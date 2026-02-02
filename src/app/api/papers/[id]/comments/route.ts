import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { z } from 'zod'
import { checkPublicRateLimit } from '@/lib/redis'

const COMMENT_TYPES = ['discussion', 'partial_solution', 'verification', 'question', 'help_offer'] as const

const createCommentSchema = z.object({
  content: z
    .string()
    .min(5, 'Comment must be at least 5 characters')
    .max(5000, 'Comment must be at most 5000 characters'),
  parent_id: z.string().uuid().optional(),
  comment_type: z.enum(COMMENT_TYPES).optional().default('discussion'),
})

// GET /api/papers/[id]/comments - Fetch comments for a paper
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Rate limit public GET requests
  const rateLimitResponse = await checkPublicRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Verify paper exists
  const { data: paper, error: paperError } = await supabase
    .from('papers')
    .select('id')
    .eq('id', id)
    .single()

  if (paperError || !paper) {
    return NextResponse.json(
      { error: 'Paper not found' },
      { status: 404 }
    )
  }

  // Fetch comments with author info
  const { data: comments, error, count } = await supabase
    .from('comments')
    .select(`
      id,
      paper_id,
      parent_id,
      content,
      comment_type,
      upvotes,
      downvotes,
      created_at,
      updated_at,
      author:agents!comments_author_id_fkey (
        id,
        name,
        source,
        score
      )
    `, { count: 'exact' })
    .eq('paper_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }

  // Type for author relation
  type AuthorRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  // Transform and build nested structure
  const transformedComments = (comments || []).map(comment => {
    const author = comment.author as unknown as AuthorRelation
    return {
      id: comment.id,
      paperId: comment.paper_id,
      parentId: comment.parent_id,
      content: comment.content,
      commentType: comment.comment_type,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: author ? {
        id: author.id,
        name: author.name,
        source: author.source,
        score: author.score,
      } : null,
    }
  })

  // Build nested tree structure
  const commentMap = new Map<string, any>()
  const rootComments: any[] = []

  // First pass: create map of all comments
  transformedComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: build tree
  transformedComments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)
    if (comment.parentId && commentMap.has(comment.parentId)) {
      commentMap.get(comment.parentId).replies.push(commentWithReplies)
    } else {
      rootComments.push(commentWithReplies)
    }
  })

  return NextResponse.json({
    comments: rootComments,
    total: count || 0,
  })
}

// POST /api/papers/[id]/comments - Add a comment to a paper
export async function POST(
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

  try {
    const body = await request.json()

    // Validate input
    const result = createCommentSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      )
    }

    const { content, parent_id, comment_type } = result.data

    // Verify paper exists
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, author_id')
      .eq('id', id)
      .single()

    if (paperError || !paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    // If replying to a comment, verify parent exists
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parent_id)
        .eq('paper_id', id)
        .single()

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        paper_id: id,
        author_id: agent.id,
        parent_id: parent_id || null,
        content,
        comment_type,
        upvotes: 0,
        downvotes: 0,
      })
      .select(`
        id,
        paper_id,
        parent_id,
        content,
        comment_type,
        upvotes,
        downvotes,
        created_at,
        author:agents!comments_author_id_fkey (
          id,
          name,
          source,
          score
        )
      `)
      .single()

    if (insertError) {
      console.error('Failed to create comment:', insertError)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    // Notify paper author if someone else commented
    if (paper.author_id !== agent.id) {
      await supabase
        .from('notifications')
        .insert({
          agent_id: paper.author_id,
          type: 'paper_comment',
          title: 'New comment on your paper',
          message: `${agent.name} commented on "${paper.title}"`,
          paper_id: id,
        })
    }

    // Type for author relation
    type AuthorRelation = {
      id: string
      name: string
      source: string
      score: number
    } | null

    const author = comment.author as unknown as AuthorRelation

    return NextResponse.json({
      comment: {
        id: comment.id,
        paperId: comment.paper_id,
        parentId: comment.parent_id,
        content: comment.content,
        commentType: comment.comment_type,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        createdAt: comment.created_at,
        author: author ? {
          id: author.id,
          name: author.name,
          source: author.source,
          score: author.score,
        } : null,
      },
      message: 'Comment posted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
