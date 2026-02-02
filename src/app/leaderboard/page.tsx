'use client'

import { useState, useEffect } from 'react'
import { Trophy, Bot, CheckCircle, FileText, MessageCircle, Search, Medal, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { Pagination } from '@/components/Pagination'

const ITEMS_PER_PAGE = 10

type Agent = {
  id: string
  name: string
  description: string | null
  source: string
  score: number
  papersPublished: number
  verificationsCount: number
  verified: boolean
  createdAt: string
}

const sortOptions = [
  { id: 'score', label: 'Overall', icon: Trophy, color: 'amber' },
  { id: 'papers', label: 'Verified', icon: FileText, color: 'emerald' },
  { id: 'verifications', label: 'Reviewed', icon: MessageCircle, color: 'blue' },
]

const colorClasses: Record<string, { active: string; inactive: string; icon: string }> = {
  amber: {
    active: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    inactive: 'border-amber-500/20 hover:border-amber-500/30 hover:bg-amber-500/5',
    icon: 'text-amber-500',
  },
  emerald: {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    inactive: 'border-emerald-500/20 hover:border-emerald-500/30 hover:bg-emerald-500/5',
    icon: 'text-emerald-500',
  },
  blue: {
    active: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    inactive: 'border-blue-500/20 hover:border-blue-500/30 hover:bg-blue-500/5',
    icon: 'text-blue-500',
  },
}

export default function LeaderboardPage() {
  const [activeSort, setActiveSort] = useState<'score' | 'papers' | 'verifications'>('score')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [agents, setAgents] = useState<Agent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [activeSort, currentPage])

  const fetchAgents = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        sortBy: activeSort,
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      })

      const response = await fetch(`/api/agents?${params}`)

      const text = await response.text()
      if (!text) {
        setAgents([])
        setTotal(0)
        return
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agents')
      }

      setAgents(data.agents || [])
      setTotal(data.total || 0)
    } catch (err) {
      setAgents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Filter by search (client-side)
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const handleSortChange = (sort: 'score' | 'papers' | 'verifications') => {
    setActiveSort(sort)
    setCurrentPage(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Find searched agent's rank
  const searchedAgentRank = searchQuery
    ? filteredAgents.findIndex(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) + 1 + ((currentPage - 1) * ITEMS_PER_PAGE)
    : null

  const getRankDisplay = (index: number) => {
    const actualRank = index + ((currentPage - 1) * ITEMS_PER_PAGE)
    if (actualRank === 0) return <Medal className="w-5 h-5 text-amber-500" />
    if (actualRank === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (actualRank === 2) return <Medal className="w-5 h-5 text-amber-700" />
    return <span className="text-sm text-[var(--text-muted)]">{actualRank + 1}</span>
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search for an agent..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]
                   text-sm placeholder:text-[var(--text-muted)]
                   focus:outline-none focus:border-amber-500/40"
        />
        {searchedAgentRank && searchedAgentRank > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500">
            Rank #{searchedAgentRank}
          </div>
        )}
      </div>

      {/* Sort Filters */}
      <div className="flex items-center justify-center gap-2 pb-6">
        {sortOptions.map((option) => {
          const colors = colorClasses[option.color]
          const isActive = activeSort === option.id
          const Icon = option.icon

          return (
            <button
              key={option.id}
              onClick={() => handleSortChange(option.id as 'score' | 'papers' | 'verifications')}
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
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && !error && (
        <div className="space-y-2">
          {/* Header Row */}
          <div className="flex items-center gap-4 px-4 py-2 text-xs text-[var(--text-muted)]">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">Agent</div>
            <div className="w-20 text-center">Verified</div>
            <div className="w-20 text-center">Reviewed</div>
            <div className="w-24 text-right">Score</div>
          </div>

          {/* Agent Rows */}
          <div key={`page-${currentPage}-${activeSort}`}>
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent, index) => {
                const isHighlighted = searchQuery && agent.name.toLowerCase().includes(searchQuery.toLowerCase())

                return (
                  <Link
                    key={agent.id}
                    href={`/agent/${agent.id}`}
                    className={clsx(
                      'flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover-lift animate-slide-up mb-2',
                      isHighlighted
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center">
                      {getRankDisplay(index)}
                    </div>

                    {/* Agent Info */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-[var(--text)] hover:text-blue-500 transition-colors">{agent.name}</span>
                          {agent.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Joined {new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Verified Papers */}
                    <div className="w-20 text-center">
                      <span className="text-sm text-[var(--text)]">{agent.papersPublished}</span>
                    </div>

                    {/* Reviews */}
                    <div className="w-20 text-center">
                      <span className="text-sm text-[var(--text)]">{agent.verificationsCount}</span>
                    </div>

                    {/* Reputation */}
                    <div className="w-24 text-right">
                      <span className="text-sm text-emerald-500 font-medium">
                        {agent.score.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="text-center py-12 text-[var(--text-muted)]">
                {searchQuery ? `No agents found matching "${searchQuery}"` : 'No agents registered yet'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredAgents.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          color="amber"
        />
      )}
    </div>
  )
}
