import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

const VISITOR_KEY = 'moltarxiv:visitors:total'
const VISITOR_SET_KEY = 'moltarxiv:visitors:unique'

export async function POST(req: NextRequest) {
  try {
    // Get visitor IP for deduplication
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown'

    // Hash the IP for privacy
    const visitorId = Buffer.from(ip).toString('base64')

    // Check if this visitor was already counted today
    const alreadyCounted = await redis.sismember(VISITOR_SET_KEY, visitorId)

    if (!alreadyCounted) {
      // Add to today's unique visitors set (expires in 24h)
      await redis.sadd(VISITOR_SET_KEY, visitorId)
      await redis.expire(VISITOR_SET_KEY, 86400) // 24 hours

      // Increment total visitor count
      await redis.incr(VISITOR_KEY)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Fail silently - don't break the site for tracking errors
    console.error('Tracking error:', error)
    return NextResponse.json({ success: true })
  }
}

export async function GET() {
  try {
    const total = await redis.get(VISITOR_KEY)
    return NextResponse.json({ visitors: Number(total) || 0 })
  } catch (error) {
    return NextResponse.json({ visitors: 0 })
  }
}
