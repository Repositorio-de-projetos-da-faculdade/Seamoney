// Server-side client for the Java rules API. Used by Server Components only.
import type { MonthPoint, Order, OrderEvent, Proof, Stats } from './types'

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

export async function listOrders(limit = 200): Promise<Order[]> {
  const body = await get<{ orders: Order[] }>(`/api/orders?limit=${limit}`)
  return body?.orders ?? []
}

export async function getOrder(id: string): Promise<{ order: Order; events: OrderEvent[] } | null> {
  return get(`/api/orders/${encodeURIComponent(id)}`)
}

export async function getStats(): Promise<{ stats: Stats; series: MonthPoint[] }> {
  const body = await get<{ stats: Stats; series: MonthPoint[] }>('/api/stats')
  if (!body) throw new RulesApiError('Stats are unavailable.', 500)
  return body
}

export async function getProof(id: string): Promise<Proof | null> {
  return get(`/api/proof/${encodeURIComponent(id)}`)
}
