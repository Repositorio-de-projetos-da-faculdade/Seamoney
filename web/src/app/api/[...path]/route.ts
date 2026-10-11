import { rulesUrl } from '@/lib/api'
import { authHeaders } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 60

// The browser talks to this app only; this proxy forwards the business endpoints to the Java rules API.
// The target is read at request time, so the same image works in any environment. The signed-in session travels
// as an httpOnly cookie and is forwarded to Java as a Bearer token; Java decides what each role may do.
const ALLOWED = new Set(['orders', 'suppliers', 'stats', 'compare', 'proof', 'reports', 'leads'])

async function forward(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  if (!ALLOWED.has(path[0])) return Response.json({ error: 'Not found', code: 'not_found' }, { status: 404 })

  const init: RequestInit = {
    method: req.method,
    headers: { 'content-type': req.headers.get('content-type') ?? 'application/json', ...(await authHeaders()) },
    cache: 'no-store',
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.arrayBuffer()

  try {
    const target = `${rulesUrl()}/api/${path.map(encodeURIComponent).join('/')}${new URL(req.url).search}`
    const res = await fetch(target, init)
    const headers = new Headers()
    for (const name of ['content-type', 'content-disposition']) {
      const value = res.headers.get(name)
      if (value) headers.set(name, value)
    }
    return new Response(res.body, { status: res.status, headers })
  } catch {
    return Response.json({ error: 'The rules service is unavailable.', code: 'unavailable' }, { status: 503 })
  }
}

export { forward as GET, forward as POST }
