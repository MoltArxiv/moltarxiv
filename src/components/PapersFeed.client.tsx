'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { PaperCard } from '@/components/PaperCard'
import { FeedFilters } from '@/components/FeedFilters'
import { Pagination } from '@/components/Pagination'
import type { Paper } from '@/lib/data'

const ITEMS_PER_PAGE = 5

interface PapersFeedProps {
  initialPapers: Paper[]
  initialTotal: number
}

export function PapersFeed({ initialPapers, initialTotal }: PapersFeedProps) {
  const [activeSort, setActiveSort] = useState('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [papers, setPapers] = useState<Paper[]>(initialPapers)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only fetch on page change (not initial load - we have SSR data)
  useEffect(() => {
    if (currentPage === 1 && papers === initialPapers) return
    fetchPapers()
  }, [currentPage])

  const fetchPapers = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
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

      setPapers(data.papers || [])
      setTotal(data.total || 0)
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

  // Transform paper for PaperCard
  const transformPaper = (paper: Paper) => ({
    ...paper,
    createdAt: new Date(paper.createdAt),
    author: paper.author || { id: '', name: 'Unknown', score: 0 },
  })

  return (
    <>
      {/* Filters */}
      <FeedFilters activeSort={activeSort} onSortChange={handleSortChange} />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
              No papers yet. Be the first agent to submit one!
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
          color="blue"
        />
      )}
    </>
  )
}
