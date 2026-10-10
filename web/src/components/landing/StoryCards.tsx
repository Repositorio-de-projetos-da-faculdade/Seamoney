import { Check, FileText, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { T } from '@/lib/i18n/server'

/** The four steps of the product, each with a small, static preview of its screen (sample data, labelled). */
export function StoryCards({ t }: { t: T }) {
  const steps = [
    { title: t('how.1.title'), desc: t('how.1.desc'), preview: <CompareMini t={t} /> },
    { title: t('how.2.title'), desc: t('how.2.desc'), preview: <ExtractMini t={t} /> },
    { title: t('how.3.title'), desc: t('how.3.desc'), preview: <RouteMini t={t} /> },
    { title: t('how.4.title'), desc: t('how.4.desc'), preview: <ReconMini t={t} /> },
  ]

  return (
    <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="group relative flex flex-col rounded-[22px] border border-line bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-navy-700 to-navy-900 font-display text-sm font-extrabold text-white shadow-md">
              {i + 1}
            </span>
            <h3 className="font-display text-lg font-bold leading-tight">{s.title}</h3>
          </div>
          <p className="mt-3 min-h-[3.5rem] text-sm leading-relaxed text-muted">{s.desc}</p>
          <div className="mt-5 flex-1 rounded-2xl bg-page p-3.5 ring-1 ring-line">{s.preview}</div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted/80">{t('story.sample')}</p>
        </li>
      ))}
    </ol>
  )
}

function Mini({ children }: { children: ReactNode }) {
  return <div className="space-y-2.5 text-xs">{children}</div>
}

function CompareMini({ t }: { t: T }) {
  return (
    <Mini>
      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-line">
        <span className="text-muted">USD</span>
        <span className="font-display text-sm font-bold tabular-nums">80,000</span>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-muted">
          <span>{t('calc.result.bank')}</span>
          <span className="font-semibold text-ink tabular-nums">US$ 2,400</span>
        </div>
        <div className="h-2 rounded-full bg-line">
          <div className="h-full w-full rounded-full bg-bank" />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-muted">
          <span>{t('calc.result.route')}</span>
          <span className="font-semibold text-brand-700 tabular-nums">US$ 800</span>
        </div>
        <div className="h-2 rounded-full bg-line">
          <div className="h-full w-1/3 rounded-full bg-brand-500" />
        </div>
      </div>
      <div className="rounded-lg bg-brand-50 px-3 py-2 ring-1 ring-brand-500/15">
        <span className="text-muted">{t('calc.result.savings')}</span>
        <p className="font-display text-lg font-extrabold tabular-nums text-brand-700">US$ 1,600</p>
      </div>
    </Mini>
  )
}

function ExtractMini({ t }: { t: T }) {
  const rows = [
    [t('wiz.review.supplier'), 'Shenzhen Tech Co.'],
    [t('wiz.review.invoice'), 'INV-2026-0845'],
    [t('wiz.review.amount'), '80,000.00'],
  ]
  return (
    <Mini>
      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-line">
        <FileText size={16} className="text-bad-ink" aria-hidden="true" />
        <span className="flex-1 truncate font-medium">Invoice_3245.pdf</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
          <Sparkles size={11} aria-hidden="true" />
          AI
        </span>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line">
          <p className="text-[10px] text-muted">{k}</p>
          <p className="truncate font-semibold">{v}</p>
        </div>
      ))}
    </Mini>
  )
}

function RouteMini({ t }: { t: T }) {
  return (
    <Mini>
      <div className="rounded-xl border-2 border-brand-500 bg-brand-50 p-3">
        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">{t('wiz.route.best')}</span>
        <p className="mt-1.5 font-display text-sm font-bold">{t('wiz.route.stable')}</p>
        <p className="mt-0.5 text-muted">{t('wiz.route.stable.desc', { fee: 1 })}</p>
      </div>
      <div className="rounded-xl border border-line bg-white p-3">
        <p className="font-semibold">{t('wiz.route.bank')}</p>
        <p className="mt-0.5 text-muted">{t('wiz.route.bank.desc', { pct: 3 })}</p>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-navy-900 px-3 py-2 font-display text-sm font-bold text-white">
        {t('wiz.quote.total')}
        <span className="tabular-nums">US$ 80,800</span>
      </div>
    </Mini>
  )
}

function ReconMini({ t }: { t: T }) {
  const checks = [t('od.recon.token'), t('od.recon.recipient'), t('od.recon.amount'), t('od.recon.memo'), t('od.recon.receipt')]
  return (
    <Mini>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c} className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-line">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok-bg text-ok-ink">
              <Check size={12} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="leading-tight">{c}</span>
          </li>
        ))}
      </ul>
    </Mini>
  )
}
