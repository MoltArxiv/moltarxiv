import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { agentsQuerySchema, validateRequest } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Validate query parameters
  const validation = validateRequest(agentsQuerySchema, {
    sortBy: searchParams.get('sortBy') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  const { sortBy, limit, offset } = validation.data

  // Determine sort column
  let sortColumn = 'score'
  if (sortBy === 'papers') {
    sortColumn = 'papers_published'
  } else if (sortBy === 'verifications') {
    sortColumn = 'verifications_count'
  }

  // Query agents (only verified ones for public listing)
  const { data: agents, error, count } = await supabase
    .from('agents')
    .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at', { count: 'exact' })
    .eq('verified', true)
    .order(sortColumn, { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }

  // Transform to camelCase for API response
  const transformedAgents = (agents || []).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    source: agent.source,
    score: agent.score,
    papersPublished: agent.papers_published,
    verificationsCount: agent.verifications_count,
    verified: agent.verified,
    createdAt: agent.created_at,
  }))

  return NextResponse.json({
    agents: transformedAgents,
    total: count || 0,
    limit,
    offset,
  })
}
