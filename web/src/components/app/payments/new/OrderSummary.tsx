'use client'

import clsx from 'clsx'
import { brl, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { orList } from '@/lib/list'
import { parseMoneyToCents } from '@/lib/money'
import { quote } from '@/lib/demo/pricing'
import { activeWallet, needsApproval, roleCan } from '@/lib/demo/rules'
import type { DemoState, Member } from '@/lib/demo/types'
import { Simulated } from '../../kit/Status'
import { code, figure, label } from '../../kit/styles'
import type { Draft } from './draft'

/**
 * The order as it will be created, updated while you type. Empty until a supplier or an amount exists (a ghost sheet),
 * then the port, the wallet that will receive, the quote and what happens next. Nothing is saved until the button below.
 */
export function OrderSummary({ state, me, draft }: { state: DemoState; me: Member; draft: Draft }) {
  const { t, locale } = useT()
  const supplier = state.suppliers.find((s) => s.id === draft.supplierId)
  const cents = parseMoneyToCents(draft.amount) ?? 0
  const invoice = draft.invoiceNumber.trim()

  if (!supplier && cents <= 0) {
    return (
      <aside aria-label={t('app.np.summary')} className="border border-dashed border-ink/25 p-6">
        <p className={label}>{t('app.np.summary')}</p>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{t('app.pnew.sum.ghost')}</p>
        <div aria-hidden="true" className="mt-6 space-y-3">
          <div className="h-px bg-ink/15" />
          <div className="h-px w-2/3 bg-ink/15" />
          <div className="h-px w-5/6 bg-ink/15" />
          <div className="h-px w-1/2 bg-ink/15" />
        </div>
      </aside>
    )
  }

  const q = quote(cents, state.settings)
  const approvers = state.members.filter((m) => m.status === 'active' && roleCan(m.role, 'approve') && m.id !== me.id).map((m) => m.name)
  const big = needsApproval(cents, state.settings)
  const wallet = supplier && draft.network ? activeWallet(supplier, draft.network) : undefined

  const line = (name: string, value: string, strong = false) => (
    <div className={strong ? 'flex items-baseline justify-between gap-4 border-t border-ink pt-3' : 'flex items-baseline justify-between gap-4'}>
      <dt className={strong ? 'font-medium text-ink' : 'text-muted'}>{name}</dt>
      <dd className={strong ? `${figure} text-[26px] text-ink` : 'tabular-nums text-ink'}>{value}</dd>
    </div>
  )

  return (
    <aside aria-label={t('app.np.summary')} className="bg-paper-hi p-6 shadow-[0_1px_0_rgb(6_24_44/0.06),0_30px_70px_-40px_rgb(6_24_44/0.45)] ring-1 ring-paper-line">
      <div className="border-b border-ink pb-4">
        <p className={label}>{t('app.np.summary')}</p>
        <p className="mt-1.5 truncate font-grotesk text-[22px] leading-tight tracking-[-0.025em] text-ink">{supplier?.name ?? t('app.np.noSupplier')}</p>
        {supplier ? (
          <p className="mt-1 text-[13px] text-muted">
            {t('app.pnew.sum.port')}: {supplier.port}, {supplier.city}
          </p>
        ) : null}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          {invoice ? <span className={code}>{invoice}</span> : null}
          {supplier ? (
            <span className={clsx(!wallet && 'text-warn-ink')}>
              {t('app.pnew.sum.receives')}:{' '}
              {draft.network && wallet ? `${t(`app.net.${draft.network}.long`)}, ${t('app.np.walletVersion', { version: wallet.version })}` : t('app.pnew.sum.noNetwork')}
            </span>
          ) : null}
        </p>
      </div>

      {cents > 0 ? (
        <>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            {line(t('app.np.s.amount'), usd(q.amountCents, locale))}
            {line(t('app.np.s.fee', { pct: q.feeBps / 100 }), usd(q.feeCents, locale))}
            {line(t('app.np.s.total'), usd(q.totalCents, locale), true)}
          </dl>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[13.5px]">
            <span className="text-muted">{t('app.np.s.brl', { rate: q.fxRate.toFixed(2) })}</span>
            <span className="flex items-center gap-2 tabular-nums text-ink">
              {brl(q.totalBrlCents, locale)}
              <Simulated />
            </span>
          </div>
          <p className="mt-2 text-[13px] text-ok-ink">{t('app.np.s.savings', { amount: usd(q.savingsCents, locale), pct: q.bankFeePct })}</p>
        </>
      ) : null}

      <div className="mt-5 border-t border-paper-line pt-4 text-[13.5px] leading-relaxed">
        <p className={label}>{t('app.np.s.after')}</p>
        <p className="mt-1.5 text-ink">
          {cents <= 0
            ? t('app.np.s.afterEmpty')
            : big
              ? t('app.np.s.approval', { names: orList(approvers, locale), limit: usd(state.settings.approvalThresholdCents, locale) })
              : t('app.np.s.policy', { limit: usd(state.settings.approvalThresholdCents, locale) })}
        </p>
      </div>
    </aside>
  )
}
