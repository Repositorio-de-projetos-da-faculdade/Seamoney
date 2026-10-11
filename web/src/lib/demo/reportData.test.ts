import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cumulativeSaving, monthsOf, monthStacks, paidInMonths, previousMonths, quantile, supplierShares } from './reportData.ts'
import { buildSeed } from './seed.ts'

const NOW = Date.parse('2026-10-10T12:00:00Z')

test('a period is whole calendar months back from now, and the previous one sits right before it', () => {
  const state = buildSeed(NOW)
  assert.deepEqual(monthsOf(state, 'q', NOW), ['2026-08', '2026-09', '2026-10'])
  assert.deepEqual(previousMonths(['2026-08', '2026-09', '2026-10'], 'q'), ['2026-05', '2026-06', '2026-07'])
  // January wraps to the previous year
  assert.deepEqual(previousMonths(['2026-01'], 'month'), ['2025-12'])
})

test('monthly stacks add up to what was paid, and the saving accumulates', () => {
  const state = buildSeed(NOW)
  const months = monthsOf(state, 'year', NOW)
  const paid = paidInMonths(state, months, 'all')
  const stacks = monthStacks(paid, months)
  const paidCents = paid.reduce((a, p) => a + p.quote.amountCents, 0)
  assert.equal(
    stacks.reduce((a, s) => a + s.tempo + s.solana, 0),
    paidCents,
  )
  const curve = cumulativeSaving(stacks)
  assert.equal(curve.at(-1)!.cents, stacks.reduce((a, s) => a + s.bank - s.fee, 0))
})

test('supplier shares sum to the whole, and the network filter keeps only that network', () => {
  const state = buildSeed(NOW)
  const months = monthsOf(state, 'all', NOW)
  const shares = supplierShares(state, paidInMonths(state, months, 'all'))
  assert.ok(Math.abs(shares.reduce((a, s) => a + s.share, 0) - 1) < 1e-9)
  assert.ok(paidInMonths(state, months, 'solana').every((p) => p.network === 'solana'))
})

test('quantiles use the nearest rank', () => {
  assert.equal(quantile([], 0.5), null)
  assert.equal(quantile([4, 1, 3, 2], 0.5), 2)
  assert.equal(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9)
})
