'use client'

import { useState, useEffect } from 'react'
import { PaperCard } from '@/components/PaperCard'
import { Send, Clock, TrendingUp, ArrowUp, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Pagination } from '@/components/Pagination'

const ITEMS_PER_PAGE = 5

type Author = {
  id: string
  name: string
  source: string
  score: number
}

type Paper = {
  id: string
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
  author: Author | null
}

const sortOptions = [
  { id: 'recent', label: 'Most Recent', icon: Clock, color: 'blue' },
  { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'orange' },
  { id: 'top', label: 'Top Voted', icon: ArrowUp, color: 'emerald' },
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
  emerald: {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    inactive: 'border-emerald-500/20 hover:border-emerald-500/30 hover:bg-emerald-500/5',
    icon: 'text-emerald-500',
  },
}

export default function SubmittedPapersPage() {
  const [activeSort, setActiveSort] = useState('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [papers, setPapers] = useState<Paper[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPapers()
  }, [currentPage])

  const fetchPapers = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all papers (open, in_progress, under_review) - excluding published/rejected
      // We'll filter out published/rejected client-side since API doesn't support OR status
      const params = new URLSearchParams({
        paper_type: 'paper',
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      })

      const response = await fetch(`/api/papers?${params}`)

      const text = await response.text()
      if (!text) {
        setPapers([])
        setTotal(0)
        return
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch papers')
      }

      // Filter to only show papers awaiting review (not published or rejected)
      const awaitingReview = (data.papers || []).filter(
        (p: Paper) => ['open', 'in_progress', 'under_review'].includes(p.status)
      )
      setPapers(awaitingReview)
      setTotal(awaitingReview.length)
    } catch (err) {
      setPapers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Sort papers client-side
  const sortedPapers = [...papers].sort((a, b) => {
    if (activeSort === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    if (activeSort === 'trending') {
      const aScore = (a.upvotes - a.downvotes) + (a.verificationsReceived * 10)
      const bScore = (b.upvotes - b.downvotes) + (b.verificationsReceived * 10)
      return bScore - aScore
    }
    if (activeSort === 'top') {
      return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
    }
    return 0
  })

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const handleSortChange = (sort: string) => {
    setActiveSort(sort)
  }

  // Transform API response to match PaperCard expected format
  const transformPaper = (paper: Paper) => ({
    ...paper,
    createdAt: new Date(paper.createdAt),
    author: paper.author || { id: '', name: 'Unknown', score: 0 },
  })

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Send className="w-7 h-7 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">
          Submitted Papers
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Papers awaiting verification and review
        </p>
      </div>

      {/* Sort Filters */}
      <div className="flex items-center justify-center gap-2 pb-4">
        {sortOptions.map((option) => {
          const colors = colorClasses[option.color]
          const isActive = activeSort === option.id
          const Icon = option.icon

          return (
            <button
              key={option.id}
              onClick={() => handleSortChange(option.id)}
              className={clsx(
                'chip-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm border',
                isActive ? colors.active : colors.inactive,
                isActive && 'active',
                !isActive && 'text-[var(--text-muted)]'
              )}
            >
              <Icon className={clsx('w-4 h-4 transition-transform duration-200', colors.icon, isActive && 'scale-110')} />
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      )}

      {/* Papers */}
      {!loading && !error && (
        <div key={`page-${currentPage}-${activeSort}`} className="space-y-4 mt-6">
          {sortedPapers.length > 0 ? (
            sortedPapers.map((paper, index) => (
              <PaperCard key={paper.id} paper={transformPaper(paper)} index={index} />
            ))
          ) : (
            <div className="text-center py-12 text-[var(--text-muted)]">
              No submitted papers awaiting review.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && sortedPapers.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          color="orange"
        />
      )}
    </div>
  )
}
