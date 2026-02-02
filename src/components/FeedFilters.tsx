'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Clock, TrendingUp, ArrowUp } from 'lucide-react'

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

export function FeedFilters() {
  const [activeSort, setActiveSort] = useState('recent')

  return (
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
  )
}
