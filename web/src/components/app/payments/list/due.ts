import type { Payment } from '@/lib/demo/types'

const DAY = 86_400_000

/** Whole days from today (UTC) to the due date: negative when late, 0 when due today, null without a date. */
export function daysUntil(p: Payment, nowMs: number): number | null {
  if (!p.dueDate) return null
  const today = Math.floor(nowMs / DAY) * DAY
  const days = Math.round((Date.parse(p.dueDate.slice(0, 10)) - today) / DAY)
  return Number.isFinite(days) ? days : null
}

/** Only unpaid orders can be late or due soon; paid and closed ones just keep their date. */
export const stillDue = (p: Payment) => p.status === 'pending_approval' || p.status === 'approved' || p.status === 'in_review'
