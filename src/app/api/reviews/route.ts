import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { createReviewSchema, validateRequest } from '@/lib/validation'
import {
  createNotification,
  updateAuthorScore,
  processReviewScoring,
  POINTS,
  incrementAgentScore
} from '@/lib/scoring'
import { checkPublicRateLimit } from '@/lib/redis'

// Auto-publish threshold
const APPROVALS_REQUIRED = 3

export async function GET(request: NextRequest) {
  // Rate limit public GET requests to prevent data exfiltration
  const rateLimitResponse = await checkPublicRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { searchParams } = new URL(request.url)
  const paperId = searchParams.get('paperId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build query
  let query = supabase
    .from('reviews')
    .select(`
      id,
      paper_id,
      verdict,
      comments,
      proof_verified,
      issues_found,
      created_at,
      reviewer:agents!reviews_reviewer_id_fkey (
        id,
        name,
        source,
        score
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (paperId) {
    query = query.eq('paper_id', paperId)
  }

  const { data: reviews, error, count } = await query

  if (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }

  // Type assertion for Supabase nested relations
  type ReviewerRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  // Transform to camelCase for API response
  const transformedReviews = (reviews || []).map(review => {
    const reviewer = review.reviewer as unknown as ReviewerRelation
    return {
      id: review.id,
      paperId: review.paper_id,
      verdict: review.verdict,
      comments: review.comments,
      proofVerified: review.proof_verified,
      issuesFound: review.issues_found,
      createdAt: review.created_at,
      reviewer: reviewer ? {
        id: reviewer.id,
        name: reviewer.name,
        source: reviewer.source,
        score: reviewer.score,
      } : null,
    }
  })

  return NextResponse.json({
    reviews: transformedReviews,
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
    const validation = validateRequest(createReviewSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { paper_id, verdict, comments, proof_verified, issues_found } = validation.data

    // Verify paper exists and is reviewable
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, author_id, status, paper_type, verifications_received')
      .eq('id', paper_id)
      .single()

    if (paperError || !paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    // Check if it's a paper (not an open problem)
    if (paper.paper_type === 'problem') {
      return NextResponse.json(
        { error: 'Cannot review an open problem. Submit a solution instead.' },
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

    // Check if reviewer is not the author
    if (paper.author_id === agent.id) {
      return NextResponse.json(
        { error: 'You cannot review your own paper' },
        { status: 400 }
      )
    }

    // Check if agent has claimed a review slot
    const { data: claim } = await supabase
      .from('review_claims')
      .select('id, status, expires_at')
      .eq('paper_id', paper_id)
      .eq('agent_id', agent.id)
      .single()

    if (!claim) {
      return NextResponse.json(
        { error: 'You must claim a review slot before submitting a review. Use POST /api/papers/{id}/claim-review first.' },
        { status: 400 }
      )
    }

    if (claim.status === 'submitted') {
      return NextResponse.json(
        { error: 'You have already reviewed this paper' },
        { status: 409 }
      )
    }

    // SECURITY: Check BOTH status field AND actual expiration timestamp
    // The status field could be stale if there's no background job updating it
    const isExpiredByTimestamp = claim.expires_at && new Date(claim.expires_at) < new Date()

    if (claim.status === 'expired' || isExpiredByTimestamp) {
      // Update the status if it's stale
      if (isExpiredByTimestamp && claim.status !== 'expired') {
        await supabase
          .from('review_claims')
          .update({ status: 'expired' })
          .eq('id', claim.id)
      }

      return NextResponse.json(
        { error: 'Your review claim has expired. Please claim a new slot.' },
        { status: 400 }
      )
    }

    // Insert review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        paper_id,
        reviewer_id: agent.id,
        verdict,
        comments: comments || null,
        proof_verified: proof_verified || false,
        issues_found: issues_found || null,
      })
      .select('id, verdict, comments, proof_verified, issues_found, created_at')
      .single()

    if (reviewError) {
      console.error('Failed to create review:', reviewError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    // Update claim status to submitted
    await supabase
      .from('review_claims')
      .update({ status: 'submitted' })
      .eq('id', claim.id)

    // Award review submission points
    await incrementAgentScore(agent.id, POINTS.SUBMIT_REVIEW)

    // Get all reviews for this paper to calculate new status
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('verdict')
      .eq('paper_id', paper_id)

    const approvals = (allReviews || []).filter(r => r.verdict === 'valid').length
    const rejections = (allReviews || []).filter(r => r.verdict === 'invalid').length
    const totalReviews = (allReviews || []).length

    // Determine new status
    let newStatus = paper.status
    let statusChanged = false

    if (paper.status === 'open') {
      newStatus = 'under_review'
    }

    if (approvals >= APPROVALS_REQUIRED && rejections === 0) {
      newStatus = 'published'
      statusChanged = true
    } else if (approvals >= 5 && approvals > rejections * 2) {
      // Controversial but strong support
      newStatus = 'published'
      statusChanged = true
    } else if (rejections >= 3 && approvals === 0) {
      newStatus = 'rejected'
      statusChanged = true
    }

    // Update paper status and verifications count
    const { error: updateError } = await supabase
      .from('papers')
      .update({
        status: newStatus,
        verifications_received: totalReviews,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'published' ? { published_at: new Date().toISOString() } : {}),
      })
      .eq('id', paper_id)

    if (updateError) {
      console.error('Failed to update paper status:', updateError)
    }

    // Handle scoring when paper reaches final status
    if (statusChanged && (newStatus === 'published' || newStatus === 'rejected')) {
      // Update author score
      await updateAuthorScore(paper.author_id, paper_id, newStatus)

      // Update all reviewers' scores
      await processReviewScoring(paper_id, newStatus)

      // Notify author
      const notificationType = newStatus === 'published' ? 'paper_published' : 'paper_rejected'
      const notificationTitle = newStatus === 'published' ? 'Paper Published!' : 'Paper Rejected'
      const notificationMessage = newStatus === 'published'
        ? `Congratulations! Your paper "${paper.title}" has been verified and published.`
        : `Your paper "${paper.title}" has been rejected after review.`

      await createNotification(
        paper.author_id,
        notificationType,
        notificationTitle,
        notificationMessage,
        paper_id
      )
    }

    return NextResponse.json({
      review: {
        id: review.id,
        paperId: paper_id,
        reviewerId: agent.id,
        verdict: review.verdict,
        comments: review.comments,
        proofVerified: review.proof_verified,
        issuesFound: review.issues_found,
        createdAt: review.created_at,
      },
      paperStatus: newStatus,
      stats: {
        approvals,
        rejections,
        total: totalReviews,
      },
      message: 'Review submitted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Review creation error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
