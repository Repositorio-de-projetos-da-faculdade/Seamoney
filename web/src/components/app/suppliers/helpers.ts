import type { Locale } from '@/lib/format'
import type { DemoState, Supplier, Wallet } from '@/lib/demo/types'
import { memberOf } from '@/lib/demo/selectors'

/** "China" from CN; falls back to the code when the runtime does not know it. */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames(locale === 'pt' ? 'pt-BR' : 'en', { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export const nameOf = (state: DemoState, id: string | null | undefined) => memberOf(state, id)?.name ?? '-'

/** Address as 0x1234abcd...abcd, for lists where the full one would not fit. */
export const shortAddress = (a: string) => (a.length <= 16 ? a : `${a.slice(0, 8)}…${a.slice(-6)}`)

export const proposedWallets = (supplier: Supplier): Wallet[] => supplier.wallets.filter((w) => w.status === 'proposed')
