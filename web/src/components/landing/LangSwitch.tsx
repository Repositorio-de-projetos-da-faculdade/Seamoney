'use client'

import clsx from 'clsx'
import { useLocale, useSwitchLocale, useT } from '@/lib/i18n/client'
import type { Locale } from '@/lib/i18n/dict'
import { label } from './type'

const LOCALES: Locale[] = ['en', 'pt']

/** EN / PT, set in the data face: the current language lit, the other one a click away. */
export function LangSwitch({ className }: { className?: string }) {
  const locale = useLocale()
  const switchLocale = useSwitchLocale()
  const { t } = useT()

  return (
    <div role="group" aria-label={t('lang.switch')} className={clsx(label, 'flex items-center', className)}>
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="px-1 text-foam/30" aria-hidden="true">/</span>}
          <button
            type="button"
            lang={l === 'pt' ? 'pt-BR' : 'en'}
            aria-pressed={l === locale}
            onClick={() => l !== locale && switchLocale(l)}
            className={clsx('min-h-10 px-1 transition-colors', l === locale ? 'text-foam' : 'text-foam/45 hover:text-foam')}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
