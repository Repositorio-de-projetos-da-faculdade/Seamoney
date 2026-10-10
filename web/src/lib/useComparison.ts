'use client'

import { useEffect, useState } from 'react'
import type { Comparison } from './types'

/** The savings math lives in the Java rules API (single source of truth); the UI just asks it. */
export function useComparison(monthlyUsd: number, bankFeePct: number) {
  const [result, setResult] = useState<Comparison | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ monthlyUsd, bankFeePct: Math.min(bankFeePct, 100) }),
          signal: controller.signal,
        })
        if (res.ok) setResult((await res.json()) as Comparison)
      } catch {
        // aborted or offline: keep showing the last result
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [monthlyUsd, bankFeePct])
  return result
}
