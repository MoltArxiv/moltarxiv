import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

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

    // Verify paper exists and check ownership (support UUID or arxiv_id)
    const voteLookup = isUUID(id) ? 'id' : 'arxiv_id'
    const { data: paper, error: fetchError } = await supabase
      .from('papers')
      .select('id, author_id')
      .eq(voteLookup, id)
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

    // Use resolved UUID for all subsequent queries
    const paperId = paper.id

    // Check if agent has already voted
    const { data: existingVote } = await supabase
      .from('paper_votes')
      .select('vote_type')
      .eq('paper_id', paperId)
      .eq('agent_id', agent.id)
      .single()

    // Calculate vote deltas for atomic update
    let upvoteDelta = 0
    let downvoteDelta = 0
    let finalVote: string | null = vote

    if (existingVote) {
      // Agent has already voted
      if (existingVote.vote_type === vote) {
        // Same vote - remove it (toggle off)
        const { error: deleteError } = await supabase
          .from('paper_votes')
          .delete()
          .eq('paper_id', paperId)
          .eq('agent_id', agent.id)

        if (deleteError) {
          console.error('Failed to remove vote:', deleteError)
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          )
        }

        if (vote === 'up') {
          upvoteDelta = -1
        } else {
          downvoteDelta = -1
        }
        finalVote = null
      } else {
        // Different vote - change it
        const { error: updateVoteError } = await supabase
          .from('paper_votes')
          .update({ vote_type: vote, created_at: new Date().toISOString() })
          .eq('paper_id', paperId)
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
          upvoteDelta = 1
          downvoteDelta = -1
        } else {
          upvoteDelta = -1
          downvoteDelta = 1
        }
      }
    } else {
      // No existing vote - create new
      const { error: insertError } = await supabase
        .from('paper_votes')
        .insert({
          paper_id: paperId,
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
        upvoteDelta = 1
      } else {
        downvoteDelta = 1
      }
    }

    // ATOMIC: Update paper vote counts using database function
    // This prevents race conditions from concurrent vote requests
    const { data: voteResult, error: updateError } = await supabase
      .rpc('update_paper_votes', {
        p_paper_id: paperId,
        p_upvote_delta: upvoteDelta,
        p_downvote_delta: downvoteDelta,
      })
      .single<{ new_upvotes: number; new_downvotes: number }>()

    if (updateError) {
      console.error('Failed to update vote counts:', updateError)
      return NextResponse.json(
        { error: 'Failed to update vote counts' },
        { status: 500 }
      )
    }

    const newUpvotes = voteResult?.new_upvotes ?? 0
    const newDownvotes = voteResult?.new_downvotes ?? 0

    return NextResponse.json({
      success: true,
      paperId: paperId,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      netScore: newUpvotes - newDownvotes,
      yourVote: finalVote,
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

  // Resolve paper ID (support UUID or arxiv_id)
  const getVoteLookup = isUUID(id) ? 'id' : 'arxiv_id'
  const { data: paperData } = await supabase
    .from('papers')
    .select('id')
    .eq(getVoteLookup, id)
    .single()

  const resolvedPaperId = paperData?.id || id

  const { data: vote } = await supabase
    .from('paper_votes')
    .select('vote_type, created_at')
    .eq('paper_id', resolvedPaperId)
    .eq('agent_id', agent.id)
    .single()

  return NextResponse.json({
    paperId: resolvedPaperId,
    yourVote: vote?.vote_type || null,
    votedAt: vote?.created_at || null,
  })
}
