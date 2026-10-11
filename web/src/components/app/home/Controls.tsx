'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import { controls } from '@/lib/demo/insights'
import { supplierOf } from '@/lib/demo/selectors'
import type { DemoState } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { label } from '../kit/styles'

type Row = { key: string; href: string; kind: 'app.home.controls.review' | 'app.home.controls.wallet' | 'app.home.controls.stale'; what: string }

/** Decisions that no daily task covers: a reconciliation difference, a wallet to approve, an approval gone stale. */
export function Controls({ state }: { state: DemoState }) {
  const { t } = useT()
  const c = controls(state)

  const rows: Row[] = [
    ...c.inReview.map((p) => ({
      key: `review-${p.id}`,
      href: `/app/payments/${p.id}`,
      kind: 'app.home.controls.review' as const,
      what: `${supplierOf(state, p)?.name ?? ''}, ${p.invoiceNumber}`,
    })),
    ...c.walletsAwaiting.map(({ supplier, wallet }) => ({
      key: `wallet-${wallet.id}`,
      href: `/app/suppliers/${supplier.id}`,
      kind: 'app.home.controls.wallet' as const,
      what: supplier.name,
    })),
    ...c.stale.map((p) => ({
      key: `stale-${p.id}`,
      href: `/app/payments/${p.id}`,
      kind: 'app.home.controls.stale' as const,
      what: `${supplierOf(state, p)?.name ?? ''}, ${p.invoiceNumber}`,
    })),
  ]

  return (
    <Panel aria-labelledby="home-controls">
      <PanelHead id="home-controls" title={t('app.home.controls')} />
      {rows.length === 0 ? (
        <Empty title={t('app.home.controls.none')} />
      ) : (
        <ul className="divide-y divide-hair">
          {rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="group block px-5 py-3.5 transition-colors hover:bg-paper-hi">
                <span className={`${label} block`}>{t(r.kind)}</span>
                <span className="block truncate text-[14px] text-ink group-hover:underline">{r.what}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
