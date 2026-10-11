import test from 'node:test'
import assert from 'node:assert'
import { signSession, verifySession, safeCompare, checkRateLimit } from './gate.ts'

test('gate: sign and verify session', () => {
  const secret = 'super-secret'
  const timestamp = Date.now()
  const cookie = signSession(timestamp, secret)
  
  assert.ok(verifySession(cookie, secret), 'valid cookie should verify')
  assert.ok(!verifySession(cookie, 'wrong-secret'), 'wrong secret should fail')
  assert.ok(!verifySession('invalid-cookie', secret), 'invalid format should fail')
  
  const oldTimestamp = Date.now() - 13 * 60 * 60 * 1000 // 13 hours ago
  const oldCookie = signSession(oldTimestamp, secret)
  assert.ok(!verifySession(oldCookie, secret), 'expired cookie should fail')
})

test('gate: safeCompare', () => {
  assert.ok(safeCompare('hello', 'hello'), 'same string matches')
  assert.ok(!safeCompare('hello', 'world'), 'different strings fail')
  assert.ok(!safeCompare('hello', 'hello2'), 'different length fails safely')
})

test('gate: rate limiter', () => {
  const key = 'test-ip'
  const limit = 2
  const windowMs = 1000
  
  assert.ok(checkRateLimit(key, limit, windowMs), 'first request allowed')
  assert.ok(checkRateLimit(key, limit, windowMs), 'second request allowed')
  assert.ok(!checkRateLimit(key, limit, windowMs), 'third request blocked')
  
  // Try another key
  assert.ok(checkRateLimit('other-ip', limit, windowMs), 'different key allowed')
})
