'use client'

import clsx from 'clsx'
import { ArrowRight, CalendarRange, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { useComparison } from '@/lib/useComparison'
import { btnPrimary, Card, Field, input, Notice } from './ui'

const num = (v: string) => (v === '' || Number.isNaN(Number(v)) ? 0 : Math.max(0, Number(v)))
const pct = (v: number, min: number, max: number) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`

const MONTHLY = { min: 5_000, max: 500_000, step: 5_000 }
const BANK = { min: 0.5, max: 6, step: 0.1 }

export function Calculator({ variant = 'page' }: { variant?: 'page' | 'teaser' }) {
  const { t, locale } = useT()
  const [monthly, setMonthly] = useState('80000')
  const [country, setCountry] = useState('cn')
  const [bankPct, setBankPct] = useState('3')
  const result = useComparison(num(monthly), num(bankPct))

  const bank = result?.bankCents ?? 0
  const route = result?.routeCents ?? 0
  const savings = result?.savingsCents ?? 0
  const worst = Math.max(bank, route, 1)
  const dark = variant === 'teaser'

  const monthlyField = (
    <Field label={t('calc.monthly')} htmlFor={`monthly-${variant}`}>
      <div className="relative">
        <span className={clsx('pointer-events-none absolute inset-y-0 left-4 flex items-center font-display text-sm font-bold', dark ? 'text-navy-900/60' : 'text-muted')}>
          US$
        </span>
        <input
          id={`monthly-${variant}`}
          className={`${input} pl-14 font-display text-lg font-bold tabular-nums`}
          type="number"
          inputMode="decimal"
          min={0}
          step={MONTHLY.step}
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
        />
      </div>
      <input
        aria-label={t('calc.monthly')}
        type="range"
        className="range mt-4"
        min={MONTHLY.min}
        max={MONTHLY.max}
        step={MONTHLY.step}
        value={Math.min(Math.max(num(monthly), MONTHLY.min), MONTHLY.max)}
        style={{ ['--pct' as string]: pct(num(monthly), MONTHLY.min, MONTHLY.max) }}
        onChange={(e) => setMonthly(e.target.value)}
      />
    </Field>
  )

  const bankField = (
    <Field label={t('calc.bankFee')} htmlFor={`bankFee-${variant}`} hint={dark ? undefined : t('calc.bankFee.hint')}>
      <div className="relative">
        <input
          id={`bankFee-${variant}`}
          className={`${input} pr-10 font-display text-lg font-bold tabular-nums`}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={BANK.step}
          value={bankPct}
          onChange={(e) => setBankPct(e.target.value)}
        />
        <span className={clsx('pointer-events-none absolute inset-y-0 right-4 flex items-center font-display font-bold', dark ? 'text-navy-900/60' : 'text-muted')}>%</span>
      </div>
      <input
        aria-label={t('calc.bankFee')}
        type="range"
        className="range mt-4"
        min={BANK.min}
        max={BANK.max}
        step={BANK.step}
        value={Math.min(Math.max(num(bankPct), BANK.min), BANK.max)}
        style={{ ['--pct' as string]: pct(num(bankPct), BANK.min, BANK.max) }}
        onChange={(e) => setBankPct(e.target.value)}
      />
    </Field>
  )

  const countryField = (
    <Field label={t('calc.country')} htmlFor={`country-${variant}`}>
      <select id={`country-${variant}`} className={input} value={country} onChange={(e) => setCountry(e.target.value)}>
        <option value="cn">{t('country.cn')}</option>
        <option value="hk">{t('country.hk')}</option>
        <option value="vn">{t('country.vn')}</option>
        <option value="in">{t('country.in')}</option>
        <option value="other">{t('country.other')}</option>
      </select>
    </Field>
  )

  const results = (
    <div className={clsx('space-y-6', dark && 'text-white')}>
      <div className="space-y-5" aria-live="polite">
        <Bar label={t('calc.result.bank')} value={usd(bank, locale)} share={bank / worst} tone="bank" dark={dark} />
        <Bar label={t('calc.result.route')} value={usd(route, locale)} share={route / worst} tone="route" dark={dark} />
      </div>

      {result && savings <= 0 ? (
        <Notice tone="warn">{t('calc.result.negative')}</Notice>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={clsx(
              'relative overflow-hidden rounded-2xl p-5',
              dark ? 'bg-gradient-to-br from-mint/25 to-aqua/10 ring-1 ring-mint/40' : 'bg-gradient-to-br from-brand-50 to-brand-100 ring-1 ring-brand-500/20',
            )}
          >
            <p className={clsx('flex items-center gap-2 text-sm font-semibold', dark ? 'text-white/80' : 'text-brand-800')}>
              <TrendingDown size={16} aria-hidden="true" />
              {t('calc.result.savings')}
            </p>
            <p className={clsx('mt-2 font-display text-4xl font-extrabold tabular-nums tracking-tight', dark ? 'text-mint' : 'text-brand-700')}>{usd(savings, locale)}</p>
          </div>
          <div className={clsx('rounded-2xl p-5 ring-1', dark ? 'bg-white/5 ring-white/15' : 'bg-tint ring-line')}>
            <p className={clsx('flex items-center gap-2 text-sm font-semibold', dark ? 'text-white/70' : 'text-muted')}>
              <CalendarRange size={16} aria-hidden="true" />
              {t('calc.result.year')}
            </p>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums tracking-tight">{usd(savings * 12, locale)}</p>
          </div>
        </div>
      )}

      <p className={clsx('text-xs leading-relaxed', dark ? 'text-white/60' : 'text-muted')}>{t('calc.note')}</p>
      <Link href="/dashboard/orders/new" className={btnPrimary}>
        {t('calc.cta')} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )

  if (dark) {
    return (
      <div className="grid gap-8 rounded-[28px] border border-white/15 bg-navy-900/60 p-6 shadow-pop backdrop-blur-xl sm:p-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2 [&_label]:text-white [&_input:not(.range)]:bg-white [&_select]:bg-white">
          {monthlyField}
          {bankField}
        </div>
        <div className="lg:col-span-3">{results}</div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="space-y-6 p-6 sm:p-7 lg:col-span-2">
        {monthlyField}
        {countryField}
        {bankField}
      </Card>

      <div className="space-y-6 lg:col-span-3">
        <Card className="p-6 sm:p-7">{results}</Card>
        <LeadForm monthly={num(monthly)} bankPct={num(bankPct)} country={country} />
      </div>
    </div>
  )
}

function Bar({ label, value, share, tone, dark }: { label: string; value: string; share: number; tone: 'bank' | 'route'; dark: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
        <span className={dark ? 'text-white/70' : 'text-muted'}>{label}</span>
        <span className="font-display text-base font-bold tabular-nums">{value}</span>
      </div>
      <div className={clsx('h-3.5 overflow-hidden rounded-full', dark ? 'bg-white/10' : 'bg-line')} role="presentation">
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            tone === 'bank' ? 'bg-gradient-to-r from-bank-soft to-bank' : 'bg-gradient-to-r from-brand-500 to-mint',
          )}
          style={{ width: `${Math.max(share * 100, 1.5)}%` }}
        />
      </div>
    </div>
  )
}

function LeadForm({ monthly, bankPct, country }: { monthly: number; bankPct: number; country: string }) {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, monthlyUsd: monthly, bankFeePct: bankPct, country, consent }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') return <Notice tone="ok">{t('calc.lead.thanks')}</Notice>

  return (
    <Card className="p-6 sm:p-7">
      <h2 className="font-display text-lg font-bold">{t('calc.lead.title')}</h2>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={t('calc.lead.email')} htmlFor="lead-email">
          <input id="lead-email" className={input} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t('calc.lead.consent')}</span>
        </label>
        {state === 'error' ? <Notice tone="bad">{t('calc.lead.error')}</Notice> : null}
        <button
          type="submit"
          disabled={state === 'sending' || (email !== '' && !consent)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-5 font-display text-[15px] font-bold shadow-sm transition hover:border-brand-500/40 hover:bg-brand-50 disabled:opacity-50"
        >
          {t('calc.lead.send')}
        </button>
      </form>
    </Card>
  )
}
