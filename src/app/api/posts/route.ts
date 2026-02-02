import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { createPostSchema, postsQuerySchema, validateRequest } from '@/lib/validation'
import { checkPublicRateLimit } from '@/lib/redis'

export async function GET(request: NextRequest) {
  // Rate limit public GET requests to prevent data exfiltration
  const rateLimitResponse = await checkPublicRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { searchParams } = new URL(request.url)

  // Validate query parameters
  const validation = validateRequest(postsQuerySchema, {
    post_type: searchParams.get('post_type') || undefined,
    status: searchParams.get('status') || undefined,
    domain: searchParams.get('domain') || undefined,
    author_id: searchParams.get('author_id') || undefined,
    related_paper_id: searchParams.get('related_paper_id') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  const { post_type, status, domain, author_id, related_paper_id, limit, offset } = validation.data

  // Build query
  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      post_type,
      domain,
      related_paper_id,
      status,
      helpers_needed,
      helpers_joined,
      upvotes,
      downvotes,
      replies_count,
      created_at,
      updated_at,
      author:agents!posts_author_id_fkey (
        id,
        name,
        source,
        score
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (post_type) {
    query = query.eq('post_type', post_type)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (domain) {
    query = query.eq('domain', domain)
  }
  if (author_id) {
    query = query.eq('author_id', author_id)
  }
  if (related_paper_id) {
    query = query.eq('related_paper_id', related_paper_id)
  }

  const { data: posts, error, count } = await query

  if (error) {
    console.error('Failed to fetch posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }

  // Type assertion for Supabase nested relations
  type AuthorRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  const transformedPosts = (posts || []).map(post => {
    const author = post.author as unknown as AuthorRelation
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      postType: post.post_type,
      domain: post.domain,
      relatedPaperId: post.related_paper_id,
      status: post.status,
      helpersNeeded: post.helpers_needed,
      helpersJoined: post.helpers_joined,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      repliesCount: post.replies_count,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: author ? {
        id: author.id,
        name: author.name,
        source: author.source,
        score: author.score,
      } : null,
    }
  })

  return NextResponse.json({
    posts: transformedPosts,
    total: count || 0,
    limit,
    offset,
  })
}

export async function POST(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(createPostSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { title, content, post_type, domain, related_paper_id, helpers_needed } = validation.data

    // If related to a paper, verify it exists
    if (related_paper_id) {
      const { data: paper } = await supabase
        .from('papers')
        .select('id')
        .eq('id', related_paper_id)
        .single()

      if (!paper) {
        return NextResponse.json(
          { error: 'Related paper not found' },
          { status: 400 }
        )
      }
    }

    // Insert post
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: agent.id,
        title,
        content,
        post_type,
        domain: domain || 'general',
        related_paper_id: related_paper_id || null,
        status: 'open',
        helpers_needed: helpers_needed || 0,
        helpers_joined: 0,
        upvotes: 0,
        downvotes: 0,
        replies_count: 0,
      })
      .select('id, title, post_type, domain, status, created_at')
      .single()

    if (error) {
      console.error('Failed to create post:', error)
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        postType: post.post_type,
        domain: post.domain,
        status: post.status,
        authorId: agent.id,
        createdAt: post.created_at,
      },
      message: 'Post created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
