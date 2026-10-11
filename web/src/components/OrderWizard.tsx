'use client'

import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, CircleAlert, ExternalLink, FileText, Ship, Sparkles, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { brl, seconds, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { explorerTx, NETWORK_NAME } from '@/lib/links'
import { parseMoneyToCents } from '@/lib/money'
import type { Order } from '@/lib/types'
import { PageHeader } from './PageHeader'
import { btnOutline, btnPrimary, Card, Field, input, Notice, Spinner } from './ui'

type Step = 'upload' | 'review' | 'quote' | 'pay'
type Source = 'ai' | 'demo' | 'manual'

interface Draft {
  supplierName: string
  supplierCountry: string
  invoiceNumber: string
  amount: string
  currency: string
  dueDate: string
  wallet: string
  filename: string
  source: Source
}

const EMPTY: Draft = {
  supplierName: '',
  supplierCountry: '',
  invoiceNumber: '',
  amount: '',
  currency: 'USD',
  dueDate: '',
  wallet: '',
  filename: '',
  source: 'manual',
}

const ACCEPT = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const STEPS: Step[] = ['upload', 'review', 'quote', 'pay']
// Same limit as the rules service (OrdersController); the invoice number never goes on-chain.
const MAX_INVOICE_CHARS = 64
// Shape of the opaque reference the rules service writes into the memo ("SM-" + 8 characters).
const MEMO_SHAPE = 'SM-XXXXXXXX'

type Phase = 'sending' | 'reconciling' | 'reconciled' | 'not_found' | 'error'

export function OrderWizard() {
  const { t, locale } = useT()
  const [step, setStep] = useState<Step>('upload')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [notice, setNotice] = useState<'ai' | 'demo' | 'failed' | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [phase, setPhase] = useState<Phase>('sending')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  async function handleFile(file: File) {
    setError(null)
    if (!ACCEPT.includes(file.type)) return setError(t('wiz.upload.badType'))
    if (file.size > MAX_BYTES) return setError(t('wiz.upload.tooBig'))
    setReading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/extract', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'extraction failed')
      const d = json.data as {
        supplier_name: string
        supplier_country: string
        invoice_number: string
        total_amount: number
        currency: string
        due_date: string
      }
      setDraft({
        supplierName: d.supplier_name,
        supplierCountry: d.supplier_country.toUpperCase().slice(0, 2),
        invoiceNumber: d.invoice_number,
        amount: d.total_amount ? d.total_amount.toFixed(2) : '',
        currency: (d.currency || 'USD').toUpperCase(),
        dueDate: d.due_date,
        wallet: '',
        filename: file.name,
        source: json.source === 'ai' ? 'ai' : 'demo',
      })
      setNotice(json.source === 'ai' ? 'ai' : 'demo')
    } catch {
      setDraft({ ...EMPTY, filename: file.name })
      setNotice('failed')
    } finally {
      setReading(false)
      setStep('review')
    }
  }

  async function loadSample() {
    const blob = await (await fetch('/sample-invoice.pdf')).blob()
    await handleFile(new File([blob], 'sample-invoice.pdf', { type: 'application/pdf' }))
  }

  const amountCents = parseMoneyToCents(draft.amount)
  // The invoice number stays in the rules service; the memo is an opaque code it assigns (MEMO_SHAPE bytes long).
  const invoiceTooLong = draft.invoiceNumber.trim().length > MAX_INVOICE_CHARS
  const walletOk = draft.wallet === '' || /^0x[0-9a-fA-F]{40}$/.test(draft.wallet)
  const usdOnly = draft.currency === 'USD'
  const reviewValid =
    draft.supplierName.trim() !== '' &&
    draft.invoiceNumber.trim() !== '' &&
    !invoiceTooLong &&
    amountCents !== null &&
    amountCents > 0 &&
    usdOnly &&
    walletOk

  async function createOrder() {
    if (!reviewValid || amountCents === null) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierName: draft.supplierName.trim(),
          supplierCountry: draft.supplierCountry || undefined,
          supplierWallet: draft.wallet || undefined,
          invoiceNumber: draft.invoiceNumber.trim(),
          amountCents,
          dueDate: draft.dueDate,
          extractionSource: draft.source,
          invoiceFilename: draft.filename || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('error.generic'))
      setOrder(json.order)
      setStep('quote')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function reconcile(id: string) {
    setPhase('reconciling')
    try {
      const res = await fetch(`/api/orders/${id}/reconcile`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.ok) {
        setOrder(json.order)
        setPhase('reconciled')
      } else {
        setPhase('not_found')
      }
    } catch {
      setPhase('not_found')
    }
  }

  async function pay() {
    if (!order) return
    setStep('pay')
    setPhase('sending')
    setError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('error.generic'))
      setOrder(json.order)
      await reconcile(json.order.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.generic'))
      setPhase('error')
    }
  }

  function restart() {
    setStep('upload')
    setDraft(EMPTY)
    setNotice(null)
    setOrder(null)
    setError(null)
    setPhase('sending')
  }

  const index = STEPS.indexOf(step)

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader title={t('wiz.title')} />

      <ol className="flex items-center" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={clsx('flex items-center', i < STEPS.length - 1 && 'flex-1')} aria-current={i === index ? 'step' : undefined}>
            <span className="flex items-center gap-2.5">
              <span
                className={clsx(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold transition-all',
                  i < index
                    ? 'bg-brand-600 text-white'
                    : i === index
                      ? 'bg-navy-900 text-white ring-4 ring-navy-900/10'
                      : 'bg-white text-muted ring-1 ring-line',
                )}
              >
                {i < index ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className={clsx('hidden text-sm sm:inline', i === index ? 'font-bold text-ink' : 'font-medium text-muted')}>{t(`wiz.step.${s}` as const)}</span>
            </span>
            {i < STEPS.length - 1 ? <span className={clsx('mx-3 h-0.5 min-w-3 flex-1 rounded-full sm:mx-4', i < index ? 'bg-brand-600' : 'bg-line')} aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      {step === 'upload' ? (
        <Card className="p-3 sm:p-4">
          <div
            className={clsx(
              'grid place-items-center gap-5 rounded-[18px] border-2 border-dashed px-6 py-14 text-center transition-colors',
              dragging ? 'border-brand-500 bg-brand-50' : 'border-line bg-gradient-to-b from-tint to-white',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) void handleFile(f)
            }}
          >
            {reading ? (
              <>
                <Spinner className="h-10 w-10 text-brand-600" />
                <p className="font-display text-lg font-bold">{t('wiz.upload.reading')}</p>
              </>
            ) : (
              <>
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 text-mint shadow-pop">
                  <Upload size={28} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-xl font-bold">{t('wiz.upload.drop')}</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{t('wiz.upload.hint')}</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  aria-label={t('wiz.upload.select')}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleFile(f)
                    e.target.value = ''
                  }}
                />
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" className={btnPrimary} onClick={() => fileRef.current?.click()}>
                    <Upload size={17} aria-hidden="true" />
                    {t('wiz.upload.select')}
                  </button>
                  <button type="button" className={btnOutline} onClick={() => void loadSample()}>
                    <FileText size={17} aria-hidden="true" />
                    {t('wiz.upload.sample')}
                  </button>
                </div>
                <p className="text-xs text-muted">{t('wiz.upload.sampleNote')}</p>
              </>
            )}
          </div>
          {error ? (
            <div className="mt-4">
              <Notice tone="bad">{error}</Notice>
            </div>
          ) : null}
        </Card>
      ) : null}

      {step === 'review' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-6 p-6 sm:p-7 lg:col-span-2">
            <h2 className="font-display text-xl font-bold">{t('wiz.review.title')}</h2>
            {notice ? (
              <Notice tone={notice === 'failed' || notice === 'demo' ? 'warn' : 'info'}>{t(`wiz.notice.${notice}` as const)}</Notice>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('wiz.review.supplier')} htmlFor="supplier">
                <input id="supplier" className={input} value={draft.supplierName} onChange={(e) => set({ supplierName: e.target.value })} />
              </Field>
              <Field label={t('wiz.review.country')} htmlFor="country">
                <input id="country" className={`${input} uppercase`} maxLength={2} value={draft.supplierCountry} onChange={(e) => set({ supplierCountry: e.target.value })} />
              </Field>
              <Field label={t('wiz.review.invoice')} htmlFor="invoice">
                <input
                  id="invoice"
                  className={clsx(input, invoiceTooLong && 'border-bad-ink')}
                  aria-invalid={invoiceTooLong}
                  maxLength={MAX_INVOICE_CHARS}
                  value={draft.invoiceNumber}
                  onChange={(e) => set({ invoiceNumber: e.target.value })}
                />
              </Field>
              <Field label={t('wiz.review.amount')} htmlFor="amount">
                <input id="amount" className={`${input} font-semibold tabular-nums`} inputMode="decimal" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
              </Field>
              <Field label={t('wiz.review.currency')} htmlFor="currency">
                <input id="currency" className={`${input} uppercase`} maxLength={3} value={draft.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
              </Field>
              <Field label={t('wiz.review.due')} htmlFor="due">
                <input id="due" className={input} type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
              </Field>
            </div>
            <Field label={t('wiz.review.wallet')} htmlFor="wallet" hint={t('wiz.review.walletHint')}>
              <input
                id="wallet"
                className={clsx(input, 'font-mono text-xs', !walletOk && 'border-bad-ink')}
                aria-invalid={!walletOk}
                placeholder="0x…"
                value={draft.wallet}
                onChange={(e) => set({ wallet: e.target.value.trim() })}
              />
            </Field>

            {!usdOnly ? <Notice tone="bad">{t('wiz.review.usdOnly')}</Notice> : null}
            {error ? <Notice tone="bad">{error}</Notice> : null}

            <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5">
              <button type="button" className={btnOutline} onClick={() => setStep('upload')}>
                <ArrowLeft size={17} aria-hidden="true" />
                {t('wiz.back')}
              </button>
              <button type="button" className={btnPrimary} disabled={!reviewValid || busy} onClick={() => void createOrder()}>
                {busy ? <Spinner className="h-4 w-4" /> : null}
                {t('wiz.review.continue')}
                {!busy ? <ArrowRight size={17} aria-hidden="true" /> : null}
              </button>
            </div>
          </Card>

          {/* what will be written on the blockchain */}
          <aside className="space-y-4 lg:col-span-1">
            <Card className="space-y-3 p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                {draft.source === 'ai' ? <Sparkles size={14} aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
                {draft.filename || t('wiz.review.title')}
              </p>
              <p className="text-sm font-semibold">{t('wiz.pay.memo')}</p>
              <p className="break-all rounded-xl bg-navy-900 px-3.5 py-3 font-mono text-sm font-semibold text-aqua/60">{MEMO_SHAPE}</p>
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-line" role="presentation">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint" style={{ width: `${(MEMO_SHAPE.length / 32) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-xs tabular-nums text-muted">
                  {MEMO_SHAPE.length}/32 bytes · {t('wiz.pay.memoPending')}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-muted">{t('wiz.pay.memoNote')}</p>
            </Card>
          </aside>
        </div>
      ) : null}

      {step === 'quote' && order ? <QuoteStep order={order} onPay={() => void pay()} onBack={() => setStep('review')} /> : null}

      {step === 'pay' && order ? (
        <Card className="space-y-7 p-6 sm:p-8">
          <RouteLoader phase={phase} />

          <ul className="space-y-3.5">
            <Stage done label={t('od.event.fiat_received')} />
            <Stage
              done={phase !== 'sending' && phase !== 'error'}
              active={phase === 'sending'}
              failed={phase === 'error'}
              label={phase === 'sending' ? t('wiz.pay.sending') : phase === 'error' ? t('wiz.pay.error', { message: error ?? '' }) : t('wiz.pay.done')}
            />
            <Stage
              done={phase === 'reconciled'}
              active={phase === 'reconciling'}
              failed={phase === 'not_found'}
              pending={phase === 'sending' || phase === 'error'}
              label={phase === 'reconciled' ? t('wiz.pay.reconciled') : phase === 'not_found' ? t('wiz.pay.notFound') : t('wiz.pay.reconciling')}
            />
          </ul>

          {order.txHash && phase !== 'sending' && phase !== 'error' ? (
            <dl className="grid gap-4 rounded-2xl bg-tint p-5 text-sm ring-1 ring-line sm:grid-cols-2">
              <Row label={t('wiz.pay.network')} value={NETWORK_NAME} />
              <Row label={t('wiz.pay.time')} value={seconds(order.confirmMs, locale)} />
              <Row label={t('wiz.pay.memo')} value={order.reference} mono />
              <Row label={t('col.amount')} value={usd(order.amountCents, locale)} />
              <div className="sm:col-span-2">
                <dt className="text-muted">{t('wiz.pay.tx')}</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="break-all text-xs">{order.txHash}</code>
                  <a href={explorerTx(order.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                    {t('wiz.pay.view')} <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </dd>
              </div>
            </dl>
          ) : null}

          {phase === 'reconciled' || phase === 'not_found' ? <p className="text-xs text-muted">{t('wiz.pay.memoNote')}</p> : null}

          <div className="flex flex-wrap gap-3">
            {phase === 'error' ? (
              <button type="button" className={btnPrimary} onClick={() => void pay()}>
                {t('wiz.pay.tryAgain')}
              </button>
            ) : null}
            {phase === 'not_found' ? (
              <button type="button" className={btnPrimary} onClick={() => void reconcile(order.id)}>
                {t('wiz.pay.retry')}
              </button>
            ) : null}
            {phase === 'reconciled' || phase === 'not_found' ? (
              <>
                <Link href={`/dashboard/orders/${order.id}`} className={phase === 'reconciled' ? btnPrimary : btnOutline}>
                  {t('wiz.pay.viewOrder')}
                </Link>
                <button type="button" className={btnOutline} onClick={restart}>
                  {t('wiz.pay.newOrder')}
                </button>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

/** A ship sails from "you" to "supplier" while the payment is sent, and arrives when it is on the chain. */
function RouteLoader({ phase }: { phase: Phase }) {
  const { t } = useT()
  const arrived = phase !== 'sending' && phase !== 'error'
  const failed = phase === 'error'

  return (
    <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 px-5 py-6 text-white sm:px-8" aria-hidden="true">
      <div className="relative flex items-center gap-4">
        <Node label={t('route.you')} on />
        <div className="relative h-8 flex-1">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/25" />
          <span
            className={clsx('absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-mint text-navy-900 shadow-lg', !arrived && !failed && 'route-ship')}
            style={arrived ? { left: 'calc(100% - 32px)' } : failed ? { left: '40%', background: '#fca5a5' } : undefined}
          >
            <Ship size={17} />
          </span>
        </div>
        <Node label={t('route.supplier')} on={arrived} />
      </div>
    </div>
  )
}

function Node({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
      <span className={clsx('grid h-10 w-10 place-items-center rounded-full ring-4 transition-colors', on ? 'bg-mint text-navy-900 ring-mint/25' : 'bg-white/10 text-white/50 ring-white/5')}>
        <Check size={18} strokeWidth={3} />
      </span>
      <span className="text-[11px] font-semibold text-white/80">{label}</span>
    </div>
  )
}

function QuoteStep({ order, onPay, onBack }: { order: Order; onPay: () => void; onBack: () => void }) {
  const { t, locale } = useT()
  const feePct = order.feeBps / 100

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold">{t('wiz.quote.title')}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative rounded-2xl border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-white p-5 shadow-[0_10px_30px_-14px_rgb(7_128_96/0.5)]">
          <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white">{t('wiz.route.best')}</span>
          <p className="mt-3 font-display text-lg font-bold">{t('wiz.route.stable')}</p>
          <p className="mt-1 text-sm text-muted">{t('wiz.route.stable.desc', { fee: feePct })}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="mt-8 font-display text-lg font-bold">{t('wiz.route.bank')}</p>
          <p className="mt-1 text-sm text-muted">{t('wiz.route.bank.desc', { pct: order.bankFeePct })}</p>
        </div>
      </div>

      <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line text-sm">
        <Line label={t('wiz.quote.send')} value={usd(order.amountCents, locale)} />
        <Line label={t('wiz.quote.fee', { fee: feePct })} value={usd(order.feeCents, locale)} />
        <Line label={t('wiz.quote.total')} value={usd(order.totalCents, locale)} strong />
        {order.totalBrlCents != null && order.fxRate != null ? (
          <Line label={t('wiz.quote.brl', { rate: order.fxRate.toFixed(2) })} value={brl(order.totalBrlCents, locale)} />
        ) : null}
      </dl>

      {order.savingsCents > 0 ? <Notice tone="ok">{t('wiz.quote.saves', { amount: usd(order.savingsCents, locale) })}</Notice> : null}
      <p className="text-xs leading-relaxed text-muted">{t('wiz.quote.partner')}</p>

      <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5">
        <button type="button" className={btnOutline} onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          {t('wiz.back')}
        </button>
        <button type="button" className={btnPrimary} onClick={onPay}>
          {t('wiz.quote.confirm')}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </Card>
  )
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={clsx('flex items-center justify-between gap-4 px-5 py-3.5', strong && 'bg-navy-900 text-white')}>
      <dt className={strong ? 'font-display font-bold' : 'text-muted'}>{label}</dt>
      <dd className={clsx('tabular-nums', strong ? 'font-display text-lg font-extrabold' : 'font-semibold')}>{value}</dd>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={clsx('mt-0.5 font-semibold', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}

function Stage({
  label,
  done = false,
  active = false,
  failed = false,
  pending = false,
}: {
  label: string
  done?: boolean
  active?: boolean
  failed?: boolean
  pending?: boolean
}) {
  return (
    <li className={clsx('flex items-center gap-3.5 text-[15px]', pending && 'text-muted')}>
      <span
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full',
          done ? 'bg-brand-600 text-white' : failed ? 'bg-bad-bg text-bad-ink' : active ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-500/25' : 'bg-line text-muted',
        )}
      >
        {done ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : failed ? <CircleAlert size={17} aria-hidden="true" /> : active ? <Spinner className="h-4 w-4" /> : null}
      </span>
      <span className={done || active || failed ? 'font-semibold' : ''}>{label}</span>
    </li>
  )
}
