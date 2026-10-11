// The signed-in session with the Java rules API. The JWT lives only in an httpOnly cookie: the browser sends it
// back to this app, and this app adds it as a Bearer token when it calls Java. Page scripts never see it.
// Server-side only (Server Components, Route Handlers, Server Actions).
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'seamoney_api'

// The Java service issues tokens valid for one hour; the cookie never outlives the token.
const MAX_AGE_S = 60 * 60

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await sessionToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function storeSession(token: string) {
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_S,
    path: '/',
  })
}

export async function clearSession() {
  ;(await cookies()).delete(SESSION_COOKIE)
}
