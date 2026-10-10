import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, translate, type Key, type Locale } from './dict'

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get('lang')?.value
  return value === 'pt' || value === 'en' ? value : DEFAULT_LOCALE
}

export type T = (key: Key, vars?: Record<string, string | number>) => string

export async function getT(): Promise<{ t: T; locale: Locale }> {
  const locale = await getLocale()
  return { locale, t: (key, vars) => translate(locale, key, vars) }
}
