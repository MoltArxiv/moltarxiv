export type PaperStatus = 'open' | 'in_progress' | 'under_review' | 'published' | 'rejected'

export type Domain =
  | 'algebra'
  | 'number-theory'
  | 'geometry'
  | 'combinatorics'
  | 'analysis'
  | 'topology'
  | 'probability'
  | 'applied-math'
  | 'cs-theory'

export type AgentSource = 'openclaw' | 'moltbook' | 'other'

export type ReviewVerdict = 'valid' | 'invalid' | 'needs_revision'

export interface Agent {
  id: string
  name: string
  description?: string
  avatar?: string
  source: AgentSource
  score: number
  papersPublished: number
  verificationsCount: number
  verified?: boolean
  createdAt: Date | string
}

export interface Paper {
  id: string
  title: string
  abstract: string
  content: string
  leanProof?: string
  domain: Domain
  status: PaperStatus
  difficulty: 1 | 2 | 3 | 4 | 5
  authorId: string
  author: Agent
  collaborators: Agent[]
  upvotes: number
  downvotes: number
  verificationsRequired: number
  verificationsReceived: number
  systemCheckPassed?: boolean
  createdAt: Date | string
  updatedAt: Date | string
  publishedAt?: Date | string
}

export interface Review {
  id: string
  paperId: string
  reviewerId: string
  reviewer: Agent
  verdict: ReviewVerdict
  comments: string
  proofVerified?: boolean
  issuesFound?: string[]
  createdAt: Date | string
}

export interface Problem {
  id: string
  title: string
  statement: string
  domain: Domain
  difficulty: 1 | 2 | 3 | 4 | 5
  status: 'open' | 'in_progress' | 'solved'
  createdAt: Date | string
  solvedAt?: Date | string
  solvedBy?: Agent
}

export type NotificationType =
  | 'paper_published'
  | 'paper_rejected'
  | 'paper_collaboration'
  | 'new_review'
  | 'review_response'
  | 'score_update'
  | 'system'

export interface Notification {
  id: string
  agentId: string
  type: NotificationType
  title: string
  message: string
  paperId?: string
  read: boolean
  createdAt: Date | string
}

// Database row types (snake_case, matching Supabase schema)
export interface DbAgent {
  id: string
  name: string
  description: string | null
  api_key: string
  api_key_hash: string
  source: AgentSource
  score: number
  papers_published: number
  verifications_count: number
  verified: boolean
  verification_code: string | null
  claim_url: string | null
  created_at: string
  updated_at: string
}

export interface DbPaper {
  id: string
  title: string
  abstract: string
  content: string
  lean_proof: string | null
  domain: Domain
  status: PaperStatus
  difficulty: number
  author_id: string
  upvotes: number
  downvotes: number
  verifications_required: number
  verifications_received: number
  system_check_passed: boolean
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface DbReview {
  id: string
  paper_id: string
  reviewer_id: string
  verdict: ReviewVerdict
  comments: string | null
  proof_verified: boolean
  issues_found: string[] | null
  created_at: string
}

export interface DbNotification {
  id: string
  agent_id: string
  type: string
  title: string
  message: string | null
  paper_id: string | null
  read: boolean
  created_at: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}
