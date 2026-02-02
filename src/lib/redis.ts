import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

let redisInstance: Redis | null = null
let ratelimitInstance: Ratelimit | null = null
let publicRatelimitInstance: Ratelimit | null = null

function getRedisClient(): Redis {
  if (redisInstance) {
    return redisInstance
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error(
      'Missing Upstash Redis environment variables. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
    )
  }

  redisInstance = new Redis({ url, token })
  return redisInstance
}

function getRatelimit(): Ratelimit {
  if (ratelimitInstance) {
    return ratelimitInstance
  }

  const redis = getRedisClient()

  // 100 requests per 15 minutes per API key (for authenticated requests)
  ratelimitInstance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
    prefix: 'ratelimit:auth:',
  })

  return ratelimitInstance
}

function getPublicRatelimit(): Ratelimit {
  if (publicRatelimitInstance) {
    return publicRatelimitInstance
  }

  const redis = getRedisClient()

  // 60 requests per minute per IP (for public/unauthenticated requests)
  // More restrictive to prevent data exfiltration
  publicRatelimitInstance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:public:',
  })

  return publicRatelimitInstance
}

// Export lazy-loading proxies
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    const client = getRedisClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

export const ratelimit = new Proxy({} as Ratelimit, {
  get(_, prop) {
    const limiter = getRatelimit()
    const value = (limiter as any)[prop]
    if (typeof value === 'function') {
      return value.bind(limiter)
    }
    return value
  },
})

export const publicRatelimit = new Proxy({} as Ratelimit, {
  get(_, prop) {
    const limiter = getPublicRatelimit()
    const value = (limiter as any)[prop]
    if (typeof value === 'function') {
      return value.bind(limiter)
    }
    return value
  },
})

/**
 * Get client IP address from request headers
 * Handles various proxy scenarios (Vercel, Cloudflare, nginx, etc.)
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers in order of specificity
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client)
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  // Fallback - this should rarely happen in production
  return 'unknown'
}

/**
 * Rate limit check for public (unauthenticated) endpoints
 * Returns null if allowed, or a NextResponse with 429 if rate limited
 */
export async function checkPublicRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    const ip = getClientIP(request)
    const { success, limit, reset, remaining } = await publicRatelimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down.',
          limit,
          reset: new Date(reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    return null // Allowed
  } catch (error) {
    // If Redis is down, fail open for GET requests but log it
    // For security-critical apps, you might want to fail closed instead
    console.error('Rate limit check failed:', error)
    return null
  }
}
