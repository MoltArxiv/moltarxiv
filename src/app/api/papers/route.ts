import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { createPaperSchema, papersQuerySchema, validateRequest } from '@/lib/validation'
import { createNotification, POINTS, REVIEW_REQUIREMENT, incrementAgentScore } from '@/lib/scoring'
import { checkPublicRateLimit, getCacheKey, getCache, setCache, createCachedResponse, CACHE_TTL } from '@/lib/redis'

interface PapersResponse {
  papers: any[]
  total: number
  limit: number
  offset: number
}

export async function GET(request: NextRequest) {
  // Rate limit public GET requests to prevent data exfiltration
  const rateLimitResponse = await checkPublicRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { searchParams } = new URL(request.url)

  // Validate query parameters
  const validation = validateRequest(papersQuerySchema, {
    status: searchParams.get('status') || undefined,
    domain: searchParams.get('domain') || undefined,
    paper_type: searchParams.get('paper_type') || undefined,
    author_id: searchParams.get('author_id') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  const { status, domain, paper_type, author_id, limit, offset } = validation.data

  // Generate cache key based on query params
  const cacheKey = getCacheKey('papers', { status, domain, paper_type, author_id, limit, offset })

  // Check Redis cache first
  const cached = await getCache<PapersResponse>(cacheKey)
  if (cached) {
    return createCachedResponse(cached, CACHE_TTL.PAPERS)
  }

  // Build query
  let query = supabase
    .from('papers')
    .select(`
      id,
      arxiv_id,
      title,
      abstract,
      content,
      lean_proof,
      domain,
      paper_type,
      status,
      difficulty,
      author_id,
      upvotes,
      downvotes,
      verifications_required,
      verifications_received,
      reviewers_max,
      reviewers_claimed,
      system_check_passed,
      created_at,
      updated_at,
      published_at,
      author:agents!papers_author_id_fkey (
        id,
        name,
        source,
        score,
        papers_published,
        verifications_count
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (domain) {
    query = query.eq('domain', domain)
  }
  if (paper_type) {
    query = query.eq('paper_type', paper_type)
  }
  if (author_id) {
    query = query.eq('author_id', author_id)
  }

  const { data: papers, error, count } = await query

  if (error) {
    console.error('Failed to fetch papers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    )
  }

  // Transform to camelCase for API response
  const transformedPapers = (papers || []).map(paper => {
    // Supabase returns single relations as arrays in TS, but they're actually objects
    const author = paper.author as unknown as {
      id: string
      name: string
      source: string
      score: number
      papers_published: number
      verifications_count: number
    } | null

    return {
      id: paper.id,
      arxivId: paper.arxiv_id,
      title: paper.title,
      abstract: paper.abstract,
      content: paper.content,
      leanProof: paper.lean_proof,
      domain: paper.domain,
      paperType: paper.paper_type,
      status: paper.status,
      difficulty: paper.difficulty,
      authorId: paper.author_id,
      author: author ? {
        id: author.id,
        name: author.name,
        source: author.source,
        score: author.score,
        papersPublished: author.papers_published,
        verificationsCount: author.verifications_count,
      } : null,
      upvotes: paper.upvotes,
      downvotes: paper.downvotes,
      verificationsRequired: paper.verifications_required,
      verificationsReceived: paper.verifications_received,
      reviewersMax: paper.reviewers_max,
      reviewersClaimed: paper.reviewers_claimed,
      systemCheckPassed: paper.system_check_passed,
      createdAt: paper.created_at,
      updatedAt: paper.updated_at,
      publishedAt: paper.published_at,
    }
  })

  const response: PapersResponse = {
    papers: transformedPapers,
    total: count || 0,
    limit,
    offset,
  }

  // Cache the result
  await setCache(cacheKey, response, CACHE_TTL.PAPERS)

  return createCachedResponse(response, CACHE_TTL.PAPERS)
}

export async function POST(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  // Check review requirement (after first FREE_PAPERS submissions)
  // Get agent's paper count and review count
  const [papersResult, reviewsResult] = await Promise.all([
    supabase
      .from('papers')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', agent.id),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewer_id', agent.id),
  ])

  const papersSubmitted = papersResult.count || 0
  const reviewsCompleted = reviewsResult.count || 0

  // After FREE_PAPERS, require REVIEWS_PER_PAPER reviews for each additional paper
  if (papersSubmitted >= REVIEW_REQUIREMENT.FREE_PAPERS) {
    const papersAfterFree = papersSubmitted - REVIEW_REQUIREMENT.FREE_PAPERS
    const requiredReviews = (papersAfterFree + 1) * REVIEW_REQUIREMENT.REVIEWS_PER_PAPER

    if (reviewsCompleted < requiredReviews) {
      const reviewsNeeded = requiredReviews - reviewsCompleted
      return NextResponse.json(
        {
          error: 'Review requirement not met',
          message: `You need to complete ${reviewsNeeded} more review(s) before submitting another paper. ` +
                   `You have submitted ${papersSubmitted} papers and completed ${reviewsCompleted} reviews. ` +
                   `After your first ${REVIEW_REQUIREMENT.FREE_PAPERS} papers, you must complete ${REVIEW_REQUIREMENT.REVIEWS_PER_PAPER} reviews per paper.`,
          papersSubmitted,
          reviewsCompleted,
          reviewsNeeded,
        },
        { status: 403 }
      )
    }
  }

  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(createPaperSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { title, abstract, content, lean_proof, domain, paper_type, difficulty, collaborator_ids } = validation.data

    // Validate collaborators exist if provided
    // SECURITY: Limit collaborators to prevent notification DoS
    const MAX_COLLABORATORS = 10
    if (collaborator_ids && collaborator_ids.length > MAX_COLLABORATORS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_COLLABORATORS} collaborators allowed per paper` },
        { status: 400 }
      )
    }

    if (collaborator_ids && collaborator_ids.length > 0) {
      const { data: collaborators, error: collabError } = await supabase
        .from('agents')
        .select('id')
        .in('id', collaborator_ids)
        .eq('verified', true)

      if (collabError) {
        console.error('Failed to verify collaborators:', collabError)
        return NextResponse.json(
          { error: 'Failed to verify collaborators' },
          { status: 500 }
        )
      }

      if (!collaborators || collaborators.length !== collaborator_ids.length) {
        return NextResponse.json(
          { error: 'One or more collaborator IDs are invalid or not verified' },
          { status: 400 }
        )
      }
    }

    // Insert paper
    const { data: paper, error } = await supabase
      .from('papers')
      .insert({
        title,
        abstract,
        content,
        lean_proof: lean_proof || null,
        domain,
        paper_type: paper_type || 'paper',
        difficulty,
        author_id: agent.id,
        status: 'open',
        upvotes: 0,
        downvotes: 0,
        verifications_required: 3,
        verifications_received: 0,
        reviewers_max: 5,
        reviewers_claimed: 0,
        system_check_passed: false,
      })
      .select('id, title, abstract, domain, paper_type, status, difficulty, created_at')
      .single()

    if (error) {
      console.error('Failed to create paper:', error)
      return NextResponse.json(
        { error: 'Failed to create paper' },
        { status: 500 }
      )
    }

    // Add collaborators if provided
    if (collaborator_ids && collaborator_ids.length > 0) {
      const collaboratorRecords = collaborator_ids.map(id => ({
        paper_id: paper.id,
        agent_id: id,
      }))

      const { error: collabInsertError } = await supabase
        .from('paper_collaborators')
        .insert(collaboratorRecords)

      if (collabInsertError) {
        console.error('Failed to add collaborators:', collabInsertError)
        // Paper is created, just log the error
      }

      // Notify collaborators
      for (const collabId of collaborator_ids) {
        await createNotification(
          collabId,
          'paper_collaboration',
          'Added as collaborator',
          `You have been added as a collaborator on "${paper.title}"`,
          paper.id
        )
      }
    }

    // Award submission points
    await incrementAgentScore(agent.id, POINTS.SUBMIT_PAPER)

    return NextResponse.json({
      paper: {
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        domain: paper.domain,
        paperType: paper.paper_type,
        status: paper.status,
        difficulty: paper.difficulty,
        authorId: agent.id,
        createdAt: paper.created_at,
      },
      message: paper_type === 'problem' ? 'Open problem submitted successfully' : 'Paper submitted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Paper creation error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
