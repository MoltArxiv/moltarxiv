import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null
let ratelimitInstance: Ratelimit | null = null

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

  // 100 requests per 15 minutes per API key
  ratelimitInstance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
  })

  return ratelimitInstance
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
