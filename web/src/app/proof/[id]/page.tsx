import { BadgeCheck, Clock, ExternalLink, Search } from 'lucide-react'
import { ShipScene } from '@/components/ShipScene'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { Card, Notice } from '@/components/ui'
import { getProof } from '@/lib/api'
import { dateTime, usd } from '@/lib/format'
import { getT, type T } from '@/lib/i18n/server'
import { explorerTx, NETWORK_NAME } from '@/lib/links'
import type { Proof } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Public page for the SUPPLIER: proof that the payment for their invoice arrived, checked live on-chain. */
export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ t, locale }, proof] = await Promise.all([getT(), getProof(id)])

  return (
    <>
      <SiteHeader />
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <ShipScene variant="wide" className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/90 to-navy-900/40" />
        <div className="mx-auto max-w-3xl px-5 pb-24 pt-12 md:pb-28 md:pt-14">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t('proof.title')}</h1>
          <p className="mt-3 text-lg text-white/80">{t('proof.sub')}</p>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-14 max-w-3xl px-5 pb-16">
        {proof ? (
          <ProofCard proof={proof} t={t} locale={locale} />
        ) : (
          <Notice tone="warn">{t('proof.notFound')}</Notice>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

function ProofCard({ proof, t, locale }: { proof: Proof; t: T; locale: 'en' | 'pt' }) {
  const { order, tx } = proof
  const verified = tx?.status === 'success'

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className={`flex items-center gap-4 px-6 py-5 sm:px-8 ${verified ? 'bg-gradient-to-r from-ok-bg to-white text-ok-ink' : 'bg-warn-bg text-warn-ink'}`}>
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${verified ? 'bg-brand-600 text-white' : 'bg-white'}`}>
            {verified ? <BadgeCheck size={26} aria-hidden="true" /> : <Clock size={26} aria-hidden="true" />}
          </span>
          <div>
            <p className="font-display text-xl font-extrabold">{verified ? t('proof.verified') : t('proof.pending')}</p>
            {verified ? <p className="mt-0.5 text-sm font-medium">{t('proof.ship')}</p> : null}
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">{t('proof.invoice')}</p>
              <p className="font-display text-2xl font-extrabold">{order.invoiceNumber}</p>
            </div>
            <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight text-navy-900">{usd(order.amountCents, locale)}</p>
          </div>

          <dl className="space-y-3.5 border-t border-line pt-6 text-sm">
            <Row label={t('proof.payer')} value={t('proof.payer.value')} />
            <Row label={t('proof.to')} value={order.supplierName} />
            <Row label={t('proof.when')} value={dateTime(tx?.timestamp ?? order.paidAt, locale)} />
            <Row label={t('wiz.pay.network')} value={NETWORK_NAME} />
            <Row label={t('proof.memo')} value={order.reference} mono />
            <div>
              <dt className="text-muted">{t('proof.tx')}</dt>
              <dd className="mt-1.5 rounded-xl bg-tint p-3.5">
                <code className="block break-all text-xs">{order.txHash}</code>
                <a href={explorerTx(order.txHash)} target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
                  {t('wiz.pay.view')} <ExternalLink size={14} aria-hidden="true" />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card className="flex gap-4 p-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-info-bg text-info-ink">
          <Search size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold">{t('proof.how')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t('proof.how.desc')}</p>
        </div>
      </Card>

      <p className="text-center text-xs leading-relaxed text-muted">{t('proof.demo')}</p>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right font-semibold ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
