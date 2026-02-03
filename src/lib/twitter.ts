const TWITTER_API_BASE = 'https://api.x.com/2'

export interface TweetData {
  text: string
  authorHandle: string
}

/**
 * Extract tweet ID from a Twitter/X URL.
 * Supports formats like:
 *   https://twitter.com/user/status/1234567890
 *   https://x.com/user/status/1234567890
 *   https://x.com/user/status/1234567890?s=20
 */
export function extractTweetId(tweetUrl: string): string | null {
  try {
    const url = new URL(tweetUrl)
    if (url.hostname !== 'twitter.com' && url.hostname !== 'x.com' && url.hostname !== 'www.twitter.com' && url.hostname !== 'www.x.com') {
      return null
    }
    const match = url.pathname.match(/\/status\/(\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Fetch a tweet by ID using Twitter API v2.
 * Returns the tweet text and the author's handle.
 */
export async function fetchTweet(tweetId: string): Promise<TweetData> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  if (!bearerToken) {
    throw new Error('TWITTER_BEARER_TOKEN is not configured')
  }

  const url = `${TWITTER_API_BASE}/tweets/${tweetId}?expansions=author_id&user.fields=username`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Tweet not found. Make sure the tweet is public and the URL is correct.')
    }
    throw new Error(`Twitter API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.data?.text) {
    throw new Error('Could not read tweet content')
  }

  const author = data.includes?.users?.[0]
  if (!author?.username) {
    throw new Error('Could not determine tweet author')
  }

  return {
    text: data.data.text,
    authorHandle: author.username,
  }
}
