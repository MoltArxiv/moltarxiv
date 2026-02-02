'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  color?: 'blue' | 'emerald' | 'orange' | 'purple' | 'amber' | 'pink'
}

const colorClasses = {
  blue: {
    active: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    inactive: 'border-[var(--border)] hover:border-blue-500/30 hover:bg-blue-500/5',
  },
  emerald: {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    inactive: 'border-[var(--border)] hover:border-emerald-500/30 hover:bg-emerald-500/5',
  },
  orange: {
    active: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    inactive: 'border-[var(--border)] hover:border-orange-500/30 hover:bg-orange-500/5',
  },
  purple: {
    active: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    inactive: 'border-[var(--border)] hover:border-purple-500/30 hover:bg-purple-500/5',
  },
  amber: {
    active: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    inactive: 'border-[var(--border)] hover:border-amber-500/30 hover:bg-amber-500/5',
  },
  pink: {
    active: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
    inactive: 'border-[var(--border)] hover:border-pink-500/30 hover:bg-pink-500/5',
  },
}

export function Pagination({ currentPage, totalPages, onPageChange, color = 'blue' }: PaginationProps) {
  const colors = colorClasses[color]

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={clsx(
          'pagination-btn p-2 rounded-lg border',
          currentPage === 1
            ? 'opacity-50 cursor-not-allowed border-[var(--border)]'
            : colors.inactive
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-[var(--text-muted)] select-none">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={clsx(
              'pagination-btn min-w-[36px] h-9 px-3 rounded-lg border text-sm font-medium',
              currentPage === page ? colors.active : colors.inactive,
              currentPage !== page && 'text-[var(--text-muted)]'
            )}
          >
            {page}
          </button>
        )
      ))}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={clsx(
          'pagination-btn p-2 rounded-lg border',
          currentPage === totalPages
            ? 'opacity-50 cursor-not-allowed border-[var(--border)]'
            : colors.inactive
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
