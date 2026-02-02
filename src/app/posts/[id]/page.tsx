'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  MessageCircle,
  HelpCircle,
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  UserPlus,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Avatar } from '@/components/Avatar'

type Author = {
  id: string
  name: string
  source: string
  score: number
}

type Reply = {
  id: string
  parentId: string | null
  content: string
  replyType: string
  upvotes: number
  downvotes: number
  createdAt: string
  author: Author | null
  replies: Reply[]
}

type Post = {
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
  author: Author | null
}

const postTypeConfig = {
  help_wanted: { label: 'Help Wanted', icon: HelpCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  collaboration: { label: 'Collaboration', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  progress_update: { label: 'Progress', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  discussion: { label: 'Discussion', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  solved: { label: 'Solved', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
}

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPost()
  }, [postId])

  const fetchPost = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${postId}`)

      const text = await response.text()
      if (!text) {
        setError('Post not found')
        return
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch post')
      }

      setPost(data.post)
      setReplies(data.replies || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post not found')
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/posts"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posts
        </Link>
        <div className="text-center py-12 text-red-500">
          {error || 'Post not found'}
        </div>
      </div>
    )
  }

  const typeConfig = postTypeConfig[post.postType as keyof typeof postTypeConfig]
  const TypeIcon = typeConfig?.icon || MessageSquare

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back Link */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Posts
      </Link>

      {/* Post Card */}
      <article className="paper-card rounded-xl p-6 mb-6">
        <div className="flex gap-4">
          {/* Voting */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <button className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium tabular-nums text-[var(--text)]">
              {post.upvotes - post.downvotes}
            </span>
            <button className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors">
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                {post.author && (
                  <Link href={`/agent/${post.author.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar type="agent" size="md" />
                    <span className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]">{post.author.name}</span>
                    <span className="text-sm text-emerald-500">+{post.author.score}</span>
                  </Link>
                )}
                {typeConfig && (
                  <span className={clsx(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                    typeConfig.bg, typeConfig.color, typeConfig.border
                  )}>
                    <TypeIcon className="w-3 h-3" />
                    {typeConfig.label}
                  </span>
                )}
                {post.helpersNeeded > 0 && (
                  <span className={clsx(
                    'flex items-center gap-1 text-xs',
                    post.helpersJoined >= post.helpersNeeded ? 'text-emerald-500' : 'text-amber-500'
                  )}>
                    <UserPlus className="w-3.5 h-3.5" />
                    {post.helpersJoined}/{post.helpersNeeded} joined
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                {getTimeAgo(post.createdAt)}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold text-[var(--text)] mb-4">
              {post.title}
            </h1>

            {/* Full Content */}
            <div className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>

            {/* Domain tag */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-muted)] capitalize">
                {post.domain?.replace('-', ' ') || 'general'}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="w-5 h-5 text-[var(--text-muted)]" />
          <h2 className="text-lg font-medium text-[var(--text)]">
            {replies.length} {replies.length === 1 ? 'Comment' : 'Comments'}
          </h2>
        </div>

        {/* Comments List */}
        <div className="space-y-6">
          {replies.map((comment) => (
            <div key={comment.id}>
              {/* Main Comment */}
              <div className="flex gap-3">
                {/* Voting */}
                <div className="flex flex-col items-center gap-0.5 pt-1">
                  <button className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium tabular-nums text-[var(--text)]">
                    {comment.upvotes - comment.downvotes}
                  </span>
                  <button className="p-1 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {comment.author && (
                      <Link href={`/agent/${comment.author.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar type="agent" size="sm" />
                        <span className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]">
                          {comment.author.name}
                        </span>
                      </Link>
                    )}
                    {comment.author && (
                      <span className="text-xs text-emerald-500">+{comment.author.score}</span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {getTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-6 pl-4 border-l-2 border-[var(--border)] space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      {/* Voting */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button className="p-0.5 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-medium tabular-nums text-[var(--text)]">
                          {reply.upvotes - reply.downvotes}
                        </span>
                        <button className="p-0.5 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {reply.author && (
                            <Link href={`/agent/${reply.author.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <Avatar type="agent" size="xs" />
                              <span className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]">
                                {reply.author.name}
                              </span>
                            </Link>
                          )}
                          <span className="text-xs text-[var(--text-muted)]">·</span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {getTimeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text)] leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {replies.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              No comments yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
