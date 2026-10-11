import { roleCan } from '@/lib/demo/rules'
import type { Activity, Member } from '@/lib/demo/types'

/** Newest time a member acted, or null when the log has nothing from them yet. */
export function lastActiveAt(activity: Activity[], memberId: string): string | null {
  let latest: string | null = null
  for (const a of activity) {
    if (a.actorId !== memberId) continue
    if (latest === null || Date.parse(a.at) > Date.parse(latest)) latest = a.at
  }
  return latest
}

/** The first active person who can create a payment, and the first other active person who can approve one. */
export function makerAndChecker(members: Member[]): { maker: Member | null; checker: Member | null } {
  const active = members.filter((m) => m.status === 'active')
  const maker = active.find((m) => roleCan(m.role, 'create_payment')) ?? null
  const checker = active.find((m) => m.id !== maker?.id && roleCan(m.role, 'approve')) ?? null
  return { maker, checker }
}
