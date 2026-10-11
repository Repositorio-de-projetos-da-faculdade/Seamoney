import type { Payment } from '@/lib/demo/types'

export type SortKey = 'recent' | 'amount' | 'due'
export interface Sort {
  key: SortKey
  dir: 'asc' | 'desc'
}

/** Queues read oldest first (whoever waits longest goes first); "All" reads newest first. */
export const defaultSort = (queue: boolean): Sort => ({ key: 'recent', dir: queue ? 'asc' : 'desc' })

/** A click on a column sorts by it (largest amount, soonest due first); a second click turns it round. */
export const nextSort = (current: Sort, key: SortKey): Sort =>
  current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'due' ? 'asc' : 'desc' }

export function sortPayments(list: Payment[], sort: Sort): Payment[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  const value = (p: Payment): string | number => {
    if (sort.key === 'amount') return p.quote.amountCents
    // payments without a due date sink to the end either way
    if (sort.key === 'due') return p.dueDate ?? (sort.dir === 'asc' ? '9999' : '0000')
    return p.createdAt
  }
  return [...list].sort((a, b) => {
    const x = value(a)
    const y = value(b)
    return (x < y ? -1 : x > y ? 1 : 0) * sign
  })
}
