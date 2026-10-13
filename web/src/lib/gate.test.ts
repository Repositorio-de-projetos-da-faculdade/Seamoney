import test from 'node:test'
import assert from 'node:assert'
import { signSession, verifySession, safeCompare, checkRateLimit, checkRequestLimits, clientIpOf, cookieSecure } from './gate.ts'

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

test('gate: the visitor address comes from the proxy headers', () => {
  const h = (o: Record<string, string>) => ({ get: (name: string) => o[name] ?? null })
  assert.equal(clientIpOf(h({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7')
  assert.equal(clientIpOf(h({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2')
  assert.equal(clientIpOf(h({})), 'unknown')
  assert.equal(clientIpOf(h({ 'x-forwarded-for': 'x'.repeat(200) })).length, 64)
})

test('gate: the session cookie is Secure only where the page is really HTTPS', () => {
  assert.equal(cookieSecure('https', {}), true)
  assert.equal(cookieSecure('https, http', {}), true)
  assert.equal(cookieSecure('http', {}), false, 'over plain HTTP a Secure cookie would be thrown away and nobody could sign in')
  assert.equal(cookieSecure(null, { NODE_ENV: 'production' }), false)
  assert.equal(cookieSecure(null, { COOKIE_SECURE: 'true' }), true)
  assert.equal(cookieSecure('https', { COOKIE_SECURE: 'false' }), false)
})

test('gate: the unlock password and the sign-in are slow to guess, even with a forged address each time', () => {
  // five tries a minute per address
  for (let i = 0; i < 5; i++) assert.ok(checkRequestLimits('/unlock', 'POST', '192.0.2.1'))
  assert.ok(!checkRequestLimits('/unlock', 'POST', '192.0.2.1'), 'the sixth from one address is refused')
  // a new address every time: the limit over everybody still stops it (30 a minute; five were spent above)
  let allowed = 0
  for (let i = 0; i < 60; i++) if (checkRequestLimits('/unlock', 'POST', `198.51.100.${i}`)) allowed++
  assert.ok(allowed < 30, `only a few more got through: ${allowed}`)

  for (let i = 0; i < 10; i++) assert.ok(checkRequestLimits('/api/session', 'POST', '192.0.2.2'))
  assert.ok(!checkRequestLimits('/api/session', 'POST', '192.0.2.2'))
})

test('gate: reading is never limited, and neither is a route outside the list', () => {
  for (let i = 0; i < 50; i++) {
    assert.ok(checkRequestLimits('/unlock', 'GET', '192.0.2.3'))
    assert.ok(checkRequestLimits('/api/session', 'GET', '192.0.2.3'))
    assert.ok(checkRequestLimits('/api/health', 'POST', '192.0.2.3'))
  }
})
