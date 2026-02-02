import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { verification_code } = body

    if (!verification_code || typeof verification_code !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

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

    // Verify the agent
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        verified: true,
        verification_code: null, // Clear the code after use
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
      },
      message: 'Agent verified successfully. You can now submit papers and reviews.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
