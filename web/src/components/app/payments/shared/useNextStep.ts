'use client'

import { orList } from '@/lib/list'
import { approvalIsStale, checkApprove, checkSend, roleCan } from '@/lib/demo/rules'
import { memberOf, nextActors } from '@/lib/demo/selectors'
import type { DemoState, Member, Payment } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'

export type StepTone = 'you' | 'wait' | 'moving' | 'done' | 'stop' | 'closed'

export interface NextStep {
  tone: StepTone
  /** one sentence: whose turn it is and what happens next */
  text: string
  /** a few words for a table column */
  short: string
}

/**
 * Where a payment stands for the person looking at it. The same sentence appears in the list and on the payment's
 * page, so people learn one vocabulary: your turn, waiting for someone named, on its way, closed.
 */
export function useNextStep() {
  const { t, locale } = useT()
  return (state: DemoState, me: Member, p: Payment): NextStep => {
    const names = orList(
      nextActors(state, p).map((m) => m.name),
      locale,
    )
    switch (p.status) {
      case 'pending_approval': {
        if (checkApprove(me, p).ok) return { tone: 'you', text: t('app.next.approve.you'), short: t('app.next.approve.youShort') }
        const own = p.createdBy === me.id
        return {
          tone: 'wait',
          text: own ? t('app.next.approve.own', { names }) : t('app.next.approve.wait', { names }),
          short: t('app.next.approve.waitShort', { names }),
        }
      }
      case 'approved': {
        if (approvalIsStale(state, p)) {
          const you = roleCan(me.role, 'create_payment')
          return { tone: you ? 'you' : 'stop', text: t('app.next.stale'), short: t('app.next.staleShort') }
        }
        if (checkSend(me, p).ok) return { tone: 'you', text: t('app.next.send.you'), short: t('app.next.send.youShort') }
        return { tone: 'wait', text: t('app.next.send.wait', { names }), short: t('app.next.send.waitShort', { names }) }
      }
      case 'sending':
        return { tone: 'moving', text: t('app.next.sending', { network: t(`app.net.${p.network}`) }), short: t('app.next.sendingShort') }
      case 'sent':
        return { tone: 'moving', text: t('app.next.sent'), short: t('app.next.sentShort') }
      case 'reconciled':
        return { tone: 'done', text: t('app.next.reconciled'), short: t('app.next.reconciledShort') }
      case 'in_review':
        return { tone: 'stop', text: t('app.next.review'), short: t('app.next.reviewShort') }
      case 'rejected':
        return {
          tone: 'closed',
          text: t('app.next.rejected', { who: memberOf(state, p.rejection?.by)?.name ?? '', reason: p.rejection?.reason ?? '' }),
          short: t('app.next.closedShort'),
        }
      case 'cancelled':
        return {
          tone: 'closed',
          text: t('app.next.cancelled', { who: memberOf(state, p.cancellation?.by)?.name ?? '', reason: p.cancellation?.reason ?? '' }),
          short: t('app.next.closedShort'),
        }
    }
  }
}
