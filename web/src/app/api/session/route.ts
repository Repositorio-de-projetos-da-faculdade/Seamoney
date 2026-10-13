import { getSession } from '@/lib/api'
import { clientIpOf } from '@/lib/gate'
import { requestToken } from '@/lib/login'
import { clearSession, storeSession } from '@/lib/session'

export const runtime = 'nodejs'

/** Who is signed in with the Java service (email, company, role), or 401. The token itself never leaves the server. */
export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Not signed in', code: 'unauthorized' }, { status: 401 })
  return Response.json(session)
}

/** Signs in with {email, password}: the token goes into the httpOnly cookie, the answer carries only the session. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown }
  const result = await requestToken(String(body.email ?? '').trim(), String(body.password ?? ''), clientIpOf(req.headers))
  if ('error' in result) return Response.json({ error: result.error, code: 'login_failed' }, { status: result.status })
  await storeSession(result.token)
  return Response.json({ ok: true })
}

export async function DELETE() {
  await clearSession()
  return Response.json({ ok: true })
}
