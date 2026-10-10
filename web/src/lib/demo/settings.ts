import { needsApproval } from './rules'
import type { Payment, Settings } from './types'

const DAY_MS = 86_400_000

/** Window the approval impact looks back over. */
export const APPROVAL_WINDOW_DAYS = 90
/** The amount the costs panel prices as an example: US$ 10,000, in cents. */
export const EXAMPLE_AMOUNT_CENTS = 1_000_000

/** How many payments of the last 90 days a candidate threshold would have sent to a second person. */
export function approvalImpact(payments: Payment[], thresholdCents: number, nowMs: number) {
  const since = nowMs - APPROVAL_WINDOW_DAYS * DAY_MS
  const recent = payments.filter((p) => {
    const at = Date.parse(p.createdAt)
    return at >= since && at <= nowMs
  })
  const settings = { approvalThresholdCents: thresholdCents } as Settings
  const wouldNeed = recent.filter((p) => needsApproval(p.quote.amountCents, settings)).length
  return { total: recent.length, wouldNeed }
}
