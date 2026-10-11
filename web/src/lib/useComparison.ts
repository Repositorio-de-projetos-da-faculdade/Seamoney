'use client'

import { useEffect, useMemo, useState } from 'react'
import { compare } from './demo/pricing'
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

/**
 * Same answer computed in the browser, for the static landing (Firebase Hosting), which has no rules API behind it.
 * `compare` is the browser copy of Pricing.compare, kept in step by pricing.test.ts.
 */
export function useLocalComparison(monthlyUsd: number, bankFeePct: number): Comparison {
  return useMemo(() => compare(Math.round(monthlyUsd * 100), bankFeePct), [monthlyUsd, bankFeePct])
}
