import { Download } from 'lucide-react'
import { DemoTag, OrderStatusChip } from '@/components/OrderStatus'
import { PageHeader } from '@/components/PageHeader'
import { btnPrimary, Card } from '@/components/ui'
import { brl, dateShort, usd } from '@/lib/format'
import { listOrders } from '@/lib/api'
import { getT } from '@/lib/i18n/server'

export default async function ReportsPage() {
  const { t, locale } = await getT()
  const orders = await listOrders(25)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        sub={t('reports.sub')}
        actions={
          <a href="/api/reports/orders" className={btnPrimary} download>
            <Download size={18} aria-hidden="true" />
            {t('reports.csv')}
          </a>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-tint/70 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.reference')}</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.supplier')}</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">USD</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">BRL ({locale === 'pt' ? 'simulado' : 'simulated'})</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.status')}</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-tint/70">
                  <td className="whitespace-nowrap px-6 py-4 font-display font-bold text-navy-900">
                    {o.reference}
                    {o.isDemo ? <DemoTag t={t} /> : null}
                  </td>
                  <td className="px-6 py-4 text-muted">{o.supplierName}</td>
                  <td className="px-6 py-4 text-right font-semibold tabular-nums">{usd(o.totalCents, locale)}</td>
                  <td className="px-6 py-4 text-right tabular-nums text-muted">{o.totalBrlCents != null ? brl(o.totalBrlCents, locale) : '-'}</td>
                  <td className="px-6 py-4"><OrderStatusChip status={o.status} t={t} /></td>
                  <td className="px-6 py-4 text-muted">{dateShort(o.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
