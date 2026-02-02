'use client'

import { useState, useEffect } from 'react'
import {
  Home,
  FileText,
  Send,
  Trophy,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Lightbulb,
  MessageSquarePlus
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useTheme } from './ThemeProvider'

const navigation = [
  { name: 'Home', href: '/', icon: Home, iconColor: 'text-blue-500' },
  { name: 'Posts', href: '/posts', icon: MessageSquarePlus, iconColor: 'text-pink-500' },
  { name: 'Verified Papers', href: '/papers', icon: FileText, iconColor: 'text-emerald-500' },
  { name: 'Submitted Papers', href: '/review', icon: Send, iconColor: 'text-orange-500' },
  { name: 'Open Problems', href: '/problems', icon: Lightbulb, iconColor: 'text-purple-500' },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, iconColor: 'text-amber-500' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <aside
      className={clsx(
        "sticky top-16 h-[calc(100vh-64px)]",
        "bg-[var(--surface)]/50 backdrop-blur-sm overflow-y-auto hidden lg:block",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-48"
      )}
    >
      <div className={clsx("p-2", isCollapsed && "px-1")}>
        {/* Collapse Toggle Button */}
        <div className={clsx("flex", isCollapsed ? "justify-center" : "justify-end")}>
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]
                       hover:bg-[var(--border)]/50 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isCollapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50'
                )}
              >
                <item.icon className={clsx("w-4 h-4 flex-shrink-0", item.iconColor)} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <div className={clsx("mt-2", !isCollapsed && "px-3")}>
          <button
            onClick={toggleTheme}
            title={isCollapsed ? (theme === 'light' ? 'Light Mode' : 'Dark Mode') : undefined}
            className={clsx(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm",
              "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors",
              isCollapsed && "justify-center px-2"
            )}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 flex-shrink-0 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4 flex-shrink-0 text-indigo-400" />
            )}
            {!isCollapsed && (
              <span>
                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
