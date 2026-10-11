'use client'

import Link from 'next/link'
import { relative } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { NETWORKS, type DemoState, type Member, type Supplier, type Wallet } from '@/lib/demo/types'
import { activeWallet } from '@/lib/demo/rules'
import { NetworkTag } from '../kit/Status'
import { Panel, PanelHead } from '../kit/Panel'
import { code, textLink } from '../kit/styles'
import { nameOf, proposedWallets, shortAddress } from './helpers'
import { WalletDecision } from './WalletDecision'

/** Why a proposed address waits: a new address for a known network, a new network, or a first wallet. */
function reasonOf(supplier: Supplier, wallet: Wallet): 'version' | 'network' | 'new' {
  if (wallet.version > 1) return 'version'
  const hasApproved = NETWORKS.some((n) => activeWallet(supplier, n))
  return hasApproved ? 'network' : 'new'
}

/** Every proposed wallet in the company, so the person who can approve finds them in one place. */
export function PendingWallets({ state, me }: { state: DemoState; me: Member }) {
  const { t, locale } = useT()
  const items = state.suppliers
    .flatMap((s) => proposedWallets(s).map((w) => ({ supplier: s, wallet: w })))
    .sort((a, b) => b.wallet.proposedAt.localeCompare(a.wallet.proposedAt))
  if (items.length === 0) return null

  return (
    <Panel className="mb-6 border-signal/60" aria-labelledby="pending-wallets">
      <PanelHead id="pending-wallets" title={t('app.sup.pending.title')} meta={t('app.sup.pending.meta')} />
      <ul className="divide-y divide-hair">
        {items.map(({ supplier, wallet }) => {
          const reason = reasonOf(supplier, wallet)
          return (
            <li key={wallet.id} className="grid gap-x-6 gap-y-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/app/suppliers/${supplier.id}`} className={textLink}>
                    {supplier.name}
                  </Link>
                  <NetworkTag network={wallet.network} />
                  <span className="text-[13px] text-muted">{t('app.sup.pending.version', { n: wallet.version })}</span>
                </p>
                <p className="mt-1 text-[13.5px] font-medium text-warn-ink">
                  {reason === 'version'
                    ? t('app.slist.reason.version', { n: wallet.version - 1 })
                    : reason === 'network'
                      ? t('app.slist.reason.network')
                      : t('app.slist.reason.new')}
                </p>
                <p className={`${code} mt-1 break-all text-ink/80`} title={wallet.address}>
                  {shortAddress(wallet.address)}
                </p>
                <p className="mt-1 text-[13px] text-muted">{t('app.sup.pending.by', { name: nameOf(state, wallet.proposedBy), when: relative(wallet.proposedAt, locale) })}</p>
              </div>
              <WalletDecision state={state} me={me} supplierId={supplier.id} wallet={wallet} />
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
