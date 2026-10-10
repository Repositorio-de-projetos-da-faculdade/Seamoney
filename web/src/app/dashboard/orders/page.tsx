import clsx from 'clsx'
import { ChevronRight, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { DemoTag, OrderStatusChip } from '@/components/OrderStatus'
import { PageHeader } from '@/components/PageHeader'
import { btnPrimary, Card } from '@/components/ui'
import { dateShort, usd } from '@/lib/format'
import { listOrders } from '@/lib/api'
import { getT } from '@/lib/i18n/server'
import type { OrderStatus } from '@/lib/types'

const FILTERS = ['all', 'quoted', 'sent', 'reconciled'] as const
type Filter = (typeof FILTERS)[number]

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [{ t, locale }, { status }] = await Promise.all([getT(), searchParams])
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : 'all'
  const all = await listOrders()
  const count = (f: Filter) => (f === 'all' ? all.length : all.filter((o) => o.status === f).length)
  const orders = filter === 'all' ? all : all.filter((o) => o.status === (filter as OrderStatus))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('orders.title')}
        sub={t('orders.sub')}
        actions={
          <Link href="/dashboard/orders/new" className={btnPrimary}>
            <Plus size={18} aria-hidden="true" />
            {t('orders.new')}
          </Link>
        }
      />

      <nav aria-label={t('col.status')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const active = f === filter
          return (
            <Link
              key={f}
              href={f === 'all' ? '/dashboard/orders' : `/dashboard/orders?status=${f}`}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
                active ? 'bg-navy-900 text-white shadow-md' : 'bg-white text-muted ring-1 ring-line hover:text-ink hover:ring-navy-500/30',
              )}
            >
              {f === 'all' ? t('orders.all') : t(`status.${f}` as const)}
              <span className={clsx('rounded-full px-2 py-0.5 text-xs tabular-nums', active ? 'bg-white/15' : 'bg-page')}>{count(f)}</span>
            </Link>
          )
        })}
      </nav>

      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">{all.length === 0 ? t('orders.empty') : t('orders.noMatch')}</p>
        ) : (
          <>
            {/* phones: one card per order */}
            <ul className="divide-y divide-line md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/dashboard/orders/${o.id}`} className="flex items-center gap-3 px-4 py-4 active:bg-tint">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-bg text-info-ink">
                      <FileText size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center text-sm font-bold">
                        <span className="truncate">{o.invoiceNumber}</span>
                        {o.isDemo ? <DemoTag t={t} /> : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {o.supplierName} · {dateShort(o.createdAt, locale)}
                      </span>
                    </span>
                    <span className="shrink-0 space-y-1.5 text-right">
                      <span className="block font-display text-sm font-bold tabular-nums">{usd(o.amountCents, locale)}</span>
                      <OrderStatusChip status={o.status} t={t} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* larger screens: a table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-tint/70 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.invoice')}</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.supplier')}</th>
                    <th scope="col" className="px-6 py-3.5 text-right font-semibold">{t('col.amount')}</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.status')}</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.date')}</th>
                    <th scope="col" className="w-10 px-3 py-3.5"><span className="sr-only">{t('col.order')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((o) => (
                    <tr key={o.id} className="group transition hover:bg-tint/70">
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link href={`/dashboard/orders/${o.id}`} className="font-display font-bold text-navy-900 group-hover:text-brand-700">
                          {o.invoiceNumber}
                        </Link>
                        {o.isDemo ? <DemoTag t={t} /> : null}
                      </td>
                      <td className="px-6 py-4 text-muted">{o.supplierName}</td>
                      <td className="px-6 py-4 text-right font-display font-bold tabular-nums">{usd(o.amountCents, locale)}</td>
                      <td className="px-6 py-4"><OrderStatusChip status={o.status} t={t} /></td>
                      <td className="px-6 py-4 text-muted">{dateShort(o.createdAt, locale)}</td>
                      <td className="px-3 py-4 text-muted/60 group-hover:text-brand-600">
                        <ChevronRight size={18} aria-hidden="true" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
