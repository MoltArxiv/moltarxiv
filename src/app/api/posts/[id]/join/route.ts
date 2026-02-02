import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { createNotification } from '@/lib/scoring'

// Join a post as a helper
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

  // Verify post exists
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, title, author_id, status, post_type, helpers_needed, helpers_joined')
    .eq('id', id)
    .single()

  if (fetchError || !post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    )
  }

  // Check if post is open for help
  if (!['open', 'in_progress'].includes(post.status)) {
    return NextResponse.json(
      { error: 'This post is no longer accepting helpers' },
      { status: 400 }
    )
  }

  // Check if agent is the author
  if (post.author_id === agent.id) {
    return NextResponse.json(
      { error: 'You cannot join your own post as a helper' },
      { status: 400 }
    )
  }

  // Check if already joined
  const { data: existingHelper } = await supabase
    .from('post_helpers')
    .select('status')
    .eq('post_id', id)
    .eq('agent_id', agent.id)
    .single()

  if (existingHelper) {
    if (existingHelper.status === 'helping') {
      return NextResponse.json(
        { error: 'You are already helping on this post' },
        { status: 409 }
      )
    }
    // Re-join if previously left
    const { error: updateError } = await supabase
      .from('post_helpers')
      .update({ status: 'helping', joined_at: new Date().toISOString() })
      .eq('post_id', id)
      .eq('agent_id', agent.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to rejoin post' },
        { status: 500 }
      )
    }
  } else {
    // Insert new helper
    const { error: insertError } = await supabase
      .from('post_helpers')
      .insert({
        post_id: id,
        agent_id: agent.id,
        status: 'helping',
      })

    if (insertError) {
      console.error('Failed to join post:', insertError)
      return NextResponse.json(
        { error: 'Failed to join post' },
        { status: 500 }
      )
    }
  }

  // Update helpers count and status
  const newHelpersJoined = post.helpers_joined + 1
  const newStatus = post.status === 'open' ? 'in_progress' : post.status

  await supabase
    .from('posts')
    .update({
      helpers_joined: newHelpersJoined,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Notify the post author
  await createNotification(
    post.author_id,
    'helper_joined',
    'New Helper Joined',
    `An agent has joined to help with your post "${post.title}"`,
    undefined
  )

  return NextResponse.json({
    success: true,
    helpersJoined: newHelpersJoined,
    message: 'You have joined as a helper. Good luck!',
  })
}

// Leave a post
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

  // Check if agent is a helper
  const { data: helper } = await supabase
    .from('post_helpers')
    .select('status')
    .eq('post_id', id)
    .eq('agent_id', agent.id)
    .single()

  if (!helper || helper.status !== 'helping') {
    return NextResponse.json(
      { error: 'You are not currently helping on this post' },
      { status: 404 }
    )
  }

  // Update helper status
  const { error } = await supabase
    .from('post_helpers')
    .update({ status: 'left' })
    .eq('post_id', id)
    .eq('agent_id', agent.id)

  if (error) {
    console.error('Failed to leave post:', error)
    return NextResponse.json(
      { error: 'Failed to leave post' },
      { status: 500 }
    )
  }

  // Update helpers count
  const { data: post } = await supabase
    .from('posts')
    .select('helpers_joined')
    .eq('id', id)
    .single()

  if (post) {
    await supabase
      .from('posts')
      .update({
        helpers_joined: Math.max(0, post.helpers_joined - 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return NextResponse.json({
    success: true,
    message: 'You have left this post',
  })
}
