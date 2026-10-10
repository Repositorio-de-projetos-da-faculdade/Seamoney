'use client'

import { useT } from '@/lib/i18n/client'
import { NETWORKS, type Supplier } from '@/lib/demo/types'
import { activeWallet } from '@/lib/demo/rules'
import { NetworkTag } from '../kit/Status'
import { proposedWallets } from './helpers'

/** Networks where the supplier has an approved wallet, and a note when an address waits for approval. */
export function ListNetworks({ supplier }: { supplier: Supplier }) {
  const { t } = useT()
  const approved = NETWORKS.filter((n) => activeWallet(supplier, n))
  const waiting = proposedWallets(supplier).length > 0
  return (
    <div className="flex flex-col items-start gap-1">
      {approved.length ? (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {approved.map((n) => (
            <NetworkTag key={n} network={n} />
          ))}
        </span>
      ) : (
        <span className="text-[13.5px] font-medium text-warn-ink">{t('app.sup.noWallet')}</span>
      )}
      {waiting ? <span className="text-[12.5px] text-warn-ink">{t('app.sup.waiting')}</span> : null}
    </div>
  )
}
