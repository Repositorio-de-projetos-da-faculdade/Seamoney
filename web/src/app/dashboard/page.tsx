import { ArrowRight, Clock, FileClock, FileText, PiggyBank, Plus, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { DemoTag, OrderStatusChip } from '@/components/OrderStatus'
import { PageHeader } from '@/components/PageHeader'
import { SavingsChart } from '@/components/SavingsChart'
import { ShipScene } from '@/components/ShipScene'
import { btnPrimary, Card, Chip, IconTile } from '@/components/ui'
import { dateShort, seconds, usd } from '@/lib/format'
import { getStats, listOrders } from '@/lib/api'
import { getT } from '@/lib/i18n/server'

export default async function DashboardHome() {
  const { t, locale } = await getT()
  const [{ stats, series }, orders] = await Promise.all([getStats(), listOrders(5)])

  const kpis = [
    { icon: PiggyBank, label: t('kpi.savings'), value: usd(stats.savingsCents, locale), sub: t('kpi.savings.sub'), accent: true },
    { icon: FileClock, label: t('kpi.inprogress'), value: String(stats.inProgress), sub: t('kpi.inprogress.sub') },
    { icon: ScanLine, label: t('kpi.recon'), value: String(stats.reconciled), sub: t('kpi.recon.sub') },
    { icon: Clock, label: t('kpi.avg'), value: seconds(stats.avgConfirmMs, locale), sub: t('kpi.avg.sub') },
  ]

  return (
    <div className="space-y-7">
      <PageHeader
        title={t('dash.hello')}
        sub={t('dash.sub')}
        actions={stats.hasDemo ? <Chip tone="info">{t('dash.demoBadge')}</Chip> : null}
      />

      <section className="relative isolate overflow-hidden rounded-[24px] bg-navy-900 text-white shadow-pop">
        <ShipScene variant="wide" className="absolute inset-0 -z-20 h-full w-full max-sm:hidden" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/85 to-navy-900/0 max-sm:hidden" />
        <div className="flex flex-wrap items-center justify-between gap-5 px-7 py-8 sm:px-10 sm:py-9">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{t('brand.closing')}</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/80">{t('dash.banner.sub')}</p>
          </div>
          <Link href="/dashboard/orders/new" className={btnPrimary}>
            <Plus size={18} aria-hidden="true" />
            {t('orders.new')}
          </Link>
        </div>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ icon, label, value, sub, accent }) => (
          <li key={label}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-snug text-muted">{label}</p>
                <IconTile icon={icon} size={38} />
              </div>
              <p className={`mt-4 font-display text-[32px] font-extrabold leading-none tabular-nums tracking-tight ${accent ? 'text-brand-700' : 'text-navy-900'}`}>
                {value}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-muted">{sub}</p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-6 xl:col-span-3">
          <h2 className="mb-5 font-display text-lg font-bold">{t('chart.title')}</h2>
          <SavingsChart data={series} t={t} locale={locale} />
        </Card>

        <Card className="p-6 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t('latest.title')}</h2>
            <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-800">
              {t('viewAll')} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3.5 transition hover:bg-tint">
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
        </Card>
      </div>
    </div>
  )
}
