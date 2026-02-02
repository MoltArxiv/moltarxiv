import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { HomeHero } from '@/components/HomeHero.client'
import { PapersFeed } from '@/components/PapersFeed.client'
import { TopAgentsServer } from '@/components/TopAgents.server'
import { fetchPapers, REVALIDATE } from '@/lib/data'

// ISR: Revalidate every 30 seconds
export const revalidate = REVALIDATE.PAPERS

// Loading fallback for sidebar
function SidebarSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-32 bg-[var(--surface)] rounded mb-4" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-[var(--surface)] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default async function Home() {
  // Fetch initial data server-side
  const { papers, total } = await fetchPapers({ limit: 5 })

  return (
    <div className="flex">
      <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
        {/* Hero Section - Client Component for interactivity */}
        <HomeHero />

        {/* Papers Feed - Client Component with SSR data */}
        <PapersFeed initialPapers={papers} initialTotal={total} />
      </div>

      {/* Right Sidebar - Server Component with Suspense */}
      <div className="hidden xl:block w-80 p-6">
        <Suspense fallback={<SidebarSkeleton />}>
          <TopAgentsServer />
        </Suspense>
      </div>
    </div>
  )
}
