import { Check, Hourglass, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { OrderActions } from '@/components/OrderActions'
import { DemoTag } from '@/components/OrderStatus'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'
import { dateTime, shortHash, usd } from '@/lib/format'
import { listOrders } from '@/lib/api'
import { getT } from '@/lib/i18n/server'
import { explorerTx } from '@/lib/links'

export default async function ReconciliationPage() {
  const { t, locale } = await getT()
  const orders = await listOrders()
  const open = orders.filter((o) => o.status === 'sent')
  const done = orders.filter((o) => o.status === 'reconciled')

  return (
    <div className="space-y-8">
      <PageHeader title={t('recon.title')} sub={t('recon.sub')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-warn-bg text-warn-ink">
            <Hourglass size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-3xl font-extrabold tabular-nums leading-none">{open.length}</p>
            <p className="mt-1.5 text-sm font-semibold text-muted">{t('recon.open')}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ok-bg text-ok-ink">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-3xl font-extrabold tabular-nums leading-none">{done.length}</p>
            <p className="mt-1.5 text-sm font-semibold text-muted">{t('recon.done')}</p>
          </div>
        </Card>
      </div>

      <section aria-labelledby="open-h" className="space-y-3">
        <h2 id="open-h" className="font-display text-lg font-bold">
          {t('recon.open')} <span className="text-muted">({open.length})</span>
        </h2>
        <Card className="divide-y divide-line">
          {open.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">{t('recon.none')}</p>
          ) : (
            open.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <Link href={`/dashboard/orders/${o.id}`} className="font-display font-bold text-navy-900 hover:text-brand-700">
                    {o.invoiceNumber}
                  </Link>
                  {o.isDemo ? <DemoTag t={t} /> : null}
                  <p className="mt-0.5 text-sm text-muted">
                    {o.supplierName} · <span className="font-semibold tabular-nums text-ink">{usd(o.amountCents, locale)}</span>
                  </p>
                </div>
                <OrderActions orderId={o.id} status={o.status} compact />
              </div>
            ))
          )}
        </Card>
      </section>

      <section aria-labelledby="done-h" className="space-y-3">
        <h2 id="done-h" className="font-display text-lg font-bold">
          {t('recon.done')} <span className="text-muted">({done.length})</span>
        </h2>
        <Card className="overflow-hidden">
          {done.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">{t('recon.none')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line bg-tint/70 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.reference')}</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.supplier')}</th>
                    <th scope="col" className="px-6 py-3.5 text-right font-semibold">{t('col.amount')}</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.tx')}</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">{t('col.reconciled')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {done.map((o) => (
                    <tr key={o.id} className="transition hover:bg-tint/70">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2.5">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-ok-bg text-ok-ink">
                            <Check size={13} strokeWidth={3} aria-hidden="true" />
                          </span>
                          <Link href={`/dashboard/orders/${o.id}`} className="font-display font-bold text-navy-900 hover:text-brand-700">
                            {o.reference}
                          </Link>
                          {o.isDemo ? <DemoTag t={t} /> : null}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted">{o.supplierName}</td>
                      <td className="px-6 py-4 text-right font-display font-bold tabular-nums">{usd(o.amountCents, locale)}</td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {o.txHash ? (
                          <a href={explorerTx(o.txHash)} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                            {shortHash(o.txHash)}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted">{dateTime(o.reconciledAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
