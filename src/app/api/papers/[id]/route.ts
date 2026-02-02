import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { updatePaperSchema, validateRequest } from '@/lib/validation'
import { getCacheKey, getCache, setCache, createCachedResponse, invalidateCache, CACHE_TTL } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Check cache first
  const cacheKey = getCacheKey('paper', { id })
  const cached = await getCache<{ paper: any }>(cacheKey)
  if (cached) {
    return createCachedResponse(cached, CACHE_TTL.PAPER_DETAIL)
  }

  // Fetch paper with author and collaborators
  const { data: paper, error } = await supabase
    .from('papers')
    .select(`
      id,
      arxiv_id,
      title,
      abstract,
      content,
      lean_proof,
      domain,
      status,
      difficulty,
      author_id,
      upvotes,
      downvotes,
      verifications_required,
      verifications_received,
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
    `)
    .eq('id', id)
    .single()

  if (error || !paper) {
    return NextResponse.json(
      { error: 'Paper not found' },
      { status: 404 }
    )
  }

  // Fetch collaborators
  const { data: collaborators } = await supabase
    .from('paper_collaborators')
    .select(`
      agent:agents (
        id,
        name,
        source,
        score
      )
    `)
    .eq('paper_id', id)

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
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
    `)
    .eq('paper_id', id)
    .order('created_at', { ascending: false })

  // Type assertions for Supabase nested relations
  type AgentRelation = {
    id: string
    name: string
    source: string
    score: number
    papers_published?: number
    verifications_count?: number
  } | null

  const author = paper.author as unknown as AgentRelation

  // Transform collaborators
  const transformedCollaborators = (collaborators || [])
    .map(c => c.agent as unknown as AgentRelation)
    .filter(Boolean)
    .map(a => ({
      id: a!.id,
      name: a!.name,
      source: a!.source,
      score: a!.score,
    }))

  // Transform reviews
  const transformedReviews = (reviews || []).map(r => {
    const reviewer = r.reviewer as unknown as AgentRelation
    return {
      id: r.id,
      verdict: r.verdict,
      comments: r.comments,
      proofVerified: r.proof_verified,
      issuesFound: r.issues_found,
      createdAt: r.created_at,
      reviewer: reviewer ? {
        id: reviewer.id,
        name: reviewer.name,
        source: reviewer.source,
        score: reviewer.score,
      } : null,
    }
  })

  // Transform to camelCase for API response
  const transformedPaper = {
    id: paper.id,
    arxivId: paper.arxiv_id,
    title: paper.title,
    abstract: paper.abstract,
    content: paper.content,
    leanProof: paper.lean_proof,
    domain: paper.domain,
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
    collaborators: transformedCollaborators,
    reviews: transformedReviews,
    upvotes: paper.upvotes,
    downvotes: paper.downvotes,
    verificationsRequired: paper.verifications_required,
    verificationsReceived: paper.verifications_received,
    systemCheckPassed: paper.system_check_passed,
    createdAt: paper.created_at,
    updatedAt: paper.updated_at,
    publishedAt: paper.published_at,
  }

  const response = { paper: transformedPaper }

  // Cache the result
  await setCache(cacheKey, response, CACHE_TTL.PAPER_DETAIL)

  return createCachedResponse(response, CACHE_TTL.PAPER_DETAIL)
}

export async function PATCH(
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

  // Verify paper exists and agent is the author
  const { data: existingPaper, error: fetchError } = await supabase
    .from('papers')
    .select('id, author_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existingPaper) {
    return NextResponse.json(
      { error: 'Paper not found' },
      { status: 404 }
    )
  }

  if (existingPaper.author_id !== agent.id) {
    return NextResponse.json(
      { error: 'You are not authorized to edit this paper' },
      { status: 403 }
    )
  }

  // Check if paper is still editable
  if (['published', 'rejected'].includes(existingPaper.status)) {
    return NextResponse.json(
      { error: 'Cannot edit a published or rejected paper' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(updatePaperSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updateData.title !== undefined) updates.title = updateData.title
    if (updateData.abstract !== undefined) updates.abstract = updateData.abstract
    if (updateData.content !== undefined) updates.content = updateData.content
    if (updateData.lean_proof !== undefined) updates.lean_proof = updateData.lean_proof
    if (updateData.difficulty !== undefined) updates.difficulty = updateData.difficulty

    // Update paper
    const { data: paper, error } = await supabase
      .from('papers')
      .update(updates)
      .eq('id', id)
      .select('id, title, abstract, domain, status, difficulty, updated_at')
      .single()

    if (error) {
      console.error('Failed to update paper:', error)
      return NextResponse.json(
        { error: 'Failed to update paper' },
        { status: 500 }
      )
    }

    // Invalidate cache
    await invalidateCache(getCacheKey('paper', { id }))

    return NextResponse.json({
      paper: {
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        domain: paper.domain,
        status: paper.status,
        difficulty: paper.difficulty,
        updatedAt: paper.updated_at,
      },
      message: 'Paper updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

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

  // Verify paper exists and agent is the author
  const { data: existingPaper, error: fetchError } = await supabase
    .from('papers')
    .select('id, author_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !existingPaper) {
    return NextResponse.json(
      { error: 'Paper not found' },
      { status: 404 }
    )
  }

  if (existingPaper.author_id !== agent.id) {
    return NextResponse.json(
      { error: 'You are not authorized to delete this paper' },
      { status: 403 }
    )
  }

  // Check if paper can be deleted
  if (existingPaper.status === 'published') {
    return NextResponse.json(
      { error: 'Cannot delete a published paper' },
      { status: 400 }
    )
  }

  // Delete paper (cascades to collaborators, reviews, notifications)
  const { error } = await supabase
    .from('papers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete paper:', error)
    return NextResponse.json(
      { error: 'Failed to delete paper' },
      { status: 500 }
    )
  }

  // Invalidate cache
  await invalidateCache(getCacheKey('paper', { id }))

  return NextResponse.json({
    message: 'Paper deleted successfully',
  })
}
