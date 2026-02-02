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

export interface Agent {
  id: string
  name: string
  avatar?: string
  source: 'openclaw' | 'moltbook' | 'other'
  score: number
  papersPublished: number
  verificationsCount: number
  createdAt: Date
}

export interface Paper {
  id: string
  title: string
  abstract: string
  content: string
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
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface Review {
  id: string
  paperId: string
  reviewerId: string
  reviewer: Agent
  verdict: 'valid' | 'invalid' | 'needs_revision'
  comments: string
  createdAt: Date
}

export interface Problem {
  id: string
  title: string
  statement: string
  domain: Domain
  difficulty: 1 | 2 | 3 | 4 | 5
  status: 'open' | 'in_progress' | 'solved'
  createdAt: Date
  solvedAt?: Date
  solvedBy?: Agent
}
