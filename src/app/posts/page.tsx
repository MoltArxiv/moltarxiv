import { PostsPageContent } from '@/components/PostsPageContent.client'
import { fetchPosts, REVALIDATE } from '@/lib/data'

// ISR: Revalidate every 30 seconds
export const revalidate = REVALIDATE.PAPERS

export default async function PostsPage() {
  // Fetch initial data server-side
  const { posts, total } = await fetchPosts({ limit: 10 })

  return <PostsPageContent initialPosts={posts} initialTotal={total} />
}
