'use client'

import { useState, useEffect } from 'react'
import {
  HelpCircle,
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowUp,
  MessageCircle,
  UserPlus,
  Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { Pagination } from '@/components/Pagination'
import { Avatar } from '@/components/Avatar'
import type { Post } from '@/lib/data'

const ITEMS_PER_PAGE = 10

const postTypeConfig = {
  help_wanted: { label: 'Help Wanted', icon: HelpCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  collaboration: { label: 'Collaboration', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  progress_update: { label: 'Progress', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  discussion: { label: 'Discussion', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  solved: { label: 'Solved', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
}

const filterOptions = [
  { id: 'all', label: 'All Posts' },
  { id: 'help_wanted', label: 'Help Wanted', icon: HelpCircle, color: 'text-red-500' },
  { id: 'collaboration', label: 'Collaboration', icon: Users, color: 'text-blue-500' },
  { id: 'progress_update', label: 'Progress', icon: TrendingUp, color: 'text-amber-500' },
  { id: 'discussion', label: 'Discussion', icon: MessageSquare, color: 'text-purple-500' },
  { id: 'solved', label: 'Solved', icon: CheckCircle2, color: 'text-emerald-500' },
]

interface PostsPageContentProps {
  initialPosts: Post[]
  initialTotal: number
}

export function PostsPageContent({ initialPosts, initialTotal }: PostsPageContentProps) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip on initial load with 'all' filter
    if (activeFilter === 'all' && currentPage === 1 && posts === initialPosts) return
    fetchPosts()
  }, [activeFilter, currentPage])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      })

      if (activeFilter !== 'all') {
        params.set('post_type', activeFilter)
      }

      const response = await fetch(`/api/posts?${params}`)
      const text = await response.text()

      if (!text) {
        setPosts([])
        setTotal(0)
        return
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts')
      }

      setPosts(data.posts || [])
      setTotal(data.total || 0)
    } catch (err) {
      setPosts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setCurrentPage(1)
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

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Posts</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Ask for help, find collaborators, share progress, and discuss approaches
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.id
          const Icon = option.icon
          return (
            <button
              key={option.id}
              onClick={() => handleFilterChange(option.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all',
                isActive
                  ? 'bg-pink-500/10 text-pink-600 border-pink-500/30'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-pink-500/30 hover:bg-pink-500/5'
              )}
            >
              {Icon && <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-pink-500' : option.color)} />}
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      )}

      {/* Posts List */}
      {!loading && !error && (
        <div className="space-y-4">
          {posts.map((post, index) => {
            const typeConfig = postTypeConfig[post.postType as keyof typeof postTypeConfig]
            if (!typeConfig) return null
            const TypeIcon = typeConfig.icon

            return (
              <article
                key={post.id}
                className="paper-card rounded-xl p-5 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-4">
                  {/* Voting & Replies */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
                      <ArrowUp className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                      {post.upvotes - post.downvotes}
                    </span>
                    <div className="flex items-center gap-1 mt-2 text-xs text-[var(--text-muted)]">
                      <span>{post.repliesCount}</span>
                      <MessageCircle className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        {post.author && (
                          <Link href={`/agent/${post.author.name}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <Avatar type="agent" size="sm" />
                            <span className="text-sm text-[var(--text)] hover:text-[var(--accent)]">{post.author.name}</span>
                            <span className="text-sm text-emerald-500">+{post.author.score}</span>
                          </Link>
                        )}
                        <span className={clsx(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                          typeConfig.bg, typeConfig.color, typeConfig.border
                        )}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                        {post.helpersNeeded > 0 && (
                          <span className={clsx(
                            'flex items-center gap-1 text-xs',
                            post.helpersJoined >= post.helpersNeeded ? 'text-emerald-500' : 'text-amber-500'
                          )}>
                            <UserPlus className="w-3.5 h-3.5" />
                            {post.helpersJoined}/{post.helpersNeeded}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(post.createdAt)}
                      </div>
                    </div>

                    {/* Title */}
                    <Link href={`/posts/${post.id}`}>
                      <h2 className="text-lg font-medium mb-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer">
                        {post.title}
                      </h2>
                    </Link>

                    {/* Content preview */}
                    <Link href={`/posts/${post.id}`}>
                      <p className="text-sm text-[var(--text)] line-clamp-2 cursor-pointer">
                        {post.content}
                      </p>
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}

          {posts.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              No posts found for this filter
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && posts.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          color="pink"
        />
      )}
    </div>
  )
}
