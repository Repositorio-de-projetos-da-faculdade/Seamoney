import clsx from 'clsx'
import Link from 'next/link'
import type { T } from '@/lib/i18n/server'
import { Logo } from '../ui'
import { PortClock } from './PortClock'
import { RiseIn } from './RiseIn'
import { label, Rich, starLast } from './type'

/** The slogan, where to go next and the disclosure; the wordmark across the full width; the two ports' clocks. */
export function LandingFooter({ t }: { t: T }) {
  const links = [
    ['#cargo', t('nav.how')],
    ['#savings', t('nav.calculator')],
    ['/dashboard', t('nav.dashboard')],
  ]
  return (
    <footer className="relative z-10 overflow-hidden border-t border-foam/10 bg-abyss px-5 pt-20 md:px-10 md:pt-28 lg:pl-24">
      <div className="grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="lp-display font-grotesk text-[clamp(2rem,3.4vw,3rem)] leading-[1] tracking-[-0.04em] text-white">
            <Rich text={starLast(t('brand.closing'))} />
          </p>
          <p className="mt-5 max-w-[36ch] font-text text-[15px] leading-relaxed text-foam/60">{t('brand.pitch')}</p>
        </div>
        <nav aria-label={t('footer.nav')} className="md:col-span-3 md:col-start-7">
          <ul className="space-y-1">
            {links.map(([href, text]) => (
              <li key={href}>
                <Link href={href} className="group inline-flex min-h-11 items-center gap-3 font-grotesk text-[1.6rem] tracking-[-0.03em] text-foam/80 transition-colors duration-300 hover:text-white">
                  <span className="h-px w-0 bg-mint transition-[width] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:w-6" aria-hidden="true" />
                  {text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3 md:col-start-10">
          <h2 className={clsx(label, 'flex items-center gap-2.5 text-signal')}>
            <span className="size-2 rotate-45 bg-signal" aria-hidden="true" />
            {t('footer.disclosure')}
          </h2>
          <p className="mt-4 font-text text-[14px] leading-relaxed text-foam/65">{t('disclaimer.demo')}</p>
        </div>
      </div>

      <div className="mt-24 select-none md:mt-32" aria-hidden="true">
        <RiseIn>
          <Logo height={1} className="h-auto w-full opacity-95" />
        </RiseIn>
      </div>
      <div className={clsx(label, 'mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-foam/10 py-6 text-foam/45')}>
        <p>{t('footer.built')}</p>
        <p className="flex gap-6" aria-label={t('lp.clock')}>
          <span>
            Santos <span className="text-foam/80"><PortClock zone="America/Sao_Paulo" /></span>
          </span>
          <span>
            Shenzhen <span className="text-foam/80"><PortClock zone="Asia/Shanghai" /></span>
          </span>
        </p>
        <p>Tempo Moderato · Chain 42431</p>
      </div>
    </footer>
  )
}
