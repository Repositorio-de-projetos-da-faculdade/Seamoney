import clsx from 'clsx'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { displayL, label, lede } from '../landing/type'
import { Logo } from '../ui'
import { privacy } from './content/privacy'
import { terms } from './content/terms'
import { LegalSectionView } from './LegalSectionView'
import { LEGAL_PATH, LEGAL_UPDATED, type LegalKind } from './types'

const DOCS = { terms, privacy }

const updatedOn = (locale: Locale) =>
  new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED))

/**
 * The terms of use and the privacy policy, on the landing's paper sheet under a night bar. Rendered by
 * src/app/terms and src/app/privacy (Next) and by landing-static/legal.tsx, so it imports nothing server-only.
 */
export function LegalPage({ kind, t, locale }: { kind: LegalKind; t: T; locale: Locale }) {
  const doc = DOCS[kind][locale]
  const other: LegalKind = kind === 'terms' ? 'privacy' : 'terms'

  return (
    <div className="lp min-h-svh bg-abyss">
      <header className="flex h-[72px] items-center justify-between gap-6 px-5 md:px-10">
        <Link href="/" aria-label="Seamoney">
          <Logo height={26} />
        </Link>
        <nav className={clsx(label, 'flex items-center gap-6 text-foam/70')}>
          <Link href={LEGAL_PATH[other]} className="py-2 transition-colors hover:text-white">
            {t(`legal.${other}`)}
          </Link>
          <Link href="/" className="py-2 transition-colors hover:text-white max-sm:hidden">
            {t('legal.home')}
          </Link>
        </nav>
      </header>

      <main className="lp-paper bg-paper px-5 py-16 text-ink md:px-10 md:py-24 lg:pl-24">
        <div className="max-w-[46rem]">
          <p className={clsx(label, 'text-ink/55')}>
            {t('legal.updated')} {updatedOn(locale)}
          </p>
          <h1 className={clsx(displayL, 'mt-5 text-ink')}>{doc.title}</h1>
          <p className={clsx(lede, 'mt-6 text-[1.25rem] text-ink/80 md:text-[1.4rem]')}>{doc.intro}</p>
        </div>

        <div className="mt-14 grid gap-12 md:mt-20 lg:grid-cols-[14rem_minmax(0,46rem)] lg:gap-16">
          <nav aria-label={t('legal.contents')} className="lg:sticky lg:top-8 lg:self-start">
            <p className={clsx(label, 'text-ink/55')}>{t('legal.contents')}</p>
            <ol className="mt-4 space-y-2">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="font-text text-[14px] text-ink/70 underline-offset-4 hover:text-ink hover:underline">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="space-y-12">
            {doc.sections.map((s, i) => (
              <LegalSectionView key={s.id} section={s} n={i + 1} />
            ))}
          </div>
        </div>
      </main>

      <footer className={clsx(label, 'flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-6 text-foam/45 md:px-10 lg:pl-24')}>
        <p>{t('footer.built')}</p>
        <p className="flex gap-6">
          <Link href={LEGAL_PATH.terms} className="hover:text-white">
            {t('legal.terms')}
          </Link>
          <Link href={LEGAL_PATH.privacy} className="hover:text-white">
            {t('legal.privacy')}
          </Link>
        </p>
      </footer>
    </div>
  )
}
