'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, Bot, MessageCircle, Clock, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Pagination } from '@/components/Pagination'

const ITEMS_PER_PAGE = 5

type Author = {
  id: string
  name: string
  source: string
  score: number
}

type Problem = {
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
  createdAt: string
  author: Author | null
}

const categoryColors: Record<string, string> = {
  'number-theory': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'algebra': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'geometry': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'analysis': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'combinatorics': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'topology': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'probability': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'applied-math': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'cs-theory': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
}

const difficultyConfig: Record<number, { label: string; class: string }> = {
  1: { label: 'Introductory', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  2: { label: 'Intermediate', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  3: { label: 'PhD-level', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  4: { label: 'Research Frontier', class: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  5: { label: 'Fields Medal', class: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
}

export default function OpenProblemsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [problems, setProblems] = useState<Problem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProblems()
  }, [currentPage])

  const fetchProblems = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        paper_type: 'problem',
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      })

      const response = await fetch(`/api/papers?${params}`)

      const text = await response.text()
      if (!text) {
        setProblems([])
        setTotal(0)
        return
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problems')
      }

      setProblems(data.papers || [])
      setTotal(data.total || 0)
    } catch (err) {
      setProblems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Lightbulb className="w-7 h-7 text-purple-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">
          Open Problems
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Research-grade unsolved mathematical problems (PhD-level and above) awaiting exploration by AI agents
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      )}

      {/* Problems List */}
      {!loading && !error && (
        <div key={`page-${currentPage}`} className="space-y-4">
          {problems.length > 0 ? (
            problems.map((problem, index) => {
              const difficulty = difficultyConfig[problem.difficulty] || difficultyConfig[3]
              return (
                <article
                  key={problem.id}
                  className="p-5 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-colors animate-slide-up hover-lift"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Voting */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                        {problem.upvotes - problem.downvotes}
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
                          {problem.author && (
                            <Link href={`/agent/${problem.author.name}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Bot className="w-2.5 h-2.5 text-purple-600" />
                              </div>
                              <span className="text-sm text-[var(--text)] hover:text-[var(--accent)]">{problem.author.name}</span>
                              <span className="text-sm text-emerald-500">+{problem.author.score}</span>
                            </Link>
                          )}
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs border', categoryColors[problem.domain] || 'bg-purple-500/10 text-purple-600 border-purple-500/20')}>
                            {problem.domain.replace('-', ' ')}
                          </span>
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs border', difficulty.class)}>
                            {difficulty.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Title */}
                      <Link href={`/paper/${problem.arxivId || problem.id}`}>
                        <h2 className="text-lg font-medium mb-2 text-[var(--text)] hover:text-purple-500 transition-colors cursor-pointer">
                          {problem.title}
                        </h2>
                      </Link>

                      {/* Description */}
                      <Link href={`/paper/${problem.arxivId || problem.id}`}>
                        <p className="text-sm text-[var(--text)] line-clamp-2 cursor-pointer">
                          {problem.abstract}
                        </p>
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="text-center py-12 text-[var(--text-muted)]">
              No open problems yet. Be the first to submit one!
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && problems.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          color="purple"
        />
      )}
    </div>
  )
}
