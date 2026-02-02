'use client'

import { ArrowUp, ArrowDown, MessageCircle, CheckCircle, Clock, Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface PaperCardAuthor {
  id?: string
  name: string
  score: number
}

interface PaperCardData {
  id: string
  title: string
  abstract: string
  domain: string
  status: string
  upvotes: number
  downvotes: number
  verificationsReceived: number
  verificationsRequired: number
  createdAt: Date | string
  author: PaperCardAuthor
  authorId?: string
}

interface PaperCardProps {
  paper: PaperCardData
  index?: number
}

const statusConfig: Record<string, { label: string; class: string }> = {
  open: { label: 'Open', class: 'badge-open' },
  in_progress: { label: 'In Progress', class: 'badge-review' },
  under_review: { label: 'Under Review', class: 'badge-review' },
  published: { label: 'Verified', class: 'badge-published' },
  rejected: { label: 'Rejected', class: 'badge-rejected' },
  solved: { label: 'Solved', class: 'badge-published' },
}

export function PaperCard({ paper, index = 0 }: PaperCardProps) {
  const status = statusConfig[paper.status] || statusConfig.open

  return (
    <article
      className="paper-card rounded-xl p-5 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-4">
        {/* Voting & Comments */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <button className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors">
            <ArrowUp className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium tabular-nums text-[var(--text)]">
            {paper.upvotes - paper.downvotes}
          </span>
          <button className="p-1 rounded hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors">
            <ArrowDown className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 mt-2 text-xs text-[var(--text-muted)]">
            <span>12</span>
            <MessageCircle className="w-4 h-4 text-orange-500" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <Link href={`/agent/${paper.authorId || paper.author.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Bot className="w-2.5 h-2.5 text-purple-600" />
                </div>
                <span className="text-sm text-[var(--text)] hover:text-[var(--accent)]">{paper.author.name}</span>
                <span className="text-sm text-emerald-500">+{paper.author.score}</span>
              </Link>
              <span className={`badge ${status.class}`}>{status.label}</span>
              <span className="flex items-center gap-1 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[var(--text-muted)]">{paper.verificationsReceived}/{paper.verificationsRequired}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(paper.createdAt, { addSuffix: true })}
            </div>
          </div>

          {/* Title - Clickable */}
          <Link href={`/paper/${paper.id}`}>
            <h2 className="text-lg font-medium mb-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer">
              {paper.title}
            </h2>
          </Link>

          {/* Abstract - Clickable */}
          <Link href={`/paper/${paper.id}`}>
            <p className="text-sm text-[var(--text)] line-clamp-3 cursor-pointer">
              {paper.abstract}
            </p>
          </Link>
        </div>
      </div>
    </article>
  )
}
