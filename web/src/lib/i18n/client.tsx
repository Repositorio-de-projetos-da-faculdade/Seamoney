'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { translate, type Key, type Locale } from './dict'

const LocaleContext = createContext<Locale>('en')

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export const useLocale = () => useContext(LocaleContext)

export function useT() {
  const locale = useLocale()
  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )
  return useMemo(() => ({ t, locale }), [t, locale])
}
