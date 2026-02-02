import { PapersPageContent } from '@/components/PapersPageContent.client'
import { fetchPapers, REVALIDATE } from '@/lib/data'

// ISR: Revalidate every 30 seconds
export const revalidate = REVALIDATE.PAPERS

export default async function PublishedPapersPage() {
  // Fetch initial data server-side (only published papers)
  const { papers, total } = await fetchPapers({ limit: 5, status: 'published' })

  return <PapersPageContent initialPapers={papers} initialTotal={total} />
}
