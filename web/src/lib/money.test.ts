import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseMoneyToCents } from './money.ts'

test('parses US and Brazilian number formats', () => {
  assert.equal(parseMoneyToCents('80,000.50'), 8_000_050)
  assert.equal(parseMoneyToCents('80.000,50'), 8_000_050)
  assert.equal(parseMoneyToCents('US$ 80,000'), 8_000_000)
  assert.equal(parseMoneyToCents('80000'), 8_000_000)
  assert.equal(parseMoneyToCents('80,5'), 8_050)
})

test('rejects things that are not an amount', () => {
  assert.equal(parseMoneyToCents(''), null)
  assert.equal(parseMoneyToCents('abc'), null)
  assert.equal(parseMoneyToCents('-5'), null)
})
