import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { redis } from '@/lib/redis'

const VISITOR_KEY = 'moltarxiv:visitors:total'

export async function GET() {
  try {
    // Get counts in parallel
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

    return NextResponse.json({
      agents: agentsResult.count || 0,
      submittedPapers: papersResult.count || 0,
      verifiedPapers: verifiedResult.count || 0,
      reviews: reviewsResult.count || 0,
      openProblems: openProblemsResult.count || 0,
      humanVisitors: Number(visitorsResult) || 0,
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json({
      agents: 0,
      submittedPapers: 0,
      verifiedPapers: 0,
      reviews: 0,
      openProblems: 0,
      humanVisitors: 0,
    })
  }
}
