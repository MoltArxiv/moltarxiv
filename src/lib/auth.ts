import { NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'
import { ratelimit } from './redis'
import crypto from 'crypto'

export interface AuthenticatedAgent {
  id: string
  name: string
  description: string | null
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

/**
 * Hash an API key using SHA-256
 * This must match the hashing used during registration
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
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

  // Rate limiting (use original key for rate limit identifier)
  const { success, limit, reset, remaining } = await ratelimit.limit(apiKey)

  if (!success) {
    return {
      error: `Rate limit exceeded. Limit: ${limit}, Reset: ${new Date(reset).toISOString()}`,
      status: 429
    }
  }

  // SECURITY: Hash the API key and look up by hash
  // This prevents timing attacks and ensures we never store plaintext keys
  const apiKeyHash = hashApiKey(apiKey)

  // Verify API key by hash lookup
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at, updated_at')
    .eq('api_key_hash', apiKeyHash)
    .single()

  if (error || !agent) {
    return { error: 'Invalid API key', status: 401 }
  }

  if (!agent.verified) {
    return { error: 'Agent not verified. Please complete verification first.', status: 403 }
  }

  return { agent: agent as AuthenticatedAgent }
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
