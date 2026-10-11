import { approvalIsStale, checkApprove, checkSend, roleCan } from '@/lib/demo/rules'
import type { DemoState, Member, Payment } from '@/lib/demo/types'

/** The queues of the payments list. Approvals and reconciliation used to be pages of their own; now they are views. */
// the tabs on screen; 'network' and 'closed' stay reachable by address (?view=) from the home page
export const VIEWS = ['mine', 'approval', 'ready', 'review', 'done', 'all'] as const
const ALL_VIEWS = [...VIEWS, 'network', 'closed'] as const
export type View = (typeof ALL_VIEWS)[number]
export const isView = (v: string | null): v is View => !!v && (ALL_VIEWS as readonly string[]).includes(v)

export function inView(state: DemoState, me: Member, p: Payment, view: View): boolean {
  switch (view) {
    case 'mine':
      return (
        checkApprove(me, p).ok ||
        (checkSend(me, p).ok && !approvalIsStale(state, p)) ||
        (approvalIsStale(state, p) && roleCan(me.role, 'create_payment'))
      )
    case 'approval':
      return p.status === 'pending_approval'
    case 'ready':
      return p.status === 'approved'
    case 'network':
      return p.status === 'sending' || p.status === 'sent'
    case 'review':
      return p.status === 'in_review'
    case 'done':
      return p.status === 'reconciled'
    case 'closed':
      return p.status === 'rejected' || p.status === 'cancelled'
    case 'all':
      return true
  }
}
