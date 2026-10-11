import type { Locale } from '@/lib/format'
import type { Payment } from '@/lib/demo/types'

const ZONES: Record<string, string> = { CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong', VN: 'Asia/Ho_Chi_Minh', IN: 'Asia/Kolkata' }

/** IANA time zone of a supplier's country, UTC when the country is not mapped. */
export const zoneFor = (country: string): string => ZONES[country] ?? 'UTC'

/** Hour and minute in a zone, read from the clock at call time (24 hours). */
export function formatClock(zone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: zone,
  }).format(new Date(Date.now()))
}

/** Wallet address in blocks of four characters, for reading only. Copy uses the raw value. */
export const groupAddress = (address: string): string => address.match(/.{1,4}/g)?.join(' ') ?? address

/** Sum of the quoted amounts of these payments, in cents. */
export const totalCents = (payments: Payment[]): number => payments.reduce((sum, p) => sum + p.quote.amountCents, 0)

/** Average in cents, rounded half up. Zero when there are no payments. */
export const averageCents = (total: number, count: number): number => (count ? Math.round(total / count) : 0)
