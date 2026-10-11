// The browser side of the real session with the rules service (web/src/app/api/session). The token itself stays in
// an httpOnly cookie; this file only asks to sign in or out and reads who is signed in.
import type { Role } from './types'

export type SignInError = 'login.error' | 'login.locked' | 'login.unavailable'

/** Signs in and returns the role the rules service gave this account, in the demo's lowercase form. */
export async function signInLive(email: string, password: string): Promise<{ role: Role } | { error: SignInError }> {
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: SignInError }
      return { error: body.error ?? 'login.error' }
    }
    const me = await fetch('/api/session', { cache: 'no-store' })
    const session = (await me.json()) as { role?: string }
    return { role: (session.role ?? '').toLowerCase() as Role }
  } catch {
    return { error: 'login.unavailable' }
  }
}

export async function signOutLive() {
  await fetch('/api/session', { method: 'DELETE' }).catch(() => undefined)
}
