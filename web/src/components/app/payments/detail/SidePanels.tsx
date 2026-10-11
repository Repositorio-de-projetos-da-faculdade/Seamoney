'use client'

import { Copy } from 'lucide-react'
import Link from 'next/link'
import { dateTime, shortHash, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { approvalIsStale, needsApproval } from '@/lib/demo/rules'
import { memberOf, proofHref } from '@/lib/demo/selectors'
import type { DemoState, Payment } from '@/lib/demo/types'
import { Facts, type Row } from '../../kit/Fields'
import { Note, Panel, PanelHead } from '../../kit/Panel'
import { btnLine, btnSmall, code } from '../../kit/styles'
import { useToast } from '../../kit/Toaster'
import { LogEntry } from '../../log/LogEntry'

/** Who signed off, under which rule, and what exactly the signature covers. */
export function ApprovalPanel({ state, payment: p }: { state: DemoState; payment: Payment }) {
  const { t, locale } = useT()
  const limit = usd(state.settings.approvalThresholdCents, locale)
  const policy = needsApproval(p.quote.amountCents, state.settings) ? t('app.doc.a.needs', { limit }) : t('app.doc.a.under', { limit })
  const a = p.approval
  const rows: Row[] = [{ label: t('app.doc.a.rule'), value: policy }]
  if (a) {
    rows.push(
      { label: t('app.doc.a.by'), value: a.auto ? t('app.policy') : (memberOf(state, a.by)?.name ?? ''), note: dateTime(a.at, locale) },
      { label: t('app.doc.a.hash'), value: <span className={code}>{shortHash(a.dataHash, 10, 8)}</span>, note: t('app.doc.a.hashNote') },
    )
  }
  if (p.rejection) rows.push({ label: t('app.doc.a.rejected'), value: memberOf(state, p.rejection.by)?.name ?? '', note: `“${p.rejection.reason}”` })
  if (p.cancellation) rows.push({ label: t('app.doc.a.cancelled'), value: memberOf(state, p.cancellation.by)?.name ?? '', note: `“${p.cancellation.reason}”` })
  return (
    <Panel aria-labelledby="doc-approval">
      <PanelHead id="doc-approval" title={t('app.doc.approval')} />
      <Facts rows={rows} />
      {approvalIsStale(state, p) ? (
        <div className="px-5 pb-4">
          <Note tone="bad">{t('app.doc.a.stale')}</Note>
        </div>
      ) : null}
    </Panel>
  )
}

/** The page the supplier can open to see the payment arrived. */
export function ProofPanel({ payment: p }: { payment: Payment }) {
  const { t } = useT()
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${proofHref(p)}`)
      toast.ok(t('app.copied'))
    } catch {
      toast.bad(t('app.err.generic'))
    }
  }
  return (
    <Panel aria-labelledby="doc-proof">
      <PanelHead id="doc-proof" title={t('app.doc.proof')} meta={t('app.doc.proofMeta')} />
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <Link href={proofHref(p)} className={`${btnLine} ${btnSmall}`}>
          {t('app.doc.openProof')}
        </Link>
        <button type="button" onClick={copy} className={`${btnLine} ${btnSmall}`}>
          <Copy size={13} aria-hidden="true" />
          {t('app.doc.copyLink')}
        </button>
      </div>
    </Panel>
  )
}

/** This payment's lines of the audit trail, oldest first. */
export function HistoryPanel({ state, payment }: { state: DemoState; payment: Payment }) {
  const { t } = useT()
  const seq = (id: string) => Number(id.split('_')[1])
  const events = state.activity.filter((a) => a.paymentId === payment.id).sort((a, b) => a.at.localeCompare(b.at) || seq(a.id) - seq(b.id))
  return (
    <Panel aria-labelledby="doc-history">
      <PanelHead id="doc-history" title={t('app.doc.history')} meta={t('app.doc.historyMeta')} />
      <ul className="divide-y divide-hair px-5">
        {events.map((e) => (
          <li key={e.id}>
            <LogEntry state={state} activity={e} bare />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
