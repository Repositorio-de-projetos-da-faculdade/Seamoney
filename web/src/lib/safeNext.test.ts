import assert from 'node:assert/strict'
import { test } from 'node:test'
import { safeNext } from './safeNext.ts'

test('keeps paths of this site', () => {
  assert.equal(safeNext('/app/settings'), '/app/settings')
  assert.equal(safeNext('/dashboard/orders?x=1'), '/dashboard/orders?x=1')
})

test('refuses anything that would leave the site', () => {
  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined, 42]) {
    assert.equal(safeNext(next), '/dashboard')
  }
})
