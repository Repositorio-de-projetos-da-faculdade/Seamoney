import clsx from 'clsx'
import type { T } from '@/lib/i18n/server'
import { Cta } from './Cta'
import { Reveal } from './Reveal'
import { primaryCta, STATIC_SITE } from './site'
import { Lede } from './lede/Lede'
import { displayXL, label, starLast } from './type'

/**
 * The ship sails off towards the moon (the WebGL scene comes back behind this transparent section) under the
 * team's slogan, with the two ways in.
 */
export function Finale({ t }: { t: T }) {
  return (
    <section id="finale" className="relative z-10 h-[220vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-end px-5 pb-10 md:px-10 md:pb-14 lg:pl-24">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(2_8_16/0.85),transparent_55%)]" aria-hidden="true" />
        <div className="relative">
          <Lede size="md" text={t('brand.tagline')} />
          <Reveal as="p" start="top 5%" text={starLast(t('brand.closing'))} className={clsx(displayXL, 'mt-6 max-w-[9em] text-white')} />
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Cta href={primaryCta(t).href}>{primaryCta(t).label}</Cta>
            {!STATIC_SITE && (
              <Cta href="/dashboard" tone="ghost">
                {t('lp.close.cta2')}
              </Cta>
            )}
            <p className={clsx(label, 'flex items-center gap-2.5 text-signal md:ml-auto')}>
              <span className="size-2 rotate-45 bg-signal" aria-hidden="true" />
              {t('lp.sim')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
