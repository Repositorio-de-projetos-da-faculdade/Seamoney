'use client'

import clsx from 'clsx'
import { Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useT } from '@/lib/i18n/client'

export function LanguageToggle({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter()
  const locale = useLocale()
  const { t } = useT()
  const next = locale === 'en' ? 'pt' : 'en'

  return (
    <button
      type="button"
      onClick={() => {
        // A plain cookie is enough: the server reads it on every request.
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`
        router.refresh()
      }}
      className={clsx(
        'inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors',
        onDark
          ? 'border border-white/15 text-white/85 hover:border-white/35 hover:bg-white/10 hover:text-white'
          : 'border border-line text-muted hover:border-brand-500/40 hover:bg-brand-50 hover:text-ink',
      )}
    >
      <Globe size={15} aria-hidden="true" />
      {t('lang.switch')}
    </button>
  )
}
