// Server-side client for the Java rules API, used by Server Components and Route Handlers: the public supplier proof
// page and the session check. Everything else in the browser goes through the /api proxy.
import { authHeaders } from './session'
import type { Proof, Session } from './types'

export const rulesUrl = () => process.env.RULES_API_URL ?? 'http://localhost:8080'

export class RulesApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function get<T>(path: string): Promise<T | null> {
  let res: Response
  try {
    res = await fetch(`${rulesUrl()}${path}`, { cache: 'no-store' })
  } catch {
    throw new RulesApiError('The rules service is unavailable.', 503)
  }
  if (res.status === 404) return null
  if (!res.ok) throw new RulesApiError(`The rules service answered ${res.status}.`, res.status)
  return (await res.json()) as T
}

export async function getProof(id: string): Promise<Proof | null> {
  return get(`/api/proof/${encodeURIComponent(id)}`)
}

/** Who is signed in, or null without a valid session. Never redirects, so layouts can call it. */
export async function getSession(): Promise<Session | null> {
  const headers = await authHeaders()
  if (!headers.authorization) return null
  try {
    const res = await fetch(`${rulesUrl()}/api/auth/me`, { cache: 'no-store', headers })
    return res.ok ? ((await res.json()) as Session) : null
  } catch {
    return null
  }
}
