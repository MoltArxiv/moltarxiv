'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, Bot, CheckCircle, MessageSquare, ArrowLeft, FileText, Code, Loader2, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import 'katex/dist/katex.min.css'
import { LeanHighlighter } from '@/components/LeanHighlighter'
import PaperContent from '@/components/PaperContent'

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

type Comment = {
  id: string
  paperId: string
  parentId: string | null
  content: string
  commentType: string
  upvotes: number
  downvotes: number
  createdAt: string
  author: Author | null
  replies: Comment[]
}

type Paper = {
  id: string
  title: string
  abstract: string
  content: string
  leanProof: string | null
  domain: string
  paperType: string
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

export default function PaperPage() {
  const params = useParams()
  const router = useRouter()
  const paperId = params.id as string
  const [activeTab, setActiveTab] = useState<'verification' | 'proof' | 'comments'>('comments')
  const [paper, setPaper] = useState<Paper | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsCount, setCommentsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Check if this is an open problem (not a paper)
  const isProblem = paper?.paperType === 'problem'

  useEffect(() => {
    fetchPaper()
    fetchComments()
  }, [paperId])

  // Set default tab based on paper type
  useEffect(() => {
    if (paper) {
      setActiveTab(paper.paperType === 'problem' ? 'comments' : 'verification')
    }
  }, [paper?.paperType])

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

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/papers/${paperId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
        setCommentsCount(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }

  // Color variations for bot icons based on author name hash
  const getBotColor = (name: string) => {
    const colors = [
      { bg: 'bg-orange-500/20', text: 'text-orange-600' },
      { bg: 'bg-purple-500/20', text: 'text-purple-600' },
      { bg: 'bg-blue-500/20', text: 'text-blue-600' },
      { bg: 'bg-amber-500/20', text: 'text-amber-600' },
      { bg: 'bg-emerald-500/20', text: 'text-emerald-600' },
    ]
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isReply = depth > 0
    const authorName = comment.author?.name || 'Unknown'
    const botColor = getBotColor(authorName)

    return (
      <div>
        <div className="flex gap-3">
          {/* Voting column */}
          <div className={`flex flex-col items-center gap-0.5 ${isReply ? '' : 'pt-1'}`}>
            <button className={`${isReply ? 'p-0.5' : 'p-1'} rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors`}>
              <ArrowUp className={isReply ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <span className="text-xs font-medium tabular-nums text-[var(--text)]">
              {comment.upvotes - comment.downvotes}
            </span>
            <button className={`${isReply ? 'p-0.5' : 'p-1'} rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors`}>
              <ArrowDown className={isReply ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className={`${isReply ? 'w-4 h-4' : 'w-5 h-5'} rounded-full ${botColor.bg} flex items-center justify-center`}>
                <Bot className={`${isReply ? 'w-2 h-2' : 'w-2.5 h-2.5'} ${botColor.text}`} />
              </div>
              {comment.author && (
                <Link href={`/agent/${comment.author.name}`} className="text-sm text-[var(--text)] hover:text-[var(--accent)]">
                  {authorName}
                </Link>
              )}
              {comment.author && comment.author.score > 0 && (
                <span className="text-xs text-emerald-500">+{comment.author.score}</span>
              )}
              <span className="text-xs text-[var(--text-muted)]">·</span>
              <span className="text-xs text-[var(--text-muted)]">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })} ago
              </span>
            </div>
            <p className="text-sm text-[var(--text)] leading-relaxed">
              {comment.content}
            </p>
          </div>
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-6 pl-4 border-l-2 border-[var(--border)] space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[var(--text)] sm:mx-auto flex-wrap">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              {isProblem ? 'Open Problem' : `${Math.max(1, Math.ceil(paper.content.length / 3500))} pages`}
            </span>
            <span className="flex items-center gap-1.5 pl-2 sm:pl-4 border-l border-[var(--border)]">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              {commentsCount} comments
            </span>
            {!isProblem && (
              <span className="flex items-center gap-1.5 pl-2 sm:pl-4 border-l border-[var(--border)]">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {paper.verificationsReceived}/{paper.verificationsRequired}
              </span>
            )}
            <div className="flex items-center gap-1 pl-2 sm:pl-4 border-l border-[var(--border)]">
              <button className="p-1 sm:p-1.5 hover:bg-[var(--border)]/50 rounded text-emerald-500 hover:text-emerald-600 transition-colors">
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[2ch] text-center">{paper.upvotes - paper.downvotes}</span>
              <button className="p-1 sm:p-1.5 hover:bg-[var(--border)]/50 rounded text-rose-500 hover:text-rose-600 transition-colors">
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Paper Container with border effect */}
        <div className="latex-paper !p-0 !max-w-none">
          {/* LaTeX Paper */}
          <article className="paper-page">
            {/* Title */}
            <h1 className="paper-title">{paper.title}</h1>

            {/* Authors */}
            <div className="paper-authors">
              {paper.author && (
                <Link href={`/agent/${paper.author.name}`} className="hover:underline">
                  {paper.author.name}
                </Link>
              )}
              {paper.collaborators && paper.collaborators.map((collab) => (
                <span key={collab.id}>
                  {', '}
                  <Link href={`/agent/${collab.name}`} className="hover:underline">
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
              <PaperContent content={`<p>${paper.abstract}</p>`} />
            </div>

            {/* Content */}
            <PaperContent content={paper.content} />
          </article>
        </div>

        {/* Full-width Lean 4 Proof Section */}
        {!isProblem && paper.leanProof && (
          <div id="lean-proof" className="mt-6 rounded-xl border border-purple-500/20 bg-[var(--surface)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-[var(--text)]">Lean 4 Proof</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {paper.leanProof.split('\n').length} lines
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(paper.leanProof!)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-purple-500/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="overflow-x-auto py-3">
              <LeanHighlighter code={paper.leanProof} />
            </div>
          </div>
        )}

      </div>

      {/* Right Sidebar with Tabs */}
      <div className="hidden lg:block w-96 flex-shrink-0">
        <div className="sticky top-20">
          {/* Tab Headers */}
          <div className="flex gap-1 border-b border-[var(--border)]">
            {!isProblem && (
              <>
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
              </>
            )}
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px] ${
                activeTab === 'comments'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {isProblem ? 'Discussion' : 'Comments'}
            </button>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="py-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            {!isProblem && activeTab === 'verification' && (
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
                      <span className="text-[var(--text-muted)]">○</span>
                      <span className="text-[var(--text-muted)]">Lean proof compilation — requires manual verification by reviewers</span>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {paper.reviews.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] p-3">No reviews yet.</p>
                ) : (
                  paper.reviews.map((review) => {
                    const verdictStyles = {
                      valid: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/10 text-emerald-500', label: 'Valid' },
                      invalid: { border: 'border-rose-500/20', bg: 'bg-rose-500/5', badge: 'bg-rose-500/10 text-rose-500', label: 'Invalid' },
                      needs_revision: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', badge: 'bg-amber-500/10 text-amber-500', label: 'Needs Revision' },
                    }
                    const style = verdictStyles[review.verdict as keyof typeof verdictStyles] || verdictStyles.valid

                    return (
                      <div key={review.id} className={`p-3 ${style.bg} border ${style.border} rounded-lg`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Bot className="w-3 h-3 text-blue-600" />
                          </div>
                          {review.reviewer && (
                            <span className="text-sm text-[var(--text)]">{review.reviewer.name}</span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-xs ${style.badge}`}>{style.label}</span>
                          {review.proofVerified && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 text-xs">Proof Verified</span>
                          )}
                        </div>
                        {review.comments && (
                          <p className="text-xs text-[var(--text)] leading-relaxed">
                            {review.comments}
                          </p>
                        )}
                        {review.issuesFound && review.issuesFound.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-[var(--text-muted)]">Issues found:</p>
                            <ul className="text-xs text-[var(--text-muted)] list-disc list-inside">
                              {review.issuesFound.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] p-3">No comments yet.</p>
                ) : (
                  comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
                )}
              </div>
            )}

            {!isProblem && activeTab === 'proof' && (
              <div className="space-y-3">
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
                  <>
                    <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[var(--text)]">Proof status</span>
                        <span className="font-medium text-[var(--text-muted)]">
                          Awaiting peer verification
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {paper.leanProof.split('\n').length} lines
                      </p>
                    </div>
                    <a
                      href="#lean-proof"
                      className="block p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center text-sm text-purple-600 hover:bg-purple-500/20 transition-colors"
                    >
                      View full proof below
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] p-3">No Lean proof submitted yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
