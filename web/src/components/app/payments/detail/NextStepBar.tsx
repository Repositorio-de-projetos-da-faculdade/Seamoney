'use client'

import clsx from 'clsx'
import { useState } from 'react'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { demo } from '@/lib/demo/store'
import type { DemoState, Member, Payment } from '@/lib/demo/types'
import { Spinner } from '../../../ui'
import { textLink } from '../../kit/styles'
import { useNextStep, type StepTone } from '../shared/useNextStep'
import { PaymentButtons, usePaymentActions } from './PaymentActions'
import { ReasonDialog } from './ReasonDialog'

const TONE: Record<StepTone, string> = {
  you: 'border-brand-600 bg-brand-50',
  wait: 'border-ink/25 bg-sheet',
  moving: 'border-mint bg-sheet',
  done: 'border-brand-600 bg-sheet',
  stop: 'border-bad-ink bg-bad-bg/40',
  closed: 'border-ink/25 bg-sheet',
}

/**
 * The one place on the page that says whose turn it is and holds the buttons for it. Everything below is the record;
 * this bar is the action.
 */
export function NextStepBar({ state, me, payment: p }: { state: DemoState; me: Member; payment: Payment }) {
  const { t, locale } = useT()
  const step = useNextStep()(state, me, p)
  const a = usePaymentActions(state, me, p)
  const [asking, setAsking] = useState<'reject' | 'cancel' | null>(null)
  const network = t(`app.net.${p.network}`)

  return (
    <section aria-label={t('app.doc.next')} className={clsx('border-l-[3px] px-5 py-4', TONE[step.tone])}>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="min-w-0 flex-1 max-sm:basis-full">
          <p className="font-data text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">{step.tone === 'you' ? t('app.doc.yourTurn') : t('app.doc.next')}</p>
          <p className="mt-1 flex items-center gap-2.5 text-[15.5px] leading-snug text-ink">
            {p.status === 'sending' ? <Spinner className="size-4 text-brand-600" /> : null}
            {step.text}
          </p>
          {a.canSend ? <p className="mt-1 text-[13.5px] text-muted">{t('app.doc.sendNote', { total: usd(p.quote.totalCents, locale), network })}</p> : null}
          {p.error && p.status === 'approved' ? <p className="mt-1 text-[13.5px] text-bad-ink">{t('app.doc.lastError', { message: p.error })}</p> : null}
        </div>
        <PaymentButtons actions={a} onReject={() => setAsking('reject')} />
      </div>
      {a.canCancel ? (
        <button type="button" onClick={() => setAsking('cancel')} className={clsx(textLink, 'mt-3 text-[13px] !font-normal text-muted print:hidden')}>
          {t('app.doc.cancelOrder')}
        </button>
      ) : null}

      <ReasonDialog
        key={asking ?? 'none'}
        open={asking !== null}
        onClose={() => setAsking(null)}
        title={asking === 'reject' ? t('app.doc.rejectTitle', { invoice: p.invoiceNumber }) : t('app.doc.cancelTitle', { invoice: p.invoiceNumber })}
        intro={asking === 'reject' ? t('app.doc.rejectIntro') : t('app.doc.cancelIntro')}
        confirm={asking === 'reject' ? t('app.doc.reject') : t('app.doc.cancelOrder')}
        busy={!!a.busy}
        onConfirm={async (reason) => {
          // the actions resolve to nothing; map success to true so a failure (undefined) keeps the dialog open
          const action = () => (asking === 'reject' ? demo.reject(p.id, reason) : demo.cancel(p.id, reason)).then(() => true)
          const done = await a.run(asking!, action, () => (asking === 'reject' ? t('app.doc.done.rejected') : t('app.doc.done.cancelled')))
          if (done) setAsking(null)
        }}
      />
    </section>
  )
}
