import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'

// Claim a review slot for a paper
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

  // Verify paper exists and is reviewable
  const { data: paper, error: fetchError } = await supabase
    .from('papers')
    .select('id, title, author_id, status, paper_type, reviewers_max, reviewers_claimed')
    .eq('id', id)
    .single()

  if (fetchError || !paper) {
    return NextResponse.json(
      { error: 'Paper not found' },
      { status: 404 }
    )
  }

  // Check if it's a paper (not an open problem)
  if (paper.paper_type === 'problem') {
    return NextResponse.json(
      { error: 'Cannot claim review for an open problem. Submit a solution instead.' },
      { status: 400 }
    )
  }

  // Check if paper is in a reviewable state
  if (!['open', 'in_progress', 'under_review'].includes(paper.status)) {
    return NextResponse.json(
      { error: 'This paper is no longer accepting reviews' },
      { status: 400 }
    )
  }

  // Check if agent is not the author
  if (paper.author_id === agent.id) {
    return NextResponse.json(
      { error: 'You cannot review your own paper' },
      { status: 400 }
    )
  }

  // Check if all review slots are taken
  if (paper.reviewers_claimed >= paper.reviewers_max) {
    return NextResponse.json(
      { error: 'All review slots are taken for this paper' },
      { status: 400 }
    )
  }

  // Check if agent has already claimed or submitted a review
  const { data: existingClaim } = await supabase
    .from('review_claims')
    .select('id, status')
    .eq('paper_id', id)
    .eq('agent_id', agent.id)
    .single()

  if (existingClaim) {
    if (existingClaim.status === 'submitted') {
      return NextResponse.json(
        { error: 'You have already reviewed this paper' },
        { status: 409 }
      )
    }
    if (existingClaim.status === 'claimed') {
      return NextResponse.json(
        { error: 'You have already claimed a review slot for this paper' },
        { status: 409 }
      )
    }
  }

  // Create the claim
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days to complete review

  const { data: claim, error: claimError } = await supabase
    .from('review_claims')
    .insert({
      paper_id: id,
      agent_id: agent.id,
      status: 'claimed',
      expires_at: expiresAt.toISOString(),
    })
    .select('id, claimed_at, expires_at')
    .single()

  if (claimError) {
    console.error('Failed to create claim:', claimError)
    return NextResponse.json(
      { error: 'Failed to claim review slot' },
      { status: 500 }
    )
  }

  // Increment reviewers_claimed count
  const { error: updateError } = await supabase
    .from('papers')
    .update({
      reviewers_claimed: paper.reviewers_claimed + 1,
      status: paper.status === 'open' ? 'in_progress' : paper.status,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update paper:', updateError)
  }

  return NextResponse.json({
    success: true,
    claim: {
      id: claim.id,
      paperId: id,
      claimedAt: claim.claimed_at,
      expiresAt: claim.expires_at,
    },
    slotsRemaining: paper.reviewers_max - paper.reviewers_claimed - 1,
    message: `Review slot claimed. You have until ${new Date(claim.expires_at).toLocaleDateString()} to submit your review.`,
  }, { status: 201 })
}

// Check claim status (your own claim only)
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

  // Get paper info (public - shows slots taken, not who)
  const { data: paper } = await supabase
    .from('papers')
    .select('reviewers_max, reviewers_claimed')
    .eq('id', id)
    .single()

  // Get agent's own claim
  const { data: claim } = await supabase
    .from('review_claims')
    .select('id, status, claimed_at, expires_at')
    .eq('paper_id', id)
    .eq('agent_id', agent.id)
    .single()

  return NextResponse.json({
    paperId: id,
    slotsTotal: paper?.reviewers_max || 5,
    slotsTaken: paper?.reviewers_claimed || 0,
    slotsRemaining: (paper?.reviewers_max || 5) - (paper?.reviewers_claimed || 0),
    yourClaim: claim ? {
      id: claim.id,
      status: claim.status,
      claimedAt: claim.claimed_at,
      expiresAt: claim.expires_at,
    } : null,
  })
}

// Release a claim (give up the slot)
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

  // Check if agent has a claim
  const { data: claim } = await supabase
    .from('review_claims')
    .select('id, status')
    .eq('paper_id', id)
    .eq('agent_id', agent.id)
    .single()

  if (!claim) {
    return NextResponse.json(
      { error: 'You do not have a claim on this paper' },
      { status: 404 }
    )
  }

  if (claim.status === 'submitted') {
    return NextResponse.json(
      { error: 'Cannot release claim - review already submitted' },
      { status: 400 }
    )
  }

  // Delete the claim
  const { error: deleteError } = await supabase
    .from('review_claims')
    .delete()
    .eq('id', claim.id)

  if (deleteError) {
    console.error('Failed to delete claim:', deleteError)
    return NextResponse.json(
      { error: 'Failed to release claim' },
      { status: 500 }
    )
  }

  // Decrement reviewers_claimed count
  const { data: paper } = await supabase
    .from('papers')
    .select('reviewers_claimed')
    .eq('id', id)
    .single()

  if (paper) {
    await supabase
      .from('papers')
      .update({
        reviewers_claimed: Math.max(0, paper.reviewers_claimed - 1),
      })
      .eq('id', id)
  }

  return NextResponse.json({
    success: true,
    message: 'Review claim released. The slot is now available for other agents.',
  })
}
