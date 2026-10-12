'use client'

import clsx from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { parseMoneyToCents } from '@/lib/money'
import { activeWallet, needsApproval, roleCan } from '@/lib/demo/rules'
import { demo, useDemoState, useMe } from '@/lib/demo/store'
import { NETWORKS } from '@/lib/demo/types'
import { Spinner } from '../../../ui'
import { Note, Panel, PanelHead } from '../../kit/Panel'
import { btnGo, btnLine } from '../../kit/styles'
import { useRun } from '../../kit/useRun'
import { Page } from '../../shell/DeskShell'
import { DetailsForm, isDraftValid } from './DetailsForm'
import { EMPTY_DRAFT, matchSupplier, supplierDraft, type Draft } from './draft'
import { FileChip } from './FileChip'
import { InvoiceDrop, type ReadResult } from './InvoiceDrop'
import { OrderSummary } from './OrderSummary'

type Step = 'invoice' | 'details'

/**
 * Two steps: bring the invoice (file read by AI, the sample, a supplier to start from, or typed), then check the order
 * and create it. `?supplier=<id>` skips straight to step 2 with that supplier chosen.
 */
export function NewPayment() {
  const { t } = useT()
  const router = useRouter()
  const state = useDemoState()
  const me = useMe()
  const params = useSearchParams()
  const preset = params.get('supplier')
  const { run } = useRun()
  // from the click until the page has moved to the new order (the order must not show as a duplicate of itself)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<Step>('invoice')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [readNote, setReadNote] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null)
  const [presetApplied, setPresetApplied] = useState(false)

  // applies ?supplier= once, as soon as the demo state has the supplier (adjusting state during render, not in an effect)
  if (!presetApplied && state && preset && state.suppliers.some((s) => s.id === preset)) {
    setPresetApplied(true)
    setDraft(supplierDraft(state.suppliers, preset))
    setStep('details')
  }

  if (!state || !me) return null

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  if (!roleCan(me.role, 'create_payment')) {
    return (
      <Page title={t('app.np.title')} width="narrow">
        <Panel>
          <div className="px-5 py-5">
            <Note tone="warn">{t('app.np.cannot')}</Note>
          </div>
        </Panel>
      </Page>
    )
  }

  function startFromSupplier(id: string) {
    setReadNote(null)
    setDraft(supplierDraft(state!.suppliers, id))
    setStep('details')
  }

  function onRead(r: ReadResult) {
    if (r.kind === 'manual') {
      setReadNote(null)
      set({ ...EMPTY_DRAFT })
    } else if (r.kind === 'failed') {
      set({ ...EMPTY_DRAFT, filename: r.filename })
      setReadNote({ tone: 'warn', text: t('app.np.read.failed') })
    } else {
      const d = r.data
      const match = matchSupplier(state!.suppliers, d.supplier_name)
      const approved = match ? NETWORKS.filter((n) => activeWallet(match, n)) : []
      set({
        supplierId: match?.id ?? '',
        network: approved.length === 1 ? approved[0] : '',
        printedName: d.supplier_name,
        printedCountry: d.supplier_country.toUpperCase().slice(0, 2),
        invoiceNumber: d.invoice_number,
        amount: d.total_amount ? d.total_amount.toFixed(2) : '',
        currency: (d.currency || 'USD').toUpperCase(),
        dueDate: d.due_date,
        source: r.kind,
        filename: r.filename,
        reviewed: false,
      })
      setReadNote(r.kind === 'ai' ? { tone: 'info', text: t('app.np.read.ai', { file: r.filename }) } : { tone: 'warn', text: t('app.np.read.demo') })
    }
    setStep('details')
  }

  async function submit() {
    const cents = parseMoneyToCents(draft.amount)
    if (!cents || !draft.network) return
    const network = draft.network
    setSubmitting(true)
    const id = await run(
      'create',
      () =>
        demo.createPayment({
          supplierId: draft.supplierId,
          network,
          invoiceNumber: draft.invoiceNumber,
          amountCents: cents,
          dueDate: draft.dueDate || null,
          source: draft.source,
          invoiceFilename: draft.filename || null,
          reviewed: draft.source === 'manual' || draft.reviewed,
        }),
      () => t('app.np.created', { invoice: draft.invoiceNumber.trim() }),
    )
    if (id) router.push(`/app/payments/${id}`)
    else setSubmitting(false)
  }

  const cents = parseMoneyToCents(draft.amount) ?? 0
  const steps: Step[] = ['invoice', 'details']
  const fromFile = draft.source !== 'manual' && draft.filename !== ''

  return (
    <Page title={t('app.np.title')} lede={t('app.np.lede')}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <ol aria-label={t('app.np.steps')} className="flex border-b border-rule">
            {steps.map((s, i) => (
              <li
                key={s}
                aria-current={s === step ? 'step' : undefined}
                className={clsx('flex flex-1 items-center gap-2.5 px-5 py-3 text-[14px]', i > 0 && 'border-l border-rule', s === step ? 'bg-sheet' : 'bg-desk/60')}
              >
                <span className={clsx('grid size-6 place-items-center rounded-full font-data text-[11px]', s === step ? 'bg-ink text-white' : 'border border-ink/25 text-muted')}>{i + 1}</span>
                <span className={s === step ? 'font-medium text-ink' : 'text-muted'}>{t(`app.np.step.${s}`)}</span>
              </li>
            ))}
          </ol>
          <PanelHead title={step === 'invoice' ? t('app.np.invoiceTitle') : t('app.np.detailsTitle')} meta={step === 'invoice' ? t('app.np.invoiceMeta') : t('app.np.detailsMeta')} />
          <div className="px-5 py-5">
            {step === 'invoice' ? (
              <InvoiceDrop suppliers={state.suppliers} onRead={onRead} onSupplier={startFromSupplier} />
            ) : (
              <div className="space-y-5">
                {fromFile ? <FileChip filename={draft.filename} source={draft.source} onReplace={() => setStep('invoice')} /> : null}
                {readNote ? <Note tone={readNote.tone}>{readNote.text}</Note> : null}
                <DetailsForm state={state} draft={draft} set={set} submitting={submitting} />
              </div>
            )}
          </div>
          {step === 'details' ? (
            <div className="flex flex-wrap justify-between gap-3 border-t border-rule px-5 py-4">
              <button type="button" className={btnLine} onClick={() => setStep('invoice')}>
                {t('app.back')}
              </button>
              <button type="button" className={btnGo} disabled={submitting || !isDraftValid(state, draft)} onClick={() => void submit()}>
                {submitting ? <Spinner className="size-4" /> : null}
                {needsApproval(cents, state.settings) ? t('app.np.submit.approval') : t('app.np.submit.create')}
              </button>
            </div>
          ) : null}
        </Panel>
        <div className="lg:sticky lg:top-6">
          <OrderSummary state={state} me={me} draft={draft} />
        </div>
      </div>
    </Page>
  )
}
