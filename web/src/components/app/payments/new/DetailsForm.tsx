'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useState } from 'react'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { parseMoneyToCents } from '@/lib/money'
import { activeWallet } from '@/lib/demo/rules'
import { NETWORKS, type DemoState } from '@/lib/demo/types'
import { FormField } from '../../kit/Fields'
import { Note } from '../../kit/Panel'
import { code, fieldInput, textLink } from '../../kit/styles'
import { dueWarning, type Draft } from './draft'

export function isDraftValid(state: DemoState, d: Draft) {
  const cents = parseMoneyToCents(d.amount)
  const supplier = state.suppliers.find((s) => s.id === d.supplierId)
  const wallet = supplier && d.network ? activeWallet(supplier, d.network) : undefined
  // whatever was read from a file (by the AI or the offline sample reader) needs a person to confirm it
  const reviewed = d.source === 'manual' || d.reviewed
  return !!wallet && d.invoiceNumber.trim() !== '' && cents !== null && cents > 0 && d.currency === 'USD' && reviewed && !isDuplicate(state, d)
}

function isDuplicate(state: DemoState, d: Draft) {
  const invoice = d.invoiceNumber.trim().toLowerCase()
  return state.payments.some((p) => p.supplierId === d.supplierId && p.invoiceNumber.toLowerCase() === invoice && p.status !== 'rejected' && p.status !== 'cancelled')
}

/** The order's fields, checked as you type: supplier and its approved networks, invoice, amount, due date, review. */
export function DetailsForm({ state, draft, set }: { state: DemoState; draft: Draft; set: (patch: Partial<Draft>) => void }) {
  const { t, locale } = useT()
  // read once per mount, so the due-date warning does not change while the page is open
  const [now] = useState(() => Date.now())
  const supplier = state.suppliers.find((s) => s.id === draft.supplierId)
  const duplicate = !!supplier && draft.invoiceNumber.trim() !== '' && isDuplicate(state, draft)
  const addHref = '/app/suppliers'

  const amountCents = parseMoneyToCents(draft.amount)
  const amountError =
    draft.currency !== 'USD'
      ? t('app.np.usdOnly')
      : draft.amount.trim() !== '' && amountCents === null
        ? t('app.pnew.amount.invalid')
        : amountCents === 0
          ? t('app.pnew.amount.zero')
          : undefined
  const amountHint = amountCents && amountCents > 0 ? t('app.pnew.amount.reads', { value: usd(amountCents, locale) }) : undefined
  const due = dueWarning(draft.dueDate, now)
  const dueHint = due === 'past' ? t('app.pnew.due.past') : due === 'soon' ? t('app.pnew.due.soon') : undefined

  const pickSupplier = (id: string) => {
    const s = state.suppliers.find((x) => x.id === id)
    // choose the only approved network by itself; with two, keep the choice open
    const approved = s ? NETWORKS.filter((n) => activeWallet(s, n)) : []
    set({ supplierId: id, network: approved.length === 1 ? approved[0] : '' })
  }

  return (
    <div className="space-y-6">
      {draft.printedName && !supplier ? (
        <Note tone="warn">
          {t('app.np.supplier.unknown', { name: draft.printedName })}{' '}
          <Link href={addHref} className={textLink}>
            {t('app.np.supplier.add')}
          </Link>
        </Note>
      ) : null}

      <FormField label={t('app.np.supplier')} htmlFor="np-supplier" hint={draft.printedName && supplier ? t('app.np.supplier.matched', { name: draft.printedName }) : undefined}>
        <select id="np-supplier" className={fieldInput} value={draft.supplierId} onChange={(e) => pickSupplier(e.target.value)}>
          <option value="">{t('app.np.supplier.choose')}</option>
          {state.suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}, {s.city}
            </option>
          ))}
        </select>
      </FormField>

      {supplier ? (
        <fieldset>
          <legend className="mb-2 block text-[13.5px] font-medium text-ink">{t('app.np.network')}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {NETWORKS.map((n) => {
              const wallet = activeWallet(supplier, n)
              const pending = supplier.wallets.some((w) => w.network === n && w.status === 'proposed')
              const on = draft.network === n
              return (
                <label
                  key={n}
                  className={clsx(
                    'flex cursor-pointer gap-3 border px-4 py-3 transition-colors',
                    !wallet && 'cursor-not-allowed opacity-60',
                    on ? 'border-brand-600 bg-brand-50' : 'border-rule bg-white hover:border-ink/40',
                  )}
                >
                  <input type="radio" name="np-network" className="mt-1 accent-brand-600" checked={on} disabled={!wallet} onChange={() => set({ network: n })} />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{t(`app.net.${n}.long`)}</span>
                    <span className="block text-[12.5px] text-muted">{t(`app.net.${n}.token`)}</span>
                    {wallet ? (
                      <span className={clsx(code, 'mt-1 block truncate text-[11.5px] text-muted')}>
                        {t('app.np.walletVersion', { version: wallet.version })} {wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[12.5px] text-warn-ink">{pending ? t('app.np.walletPending') : t('app.np.walletNone')}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label={t('app.np.invoice')} htmlFor="np-invoice" error={duplicate ? t('app.err.duplicate_invoice') : undefined} className="sm:col-span-1">
          <input id="np-invoice" className={clsx(fieldInput, code, '!text-[14px]')} value={draft.invoiceNumber} onChange={(e) => set({ invoiceNumber: e.target.value })} />
        </FormField>
        <FormField label={t('app.np.amount')} htmlFor="np-amount" error={amountError} hint={amountError ? undefined : amountHint}>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 grid place-items-center border-r border-rule px-3 font-data text-[12px] text-muted">
              {t('app.pnew.amount.prefix')}
            </span>
            <input
              id="np-amount"
              className={clsx(fieldInput, 'pl-16 tabular-nums')}
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={amountError ? true : undefined}
              value={draft.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </div>
        </FormField>
        <FormField label={t('app.np.due')} htmlFor="np-due" hint={dueHint}>
          <input id="np-due" type="date" className={clsx(fieldInput, due && 'border-warn')} value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
        </FormField>
      </div>

      {draft.source === 'ai' || draft.source === 'demo' ? (
        <label className={clsx('flex cursor-pointer gap-3 border px-4 py-3.5', draft.reviewed ? 'border-brand-600 bg-brand-50' : 'border-signal bg-white')}>
          <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={draft.reviewed} onChange={(e) => set({ reviewed: e.target.checked })} />
          <span>
            <span className="block font-medium text-ink">{t('app.np.reviewed')}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{t('app.np.reviewedHint')}</span>
          </span>
        </label>
      ) : null}

      <p className="text-[13px] leading-relaxed text-muted">{t('app.np.memoNote')}</p>
    </div>
  )
}
