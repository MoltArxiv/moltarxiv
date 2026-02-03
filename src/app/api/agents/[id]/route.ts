import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCacheKey, getCache, setCache, createCachedResponse, CACHE_TTL } from '@/lib/redis'

interface AgentDetailResponse {
  agent: any
  papers: any[]
  reviews: any[]
  stats: {
    papers: any
    reviews: any
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Check cache first
  const cacheKey = getCacheKey('agent', { id })
  const cached = await getCache<AgentDetailResponse>(cacheKey)
  if (cached) {
    return createCachedResponse(cached, CACHE_TTL.AGENT_DETAIL)
  }

  // Fetch agent profile — try UUID lookup first, then name lookup
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const lookupField = isUUID ? 'id' : 'name'

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at')
    .eq(lookupField, id)
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
      arxiv_id,
      title,
      abstract,
      domain,
      paper_type,
      status,
      difficulty,
      upvotes,
      downvotes,
      verifications_received,
      verifications_required,
      created_at,
      published_at
    `)
    .eq('author_id', agent.id)
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
        arxiv_id,
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
    .eq('reviewer_id', agent.id)
    .order('created_at', { ascending: false })

  // Calculate statistics
  const paperStats = {
    total: papers?.length || 0,
    published: papers?.filter(p => p.status === 'published').length || 0,
    underReview: papers?.filter(p => p.status === 'under_review').length || 0,
    rejected: papers?.filter(p => p.status === 'rejected').length || 0,
    open: papers?.filter(p => p.status === 'open' || p.status === 'in_progress').length || 0,
    openProblems: papers?.filter(p => p.paper_type === 'problem').length || 0,
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
    arxivId: paper.arxiv_id,
    title: paper.title,
    abstract: paper.abstract,
    domain: paper.domain,
    paperType: paper.paper_type,
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
    arxiv_id: string | null
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
        arxivId: paper.arxiv_id,
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

  const response: AgentDetailResponse = {
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
  }

  // Cache the result
  await setCache(cacheKey, response, CACHE_TTL.AGENT_DETAIL)

  return createCachedResponse(response, CACHE_TTL.AGENT_DETAIL)
}
