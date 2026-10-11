import clsx from 'clsx'
import { FEE_BPS } from '@/lib/demo/pricing'
import { usdWhole, type Locale } from '@/lib/format'
import type { Key } from '@/lib/i18n/dict'
import { label } from '../type'
import { Ticket, type TicketData } from './Ticket'

// The two routes side by side, before the calculator. Only the project's own figures, never a market statistic: the
// bank share is the same assumption the calculator starts from (typical estimates 2% to 5%) and the route share is
// the Seamoney fee.

/** The bars share one scale, up to the top of the typical bank range. */
const SCALE_PCT = 5
const BANK = { pct: 3, low: 2, high: 5 }
const ROUTE_PCT = FEE_BPS / 100
/** The worked example on each stub, in cents. */
const SAMPLE_CENTS = 100_000_00

export const pctText = (value: number, locale: Locale) =>
  `${value.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

type Translate = (key: Key, vars?: Record<string, string | number>) => string

export function RouteTickets({ t, locale }: { t: Translate; locale: Locale }) {
  const amount = usdWhole(SAMPLE_CENTS, locale)
  const ticket = (id: TicketData['id'], n: number, pct: number, band?: TicketData['band']): TicketData => ({
    id,
    no: t('lp.save.leak.no', { n: String(n).padStart(2, '0') }),
    name: t(`lp.save.leak.${id}`),
    via: t(`lp.save.leak.${id}.via`),
    lostLabel: t('lp.save.leak.lost'),
    pct,
    pctText: pctText(pct, locale),
    barPct: (pct / SCALE_PCT) * 100,
    band,
    per: t('lp.save.leak.per', { lost: usdWhole(Math.round((SAMPLE_CENTS * pct) / 100), locale), amount }),
    note: t(`lp.save.leak.${id}.note`),
  })
  const band = { left: (BANK.low / SCALE_PCT) * 100, width: ((BANK.high - BANK.low) / SCALE_PCT) * 100 }

  return (
    <div data-s="tickets">
      <p data-s="kicker" className={clsx(label, 'text-mint')}>
        {t('lp.save.leak.kicker')}
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
        <Ticket data={ticket('bank', 1, BANK.pct, band)} />
        <Ticket data={ticket('route', 2, ROUTE_PCT)} />
      </div>
      <p data-s="diff" className="mt-8 flex max-w-[64ch] gap-2.5 font-text text-[13px] leading-relaxed text-foam/55">
        <span className="mt-[0.45em] size-2 shrink-0 rotate-45 bg-signal" aria-hidden="true" />
        {t('lp.save.leak.diff', { pp: pctText(BANK.pct - ROUTE_PCT, locale).replace('%', '') })} {t('lp.save.leak.note')}
      </p>
    </div>
  )
}
