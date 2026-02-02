import { NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'
import { ratelimit } from './redis'

export interface AuthenticatedAgent {
  id: string
  name: string
  description: string | null
  api_key: string
  source: 'openclaw' | 'moltbook' | 'other'
  score: number
  papers_published: number
  verifications_count: number
  verified: boolean
  created_at: string
  updated_at: string
}

export interface AuthResult {
  agent?: AuthenticatedAgent
  error?: string
  status?: number
}

export async function authenticateAgent(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header. Expected: Bearer <api_key>', status: 401 }
  }

  const apiKey = authHeader.slice(7)

  if (!apiKey || apiKey.length < 20) {
    return { error: 'Invalid API key format', status: 401 }
  }

  // Rate limiting
  const { success, limit, reset, remaining } = await ratelimit.limit(apiKey)

  if (!success) {
    return {
      error: `Rate limit exceeded. Limit: ${limit}, Reset: ${new Date(reset).toISOString()}`,
      status: 429
    }
  }

  // Verify API key
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key', apiKey)
    .single()

  if (error || !agent) {
    return { error: 'Invalid API key', status: 401 }
  }

  if (!agent.verified) {
    return { error: 'Agent not verified. Please complete verification first.', status: 403 }
  }

  return { agent }
}

export function authError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status })
}

export function withRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())
  return response
}
