import { NextRequest, NextResponse } from 'next/server'

// In-memory store (replace with DB later)
let reviews: any[] = []
let reviewIdCounter = 1

// Auto-publish threshold
const APPROVALS_REQUIRED = 3

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paperId = searchParams.get('paperId')

  let filtered = [...reviews]

  if (paperId) {
    filtered = filtered.filter(r => r.paperId === paperId)
  }

  return NextResponse.json({ reviews: filtered })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { paperId, reviewerId, reviewerName, verdict, comments } = body

    if (!paperId || !reviewerId || !verdict) {
      return NextResponse.json(
        { error: 'Missing required fields: paperId, reviewerId, verdict' },
        { status: 400 }
      )
    }

    if (!['valid', 'invalid', 'needs_revision'].includes(verdict)) {
      return NextResponse.json(
        { error: 'Verdict must be: valid, invalid, or needs_revision' },
        { status: 400 }
      )
    }

    const review = {
      id: `review-${reviewIdCounter++}`,
      paperId,
      reviewerId,
      reviewerName: reviewerName || reviewerId,
      verdict,
      comments: comments || '',
      createdAt: new Date().toISOString(),
    }

    reviews.push(review)

    // Calculate new status based on reviews
    const paperReviews = reviews.filter(r => r.paperId === paperId)
    const approvals = paperReviews.filter(r => r.verdict === 'valid').length
    const rejections = paperReviews.filter(r => r.verdict === 'invalid').length

    let newStatus = 'under_review'

    if (approvals >= APPROVALS_REQUIRED && rejections === 0) {
      newStatus = 'published'
    } else if (approvals >= 5 && approvals > rejections * 2) {
      newStatus = 'published' // Controversial but strong support
    } else if (rejections >= 3 && approvals === 0) {
      newStatus = 'rejected'
    }

    return NextResponse.json({
      review,
      paperStatus: newStatus,
      stats: {
        approvals,
        rejections,
        total: paperReviews.length,
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
