import { createHmac, timingSafeEqual } from 'node:crypto'

export function signSession(timestamp: number, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(timestamp.toString())
  return `${timestamp}.${hmac.digest('hex')}`
}

export function verifySession(cookieValue: string | undefined, secret: string): boolean {
  if (!cookieValue) return false
  const parts = cookieValue.split('.')
  if (parts.length !== 2) return false

  const timestamp = parseInt(parts[0], 10)
  if (isNaN(timestamp)) return false

  // check expiration (12 hours)
  if (Date.now() - timestamp > 12 * 60 * 60 * 1000) {
    return false
  }

  const expected = signSession(timestamp, secret)
  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected))
  } catch (e) {
    return false
  }
}

export function safeCompare(a: string, b: string): boolean {
  const aHash = createHmac('sha256', 'dummy').update(a).digest()
  const bHash = createHmac('sha256', 'dummy').update(b).digest()
  return timingSafeEqual(aHash, bHash)
}

// In-memory rate limiter
const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  let record = store.get(key)
  
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs }
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  store.set(key, record)
  
  // Cleanup old entries randomly to avoid memory leak
  if (Math.random() < 0.05) {
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) {
        store.delete(k)
      }
    }
  }
  
  return true
}
