'use client'

import { ChevronLeft } from 'lucide-react'
import { Printer } from 'iconoir-react'
import Link from 'next/link'
import { useRef } from 'react'
import { useT } from '@/lib/i18n/client'
import { paymentOf, supplierOf } from '@/lib/demo/selectors'
import { useDemoState, useMe } from '@/lib/demo/store'
import { Empty, Panel } from '../../kit/Panel'
import { btnLine, btnSmall, textLink } from '../../kit/styles'
import { Journey } from './Journey'
import { NetworkPanel } from './NetworkPanel'
import { NextStepBar } from './NextStepBar'
import { PaymentHeader } from './PaymentHeader'
import { AmountsPanel, DestinationPanel, InvoicePanel } from './RecordPanels'
import { OpenPaymentsPanel } from './OpenPaymentsPanel'
import { RoutePanel } from './RoutePanel'
import { ApprovalPanel, HistoryPanel, ProofPanel } from './SidePanels'
import { StickyBar } from './StickyBar'

/**
 * One payment order, read top to bottom: who and how much, whose turn it is (with the buttons), the way it has
 * travelled, then the record grouped by question: what is paid, how much it costs, where it goes, what the network
 * shows. The side column is about people: who approved, the supplier's proof, the history.
 */
export function PaymentPage({ id }: { id: string }) {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  const headerRef = useRef<HTMLDivElement>(null)
  if (!state || !me) return null
  const payment = paymentOf(state, id)

  const back = (
    <Link href="/app/payments" className="inline-flex items-center gap-1 hover:text-ink">
      <ChevronLeft size={15} aria-hidden="true" />
      {t('app.nav.payments')}
    </Link>
  )

  if (!payment) {
    return (
      <div className="px-4 pt-8 sm:px-6 lg:px-10">
        <div className="mb-4 text-[13px] text-muted">{back}</div>
        <Panel>
          <Empty
            title={t('app.doc.notFound')}
            action={
              <Link href="/app/payments" className={textLink}>
                {t('app.doc.backToList')}
              </Link>
            }
          >
            {t('app.doc.notFoundHint')}
          </Empty>
        </Panel>
      </div>
    )
  }

  const supplier = supplierOf(state, payment)
  const paid = !!payment.settlement || payment.status === 'sending'

  return (
    <div className="px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9">
      <StickyBar anchor={headerRef} state={state} me={me} payment={payment} supplier={supplier} />
      <div className="mb-5 flex items-center justify-between gap-4 text-[13px] text-muted print:hidden">
        {back}
        <button type="button" onClick={() => window.print()} className={`${btnLine} ${btnSmall}`}>
          <Printer width={14} height={14} aria-hidden="true" />
          {t('app.pdoc.print')}
        </button>
      </div>
      <div ref={headerRef}>
        <PaymentHeader payment={payment} supplier={supplier} />
      </div>

      <div className="mt-7">
        <NextStepBar state={state} me={me} payment={payment} />
      </div>

      <Panel className="mt-4 px-5 py-5" as="div">
        <Journey payment={payment} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {paid ? <NetworkPanel payment={payment} /> : null}
          <DestinationPanel state={state} payment={payment} />
          <AmountsPanel payment={payment} />
          <InvoicePanel state={state} payment={payment} />
        </div>
        <div className="min-w-0 space-y-6">
          {payment.status === 'reconciled' ? <ProofPanel payment={payment} /> : null}
          <div className="print:hidden">
            <RoutePanel state={state} payment={payment} />
          </div>
          <ApprovalPanel state={state} payment={payment} />
          <OpenPaymentsPanel state={state} payment={payment} />
          <HistoryPanel state={state} payment={payment} />
        </div>
      </div>
    </div>
  )
}
