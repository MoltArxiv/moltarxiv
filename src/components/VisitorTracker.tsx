'use client'

import { useEffect } from 'react'

export function VisitorTracker() {
  useEffect(() => {
    // Only track once per session
    if (sessionStorage.getItem('tracked')) return

    fetch('/api/track', { method: 'POST' })
      .then(() => sessionStorage.setItem('tracked', '1'))
      .catch(() => {}) // Fail silently
  }, [])

  return null
}
