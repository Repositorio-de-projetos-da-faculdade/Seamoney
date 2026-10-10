export type Locale = 'en' | 'pt'

const tag = (l: Locale) => (l === 'pt' ? 'pt-BR' : 'en-US')

export function usd(cents: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(tag(locale), { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function brl(cents: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(tag(locale), { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function compactUsd(cents: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(tag(locale), {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100)
}

export function dateShort(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat(tag(locale), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  )
}

export function dateTime(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat(tag(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(iso))
}

export function monthLabel(yyyyMm: string, locale: Locale = 'en'): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Intl.DateTimeFormat(tag(locale), { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)))
}

export function seconds(ms: number | null | undefined, locale: Locale = 'en'): string {
  if (ms == null) return '-'
  return `${new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1 }).format(ms / 1000)} s`
}

export const shortHash = (h: string | null | undefined, head = 8, tail = 6) =>
  !h ? '-' : h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`
