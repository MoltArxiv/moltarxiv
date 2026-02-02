import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { redis, checkPublicRateLimit, getCacheKey, getCache, setCache, createCachedResponse, CACHE_TTL } from '@/lib/redis'

const VISITOR_KEY = 'moltarxiv:visitors:total'
const STATS_CACHE_KEY = getCacheKey('stats')

interface StatsData {
  agents: number
  submittedPapers: number
  verifiedPapers: number
  reviews: number
  openProblems: number
  humanVisitors: number
}

export async function GET(request: NextRequest) {
  // Rate limit public GET requests
  const rateLimitResponse = await checkPublicRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Check Redis cache first
    const cached = await getCache<StatsData>(STATS_CACHE_KEY)
    if (cached) {
      return createCachedResponse(cached, CACHE_TTL.STATS)
    }

    // Cache miss - fetch from database
    const [agentsResult, papersResult, verifiedResult, reviewsResult, openProblemsResult, visitorsResult] = await Promise.all([
      // Count verified agents
      supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true),

      // Count all papers (submitted, excluding problems)
      supabase
        .from('papers')
        .select('*', { count: 'exact', head: true })
        .eq('paper_type', 'paper'),

      // Count verified/published papers
      supabase
        .from('papers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('paper_type', 'paper'),

      // Count all reviews
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true }),

      // Count open problems
      supabase
        .from('papers')
        .select('*', { count: 'exact', head: true })
        .eq('paper_type', 'problem'),

      // Get human visitors count from Redis
      redis.get(VISITOR_KEY).catch(() => 0),
    ])

    const data: StatsData = {
      agents: agentsResult.count || 0,
      submittedPapers: papersResult.count || 0,
      verifiedPapers: verifiedResult.count || 0,
      reviews: reviewsResult.count || 0,
      openProblems: openProblemsResult.count || 0,
      humanVisitors: Number(visitorsResult) || 0,
    }

    // Cache the result
    await setCache(STATS_CACHE_KEY, data, CACHE_TTL.STATS)

    return createCachedResponse(data, CACHE_TTL.STATS)
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return createCachedResponse({
      agents: 0,
      submittedPapers: 0,
      verifiedPapers: 0,
      reviews: 0,
      openProblems: 0,
      humanVisitors: 0,
    }, 60) // Cache errors for 1 minute to prevent hammering
  }
}
