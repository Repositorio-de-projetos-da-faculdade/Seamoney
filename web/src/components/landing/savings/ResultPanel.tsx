import clsx from 'clsx'
import { usd, type Locale } from '@/lib/format'
import type { Key } from '@/lib/i18n/dict'
import { Cta } from '../Cta'
import { label } from '../type'
import { CompareBars } from './CompareBars'
import { Odometer } from './Odometer'

/**
 * The answer: the yearly odometer (sized to its column, so even the largest figure fits), the monthly comparison,
 * the honest caveats and the way in.
 */
export function ResultPanel({
  t,
  locale,
  yearDollars,
  savingsCents,
  bankCents,
  routeCents,
}: {
  t: (key: Key) => string
  locale: Locale
  yearDollars: number
  savingsCents: number
  bankCents: number
  routeCents: number
}) {
  const negative = savingsCents < 0

  return (
    <div className="@container">
      <p className="sr-only" aria-live="polite">
        {usd(yearDollars * 100, locale)} {t('lp.save.year')}
      </p>
      <p className={clsx(label, 'text-mint')}>{t('lp.save.year')}</p>
      <div className={clsx('mt-4 transition-opacity duration-500 motion-reduce:transition-none', negative && 'opacity-45')}>
        <Odometer value={yearDollars} locale={locale} className="text-[clamp(3rem,18cqi,10.5rem)] text-white" />
      </div>

      <p className="mt-10 flex items-baseline justify-between gap-4 border-t border-foam/15 pt-5">
        <span className="font-text text-[15px] text-foam/75">{t('calc.result.savings')}</span>
        <span className="font-grotesk text-[1.6rem] tracking-[-0.03em] text-mint tabular-nums">{usd(savingsCents, locale)}</span>
      </p>

      <div className="mt-8">
        <CompareBars bankLabel={t('calc.result.bank')} routeLabel={t('calc.result.route')} bankCents={bankCents} routeCents={routeCents} locale={locale} />
      </div>

      {negative && <p className="mt-8 border-l-2 border-signal pl-4 font-text text-sm leading-relaxed text-foam/85">{t('calc.result.negative')}</p>}

      <p className="mt-8 flex max-w-[56ch] gap-2.5 font-text text-[13px] leading-relaxed text-foam/50">
        <span className="mt-[0.45em] size-2 shrink-0 rotate-45 bg-signal" aria-hidden="true" />
        {t('calc.note')}
      </p>

      <Cta href="/app" className="mt-10">
        {t('lp.cta')}
      </Cta>
    </div>
  )
}
