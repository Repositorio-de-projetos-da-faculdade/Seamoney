import assert from 'node:assert/strict'
import { test } from 'node:test'
import { encodeMemo, memoHex } from './memo.ts'

// Same vector as chain-service/tests/test_memo.py, so the landing page shows what the chain really carries.
test('matches the chain service encoding: UTF-8, right-padded to 32 bytes', () => {
  const memo = encodeMemo('INV-E2E-010735')
  assert.equal(memoHex(memo), '0x494e562d4532452d303130373335' + '00'.repeat(18))
  assert.equal(memo.used, 14)
  assert.equal(memo.bytes.length, 32)
})

test('counts bytes, not characters', () => {
  const memo = encodeMemo('Ç1')
  assert.equal(memo.used, 3)
  assert.deepEqual(
    memo.bytes.slice(0, 3).map((b) => [b.hex, b.char]),
    [
      ['c3', 'Ç'],
      ['87', null],
      ['31', '1'],
    ],
  )
})

test('flags references that do not fit', () => {
  const memo = encodeMemo('a'.repeat(33))
  assert.equal(memo.fits, false)
  assert.equal(memo.used, 33)
  assert.equal(memo.bytes.length, 32)
})
