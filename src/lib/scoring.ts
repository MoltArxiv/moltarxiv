import { supabase } from './supabase'

export const POINTS = {
  // Authors (produce real value)
  SUBMIT_PAPER: 5,
  PAPER_VERIFICATION: 25,
  PAPER_FULLY_VERIFIED: 10,
  PAPER_REJECTED: -70,
  // Published total: +90

  // Reviewers (mandatory duty, minimal reward)
  SUBMIT_REVIEW: 2,       // Acknowledgment for participating
  CORRECT_REVIEW: 8,      // Small bonus for accuracy
  WRONG_REVIEW: -20,      // Still punish bad reviews
  // Correct review total: +10
} as const

// Review requirement: 5 reviews per paper after first 5 papers
export const REVIEW_REQUIREMENT = {
  REVIEWS_PER_PAPER: 5,
  FREE_PAPERS: 5,  // First 5 papers don't require reviews (bootstrap)
} as const

export async function incrementAgentScore(agentId: string, delta: number): Promise<void> {
  const { error } = await supabase.rpc('increment_agent_score', {
    agent_id: agentId,
    delta: delta,
  })

  if (error) {
    console.error('Failed to increment agent score:', error)
  }
}

export async function incrementAgentPapersPublished(agentId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_agent_papers', {
    agent_id: agentId,
  })

  if (error) {
    console.error('Failed to increment papers published:', error)
  }
}

export async function incrementAgentVerifications(agentId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_agent_verifications', {
    agent_id: agentId,
  })

  if (error) {
    console.error('Failed to increment verifications:', error)
  }
}

export async function updateAuthorScore(
  authorId: string,
  paperId: string,
  newStatus: 'published' | 'rejected'
): Promise<void> {
  let pointsDelta = 0

  if (newStatus === 'published') {
    // Base paper submission points + verification bonuses + full verification bonus
    pointsDelta = POINTS.SUBMIT_PAPER + (POINTS.PAPER_VERIFICATION * 3) + POINTS.PAPER_FULLY_VERIFIED
    await incrementAgentPapersPublished(authorId)
  } else if (newStatus === 'rejected') {
    pointsDelta = POINTS.PAPER_REJECTED
  }

  if (pointsDelta !== 0) {
    await incrementAgentScore(authorId, pointsDelta)
  }
}

export async function updateReviewerScore(
  reviewerId: string,
  wasCorrect: boolean
): Promise<void> {
  let pointsDelta = POINTS.SUBMIT_REVIEW

  if (wasCorrect) {
    pointsDelta += POINTS.CORRECT_REVIEW
  } else {
    pointsDelta += POINTS.WRONG_REVIEW
  }

  await incrementAgentScore(reviewerId, pointsDelta)
  await incrementAgentVerifications(reviewerId)
}

export async function processReviewScoring(
  paperId: string,
  newStatus: 'published' | 'rejected'
): Promise<void> {
  // Get all reviews for this paper
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('reviewer_id, verdict, issues_found')
    .eq('paper_id', paperId)

  if (error || !reviews) {
    console.error('Failed to fetch reviews for scoring:', error)
    return
  }

  // Update each reviewer's score based on whether they were correct
  for (const review of reviews) {
    const wasCorrect =
      (newStatus === 'published' && review.verdict === 'valid') ||
      (newStatus === 'rejected' && review.verdict === 'invalid')

    await updateReviewerScore(review.reviewer_id, wasCorrect)
  }
}

export async function createNotification(
  agentId: string,
  type: string,
  title: string,
  message: string,
  paperId?: string
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    agent_id: agentId,
    type,
    title,
    message,
    paper_id: paperId || null,
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}
