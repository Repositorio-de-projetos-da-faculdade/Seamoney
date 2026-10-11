// Checks credentials with the Java service. Shared by the /login form (Server Action) and POST /api/session
// (used by scripts such as scripts/e2e.mjs). The caller stores the token with storeSession.
import { rulesUrl } from './api'
import type { Key } from './i18n/dict'

export type LoginResult = { token: string } | { error: Extract<Key, `login.${string}`>; status: number }

export async function requestToken(email: string, password: string): Promise<LoginResult> {
  if (!email || !password) return { error: 'login.error', status: 400 }
  let res: Response
  try {
    res = await fetch(`${rulesUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
  } catch {
    return { error: 'login.unavailable', status: 503 }
  }
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
  if (res.ok && body.token) return { token: body.token }
  if (res.status >= 500) return { error: 'login.unavailable', status: 503 }
  // Java answers 401 for a wrong password and for a locked account; its message tells them apart
  return { error: body.error?.toLowerCase().includes('locked') ? 'login.locked' : 'login.error', status: 401 }
}
