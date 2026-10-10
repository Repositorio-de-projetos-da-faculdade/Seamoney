'use client'

import { useEffect, useRef, useState } from 'react'
import type { LonLat } from '@/lib/chart/geo'
import { OPEN, supplierOf } from '@/lib/demo/selectors'
import type { DemoState, Payment, PaymentStatus, Supplier } from '@/lib/demo/types'

/** Waiting for approval: at anchor off Santos, each in its own berth. */
export const ANCHORAGE: LonLat[] = [
  [-41.2, -26.2],
  [-38.9, -27.6],
  [-42.6, -28.6],
  [-37.0, -25.6],
  [-40.0, -30.0],
  [-35.6, -28.6],
]

/** How far along its route a vessel rests in each status (0 = Santos, 1 = alongside at the supplier's port). */
export function restingAt(status: PaymentStatus, berth = 0): number | null {
  switch (status) {
    // ready to sail: strung out along the way out of Santos, past the anchorage
    case 'approved':
    case 'sending':
      return 0.07 + (berth % 5) * 0.024
    case 'sent':
    case 'in_review':
      return 0.986
    case 'reconciled':
      return 1
    default:
      return null // at anchor (awaiting approval)
  }
}

/** Vessel colours on the night chart: grey foam at anchor, aqua ready, mint under way, white arrived, red in review. */
export const VESSEL_COLOR: Record<PaymentStatus, string> = {
  pending_approval: '#9fb3c3',
  approved: '#46ded6',
  sending: '#24e4b4',
  sent: '#24e4b4',
  reconciled: '#e3ebee',
  in_review: '#ff7a6e',
  rejected: '#ff7a6e',
  cancelled: '#55687a',
}

export interface VesselSpec {
  payment: Payment
  supplier: Supplier
}

const RECENT_MS = 3 * 24 * 3_600_000

/** Which payments are drawn: everything at sea, plus the ones that arrived in the last three days. */
export function vesselsOf(state: DemoState, focusId?: string): VesselSpec[] {
  const now = Date.now()
  return state.payments
    .filter((p) => {
      if (p.id === focusId) return true
      if (focusId) return false
      if (OPEN.includes(p.status) || p.status === 'in_review') return true
      return p.status === 'reconciled' && !!p.recon && now - Date.parse(p.recon.matchedAt) < RECENT_MS
    })
    .map((payment) => ({ payment, supplier: supplierOf(state, payment)! }))
    .filter((v) => v.supplier)
}

/**
 * The fraction of the route a vessel has sailed, animated when its status moves it: while a payment is being
 * sent it crosses the ocean in under two seconds, which is the point of the product.
 */
export function useVoyage(status: PaymentStatus, berth = 0): number {
  const rest = restingAt(status, berth) ?? 0
  const [t, setT] = useState(rest)
  const current = useRef(rest)

  useEffect(() => {
    const from = current.current
    const to = status === 'sending' ? 0.93 : rest
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduce ? 0 : status === 'sending' ? 1_700 : Math.abs(to - from) > 0.2 ? 1_100 : 420
    const ease = (x: number) => (status === 'sending' ? 1 - Math.pow(1 - x, 2) : 1 - Math.pow(1 - x, 3))
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const k = duration ? Math.min(1, (now - start) / duration) : 1
      const value = from + (to - from) * ease(k)
      current.current = value
      setT(value)
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [status, rest])

  return t
}
