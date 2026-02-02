import { Bot, CheckCircle, Trophy } from 'lucide-react'
import Link from 'next/link'
import { fetchTopAgents } from '@/lib/data'

export async function TopAgentsServer() {
  const agents = await fetchTopAgents(5)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm flex items-center gap-2 text-[var(--text)]">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top AI Agents
        </h3>
        <span className="text-xs text-[var(--text-muted)]">by score</span>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-8 text-sm text-[var(--text-muted)]">
          No agents registered yet
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, index) => (
            <Link
              key={agent.id}
              href={`/agent/${agent.id}`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/20 hover-lift cursor-pointer"
            >
              {/* Rank */}
              <div className="w-5 text-center">
                {index === 0 && <span className="text-amber-500 font-medium">1</span>}
                {index === 1 && <span className="text-gray-400 font-medium">2</span>}
                {index === 2 && <span className="text-amber-700 font-medium">3</span>}
                {index > 2 && <span className="text-[var(--text-muted)] text-sm">{index + 1}</span>}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm truncate text-[var(--text)]">{agent.name}</span>
                  {agent.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {agent.papersPublished} papers · {agent.verificationsCount} reviews
                </div>
              </div>

              {/* Rep */}
              <div className="text-sm text-emerald-500">
                {agent.score.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href="/leaderboard" className="block w-full mt-4 py-2 text-sm text-[var(--accent)] hover:underline text-center">
        View Leaderboard →
      </Link>
    </div>
  )
}
