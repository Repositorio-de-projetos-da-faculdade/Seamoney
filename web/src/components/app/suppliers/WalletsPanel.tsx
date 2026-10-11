'use client'

import { useState } from 'react'
import { dateShort } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { activeWallet, roleCan } from '@/lib/demo/rules'
import { memberOf } from '@/lib/demo/selectors'
import { NETWORKS, type DemoState, type Member, type Network, type Supplier, type Wallet } from '@/lib/demo/types'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { Initials } from '../kit/Initials'
import { NetworkTag } from '../kit/Status'
import { btnLine, btnSmall, code, label, td, th } from '../kit/styles'
import { CopyButton } from './CopyButton'
import { groupAddress } from './detailFormat'
import { nameOf, shortAddress } from './helpers'
import { ProposeWalletDialog } from './ProposeWalletDialog'
import { WalletDecision } from './WalletDecision'

function NetworkBlock({ state, me, supplier, network }: { state: DemoState; me: Member; supplier: Supplier; network: Network }) {
  const { t, locale } = useT()
  const approved = activeWallet(supplier, network)
  const pending = supplier.wallets.find((w) => w.network === network && w.status === 'proposed')
  const approver = approved ? memberOf(state, approved.approvedBy) : undefined

  return (
    <div className="px-5 py-5">
      <NetworkTag network={network} />
      {approved ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className={`${code} min-w-0 break-all text-[13.5px] text-ink`}>{groupAddress(approved.address)}</p>
            <CopyButton value={approved.address} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            {approver ? <Initials member={approver} size={22} /> : null}
            {t('app.sup.wallets.approvedBy', { n: approved.version, name: nameOf(state, approved.approvedBy), date: dateShort(approved.approvedAt, locale) })}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[13.5px] font-medium text-warn-ink">{t('app.sup.wallets.noApproved')}</p>
      )}

      {pending ? (
        <div className="mt-4 border-l-2 border-signal bg-desk px-4 py-3">
          <p className={label}>{t('app.sup.wallets.pending')}</p>
          <p className={`${code} mt-1.5 break-all text-ink`}>{groupAddress(pending.address)}</p>
          <p className="mb-3 mt-1 text-[13px] text-muted">
            {t('app.sup.wallets.pendingLine', { n: pending.version, name: nameOf(state, pending.proposedBy), date: dateShort(pending.proposedAt, locale) })}
          </p>
          <WalletDecision state={state} me={me} supplierId={supplier.id} wallet={pending} />
        </div>
      ) : null}
    </div>
  )
}

function History({ state, wallets }: { state: DemoState; wallets: Wallet[] }) {
  const { t, locale } = useT()
  const sorted = [...wallets].sort((a, b) => a.network.localeCompare(b.network) || b.version - a.version)
  return (
    <details className="border-t border-rule px-5 py-3">
      <summary className="cursor-pointer text-[13.5px] font-medium text-ink">{t('app.sup.history', { n: wallets.length })}</summary>
      <div className="relative -mx-4 mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-rule">
              <th className={th}>{t('app.sup.pay.network')}</th>
              <th className={th}>{t('app.sup.hist.version')}</th>
              <th className={th}>{t('app.sup.hist.address')}</th>
              <th className={th}>{t('app.sup.hist.status')}</th>
              <th className={th}>{t('app.sup.hist.approved')}</th>
              <th className={th}>{t('app.sup.hist.proposed')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((w) => (
              <tr key={w.id} className="border-b border-hair last:border-b-0">
                <td className={td}>
                  <NetworkTag network={w.network} />
                </td>
                <td className={`${td} tabular-nums`}>{w.version}</td>
                <td className={`${td} ${code}`} title={w.address}>
                  {shortAddress(w.address)}
                </td>
                <td className={td}>{t(`app.sup.wstatus.${w.status}`)}</td>
                <td className={td}>{w.approvedBy ? t('app.sup.hist.by', { name: nameOf(state, w.approvedBy), date: dateShort(w.approvedAt, locale) }) : '-'}</td>
                <td className={td}>{t('app.sup.hist.by', { name: nameOf(state, w.proposedBy), date: dateShort(w.proposedAt, locale) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

/** One block per network with the approved address and any proposal, then the version history. */
export function WalletsPanel({ state, me, supplier }: { state: DemoState; me: Member; supplier: Supplier }) {
  const { t } = useT()
  const [proposing, setProposing] = useState(false)
  const networks = NETWORKS.filter((n) => supplier.wallets.some((w) => w.network === n))
  const canEdit = roleCan(me.role, 'edit_suppliers')
  const propose = canEdit ? (
    <button type="button" className={`${btnLine} ${btnSmall}`} onClick={() => setProposing(true)}>
      {t('app.sup.wallets.propose')}
    </button>
  ) : null

  return (
    <Panel aria-labelledby="sup-wallets">
      <PanelHead id="sup-wallets" title={t('app.sup.wallets.title')} meta={t('app.sup.wallets.meta')} action={propose} />
      {networks.length === 0 ? (
        <Empty title={t('app.sup.wallets.none')}>{t('app.sup.wallets.none.body')}</Empty>
      ) : (
        <div className="divide-y divide-hair">
          {networks.map((n) => (
            <NetworkBlock key={n} state={state} me={me} supplier={supplier} network={n} />
          ))}
        </div>
      )}
      {supplier.wallets.length > 0 ? <History state={state} wallets={supplier.wallets} /> : null}
      {canEdit ? <ProposeWalletDialog supplier={supplier} open={proposing} onClose={() => setProposing(false)} /> : null}
    </Panel>
  )
}

