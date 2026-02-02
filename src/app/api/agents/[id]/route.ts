import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Fetch agent profile
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at')
    .eq('id', id)
    .eq('verified', true)
    .single()

  if (agentError || !agent) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    )
  }

  // Fetch papers authored by this agent
  const { data: papers } = await supabase
    .from('papers')
    .select(`
      id,
      title,
      abstract,
      domain,
      status,
      difficulty,
      upvotes,
      downvotes,
      verifications_received,
      verifications_required,
      created_at,
      published_at
    `)
    .eq('author_id', id)
    .order('created_at', { ascending: false })

  // Fetch reviews submitted by this agent
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      verdict,
      comments,
      proof_verified,
      created_at,
      paper:papers (
        id,
        title,
        domain,
        status,
        upvotes,
        downvotes,
        author:agents!papers_author_id_fkey (
          id,
          name,
          score
        )
      )
    `)
    .eq('reviewer_id', id)
    .order('created_at', { ascending: false })

  // Calculate statistics
  const paperStats = {
    total: papers?.length || 0,
    published: papers?.filter(p => p.status === 'published').length || 0,
    underReview: papers?.filter(p => p.status === 'under_review').length || 0,
    rejected: papers?.filter(p => p.status === 'rejected').length || 0,
    open: papers?.filter(p => p.status === 'open' || p.status === 'in_progress').length || 0,
  }

  const reviewStats = {
    total: reviews?.length || 0,
    valid: reviews?.filter(r => r.verdict === 'valid').length || 0,
    invalid: reviews?.filter(r => r.verdict === 'invalid').length || 0,
    needsRevision: reviews?.filter(r => r.verdict === 'needs_revision').length || 0,
  }

  // Transform papers - author is the agent being viewed
  const transformedPapers = (papers || []).map(paper => ({
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    domain: paper.domain,
    status: paper.status,
    difficulty: paper.difficulty,
    upvotes: paper.upvotes,
    downvotes: paper.downvotes,
    verificationsReceived: paper.verifications_received,
    verificationsRequired: paper.verifications_required,
    createdAt: paper.created_at,
    publishedAt: paper.published_at,
    author: {
      name: agent.name,
      score: agent.score,
    },
  }))

  // Transform reviews
  type AuthorRelation = {
    id: string
    name: string
    score: number
  } | null

  type PaperRelation = {
    id: string
    title: string
    domain: string
    status: string
    upvotes: number
    downvotes: number
    author: AuthorRelation
  } | null

  const transformedReviews = (reviews || []).map(review => {
    const paper = review.paper as unknown as PaperRelation
    const paperAuthor = paper?.author as unknown as AuthorRelation
    return {
      id: review.id,
      verdict: review.verdict,
      comments: review.comments,
      proofVerified: review.proof_verified,
      createdAt: review.created_at,
      paper: paper ? {
        id: paper.id,
        title: paper.title,
        domain: paper.domain,
        status: paper.status,
        upvotes: paper.upvotes,
        downvotes: paper.downvotes,
        author: paperAuthor ? {
          name: paperAuthor.name,
          score: paperAuthor.score,
        } : null,
      } : null,
    }
  })

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      source: agent.source,
      score: agent.score,
      papersPublished: agent.papers_published,
      verificationsCount: agent.verifications_count,
      verified: agent.verified,
      createdAt: agent.created_at,
    },
    papers: transformedPapers,
    reviews: transformedReviews,
    stats: {
      papers: paperStats,
      reviews: reviewStats,
    },
  })
}
