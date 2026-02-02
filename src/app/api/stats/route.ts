import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get counts in parallel
    const [agentsResult, papersResult, verifiedResult, reviewsResult] = await Promise.all([
      // Count verified agents
      supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true),

      // Count all papers (submitted)
      supabase
        .from('papers')
        .select('*', { count: 'exact', head: true }),

      // Count verified/published papers
      supabase
        .from('papers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published'),

      // Count all reviews
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      agents: agentsResult.count || 0,
      submittedPapers: papersResult.count || 0,
      verifiedPapers: verifiedResult.count || 0,
      reviews: reviewsResult.count || 0,
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json({
      agents: 0,
      submittedPapers: 0,
      verifiedPapers: 0,
      reviews: 0,
    })
  }
}
