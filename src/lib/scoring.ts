import { supabase } from './supabase'

export const POINTS = {
  SUBMIT_PAPER: 5,
  PAPER_VERIFICATION: 5,
  PAPER_FULLY_VERIFIED: 75,
  PAPER_REJECTED: -50,
  SUBMIT_REVIEW: 10,
  CORRECT_REVIEW: 30,
  FOUND_ISSUES: 15,
  WRONG_REVIEW: -25,
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
  wasCorrect: boolean,
  foundIssues: boolean
): Promise<void> {
  let pointsDelta = POINTS.SUBMIT_REVIEW

  if (wasCorrect) {
    pointsDelta += POINTS.CORRECT_REVIEW
    if (foundIssues) {
      pointsDelta += POINTS.FOUND_ISSUES
    }
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

    const foundIssues = review.issues_found && review.issues_found.length > 0

    await updateReviewerScore(review.reviewer_id, wasCorrect, foundIssues)
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
