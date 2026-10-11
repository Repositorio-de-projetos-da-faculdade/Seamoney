'use client'

import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import { dateTime } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment } from '@/lib/demo/types'
import type { Key } from '@/lib/i18n/dict'

type Mark = 'done' | 'now' | 'todo' | 'failed'

interface Stage {
  key: Key
  mark: Mark
  at?: string | null
  /** the reais leg runs through a partner that does not exist yet: those stages are simulated */
  simulated?: boolean
}

/**
 * The order's way from invoice to reconciliation, as the plan's state machine draws it: created, approved, reais in
 * and converted (simulated), sent on the chosen network, reconciled. A refused or cancelled order stops where it
 * stopped.
 */
function stagesOf(p: Payment): Stage[] {
  const created: Stage = { key: 'app.journey.created', mark: 'done', at: p.createdAt }
  if (p.status === 'rejected') return [created, { key: 'app.journey.rejected', mark: 'failed', at: p.rejection?.at }]
  if (p.status === 'cancelled') {
    const approved: Stage[] = p.approval ? [{ key: 'app.journey.approved', mark: 'done', at: p.approval.at }] : []
    return [created, ...approved, { key: 'app.journey.cancelled', mark: 'failed', at: p.cancellation?.at }]
  }
  const paid = !!p.settlement
  const moving = p.status === 'sending'
  return [
    created,
    { key: 'app.journey.approved', mark: p.approval ? 'done' : 'now', at: p.approval?.at },
    { key: 'app.journey.funds', mark: paid || moving ? 'done' : 'todo', simulated: true },
    { key: 'app.journey.converted', mark: paid || moving ? 'done' : 'todo', simulated: true },
    { key: 'app.journey.sent', mark: paid ? 'done' : moving ? 'now' : 'todo', at: p.settlement?.paidAt },
    {
      key: p.status === 'in_review' ? 'app.journey.review' : 'app.journey.reconciled',
      mark: p.status === 'reconciled' ? 'done' : p.status === 'in_review' ? 'failed' : p.status === 'sent' ? 'now' : 'todo',
      at: p.recon?.matchedAt,
    },
  ]
}

function Node({ mark }: { mark: Mark }) {
  return (
    <span
      className={clsx(
        'relative z-10 grid size-[22px] shrink-0 place-items-center rounded-full',
        mark === 'done' && 'bg-brand-600 text-white',
        mark === 'now' && 'border-2 border-brand-600 bg-sheet',
        mark === 'todo' && 'border border-ink/25 bg-sheet',
        mark === 'failed' && 'bg-bad-ink text-white',
      )}
      aria-hidden="true"
    >
      {mark === 'done' ? <Check size={12} strokeWidth={3} /> : null}
      {mark === 'failed' ? <X size={12} strokeWidth={3} /> : null}
      {mark === 'now' ? <span className="beat size-2 rounded-full bg-mint" /> : null}
    </span>
  )
}

export function Journey({ payment }: { payment: Payment }) {
  const { t, locale } = useT()
  const stages = stagesOf(payment)
  const state = (m: Mark) => t(`app.journey.mark.${m}`)

  return (
    <ol className="grid gap-0 md:grid-flow-col md:auto-cols-fr" aria-label={t('app.journey.title')}>
      {stages.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0 md:block md:pb-0 md:pr-3">
          {/* the rail to the next stage: down on a phone, across on a desktop */}
          {i < stages.length - 1 ? (
            <span
              className={clsx(
                'absolute left-[10px] top-[22px] h-[calc(100%-22px)] w-[2px] md:left-[22px] md:top-[10px] md:h-[2px] md:w-[calc(100%-22px)]',
                stages[i + 1].mark === 'todo' ? 'bg-ink/12' : 'bg-brand-600',
              )}
              aria-hidden="true"
            />
          ) : null}
          <Node mark={s.mark} />
          <div className="min-w-0 md:mt-3">
            <p className={clsx('text-[14px] leading-tight', s.mark === 'todo' ? 'text-muted' : s.mark === 'failed' ? 'font-medium text-bad-ink' : 'font-medium text-ink')}>
              {t(s.key)}
              <span className="sr-only">, {state(s.mark)}</span>
            </p>
            <p className="mt-1 text-[12.5px] text-muted">
              {s.simulated ? (
                <span className="inline-flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.08em] text-warn-ink">
                  <span className="size-[6px] rotate-45 bg-signal" aria-hidden="true" />
                  {t('app.simulated')}
                </span>
              ) : s.at ? (
                <time dateTime={s.at}>{dateTime(s.at, locale)}</time>
              ) : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
