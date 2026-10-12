'use client'

import Link from 'next/link'
import { seconds, shortHash } from '@/lib/format'
import { explorerTxOn } from '@/lib/links'
import { useT } from '@/lib/i18n/client'
import { latestSettlement } from '@/lib/demo/insights'
import type { DemoState } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { Stamp, stampDate } from '../kit/Stamp'
import { Simulated } from '../kit/Status'
import { code, label, textLink } from '../kit/styles'

/** The last payment that passed reconciliation, as a stamped receipt. Simulated settlements say so on the document. */
export function LatestSettlement({ state }: { state: DemoState }) {
  const { t, locale } = useT()
  const p = latestSettlement(state)
  const s = p?.settlement
  const recon = p?.recon

  return (
    <Panel aria-labelledby="home-receipt">
      <PanelHead id="home-receipt" title={t('app.home.receipt')} />
      {!p || !s || !recon ? (
        <Empty title={t('app.home.receipt.none')} />
      ) : (
        <div className="space-y-4 px-5 pb-5">
          <p className="text-[13px] text-muted">{t('app.home.receiptMeta')}</p>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <Stamp
              kind="reconciled"
              word={t('app.stamp.reconciled')}
              lines={[stampDate(s.paidAt, locale), shortHash(s.txHash)]}
              at={s.paidAt}
            />
            <dl className="min-w-0 flex-1 space-y-3 text-[14px]">
              <div>
                <dt className={label}>{t('app.home.receipt.checks', { n: Object.values(recon.checks).filter(Boolean).length })}</dt>
                <dd className="mt-1 text-ink">{t('app.home.receipt.confirm', { s: seconds(s.confirmMs, locale) })}</dd>
              </div>
              <div>
                <dt className={label}>{t('app.home.receipt.tx')}</dt>
                <dd className={`mt-1 ${code} text-ink`}>{shortHash(s.txHash)}</dd>
              </div>
            </dl>
          </div>
          {s.mode === 'simulated' ? (
            <Simulated />
          ) : (
            <Link href={explorerTxOn(s.network, s.txHash)} target="_blank" rel="noopener noreferrer" className={`${textLink} text-[13.5px]`}>
              {t('app.home.receipt.view')}
            </Link>
          )}
        </div>
      )}
    </Panel>
  )
}
