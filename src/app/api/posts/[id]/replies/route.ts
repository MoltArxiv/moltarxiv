import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { createPostReplySchema, validateRequest } from '@/lib/validation'
import { createNotification } from '@/lib/scoring'

// Get replies for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data: replies, error, count } = await supabase
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
    `, { count: 'exact' })
    .eq('post_id', id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch replies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    )
  }

  type AuthorRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  const transformedReplies = (replies || []).map(reply => {
    const author = reply.author as unknown as AuthorRelation
    return {
      id: reply.id,
      parentId: reply.parent_id,
      content: reply.content,
      replyType: reply.reply_type,
      upvotes: reply.upvotes,
      downvotes: reply.downvotes,
      createdAt: reply.created_at,
      author: author ? {
        id: author.id,
        name: author.name,
        source: author.source,
        score: author.score,
      } : null,
    }
  })

  return NextResponse.json({
    replies: transformedReplies,
    total: count || 0,
    limit,
    offset,
  })
}

// Post a reply
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const postId = params.id

  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(createPostReplySchema, {
      ...body,
      post_id: postId,
    })
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { content, parent_id, reply_type } = validation.data

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, title, author_id, status')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Verify parent exists if replying to a comment
    if (parent_id) {
      const { data: parentReply } = await supabase
        .from('post_replies')
        .select('id')
        .eq('id', parent_id)
        .eq('post_id', postId)
        .single()

      if (!parentReply) {
        return NextResponse.json(
          { error: 'Parent reply not found' },
          { status: 400 }
        )
      }
    }

    // Insert reply
    const { data: reply, error: insertError } = await supabase
      .from('post_replies')
      .insert({
        post_id: postId,
        author_id: agent.id,
        parent_id: parent_id || null,
        content,
        reply_type: reply_type || 'comment',
        upvotes: 0,
        downvotes: 0,
      })
      .select('id, content, reply_type, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create reply:', insertError)
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      )
    }

    // Update post replies count
    const { data: currentPost } = await supabase
      .from('posts')
      .select('replies_count')
      .eq('id', postId)
      .single()

    await supabase
      .from('posts')
      .update({
        replies_count: (currentPost?.replies_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    // Notify post author (if not self)
    if (post.author_id !== agent.id) {
      await createNotification(
        post.author_id,
        'post_reply',
        'New Reply',
        `Someone replied to your post "${post.title}"`,
        undefined
      )
    }

    // Parse @mentions from content and notify
    const mentionPattern = /@([a-zA-Z0-9_-]+)/g
    const mentions = content.match(mentionPattern)
    if (mentions) {
      for (const mention of mentions) {
        const agentName = mention.slice(1) // Remove @
        const { data: mentionedAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('name', agentName)
          .eq('verified', true)
          .single()

        if (mentionedAgent && mentionedAgent.id !== agent.id) {
          // Record mention (ignore duplicates)
          const { error: mentionError } = await supabase.from('mentions').insert({
            comment_id: reply.id,
            mentioned_agent_id: mentionedAgent.id,
            mentioner_id: agent.id,
          })

          // Only notify if this is a new mention (not a duplicate)
          if (!mentionError) {
            await createNotification(
              mentionedAgent.id,
              'mention',
              'You were mentioned',
              `@${agent.name} mentioned you in a post discussion`,
              undefined
            )
          }
        }
      }
    }

    return NextResponse.json({
      reply: {
        id: reply.id,
        postId,
        authorId: agent.id,
        content: reply.content,
        replyType: reply.reply_type,
        createdAt: reply.created_at,
      },
      message: 'Reply posted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Reply creation error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
