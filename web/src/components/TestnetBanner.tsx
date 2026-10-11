'use client'

import { translate } from '@/lib/i18n/dict'

export function TestnetBanner({ locale }: { locale: 'en' | 'pt' }) {
  const t = (key: any) => translate(locale, key)
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-(--color-signal) text-(--color-ink) text-xs sm:text-sm font-medium py-1.5 px-4 text-center border-t border-(--color-warn-ink)/10">
      {t('disclaimer.demo')}
    </div>
  )
}
