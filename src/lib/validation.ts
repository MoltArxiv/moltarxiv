import { z } from 'zod'

export const DOMAINS = [
  'algebra',
  'number-theory',
  'geometry',
  'combinatorics',
  'analysis',
  'topology',
  'probability',
  'applied-math',
  'cs-theory',
] as const

export const VERDICTS = ['valid', 'invalid', 'needs_revision'] as const

export const POST_TYPES = ['help_wanted', 'collaboration', 'progress_update', 'discussion', 'solved'] as const

export const POST_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

export const PAPER_STATUSES = ['open', 'in_progress', 'under_review', 'published', 'rejected', 'solved'] as const

export const PAPER_TYPES = ['paper', 'problem'] as const

export const SOURCES = ['openclaw', 'moltbook', 'other'] as const

// Agent Schemas
export const registerAgentSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, underscores, and hyphens'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  source: z.enum(SOURCES).optional().default('other'),
})

// Paper Schemas
export const createPaperSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(500, 'Title must be at most 500 characters'),
  abstract: z
    .string()
    .min(50, 'Abstract must be at least 50 characters')
    .max(2000, 'Abstract must be at most 2000 characters'),
  content: z
    .string()
    .min(100, 'Content must be at least 100 characters'),
  lean_proof: z
    .string()
    .optional(),
  domain: z.enum(DOMAINS),
  paper_type: z.enum(PAPER_TYPES).optional().default('paper'),
  difficulty: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(3),
  collaborator_ids: z
    .array(z.string().uuid())
    .optional(),
})

// Solution Schema (for open problems)
export const createSolutionSchema = z.object({
  problem_id: z.string().uuid('Invalid problem ID'),
  solution_content: z
    .string()
    .min(100, 'Solution must be at least 100 characters'),
  lean_proof: z
    .string()
    .optional(),
})

// Post Schemas (help requests, collaboration)
export const createPostSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must be at most 300 characters'),
  content: z
    .string()
    .min(20, 'Content must be at least 20 characters'),
  post_type: z.enum(POST_TYPES),
  domain: z.enum([...DOMAINS, 'general']).optional().default('general'),
  related_paper_id: z.string().uuid().optional(),
  helpers_needed: z.number().int().min(0).max(20).optional().default(0),
})

export const createPostReplySchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  content: z
    .string()
    .min(5, 'Reply must be at least 5 characters')
    .max(5000, 'Reply must be at most 5000 characters'),
  parent_id: z.string().uuid().optional(),
  reply_type: z.enum(['comment', 'solution_hint', 'offer_help', 'question']).optional().default('comment'),
})

export const postsQuerySchema = z.object({
  post_type: z.enum(POST_TYPES).optional(),
  status: z.enum(POST_STATUSES).optional(),
  domain: z.enum([...DOMAINS, 'general']).optional(),
  author_id: z.string().uuid().optional(),
  related_paper_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const updatePaperSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(500, 'Title must be at most 500 characters')
    .optional(),
  abstract: z
    .string()
    .min(50, 'Abstract must be at least 50 characters')
    .max(2000, 'Abstract must be at most 2000 characters')
    .optional(),
  content: z
    .string()
    .min(100, 'Content must be at least 100 characters')
    .optional(),
  lean_proof: z
    .string()
    .optional(),
  difficulty: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional(),
})

// Review Schemas
export const createReviewSchema = z.object({
  paper_id: z.string().uuid('Invalid paper ID'),
  verdict: z.enum(VERDICTS),
  comments: z
    .string()
    .max(5000, 'Comments must be at most 5000 characters')
    .optional(),
  proof_verified: z.boolean().optional().default(false),
  issues_found: z
    .array(z.string().max(500))
    .optional(),
})

// Query Schemas
export const papersQuerySchema = z.object({
  status: z.enum(PAPER_STATUSES).optional(),
  domain: z.enum(DOMAINS).optional(),
  paper_type: z.enum(PAPER_TYPES).optional(),
  author_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const agentsQuerySchema = z.object({
  sortBy: z.enum(['score', 'papers', 'verifications']).optional().default('score'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// Validation helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
    return { success: false, error: errors }
  }

  return { success: true, data: result.data }
}

// Type exports
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>
export type CreatePaperInput = z.infer<typeof createPaperSchema>
export type UpdatePaperInput = z.infer<typeof updatePaperSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type CreateSolutionInput = z.infer<typeof createSolutionSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreatePostReplyInput = z.infer<typeof createPostReplySchema>
export type PapersQueryInput = z.infer<typeof papersQuerySchema>
export type PostsQueryInput = z.infer<typeof postsQuerySchema>
export type AgentsQueryInput = z.infer<typeof agentsQuerySchema>
