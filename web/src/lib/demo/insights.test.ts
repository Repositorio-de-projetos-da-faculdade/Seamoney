import assert from 'node:assert/strict'
import { test } from 'node:test'
import { approvalHours, dueSoon, latestSettlement } from './insights.ts'
import { buildSeed } from './seed.ts'
import type { Activity } from './types.ts'

const HOUR = 3_600_000
const DAY = 86_400_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const at = (ms: number) => new Date(ms).toISOString()

test('approval hours pair each request with the human approval of the same payment, skipping automatic ones', () => {
  const base = buildSeed(NOW)
  const act = (a: Pick<Activity, 'id' | 'type' | 'at'> & Partial<Activity>): Activity => ({ actorId: 'mem_julia', ...a })
  const state = {
    ...base,
    activity: [
      act({ id: 'a3', type: 'approved', at: at(NOW - HOUR), paymentId: 'p1' }),
      act({ id: 'a2', type: 'auto_approved', at: at(NOW - 2 * HOUR), paymentId: 'p3' }),
      act({ id: 'a1', type: 'approval_requested', at: at(NOW - 5 * HOUR), paymentId: 'p1' }),
      act({ id: 'a0', type: 'approval_requested', at: at(NOW - 200 * DAY), paymentId: 'p2' }),
    ],
  }
  assert.equal(approvalHours(state, NOW), 4)
  assert.equal(approvalHours({ ...base, activity: [] }, NOW), null)
})

test('due dates: overdue are negative, the strip sums cents per day from today, and paid orders leave the list', () => {
  const base = buildSeed(NOW)
  const [first, second, third] = base.payments
  const state = {
    ...base,
    payments: [
      { ...first, status: 'approved' as const, dueDate: '2026-10-08' },
      { ...second, status: 'sent' as const, dueDate: '2026-10-10' },
      { ...third, status: 'reconciled' as const, dueDate: '2026-10-12' },
    ],
  }
  const due = dueSoon(state, NOW)
  assert.deepEqual(due.overdue.map((i) => i.days), [-2])
  assert.deepEqual(due.upcoming.map((i) => i.days), [0])
  assert.equal(due.strip[0], second.quote.amountCents)
  assert.equal(due.strip.length, 15)
})

test('the latest settlement is the newest reconciled payment, never an open review case', () => {
  const state = buildSeed(NOW)
  const latest = latestSettlement(state)
  assert.equal(latest?.status, 'reconciled')
  // the seed's review case was paid more recently than any reconciled payment
  const review = state.payments.find((p) => p.status === 'in_review')!
  assert.ok(review.settlement!.paidAt > latest!.settlement!.paidAt)
})
