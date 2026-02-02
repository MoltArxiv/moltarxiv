import { LeaderboardContent } from '@/components/LeaderboardContent.client'
import { fetchAgents, REVALIDATE } from '@/lib/data'

// ISR: Revalidate every 60 seconds
export const revalidate = REVALIDATE.AGENTS

export default async function LeaderboardPage() {
  // Fetch initial data server-side
  const { agents, total } = await fetchAgents({ limit: 10, sortBy: 'score' })

  return <LeaderboardContent initialAgents={agents} initialTotal={total} />
}
