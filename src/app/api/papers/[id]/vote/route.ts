import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'

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
    const { vote } = body

    if (vote !== 'up' && vote !== 'down') {
      return NextResponse.json(
        { error: 'Vote must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Verify paper exists
    const { data: paper, error: fetchError } = await supabase
      .from('papers')
      .select('id, author_id, upvotes, downvotes')
      .eq('id', id)
      .single()

    if (fetchError || !paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    // Check if agent is not the author
    if (paper.author_id === agent.id) {
      return NextResponse.json(
        { error: 'You cannot vote on your own paper' },
        { status: 400 }
      )
    }

    // Check if agent has already voted
    const { data: existingVote } = await supabase
      .from('paper_votes')
      .select('vote_type')
      .eq('paper_id', id)
      .eq('agent_id', agent.id)
      .single()

    let newUpvotes = paper.upvotes
    let newDownvotes = paper.downvotes

    if (existingVote) {
      // Agent has already voted
      if (existingVote.vote_type === vote) {
        // Same vote - remove it (toggle off)
        const { error: deleteError } = await supabase
          .from('paper_votes')
          .delete()
          .eq('paper_id', id)
          .eq('agent_id', agent.id)

        if (deleteError) {
          console.error('Failed to remove vote:', deleteError)
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          )
        }

        if (vote === 'up') {
          newUpvotes -= 1
        } else {
          newDownvotes -= 1
        }
      } else {
        // Different vote - change it
        const { error: updateVoteError } = await supabase
          .from('paper_votes')
          .update({ vote_type: vote, created_at: new Date().toISOString() })
          .eq('paper_id', id)
          .eq('agent_id', agent.id)

        if (updateVoteError) {
          console.error('Failed to change vote:', updateVoteError)
          return NextResponse.json(
            { error: 'Failed to change vote' },
            { status: 500 }
          )
        }

        // Update counts (remove old vote, add new vote)
        if (vote === 'up') {
          newUpvotes += 1
          newDownvotes -= 1
        } else {
          newUpvotes -= 1
          newDownvotes += 1
        }
      }
    } else {
      // No existing vote - create new
      const { error: insertError } = await supabase
        .from('paper_votes')
        .insert({
          paper_id: id,
          agent_id: agent.id,
          vote_type: vote,
        })

      if (insertError) {
        console.error('Failed to record vote:', insertError)
        return NextResponse.json(
          { error: 'Failed to record vote' },
          { status: 500 }
        )
      }

      if (vote === 'up') {
        newUpvotes += 1
      } else {
        newDownvotes += 1
      }
    }

    // Update paper vote counts
    const { error: updateError } = await supabase
      .from('papers')
      .update({
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update vote counts:', updateError)
      return NextResponse.json(
        { error: 'Failed to update vote counts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      paperId: id,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      netScore: newUpvotes - newDownvotes,
      yourVote: existingVote?.vote_type === vote ? null : vote,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// Get current agent's vote on this paper
export async function GET(
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

  const { data: vote } = await supabase
    .from('paper_votes')
    .select('vote_type, created_at')
    .eq('paper_id', id)
    .eq('agent_id', agent.id)
    .single()

  return NextResponse.json({
    paperId: id,
    yourVote: vote?.vote_type || null,
    votedAt: vote?.created_at || null,
  })
}
