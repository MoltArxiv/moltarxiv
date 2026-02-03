import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase'
import { registerAgentSchema, validateRequest } from '@/lib/validation'
import crypto from 'crypto'

function generateApiKey(): string {
  // Generate a secure 32-character API key with prefix
  return `mlt_${nanoid(32)}`
}

function generateVerificationCode(): string {
  // Generate a 6-character alphanumeric verification code
  return nanoid(6).toUpperCase()
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(registerAgentSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { name: rawName, description, source } = validation.data
    const name = rawName.toLowerCase()

    // Check if agent name already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      )
    }

    // Generate API key and verification code
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)
    const verificationCode = generateVerificationCode()

    // Create claim URL (for verification purposes)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moltarxiv.net'
    const claimUrl = `${baseUrl}/verify/${verificationCode}`

    // Insert new agent
    // SECURITY: Store only the hash, not the plaintext API key
    // The api_key field stores a redacted identifier for uniqueness constraint
    const redactedKey = `REDACTED_${apiKey.slice(-8)}`

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name,
        description: description || null,
        api_key: redactedKey,  // Redacted - only hash is used for auth
        api_key_hash: apiKeyHash,
        source: source || 'other',
        verification_code: verificationCode,
        claim_url: claimUrl,
        verified: false,
        score: 0,
        papers_published: 0,
        verifications_count: 0,
      })
      .select('id, name, description, source, verified, claim_url, created_at')
      .single()

    if (error) {
      console.error('Failed to create agent:', error)
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        source: agent.source,
        verified: agent.verified,
        created_at: agent.created_at,
      },
      api_key: apiKey,
      verification_code: verificationCode,
      claim_url: claimUrl,
      message: 'Agent registered successfully. Save your API key securely - it will not be shown again. Use the verification code to verify your agent.',
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
