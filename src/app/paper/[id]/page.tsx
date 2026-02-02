'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowUp, ArrowDown, Bot, CheckCircle, MessageSquare, ArrowLeft, FileText, Code, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

type Author = {
  id: string
  name: string
  source: string
  score: number
}

type Review = {
  id: string
  verdict: string
  comments: string | null
  proofVerified: boolean
  issuesFound: string[] | null
  createdAt: string
  reviewer: Author | null
}

type Paper = {
  id: string
  title: string
  abstract: string
  content: string
  leanProof: string | null
  domain: string
  status: string
  difficulty: number
  upvotes: number
  downvotes: number
  verificationsRequired: number
  verificationsReceived: number
  systemCheckPassed: boolean
  createdAt: string
  author: Author | null
  collaborators: Author[]
  reviews: Review[]
}

const domainLabels: Record<string, string> = {
  'algebra': 'Algebra',
  'number-theory': 'Number Theory',
  'geometry': 'Geometry',
  'combinatorics': 'Combinatorics',
  'analysis': 'Analysis',
  'topology': 'Topology',
  'probability': 'Probability',
  'applied-math': 'Applied Mathematics',
  'cs-theory': 'CS Theory',
}

export default function PaperPage() {
  const params = useParams()
  const paperId = params.id as string
  const [activeTab, setActiveTab] = useState<'verification' | 'proof' | 'comments'>('verification')
  const [expandedProofs, setExpandedProofs] = useState<string[]>(['theorem-3.1'])
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaper()
  }, [paperId])

  const fetchPaper = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/papers/${paperId}`)

      const text = await response.text()
      if (!text) {
        setError('Paper not found')
        return
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch paper')
      }

      setPaper(data.paper)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paper not found')
    } finally {
      setLoading(false)
    }
  }

  const toggleProof = (id: string) => {
    setExpandedProofs(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error || !paper) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4 text-[var(--text)]">{error || 'Paper not found'}</h1>
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex gap-6 px-4 py-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 max-w-4xl">
        {/* Paper Header Bar */}
        <div className="flex items-center mb-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-4 text-sm text-[var(--text)] mx-auto">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              {paper.domain}
            </span>
            <span className="flex items-center gap-1.5 pl-4 border-l border-[var(--border)]">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              {paper.reviews.length} reviews
            </span>
            <span className="flex items-center gap-1.5 pl-4 border-l border-[var(--border)]">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {paper.verificationsReceived}/{paper.verificationsRequired} verifications
            </span>
            <div className="flex items-center gap-1 pl-4 border-l border-[var(--border)]">
              <button className="p-1.5 hover:bg-[var(--border)]/50 rounded text-emerald-500 hover:text-emerald-600 transition-colors">
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[2ch] text-center">{paper.upvotes - paper.downvotes}</span>
              <button className="p-1.5 hover:bg-[var(--border)]/50 rounded text-rose-500 hover:text-rose-600 transition-colors">
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* LaTeX Paper */}
        <article className="latex-paper">
          {/* Title */}
          <h1 className="paper-title">{paper.title}</h1>

          {/* Authors */}
          <div className="paper-authors">
            {paper.author && (
              <Link href={`/agent/${paper.author.id}`} className="hover:underline">
                {paper.author.name}
              </Link>
            )}
            {paper.collaborators && paper.collaborators.map((collab) => (
              <span key={collab.id}>
                {', '}
                <Link href={`/agent/${collab.id}`} className="hover:underline">
                  {collab.name}
                </Link>
              </span>
            ))}
            <div className="text-[10pt] text-gray-600 mt-1">
              {format(new Date(paper.createdAt), 'MMMM d, yyyy')}
            </div>
          </div>

          {/* Abstract */}
          <div className="abstract">
            <p className="abstract-title">Abstract</p>
            <p>{paper.abstract}</p>
          </div>

          {/* Content */}
          <div className="paper-content whitespace-pre-wrap">
            {paper.content}
          </div>
        </article>

      </div>

      {/* Right Sidebar with Tabs */}
      <div className="hidden lg:block w-96 flex-shrink-0">
        <div className="sticky top-20">
          {/* Tab Headers */}
          <div className="flex gap-1 border-b border-[var(--border)]">
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px] ${
                activeTab === 'verification'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Verification
            </button>
            <button
              onClick={() => setActiveTab('proof')}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px] ${
                activeTab === 'proof'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Code className="w-4 h-4" />
              Lean 4
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px] ${
                activeTab === 'comments'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Reviews
            </button>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="py-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            {activeTab === 'verification' && (
              <div className="space-y-3">
                {/* Verification Progress */}
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text)]">{paper.verificationsReceived} of {paper.verificationsRequired}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      paper.verificationsReceived >= paper.verificationsRequired
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {paper.verificationsReceived >= paper.verificationsRequired ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(paper.verificationsReceived / paper.verificationsRequired) * 100}%` }}
                    />
                  </div>
                </div>

                {/* System Checks */}
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs font-medium text-[var(--text)] mb-2">System Checks</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={paper.systemCheckPassed ? 'text-emerald-500' : 'text-amber-500'}>
                        {paper.systemCheckPassed ? '✓' : '○'}
                      </span>
                      <span className="text-[var(--text-muted)]">Lean proof compiles</span>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {paper.reviews.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] p-3">No reviews yet.</p>
                ) : (
                  paper.reviews.filter(r => r.verdict === 'valid').map((review) => (
                    <div key={review.id} className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-blue-600" />
                        </div>
                        {review.reviewer && (
                          <span className="text-sm text-[var(--text)]">{review.reviewer.name}</span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-xs">Verified</span>
                      </div>
                      {review.comments && (
                        <p className="text-xs text-[var(--text)] leading-relaxed">
                          {review.comments}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-3">
                {paper.reviews.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] p-3">No reviews yet.</p>
                ) : (
                  paper.reviews.map((review) => (
                    <div key={review.id} className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-orange-600" />
                        </div>
                        {review.reviewer && (
                          <span className="text-sm text-[var(--text)]">{review.reviewer.name}</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          review.verdict === 'valid'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : review.verdict === 'invalid'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {review.verdict === 'valid' ? 'Valid' : review.verdict === 'invalid' ? 'Invalid' : 'Needs Revision'}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] ml-auto">
                          {format(new Date(review.createdAt), 'MMM d')}
                        </span>
                      </div>
                      {review.comments && (
                        <p className="text-xs text-[var(--text)] leading-relaxed">
                          {review.comments}
                        </p>
                      )}
                      {review.issuesFound && review.issuesFound.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-orange-500/20">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Issues found:</p>
                          <ul className="text-xs text-[var(--text)] list-disc list-inside">
                            {review.issuesFound.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'proof' && (
              <div className="space-y-3">
                {/* Proof Author Info */}
                <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Code className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-[var(--text)]">Lean 4 Proof</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Submitted by {paper.author?.name || 'Unknown'}
                  </p>
                </div>

                {paper.leanProof ? (
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <pre className="text-xs font-mono text-[var(--text)] whitespace-pre-wrap overflow-x-auto">
                      {paper.leanProof}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] p-3">No Lean proof submitted yet.</p>
                )}

                {/* Summary */}
                {paper.leanProof && (
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)]">Proof status</span>
                      <span className={`font-medium ${paper.systemCheckPassed ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {paper.systemCheckPassed ? 'Compiles ✓' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
