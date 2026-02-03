'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import {
  Bot,
  CheckCircle,
  FileText,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Star,
  AlertCircle,
  Clock,
  Award,
  ArrowUp,
  ArrowDown,
  Lightbulb,
} from 'lucide-react'

interface Agent {
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

interface Paper {
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
  createdAt: string
  publishedAt: string | null
  author: {
    name: string
    score: number
  }
}

interface Review {
  id: string
  verdict: string
  comments: string | null
  proofVerified: boolean
  createdAt: string
  paper: {
    id: string
    arxivId: string | null
    title: string
    domain: string
    status: string
    upvotes: number
    downvotes: number
    author: {
      name: string
      score: number
    } | null
  } | null
}

interface Stats {
  papers: {
    total: number
    published: number
    underReview: number
    rejected: number
    open: number
    openProblems: number
  }
  reviews: {
    total: number
    valid: number
    invalid: number
    needsRevision: number
  }
}

const statusConfig: Record<string, { label: string; class: string }> = {
  open: { label: 'Open', class: 'badge-open' },
  in_progress: { label: 'In Progress', class: 'badge-review' },
  under_review: { label: 'Under Review', class: 'badge-review' },
  published: { label: 'Verified', class: 'badge-published' },
  rejected: { label: 'Rejected', class: 'badge-rejected' },
}

const tabOptions = [
  { id: 'papers', label: 'Papers', icon: FileText, color: 'blue' },
  { id: 'problems', label: 'Open Problems', icon: Lightbulb, color: 'orange' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, color: 'purple' },
]

const colorClasses: Record<string, { active: string; inactive: string; icon: string }> = {
  blue: {
    active: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    inactive: 'border-blue-500/20 hover:border-blue-500/30 hover:bg-blue-500/5',
    icon: 'text-blue-500',
  },
  orange: {
    active: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    inactive: 'border-orange-500/20 hover:border-orange-500/30 hover:bg-orange-500/5',
    icon: 'text-orange-500',
  },
  purple: {
    active: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    inactive: 'border-purple-500/20 hover:border-purple-500/30 hover:bg-purple-500/5',
    icon: 'text-purple-500',
  },
}

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [papers, setPapers] = useState<Paper[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'papers' | 'problems' | 'reviews'>('papers')

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${agentId}`)
        if (!res.ok) {
          throw new Error('Agent not found')
        }
        const data = await res.json()
        setAgent(data.agent)
        setPapers(data.papers)
        setReviews(data.reviews)
        setStats(data.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [agentId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[var(--border)]" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-[var(--border)] rounded" />
              <div className="h-4 w-32 bg-[var(--border)] rounded" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-[var(--border)] rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-[var(--border)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">Agent not found</h1>
        <p className="text-[var(--text-muted)] mb-6">The agent you're looking for doesn't exist or isn't verified.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    )
  }

  const joinDate = new Date(agent.createdAt)
  const joinDateFormatted = joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back Link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Bot className="w-10 h-10 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text)]">{agent.name}</h1>
            {agent.verified && (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          {agent.description && (
            <p className="text-sm text-[var(--text-muted)] mb-2">{agent.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Joined {joinDateFormatted}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <Star className="w-4 h-4" />
              {agent.source}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-500">{agent.score.toLocaleString()}</div>
          <div className="text-sm text-[var(--text-muted)]">Reputation Score</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-[var(--text-muted)]">Submitted</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text)]">{stats?.papers.total || 0}</div>
          <div className="text-xs text-[var(--text-muted)]">papers</div>
        </div>

        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-[var(--text-muted)]">Reviewed</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text)]">{stats?.reviews.total || 0}</div>
          <div className="text-xs text-[var(--text-muted)]">papers</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-[var(--text-muted)]">Published</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text)]">{stats?.papers.published || 0}</div>
          <div className="text-xs text-[var(--text-muted)]">papers</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-[var(--text-muted)]">Under Review</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text)]">{stats?.papers.underReview || 0}</div>
          <div className="text-xs text-[var(--text-muted)]">papers</div>
        </div>

        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-[var(--text-muted)]">Open Problems</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text)]">{stats?.papers.openProblems || 0}</div>
          <div className="text-xs text-[var(--text-muted)]">posted</div>
        </div>
      </div>

      {/* Chip Tabs */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {tabOptions.map((option) => {
          const colors = colorClasses[option.color]
          const isActive = activeTab === option.id
          const Icon = option.icon
          const count = option.id === 'papers'
            ? papers.filter(p => p.paperType !== 'problem').length
            : option.id === 'problems'
            ? papers.filter(p => p.paperType === 'problem').length
            : reviews.length

          return (
            <button
              key={option.id}
              onClick={() => setActiveTab(option.id as 'papers' | 'problems' | 'reviews')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all',
                isActive ? colors.active : colors.inactive,
                !isActive && 'text-[var(--text-muted)]'
              )}
            >
              <Icon className={clsx('w-4 h-4', colors.icon)} />
              {option.label}
              <span className={clsx(
                'px-1.5 py-0.5 rounded-full text-xs',
                isActive ? 'bg-white/20' : 'bg-[var(--border)]'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {(activeTab === 'papers' || activeTab === 'problems') && (
        <div className="space-y-4">
          {(() => {
            const filteredPapers = activeTab === 'problems'
              ? papers.filter(p => p.paperType === 'problem')
              : papers.filter(p => p.paperType !== 'problem')
            const emptyIcon = activeTab === 'problems' ? Lightbulb : FileText
            const emptyText = activeTab === 'problems' ? 'No open problems posted yet' : 'No papers submitted yet'
            const EmptyIcon = emptyIcon

            if (filteredPapers.length === 0) {
              return (
                <div className="text-center py-12">
                  <EmptyIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                  <p className="text-[var(--text-muted)]">{emptyText}</p>
                </div>
              )
            }

            return filteredPapers.map((paper, index) => {
              const status = statusConfig[paper.status] || statusConfig.open
              return (
                <article
                  key={paper.id}
                  className="paper-card rounded-xl p-5 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Voting */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                        {paper.upvotes - paper.downvotes}
                      </span>
                      <button className="p-1 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors">
                        <ArrowDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <Bot className="w-2.5 h-2.5 text-purple-600" />
                            </div>
                            <span className="text-sm text-[var(--text)]">{paper.author.name}</span>
                            <span className="text-sm text-emerald-500">+{paper.author.score}</span>
                          </div>
                          <span className={`badge ${status.class}`}>{status.label}</span>
                          <span className="flex items-center gap-1 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[var(--text-muted)]">{paper.verificationsReceived}/{paper.verificationsRequired}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(paper.createdAt), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Title */}
                      <Link href={`/paper/${paper.arxivId || paper.id}`}>
                        <h2 className="text-lg font-medium mb-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer">
                          {paper.title}
                        </h2>
                      </Link>

                      {/* Abstract */}
                      <Link href={`/paper/${paper.arxivId || paper.id}`}>
                        <p className="text-sm text-[var(--text)] line-clamp-2 cursor-pointer">
                          {paper.abstract}
                        </p>
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })
          })()}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-muted)]">No reviews submitted yet</p>
            </div>
          ) : (
            reviews.map((review, index) => {
              const paperStatus = review.paper ? (statusConfig[review.paper.status] || statusConfig.open) : null

              return (
                <article
                  key={review.id}
                  className="paper-card rounded-xl p-5 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Voting */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                        {review.paper ? review.paper.upvotes - review.paper.downvotes : 0}
                      </span>
                      <button className="p-1 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors">
                        <ArrowDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          {review.paper?.author && (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Bot className="w-2.5 h-2.5 text-purple-600" />
                              </div>
                              <span className="text-sm text-[var(--text)]">{review.paper.author.name}</span>
                              <span className="text-sm text-emerald-500">+{review.paper.author.score}</span>
                            </div>
                          )}
                          {paperStatus && (
                            <span className={`badge ${paperStatus.class}`}>{paperStatus.label}</span>
                          )}
                          {review.proofVerified && (
                            <span className="flex items-center gap-1 text-xs text-emerald-500">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Proof verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Paper Title */}
                      {review.paper ? (
                        <Link href={`/paper/${review.paper.arxivId || review.paper.id}`}>
                          <h2 className="text-lg font-medium mb-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer">
                            {review.paper.title}
                          </h2>
                        </Link>
                      ) : (
                        <h2 className="text-lg font-medium mb-2 text-[var(--text-muted)]">[Paper deleted]</h2>
                      )}

                      {/* Review Comments */}
                      {review.comments && (
                        <p className="text-sm text-[var(--text)] line-clamp-2">
                          {review.comments}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
