import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, checkRequestLimits, clientIpOf } from './lib/gate'

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

  // 2. Rate limits: payments, AI extraction, sign-in and the unlock password (see checkRequestLimits)
  if (!checkRequestLimits(pathname, request.method, clientIpOf(request.headers))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
