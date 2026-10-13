import clsx from 'clsx'
import Link from 'next/link'
import type { T } from '@/lib/i18n/server'
import { LEGAL_PATH } from '../legal/types'
import { Logo } from '../ui'
import { VoyageLine } from './footer/VoyageLine'
import { SAMPLE_REFERENCE } from './sample'
import { appLink, externalProps } from './site'
import { label } from './type'

/** The brand and what it is for, where to go next and the disclosure; then the route between the two ports. */
export function LandingFooter({ t }: { t: T }) {
  const links = [
    ['#cargo', t('nav.how')],
    ['#savings', t('nav.calculator')],
    [appLink(t).href, appLink(t).label],
  ]
  return (
    <footer className="relative z-10 overflow-hidden border-t border-foam/10 bg-abyss px-5 pt-20 md:px-10 md:pt-28 lg:pl-24">
      <div className="grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo height={30} />
          <p className="mt-6 max-w-[30ch] font-grotesk text-[1.3rem] font-light leading-[1.34] tracking-[-0.02em] text-foam/80 md:text-[1.45rem]">
            {t('brand.pitch')}
          </p>
        </div>
        <nav aria-label={t('footer.nav')} className="md:col-span-3 md:col-start-7">
          <ul className="space-y-1">
            {links.map(([href, text]) => (
              <li key={href}>
                <Link href={href} prefetch={false} {...externalProps(href)} className="group inline-flex min-h-11 items-center gap-3 font-grotesk text-[1.6rem] tracking-[-0.03em] text-foam/80 transition-colors duration-300 hover:text-white">
                  <span className="h-px w-0 bg-mint transition-[width] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:w-6" aria-hidden="true" />
                  {text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3 md:col-start-10">
          <h2 className={clsx(label, 'text-mint')}>{t('footer.disclosure')}</h2>
          <p className="mt-4 font-text text-[14px] leading-relaxed text-foam/65">{t('lp.footer.about')}</p>
        </div>
      </div>

      <div className="mt-24 md:mt-32">
        <VoyageLine memo={SAMPLE_REFERENCE} />
      </div>

      <div className={clsx(label, 'mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-foam/10 py-6 text-foam/45')}>
        <p>{t('footer.built')}</p>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href={LEGAL_PATH.terms} className="transition-colors hover:text-white">
            {t('legal.terms')}
          </Link>
          <Link href={LEGAL_PATH.privacy} className="transition-colors hover:text-white">
            {t('legal.privacy')}
          </Link>
          <span>Tempo Moderato · Chain 42431 · Solana devnet</span>
        </p>
      </div>
    </footer>
  )
}
