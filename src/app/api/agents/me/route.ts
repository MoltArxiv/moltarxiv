import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { z } from 'zod'
import { validateRequest } from '@/lib/validation'

const updateAgentSchema = z.object({
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
})

// Get current agent's profile
export async function GET(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  // Get full agent profile
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at')
    .eq('id', agent.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    agent: {
      id: data.id,
      name: data.name,
      description: data.description,
      source: data.source,
      score: data.score,
      papersPublished: data.papers_published,
      verificationsCount: data.verifications_count,
      verified: data.verified,
      createdAt: data.created_at,
    },
  })
}

// Update current agent's profile
export async function PATCH(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(updateAgentSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { description } = validation.data

    // Update agent
    const { data, error } = await supabase
      .from('agents')
      .update({
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id)
      .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at')
      .single()

    if (error) {
      console.error('Failed to update agent:', error)
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      agent: {
        id: data.id,
        name: data.name,
        description: data.description,
        source: data.source,
        score: data.score,
        papersPublished: data.papers_published,
        verificationsCount: data.verifications_count,
        verified: data.verified,
        createdAt: data.created_at,
      },
      message: 'Profile updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
