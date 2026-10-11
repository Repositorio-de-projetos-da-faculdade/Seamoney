'use client'

import { quote } from '@/lib/demo/pricing'
import { EXAMPLE_AMOUNT_CENTS } from '@/lib/demo/settings'
import { brl, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { Facts } from '../kit/Fields'
import { Simulated } from '../kit/Status'

/** A worked US$ 10,000 payment priced with the costs as typed, so the owner sees the effect before saving. */
export function ExampleQuote({ feeBps, bankFeePct, fxRate }: { feeBps: number; bankFeePct: number; fxRate: number }) {
  const { t, locale } = useT()
  const q = quote(EXAMPLE_AMOUNT_CENTS, { feeBps, bankFeePct, fxRate })
  return (
    <Facts
      rows={[
        { label: t('app.set.exAmount'), value: usd(EXAMPLE_AMOUNT_CENTS, locale) },
        { label: t('app.set.exFee'), value: usd(q.feeCents, locale) },
        { label: t('app.set.exTotal'), value: usd(q.totalCents, locale), total: true },
        {
          label: t('app.set.exBrl'),
          value: (
            <span className="inline-flex flex-wrap items-center gap-2">
              {brl(q.totalBrlCents, locale)}
              <Simulated />
            </span>
          ),
        },
        { label: t('app.set.exBank'), value: usd(q.bankCostCents, locale), note: t('app.set.exBankNote') },
        { label: t('app.set.exSaving'), value: usd(q.savingsCents, locale), note: t('app.set.exSavingNote'), total: true },
      ]}
    />
  )
}
