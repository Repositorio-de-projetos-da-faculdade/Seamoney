import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { centsToUnits, compare, feeCents, quote } from './pricing.ts'
import { sha256Hex } from './sha256.ts'

// The same worked examples as rules-api PricingTest, so the browser demo and the Java service agree.
test('fee is 1% with half-up rounding, like Pricing.java', () => {
  assert.equal(feeCents(8_000_000, 100), 80_000)
  assert.equal(feeCents(50, 100), 1)
  assert.equal(feeCents(49, 100), 0)
})

test('comparison matches the worked example', () => {
  const c = compare(8_000_000, 3)
  assert.equal(c.bankCents, 240_000)
  assert.equal(c.routeCents, 80_000)
  assert.equal(c.savingsCents, 160_000)
  assert.ok(compare(1_000_000, 0.5).savingsCents < 0)
})

test('quote adds the fee and converts at the simulated rate', () => {
  const q = quote(8_000_000, { feeBps: 100, bankFeePct: 3, fxRate: 5.4 })
  assert.equal(q.totalCents, 8_080_000)
  assert.equal(q.totalBrlCents, 43_632_000)
  assert.equal(q.savingsCents, 160_000)
})

test('cents become six-decimal token units without losing precision', () => {
  assert.equal(centsToUnits(8_000_000), '80000000000')
  assert.equal(centsToUnits(90_071_992_547_409), '900719925474090000')
  assert.throws(() => centsToUnits(-1))
})

test('the bundled SHA-256 agrees with node:crypto', () => {
  for (const text of ['', 'abc', 'pay_0001|sup_x|0xabc|INV-2026-0845|8000000|2026-10-25', 'ç'.repeat(55), 'x'.repeat(64), 'y'.repeat(1000)]) {
    assert.equal(sha256Hex(text), '0x' + createHash('sha256').update(text).digest('hex'), JSON.stringify(text.slice(0, 20)))
  }
})
