import { DEFAULT_LOCALE, translate, type Key, type Locale } from '@/lib/i18n/dict'

// The Next app reads the language from the `lang` cookie on the server; here the browser reads the same cookie, so
// the language switch behaves the same way (it sets the cookie and reloads). Shared by every page of the static build.

const saved = document.cookie.match(/(?:^|;\s*)lang=(en|pt)\b/)?.[1] as Locale | undefined
export const locale: Locale = saved ?? DEFAULT_LOCALE
export const t = (key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars)

document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en'
