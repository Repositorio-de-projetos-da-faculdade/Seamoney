'use client'

import { usePathname } from 'next/navigation'
import { translate, type Key } from '@/lib/i18n/dict'

// Not on the landing page (/): there, what is simulated is told only in the roadmap.
export function TestnetBanner({ locale }: { locale: 'en' | 'pt' }) {
  const pathname = usePathname()
  const t = (key: Key) => translate(locale, key)
  if (pathname === '/') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-(--color-signal) text-(--color-ink) text-xs sm:text-sm font-medium py-1.5 px-4 text-center border-t border-(--color-warn-ink)/10">
      {t('disclaimer.demo')}
    </div>
  )
}
