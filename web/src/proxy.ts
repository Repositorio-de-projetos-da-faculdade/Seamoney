import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, checkRateLimit } from './lib/gate'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pwd = process.env.DEMO_ACCESS_PASSWORD
  const secret = process.env.DEMO_SESSION_SECRET ?? ''
  
  // 1. Gate / password check
  if (pwd && pwd.length > 0) {
    // fail closed: sem segredo de sessao nao ha como validar cookie
    if (secret.length < 16) {
      return NextResponse.json({ error: 'Gate misconfigured' }, { status: 503 })
    }
    // Exclude /unlock and Next.js static files
    if (
      !pathname.startsWith('/unlock') &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/favicon.ico') &&
      !pathname.startsWith('/brand/')
    ) {
      const cookie = request.cookies.get('seamoney_session')?.value
      if (!verifySession(cookie, secret)) {
        // block API and Pages
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/unlock', request.url))
      }
    }
  }

  // 2. Rate Limiting for testnet payment routes and AI extraction
  if (pathname.startsWith('/api/orders') || pathname.startsWith('/api/extract')) {
    // only POST for orders and extract
    if (request.method === 'POST') {
      const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
      const key = ip.split(',')[0].trim()
      
      const allowed = checkRateLimit(key, 10, 60 * 1000) // 10 req/min
      if (!allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
