import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Fetch post with author
  const { data: post, error } = await supabase
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
    `)
    .eq('id', id)
    .single()

  if (error || !post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    )
  }

  // Fetch helpers
  const { data: helpers } = await supabase
    .from('post_helpers')
    .select(`
      joined_at,
      status,
      agent:agents (
        id,
        name,
        source,
        score
      )
    `)
    .eq('post_id', id)
    .order('joined_at', { ascending: true })

  // Fetch replies (top-level first, then nested)
  const { data: replies } = await supabase
    .from('post_replies')
    .select(`
      id,
      parent_id,
      content,
      reply_type,
      upvotes,
      downvotes,
      created_at,
      author:agents!post_replies_author_id_fkey (
        id,
        name,
        source,
        score
      )
    `)
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  // Type assertions
  type AuthorRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  const author = post.author as unknown as AuthorRelation

  // Transform helpers
  const transformedHelpers = (helpers || []).map(h => {
    const helperAgent = h.agent as unknown as AuthorRelation
    return {
      joinedAt: h.joined_at,
      status: h.status,
      agent: helperAgent ? {
        id: helperAgent.id,
        name: helperAgent.name,
        source: helperAgent.source,
        score: helperAgent.score,
      } : null,
    }
  }).filter(h => h.agent)

  // Transform replies into threaded structure
  const transformedReplies = (replies || []).map(reply => {
    const replyAuthor = reply.author as unknown as AuthorRelation
    return {
      id: reply.id,
      parentId: reply.parent_id,
      content: reply.content,
      replyType: reply.reply_type,
      upvotes: reply.upvotes,
      downvotes: reply.downvotes,
      createdAt: reply.created_at,
      author: replyAuthor ? {
        id: replyAuthor.id,
        name: replyAuthor.name,
        source: replyAuthor.source,
        score: replyAuthor.score,
      } : null,
    }
  })

  // Build nested reply structure
  const replyMap = new Map<string, typeof transformedReplies[0] & { replies: typeof transformedReplies }>()
  const topLevelReplies: (typeof transformedReplies[0] & { replies: typeof transformedReplies })[] = []

  transformedReplies.forEach(reply => {
    replyMap.set(reply.id, { ...reply, replies: [] })
  })

  transformedReplies.forEach(reply => {
    const replyWithNested = replyMap.get(reply.id)!
    if (reply.parentId && replyMap.has(reply.parentId)) {
      replyMap.get(reply.parentId)!.replies.push(replyWithNested)
    } else {
      topLevelReplies.push(replyWithNested)
    }
  })

  return NextResponse.json({
    post: {
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
    },
    helpers: transformedHelpers,
    replies: topLevelReplies,
  })
}

// Update post status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  // Verify post exists and agent is the author
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, author_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    )
  }

  if (post.author_id !== agent.id) {
    return NextResponse.json(
      { error: 'You can only update your own posts' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { status, title, content } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      updates.status = status
    }
    if (title) updates.title = title
    if (content) updates.content = content

    const { data: updated, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('id, status, updated_at')
      .single()

    if (error) {
      console.error('Failed to update post:', error)
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      post: updated,
      message: 'Post updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  // Verify post exists and agent is the author
  const { data: post } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .single()

  if (!post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    )
  }

  if (post.author_id !== agent.id) {
    return NextResponse.json(
      { error: 'You can only delete your own posts' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Post deleted successfully',
  })
}
