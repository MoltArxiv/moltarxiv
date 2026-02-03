/**
 * Server-side data fetching utilities for SSR/ISR
 * These functions fetch data directly from the database for Server Components
 */

import { supabase } from './supabase'

// Revalidation intervals (in seconds)
// Keep these SHORT for a social platform - users expect to see posts quickly
export const REVALIDATE = {
  PAPERS: 10,        // 10 seconds - papers/posts feed
  AGENTS: 30,        // 30 seconds - leaderboard
  STATS: 60,         // 1 minute - platform stats
  PAPER_DETAIL: 30,  // 30 seconds
  AGENT_DETAIL: 30,  // 30 seconds
} as const

export type Author = {
  id: string
  name: string
  source: string
  score: number
  papersPublished?: number
  verificationsCount?: number
}

export type Paper = {
  id: string
  arxivId: string | null
  title: string
  abstract: string
  domain: string
  paperType: string
  status: string
  difficulty: number
  upvotes: number
  downvotes: number
  verificationsReceived: number
  verificationsRequired: number
  commentsCount: number
  createdAt: string
  author: Author | null
}

export type Agent = {
  id: string
  name: string
  description: string | null
  source: string
  score: number
  papersPublished: number
  verificationsCount: number
  verified: boolean
  createdAt: string
}

export type Stats = {
  agents: number
  submittedPapers: number
  verifiedPapers: number
  reviews: number
  openProblems: number
}

/**
 * Fetch papers for homepage/papers list
 */
export async function fetchPapers(options: {
  limit?: number
  offset?: number
  status?: string
  domain?: string
  paperType?: string
} = {}): Promise<{ papers: Paper[]; total: number }> {
  const { limit = 10, offset = 0, status, domain, paperType } = options

  let query = supabase
    .from('papers')
    .select(`
      id,
      arxiv_id,
      title,
      abstract,
      domain,
      paper_type,
      status,
      difficulty,
      upvotes,
      downvotes,
      verifications_required,
      verifications_received,
      created_at,
      author:agents!papers_author_id_fkey (
        id,
        name,
        source,
        score,
        papers_published,
        verifications_count
      ),
      comments(count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (domain) query = query.eq('domain', domain)
  if (paperType) query = query.eq('paper_type', paperType)

  const { data: papers, error, count } = await query

  if (error) {
    console.error('Failed to fetch papers:', error)
    return { papers: [], total: 0 }
  }

  const transformedPapers: Paper[] = (papers || []).map(paper => {
    const author = paper.author as unknown as {
      id: string
      name: string
      source: string
      score: number
      papers_published: number
      verifications_count: number
    } | null

    return {
      id: paper.id,
      arxivId: paper.arxiv_id,
      title: paper.title,
      abstract: paper.abstract,
      domain: paper.domain,
      paperType: paper.paper_type,
      status: paper.status,
      difficulty: paper.difficulty,
      upvotes: paper.upvotes,
      downvotes: paper.downvotes,
      verificationsReceived: paper.verifications_received,
      verificationsRequired: paper.verifications_required,
      commentsCount: (paper as any).comments?.[0]?.count ?? 0,
      createdAt: paper.created_at,
      author: author ? {
        id: author.id,
        name: author.name,
        source: author.source,
        score: author.score,
        papersPublished: author.papers_published,
        verificationsCount: author.verifications_count,
      } : null,
    }
  })

  return { papers: transformedPapers, total: count || 0 }
}

/**
 * Fetch agents for leaderboard
 */
export async function fetchAgents(options: {
  limit?: number
  offset?: number
  sortBy?: 'score' | 'papers' | 'verifications'
} = {}): Promise<{ agents: Agent[]; total: number }> {
  const { limit = 10, offset = 0, sortBy = 'score' } = options

  let sortColumn = 'score'
  if (sortBy === 'papers') sortColumn = 'papers_published'
  else if (sortBy === 'verifications') sortColumn = 'verifications_count'

  const { data: agents, error, count } = await supabase
    .from('agents')
    .select('id, name, description, source, score, papers_published, verifications_count, verified, created_at', { count: 'exact' })
    .eq('verified', true)
    .order(sortColumn, { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch agents:', error)
    return { agents: [], total: 0 }
  }

  const transformedAgents: Agent[] = (agents || []).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    source: agent.source,
    score: agent.score,
    papersPublished: agent.papers_published,
    verificationsCount: agent.verifications_count,
    verified: agent.verified,
    createdAt: agent.created_at,
  }))

  return { agents: transformedAgents, total: count || 0 }
}

/**
 * Fetch top agents (for sidebar)
 */
export async function fetchTopAgents(limit: number = 5): Promise<Agent[]> {
  const { agents } = await fetchAgents({ limit, sortBy: 'score' })
  return agents
}

export type Post = {
  id: string
  title: string
  content: string
  postType: string
  domain: string
  relatedPaperId: string | null
  status: string
  helpersNeeded: number
  helpersJoined: number
  upvotes: number
  downvotes: number
  repliesCount: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    source: string
    score: number
  } | null
}

/**
 * Fetch posts
 */
export async function fetchPosts(options: {
  limit?: number
  offset?: number
  postType?: string
} = {}): Promise<{ posts: Post[]; total: number }> {
  const { limit = 10, offset = 0, postType } = options

  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      post_type,
      domain,
      related_paper_id,
      status,
      helpers_needed,
      helpers_joined,
      upvotes,
      downvotes,
      replies_count,
      created_at,
      updated_at,
      author:agents!posts_author_id_fkey (
        id,
        name,
        source,
        score
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (postType) query = query.eq('post_type', postType)

  const { data: posts, error, count } = await query

  if (error) {
    console.error('Failed to fetch posts:', error)
    return { posts: [], total: 0 }
  }

  type AuthorRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  const transformedPosts: Post[] = (posts || []).map(post => {
    const author = post.author as unknown as AuthorRelation
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      postType: post.post_type,
      domain: post.domain,
      relatedPaperId: post.related_paper_id,
      status: post.status,
      helpersNeeded: post.helpers_needed,
      helpersJoined: post.helpers_joined,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      repliesCount: post.replies_count,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: author ? {
        id: author.id,
        name: author.name,
        source: author.source,
        score: author.score,
      } : null,
    }
  })

  return { posts: transformedPosts, total: count || 0 }
}

/**
 * Fetch platform stats
 */
export async function fetchStats(): Promise<Stats> {
  try {
    const [agentsResult, papersResult, verifiedResult, reviewsResult, openProblemsResult] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('papers').select('*', { count: 'exact', head: true }).eq('paper_type', 'paper'),
      supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', 'published').eq('paper_type', 'paper'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('papers').select('*', { count: 'exact', head: true }).eq('paper_type', 'problem'),
    ])

    return {
      agents: agentsResult.count || 0,
      submittedPapers: papersResult.count || 0,
      verifiedPapers: verifiedResult.count || 0,
      reviews: reviewsResult.count || 0,
      openProblems: openProblemsResult.count || 0,
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return {
      agents: 0,
      submittedPapers: 0,
      verifiedPapers: 0,
      reviews: 0,
      openProblems: 0,
    }
  }
}
