import clsx from 'clsx'
import { ArrowLeft, Check, ExternalLink, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderActions } from '@/components/OrderActions'
import { DemoTag, OrderStatusChip } from '@/components/OrderStatus'
import { btnOutline, Card } from '@/components/ui'
import { brl, dateShort, dateTime, seconds, shortHash, usd } from '@/lib/format'
import { getOrder } from '@/lib/api'
import { dict, type Key } from '@/lib/i18n/dict'
import { getT, type T } from '@/lib/i18n/server'
import { explorerAddress, explorerTx, NETWORK_NAME } from '@/lib/links'
import type { OrderStatus } from '@/lib/types'

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, { t, locale }] = await Promise.all([getOrder(id), getT()])
  if (!data) notFound()
  const { order, events } = data

  const sourceLabel =
    order.extractionSource === 'ai' ? t('od.source.ai') : order.extractionSource === 'demo' ? t('od.source.demo') : t('od.source.manual')

  const checks = order.recon
    ? ([
        ['token', t('od.recon.token')],
        ['recipient', t('od.recon.recipient')],
        ['amount', t('od.recon.amount')],
        ['memo', t('od.recon.memo')],
        ['receipt', t('od.recon.receipt')],
      ] as const)
    : []

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('od.back')}
      </Link>

      <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 p-6 text-white shadow-pop sm:p-8">
        <div className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-mint/15 blur-[90px]" aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-aqua">{order.supplierName}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {order.invoiceNumber}
              {order.isDemo ? <DemoTag t={t} /> : null}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-white/55">{order.id}</p>
          </div>
          <div className="space-y-2.5 sm:text-right">
            <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight">{usd(order.amountCents, locale)}</p>
            <OrderStatusChip status={order.status} t={t} />
          </div>
        </div>
        <Progress status={order.status} t={t} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <OrderActions orderId={order.id} status={order.status} />
        {order.txHash ? (
          <Link href={`/proof/${order.id}`} className={btnOutline}>
            <ShieldCheck size={17} aria-hidden="true" />
            {t('od.proof')}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-bold">{t('od.summary')}</h2>
          <dl className="space-y-3.5 text-sm">
            <Item label={t('od.supplier')} value={order.supplierName} />
            <Item label={t('od.wallet')} value={order.supplierWallet} mono href={explorerAddress(order.supplierWallet)} />
            <Item label={t('od.amount')} value={usd(order.amountCents, locale)} />
            <Item label={t('od.fee')} value={`${usd(order.feeCents, locale)} (${order.feeBps / 100}%)`} />
            <Item label={t('od.total')} value={usd(order.totalCents, locale)} strong />
            {order.totalBrlCents != null ? <Item label={t('od.brl')} value={brl(order.totalBrlCents, locale)} /> : null}
            <Item label={t('od.due')} value={dateShort(order.dueDate, locale)} />
            <Item label={t('od.source')} value={sourceLabel} />
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-bold">{t('od.onchain')}</h2>
          {order.txHash ? (
            <dl className="space-y-3.5 text-sm">
              <Item label={t('wiz.pay.network')} value={NETWORK_NAME} />
              <Item label={t('wiz.pay.tx')} value={shortHash(order.txHash, 10, 8)} mono href={explorerTx(order.txHash)} />
              <Item label={t('wiz.pay.memo')} value={order.reference} mono />
              <Item label={t('col.paid')} value={dateTime(order.paidAt, locale)} />
              <Item label={t('wiz.pay.time')} value={seconds(order.confirmMs, locale)} />
            </dl>
          ) : (
            <p className="rounded-xl bg-tint p-5 text-sm text-muted">{t('od.noTx')}</p>
          )}
        </Card>

        {order.recon ? (
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-bold">{t('od.recon.title')}</h2>
            <ul className="space-y-2.5 text-sm">
              {checks.map(([key, label]) => {
                const ok = order.recon!.checks[key]
                return (
                  <li key={key} className="flex items-center gap-3 rounded-xl bg-tint px-3.5 py-2.5">
                    <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full', ok ? 'bg-ok-bg text-ok-ink' : 'bg-bad-bg text-bad-ink')}>
                      {ok ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <X size={14} strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <span className="font-medium">{label}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-xs text-muted">
              {t('col.reconciled')}: {dateTime(order.reconciledAt, locale)} · log #{order.recon.logIndex}
            </p>
          </Card>
        ) : null}

        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-bold">{t('od.timeline')}</h2>
          <ol className="relative ml-2 space-y-5 border-l-2 border-line pl-6">
            {events.map((e, i) => {
              const key = `od.event.${e.type}`
              const label = key in dict.en ? t(key as Key) : e.type
              const last = i === events.length - 1
              return (
                <li key={e.id} className="relative text-sm">
                  <span
                    className={clsx(
                      'absolute -left-[33px] top-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-white',
                      last ? 'bg-brand-500 ring-4 ring-brand-500/20' : 'bg-bank-soft',
                    )}
                    aria-hidden="true"
                  />
                  <p className="font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted">{dateTime(e.ts, locale)}</p>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>
    </div>
  )
}

/** Quote → payment → reconciled, in the header of the order. */
function Progress({ status, t }: { status: OrderStatus; t: T }) {
  const steps = [t('wiz.step.quote'), t('wiz.step.pay'), t('status.reconciled')]
  const reached = status === 'quoted' ? 0 : status === 'reconciled' ? 2 : 1
  return (
    <ol className="mt-8 flex items-center" aria-label="Progress">
      {steps.map((label, i) => (
        <li key={label} className={clsx('flex items-center', i < steps.length - 1 && 'flex-1')} aria-current={i === reached ? 'step' : undefined}>
          <span className="flex items-center gap-2.5">
            <span
              className={clsx(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold',
                i < reached || (i === reached && status === 'reconciled')
                  ? 'bg-mint text-navy-900'
                  : i === reached
                    ? 'bg-white text-navy-900 ring-4 ring-white/20'
                    : 'bg-white/10 text-white/60',
              )}
            >
              {i < reached || (i === reached && status === 'reconciled') ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className={clsx('text-sm font-semibold', i <= reached ? 'text-white' : 'text-white/55')}>{label}</span>
          </span>
          {i < steps.length - 1 ? <span className={clsx('mx-3 h-0.5 min-w-4 flex-1 rounded-full sm:mx-5', i < reached ? 'bg-mint' : 'bg-white/15')} aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  )
}

function Item({ label, value, mono = false, strong = false, href }: { label: string; value: string; mono?: boolean; strong?: boolean; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={clsx('min-w-0 break-all text-right', mono && 'font-mono text-xs', strong ? 'font-display text-base font-extrabold' : 'font-semibold')}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            {value} <ExternalLink size={12} aria-hidden="true" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
