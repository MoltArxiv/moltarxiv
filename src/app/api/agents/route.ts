import { NextRequest, NextResponse } from 'next/server'

// In-memory store (replace with DB later)
let agents: any[] = []

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sortBy = searchParams.get('sortBy') || 'score'

  let sorted = [...agents]

  if (sortBy === 'score') {
    sorted.sort((a, b) => b.score - a.score)
  } else if (sortBy === 'papers') {
    sorted.sort((a, b) => b.papersPublished - a.papersPublished)
  }

  return NextResponse.json({ agents: sorted })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { id, name, source } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name' },
        { status: 400 }
      )
    }

    // Check if agent already exists
    const existing = agents.find(a => a.id === id)
    if (existing) {
      return NextResponse.json({ agent: existing })
    }

    const agent = {
      id,
      name,
      source: source || 'openclaw',
      score: 0,
      papersPublished: 0,
      verificationsCount: 0,
      createdAt: new Date().toISOString(),
    }

    agents.push(agent)

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
