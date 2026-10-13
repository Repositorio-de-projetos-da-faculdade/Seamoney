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
  } catch {
    return false
  }
}

export function safeCompare(a: string, b: string): boolean {
  const aHash = createHmac('sha256', 'dummy').update(a).digest()
  const bHash = createHmac('sha256', 'dummy').update(b).digest()
  return timingSafeEqual(aHash, bHash)
}

/** The visitor's address as the proxy in front of this app reports it; 'unknown' when there is none. */
export function clientIpOf(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = headers.get('x-real-ip')?.trim()
  return (forwarded || real || 'unknown').slice(0, 64)
}

/**
 * Whether a session cookie gets the Secure flag. A Secure cookie set over plain HTTP is thrown away by the browser, so
 * a demo opened at http://<server ip> could never sign in: it is Secure when the request reached us as HTTPS (behind
 * a proxy that says so in X-Forwarded-Proto), and COOKIE_SECURE=true|false overrides that.
 */
export function cookieSecure(forwardedProto: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  if (env.COOKIE_SECURE === 'true') return true
  if (env.COOKIE_SECURE === 'false') return false
  return forwardedProto?.split(',')[0]?.trim().toLowerCase() === 'https'
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

/**
 * The limits on routes that cost something or let someone guess something. Each has a limit per address and, where a
 * forged X-Forwarded-For could dodge it, one over everybody as well: guessing the unlock password or a sign-in stays
 * slow even for someone who changes address with every try.
 * Returns false when the request must be refused (429).
 */
export function checkRequestLimits(pathname: string, method: string, ip: string): boolean {
  if (method !== 'POST') return true
  const minute = 60_000
  if (pathname.startsWith('/api/orders')) return checkRateLimit(`orders:${ip}`, 10, minute)
  if (pathname.startsWith('/api/extract')) return checkRateLimit(`extract:${ip}`, 10, minute) && checkRateLimit('extract:all', 120, 60 * minute)
  if (pathname === '/api/session') return checkRateLimit(`session:${ip}`, 10, minute) && checkRateLimit('session:all', 120, minute)
  if (pathname === '/unlock' || pathname.startsWith('/unlock/')) return checkRateLimit(`unlock:${ip}`, 5, minute) && checkRateLimit('unlock:all', 30, minute)
  return true
}
