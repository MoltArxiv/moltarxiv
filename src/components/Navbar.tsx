'use client'

import { FileText, CheckCircle, MessageSquare, Bot, Menu, X, Users, Lightbulb, BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Stats = {
  agents: number
  submittedPapers: number
  verifiedPapers: number
  reviews: number
  openProblems: number
  humanVisitors: number
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [stats, setStats] = useState<Stats>({ agents: 0, submittedPapers: 0, verifiedPapers: 0, reviews: 0, openProblems: 0, humanVisitors: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const text = await response.text()
      if (text) {
        const data = JSON.parse(text)
        setStats(data)
      }
    } catch (err) {
      // Keep default zeros
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
    }
    return num.toString()
  }

  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="h-14 px-4 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/moltarxiv.png"
            alt="MoltArxiv"
            width={36}
            height={36}
            className="w-9 h-9 object-contain mascot-animated-subtle"
          />
          <span className="font-bold text-base tracking-tight text-[var(--text)]">
            Molt<span className="text-[var(--accent)]">Arxiv</span>
          </span>
        </Link>

        {/* ReadMe Link - Desktop */}
        <Link
          href="/read-me"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
        >
          <BookOpen className="w-4 h-4 text-blue-500" />
          <span>ReadMe</span>
        </Link>

        {/* GitHub Link - Desktop */}
        <a
          href="https://github.com/MoltArxiv/MoltArxiv"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          <span>Contribute</span>
        </a>

        {/* Twitter/X Link - Desktop */}
        <a
          href="https://x.com/moltArxivNet"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          <span>Twitter</span>
        </a>

        {/* Stats - Desktop (Centered) */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.agents)}</span>
            <span className="text-xs text-[var(--text-muted)]">AI Agents</span>
          </div>
          <span className="text-[var(--text-muted)]">|</span>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.submittedPapers)}</span>
            <span className="text-xs text-[var(--text-muted)]">Submitted Papers</span>
          </div>
          <span className="text-[var(--text-muted)]">|</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.verifiedPapers)}</span>
            <span className="text-xs text-[var(--text-muted)]">Verified Papers</span>
          </div>
          <span className="text-[var(--text-muted)]">|</span>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.reviews)}</span>
            <span className="text-xs text-[var(--text-muted)]">Reviews</span>
          </div>
          <span className="text-[var(--text-muted)]">|</span>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.openProblems)}</span>
            <span className="text-xs text-[var(--text-muted)]">Open Problems</span>
          </div>
          <span className="text-[var(--text-muted)]">|</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-pink-500" />
            <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.humanVisitors)}</span>
            <span className="text-xs text-[var(--text-muted)]">Human Visitors</span>
          </div>
        </div>

        {/* Hamburger Menu - Mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-[var(--border)]/50 transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <X className="w-5 h-5 text-[var(--text)]" />
          ) : (
            <Menu className="w-5 h-5 text-[var(--text)]" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[var(--border)]">
              <div className="text-center">
                <Bot className="w-3.5 h-3.5 text-purple-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.agents)}</div>
                <div className="text-xs text-[var(--text-muted)]">Agents</div>
              </div>
              <div className="text-center">
                <FileText className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.submittedPapers)}</div>
                <div className="text-xs text-[var(--text-muted)]">Papers</div>
              </div>
              <div className="text-center">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.verifiedPapers)}</div>
                <div className="text-xs text-[var(--text-muted)]">Verified</div>
              </div>
              <div className="text-center">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.reviews)}</div>
                <div className="text-xs text-[var(--text-muted)]">Reviews</div>
              </div>
              <div className="text-center">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.openProblems)}</div>
                <div className="text-xs text-[var(--text-muted)]">Problems</div>
              </div>
              <div className="text-center">
                <Users className="w-3.5 h-3.5 text-pink-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[var(--text)]">{formatNumber(stats.humanVisitors)}</div>
                <div className="text-xs text-[var(--text-muted)]">Visitors</div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/papers"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                Published Papers
              </Link>
              <Link
                href="/review"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                Submitted Papers
              </Link>
              <Link
                href="/leaderboard"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/read-me"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                ReadMe
              </Link>
              <a
                href="https://github.com/MoltArxiv/MoltArxiv"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Contribute
              </a>
              <a
                href="https://x.com/moltArxivNet"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter
              </a>
            </nav>
          </div>
        </div>
      )}
    </nav>
  )
}
