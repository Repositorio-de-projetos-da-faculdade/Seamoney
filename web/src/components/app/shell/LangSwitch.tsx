'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useLocale, useT } from '@/lib/i18n/client'

function saveLang(lang: 'en' | 'pt') {
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`
}

/** EN / PT, like the landing's switch. Saved in the `lang` cookie the whole site reads. */
export function LangSwitch({ onNight = false }: { onNight?: boolean }) {
  const router = useRouter()
  const locale = useLocale()
  const { t } = useT()
  const set = (lang: 'en' | 'pt') => {
    if (lang === locale) return
    saveLang(lang)
    router.refresh()
  }
  return (
    <div role="group" aria-label={t('lang.switch')} className="flex items-center gap-1 font-data text-[11px] font-medium tracking-[0.08em]">
      {(['en', 'pt'] as const).map((lang, i) => (
        <span key={lang} className="flex items-center gap-1">
          {i > 0 ? <span className={onNight ? 'text-foam/25' : 'text-ink/25'}>/</span> : null}
          <button
            type="button"
            aria-pressed={locale === lang}
            onClick={() => set(lang)}
            className={clsx(
              'grid h-8 min-w-7 place-items-center uppercase transition-colors',
              locale === lang ? (onNight ? 'text-white' : 'text-ink') : onNight ? 'text-foam/45 hover:text-foam' : 'text-ink/40 hover:text-ink',
            )}
          >
            {lang}
          </button>
        </span>
      ))}
    </div>
  )
}
