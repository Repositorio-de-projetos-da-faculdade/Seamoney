import { NextResponse } from 'next/server'
import { rulesUrl } from '@/lib/api'

export const runtime = 'nodejs'

/** Web health: this app is up; also reports what the Java service says about itself and the chain. */
export async function GET() {
  const checks: Record<string, string> = { web: 'ok', aiExtraction: process.env.ANTHROPIC_API_KEY ? 'configured' : 'demo-mode' }
  try {
    const res = await fetch(`${rulesUrl()}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    const body = (await res.json()) as { ok: boolean; checks: Record<string, string> }
    checks.rulesApi = body.ok ? 'ok' : 'error'
    Object.assign(checks, body.checks)
  } catch {
    checks.rulesApi = 'unreachable'
  }
  // The web process itself is healthy as long as it answers; dependencies are reported, not required here.
  return NextResponse.json({ ok: true, checks })
}
