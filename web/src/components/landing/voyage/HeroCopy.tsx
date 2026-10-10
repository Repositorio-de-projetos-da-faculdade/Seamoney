'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { Cta } from '../Cta'
import { PortClock } from '../PortClock'
import { Reveal } from '../Reveal'
import { displayXL, fadeDelay, label, lede } from '../type'

/** Over the opening shot: the promise, what is live and what is simulated, the two ways in and the two ports' clocks. */
export function HeroCopy() {
  const { t } = useT()

  return (
    <section className="relative z-10 flex h-[100svh] min-h-[640px] flex-col justify-between px-5 pb-6 pt-28 md:px-10 md:pb-9 md:pt-32 lg:pl-24">
      <Reveal as="h1" on="load" text={t('lp.hero.title')} className={clsx(displayXL, 'max-w-[8em] text-white')} />

      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="lp-fade" style={fadeDelay(0.7)}>
          <p className={clsx(lede, 'max-w-[38ch] text-foam/75')}>{t('lp.hero.sub')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Cta href="/dashboard/orders/new">{t('lp.cta')}</Cta>
            <Cta href="#savings" tone="ghost">
              {t('lp.cta2')}
            </Cta>
          </div>
        </div>

        <div className={clsx(label, 'lp-fade flex flex-col gap-2.5 md:items-end md:text-right')} style={fadeDelay(0.95)}>
          <p className="flex items-center gap-2.5 text-foam/80">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-mint opacity-60" />
              <span className="relative size-2 rounded-full bg-mint" />
            </span>
            {t('lp.live')}
          </p>
          <p className="flex items-center gap-2.5 text-signal">
            <span className="size-2 rotate-45 bg-signal" aria-hidden="true" />
            {t('lp.sim')}
          </p>
          <dl className="mt-4 flex gap-8 border-t border-foam/15 pt-4 text-foam/55 max-md:hidden" aria-label={t('lp.clock')}>
            <div>
              <dt>Santos</dt>
              <dd className="mt-1 text-foam">
                <PortClock zone="America/Sao_Paulo" />
              </dd>
            </div>
            <div>
              <dt>Shenzhen</dt>
              <dd className="mt-1 text-foam">
                <PortClock zone="Asia/Shanghai" />
              </dd>
            </div>
          </dl>
          <p className="mt-3 flex items-center gap-3 text-foam/55 max-md:hidden">
            {t('lp.scroll')}
            <span className="relative block h-8 w-px overflow-hidden bg-foam/15" aria-hidden="true">
              <span className="lp-cue absolute inset-x-0 top-0 block h-1/3 bg-mint" />
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
