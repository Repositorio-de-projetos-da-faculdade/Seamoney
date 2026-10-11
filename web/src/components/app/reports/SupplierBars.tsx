'use client'

import Link from 'next/link'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { SupplierShare } from '@/lib/demo/reportData'
import { Empty, Panel, PanelHead } from '../kit/Panel'

/**
 * Who received the money, largest first: one bar per supplier in a single colour (this is magnitude, not identity),
 * the amount at the bar's end and the share and count under it.
 */
export function SupplierBars({ shares }: { shares: SupplierShare[] }) {
  const { t, locale } = useT()
  const top = shares[0]?.cents ?? 1
  return (
    <Panel aria-labelledby="rx-sup">
      <PanelHead id="rx-sup" title={t('app.rep.suppliers')} meta={t('app.rep.suppliers.meta')} />
      {shares.length === 0 ? (
        <Empty title={t('app.rep.empty')}>{t('app.rep.empty.body')}</Empty>
      ) : (
        <ol className="space-y-4 px-5 py-5">
          {shares.map((s) => (
            <li key={s.supplierId}>
              <div className="flex items-baseline justify-between gap-4">
                <Link href={`/app/suppliers/${s.supplierId}`} className="min-w-0 truncate text-[14px] text-ink underline decoration-transparent underline-offset-4 hover:decoration-ink">
                  {s.name}
                </Link>
                <span className="shrink-0 font-grotesk text-[17px] font-light tabular-nums text-ink">{usd(s.cents, locale)}</span>
              </div>
              <div className="mt-1.5 h-3 bg-ink/[0.05]" aria-hidden="true">
                <div className="h-3 rounded-r-[4px] bg-brand-600" style={{ width: `${(s.cents / top) * 100}%` }} />
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{t('app.rx.sup.line', { share: Math.round(s.share * 100), n: s.count })}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
