'use client'

import Link from 'next/link'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { approvalIsStale, checkApprove, checkCancel, checkRecheck, checkSend, roleCan } from '@/lib/demo/rules'
import { demo } from '@/lib/demo/store'
import type { DemoState, Member, Payment } from '@/lib/demo/types'
import { Spinner } from '../../../ui'
import { btnGo, btnLine, btnSmall } from '../../kit/styles'
import { useRun } from '../../kit/useRun'

/** The moves a member can make on one payment right now, with the handlers that run them. */
export function usePaymentActions(state: DemoState, me: Member, p: Payment) {
  const { t, locale } = useT()
  const { run, busy } = useRun()
  const stale = approvalIsStale(state, p)

  const approve = () => run('approve', () => demo.approve(p.id), () => t('app.doc.done.approved', { invoice: p.invoiceNumber }))
  const send = () =>
    run(
      'send',
      () => demo.send(p.id),
      (status) => (status === 'reconciled' ? t('app.doc.done.reconciled', { invoice: p.invoiceNumber }) : status === 'in_review' ? t('app.doc.done.review') : t('app.doc.done.sent')),
    )
  const recheck = () => run('recheck', () => demo.recheck(p.id), (status) => (status === 'sent' ? t('app.doc.done.notYet') : t('app.doc.done.reconciled', { invoice: p.invoiceNumber })))
  const reapprove = () => run('reapprove', () => demo.requestReapproval(p.id), () => t('app.doc.done.reapproval'))

  return {
    payment: p,
    locale,
    run,
    busy,
    approve,
    send,
    recheck,
    reapprove,
    canApprove: checkApprove(me, p).ok,
    canSend: checkSend(me, p).ok && !stale,
    canReapprove: stale && roleCan(me.role, 'create_payment'),
    canRecheck: checkRecheck(me, p).ok,
    canCancel: checkCancel(me, p).ok,
  }
}

export type PaymentActions = ReturnType<typeof usePaymentActions>

/**
 * The buttons for whose turn it is. Reject opens a reason dialog owned by the parent, so it appears only when the
 * parent passes onReject. Sticky bar leaves it out: rejecting is a decision for the full bar.
 */
export function PaymentButtons({ actions: a, onReject, small = false }: { actions: PaymentActions; onReject?: () => void; small?: boolean }) {
  const { t } = useT()
  const p = a.payment
  const busy = a.busy
  const size = small ? ` ${btnSmall}` : ''
  return (
    <div className="flex flex-wrap items-center gap-2.5 print:hidden">
      {a.canApprove ? (
        <>
          {onReject ? (
            <button type="button" className={`${btnLine}${size}`} onClick={onReject} disabled={!!busy}>
              {t('app.doc.reject')}
            </button>
          ) : null}
          <button type="button" className={`${btnGo}${size}`} onClick={a.approve} disabled={!!busy}>
            {busy === 'approve' ? <Spinner className="size-4" /> : null}
            {t('app.doc.approve')}
          </button>
        </>
      ) : null}
      {a.canSend ? (
        <button type="button" className={`${btnGo}${size}`} onClick={a.send} disabled={!!busy}>
          {busy === 'send' ? <Spinner className="size-4" /> : null}
          {t('app.doc.send', { amount: usd(p.quote.amountCents, a.locale) })}
        </button>
      ) : null}
      {a.canReapprove ? (
        <button type="button" className={`${btnGo}${size}`} onClick={a.reapprove} disabled={!!busy}>
          {t('app.doc.reapprove')}
        </button>
      ) : null}
      {a.canRecheck ? (
        <button type="button" className={`${btnLine}${size}`} onClick={a.recheck} disabled={!!busy}>
          {busy === 'recheck' ? <Spinner className="size-4" /> : null}
          {t('app.doc.recheck')}
        </button>
      ) : null}
      {p.status === 'reconciled' ? (
        <Link href={`/app/proof/${p.id}`} className={`${btnLine}${size}`}>
          {t('app.doc.openProof')}
        </Link>
      ) : null}
    </div>
  )
}
