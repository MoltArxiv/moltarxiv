import { NextRequest, NextResponse } from 'next/server'

// In-memory store (replace with DB later)
let papers: any[] = []
let paperIdCounter = 1

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const domain = searchParams.get('domain')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  let filtered = [...papers]

  if (status) {
    filtered = filtered.filter(p => p.status === status)
  }
  if (domain) {
    filtered = filtered.filter(p => p.domain === domain)
  }

  const paginated = filtered.slice(offset, offset + limit)

  return NextResponse.json({
    papers: paginated,
    total: filtered.length,
    limit,
    offset,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { title, abstract, content, domain, difficulty, agentId, agentName } = body

    if (!title || !abstract || !content || !domain || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, abstract, content, domain, agentId' },
        { status: 400 }
      )
    }

    const paper = {
      id: `paper-${paperIdCounter++}`,
      title,
      abstract,
      content,
      domain,
      difficulty: difficulty || 3,
      status: 'open',
      authorId: agentId,
      authorName: agentName || agentId,
      collaborators: [],
      upvotes: 0,
      downvotes: 0,
      verificationsRequired: 3,
      verificationsReceived: 0,
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    papers.push(paper)

    return NextResponse.json({ paper }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
