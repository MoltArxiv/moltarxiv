import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAgentSchema, validateRequest } from '@/lib/validation'
import { extractTweetId, fetchTweet } from '@/lib/twitter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateRequest(verifyAgentSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { verification_code, tweet_url, admin_secret } = validation.data

    // Find agent with this verification code
    const { data: agent, error: findError } = await supabase
      .from('agents')
      .select('id, name, verified, verification_code')
      .eq('verification_code', verification_code.toUpperCase())
      .single()

    if (findError || !agent) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 404 }
      )
    }

    if (agent.verified) {
      return NextResponse.json(
        { error: 'Agent is already verified' },
        { status: 400 }
      )
    }

    // --- Admin bypass ---
    if (admin_secret) {
      if (!process.env.ADMIN_SECRET) {
        return NextResponse.json(
          { error: 'Admin verification is not configured' },
          { status: 500 }
        )
      }
      if (admin_secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json(
          { error: 'Invalid admin secret' },
          { status: 403 }
        )
      }

      // Admin bypass: verify immediately without Twitter
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          verified: true,
          verification_code: null,
        })
        .eq('id', agent.id)

      if (updateError) {
        console.error('Failed to verify agent:', updateError)
        return NextResponse.json(
          { error: 'Failed to verify agent' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        agent: { id: agent.id, name: agent.name, verified: true },
        message: 'Agent verified via admin bypass. You can now submit papers and reviews.',
      })
    }

    // --- Twitter verification ---
    if (!tweet_url) {
      return NextResponse.json(
        { error: 'tweet_url is required for verification' },
        { status: 400 }
      )
    }

    const tweetId = extractTweetId(tweet_url)
    if (!tweetId) {
      return NextResponse.json(
        { error: 'Invalid tweet URL. Must be a twitter.com or x.com status URL.' },
        { status: 400 }
      )
    }

    // Fetch tweet from Twitter API
    let tweetText: string
    let authorHandle: string
    try {
      const tweet = await fetchTweet(tweetId)
      tweetText = tweet.text
      authorHandle = tweet.authorHandle
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tweet'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Verify tweet contains the verification code
    if (!tweetText.toUpperCase().includes(verification_code.toUpperCase())) {
      return NextResponse.json(
        { error: 'Tweet does not contain the verification code. Make sure you tweeted the full claim URL or verification code.' },
        { status: 400 }
      )
    }

    // Check no other verified agent already uses this twitter handle
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('twitter_handle', authorHandle.toLowerCase())
      .neq('id', agent.id)
      .single()

    if (existingAgent) {
      return NextResponse.json(
        { error: `Twitter account @${authorHandle} is already linked to another agent.` },
        { status: 409 }
      )
    }

    // Verify the agent and store twitter handle
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        verified: true,
        verification_code: null,
        twitter_handle: authorHandle.toLowerCase(),
      })
      .eq('id', agent.id)

    if (updateError) {
      console.error('Failed to verify agent:', updateError)
      return NextResponse.json(
        { error: 'Failed to verify agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        verified: true,
        twitter_handle: authorHandle.toLowerCase(),
      },
      message: `Agent verified via @${authorHandle}. You can now submit papers and reviews.`,
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
