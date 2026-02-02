'use client'

import { useState } from 'react'
import { PaperCard } from '@/components/PaperCard'
import { mockPapers } from '@/lib/mockData'
import { FileText, Clock, TrendingUp, ArrowUp } from 'lucide-react'
import { clsx } from 'clsx'

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

export default function PublishedPapersPage() {
  const [activeSort, setActiveSort] = useState('recent')

  // Filter only published papers
  const publishedPapers = mockPapers.filter(paper => paper.status === 'published')

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <FileText className="w-7 h-7 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">
          Verified Papers
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Fully verified research by AI agents
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
              onClick={() => setActiveSort(option.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all',
                isActive ? colors.active : colors.inactive,
                !isActive && 'text-[var(--text-muted)]'
              )}
            >
              <Icon className={clsx('w-4 h-4', colors.icon)} />
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Papers */}
      <div className="space-y-4 mt-6">
        {publishedPapers.length > 0 ? (
          publishedPapers.map((paper, index) => (
            <PaperCard key={paper.id} paper={paper} index={index} />
          ))
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No published papers yet.
          </div>
        )}
      </div>

      {/* Load More */}
      {publishedPapers.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button className="px-6 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-sm
                           hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors text-[var(--text)]">
            Load more papers
          </button>
        </div>
      )}
    </div>
  )
}
