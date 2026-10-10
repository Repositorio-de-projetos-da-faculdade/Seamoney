'use client'

import clsx from 'clsx'
import { demo } from '@/lib/demo/store'
import { checkApproveWallet, roleCan } from '@/lib/demo/rules'
import { walletApprovers } from '@/lib/demo/selectors'
import type { DemoState, Member, Wallet } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { orList } from '@/lib/list'
import { btnDanger, btnGo, btnLine, btnSmall } from '../kit/styles'
import { useRun } from '../kit/useRun'

/** What the viewer can do about a proposed wallet: approve or turn it down, withdraw their own, or who to ask. */
export function WalletDecision({ state, me, supplierId, wallet }: { state: DemoState; me: Member; supplierId: string; wallet: Wallet }) {
  const { t, locale } = useT()
  const { run, busy } = useRun()
  const can = checkApproveWallet(me, wallet).ok
  const own = wallet.proposedBy === me.id
  const approvers = walletApprovers(state, wallet)
  const names = orList(
    approvers.map((m) => m.name),
    locale,
  )

  if (can) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run(`approve-${wallet.id}`, () => demo.approveWallet(supplierId, wallet.id), () => t('app.sup.approved.toast'))}
          className={clsx(btnGo, btnSmall)}
        >
          {t('app.sup.approve')}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run(`reject-${wallet.id}`, () => demo.rejectWallet(supplierId, wallet.id), () => t('app.sup.rejected.toast'))}
          className={clsx(btnDanger, btnSmall)}
        >
          {t('app.sup.reject')}
        </button>
      </div>
    )
  }

  const message = own
    ? approvers.length
      ? t('app.sup.who.own', { names })
      : t('app.sup.who.ownNone')
    : approvers.length
      ? t('app.sup.who.can', { names })
      : t('app.sup.who.none')

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-[13.5px] text-muted">{message}</p>
      {own && roleCan(me.role, 'edit_suppliers') ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run(`withdraw-${wallet.id}`, () => demo.rejectWallet(supplierId, wallet.id), () => t('app.sup.withdrawn.toast'))}
          className={clsx(btnLine, btnSmall)}
        >
          {t('app.sup.withdraw')}
        </button>
      ) : null}
    </div>
  )
}
