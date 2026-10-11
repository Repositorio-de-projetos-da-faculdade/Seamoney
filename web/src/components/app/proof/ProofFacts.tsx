'use client'

import { useT } from '@/lib/i18n/client'
import { dateTime } from '@/lib/format'
import type { Payment, Supplier, Wallet } from '@/lib/demo/types'
import { Facts, type Row } from '../kit/Fields'
import { NetworkTag } from '../kit/Status'
import { code, label } from '../kit/styles'
import { HashGroups } from './HashGroups'

/** One group of facts under a small heading, the rule above it on the sheet. */
function FactGroup({ heading, rows }: { heading: string; rows: Row[] }) {
  return (
    <section className="border-b border-hair last:border-b-0">
      <h2 className={`${label} px-5 pt-5 !text-ink/60 sm:px-8`}>{heading}</h2>
      <Facts rows={rows} className="sm:[&>div]:px-8" />
    </section>
  )
}

/** The facts of the transfer in two groups: what was paid, and what the network recorded. */
export function ProofFacts({ payment, supplier, wallet }: { payment: Payment; supplier: Supplier | undefined; wallet: Wallet | undefined }) {
  const { t, locale } = useT()
  const s = payment.settlement
  if (!s) return null
  const net = payment.network
  const numberLocale = locale === 'pt' ? 'pt-BR' : 'en-US'

  const paymentRows: Row[] = [
    { label: t('app.proof.supplier'), value: supplier?.name ?? '' },
    { label: t('app.proof.invoice'), value: <span className={code}>{payment.invoiceNumber}</span> },
    { label: t('app.proof.reference'), value: <span className={code}>{payment.reference}</span>, note: t('app.proof.referenceNote') },
    { label: t('app.proof.paidAt'), value: dateTime(s.paidAt, locale) },
  ]
  if (payment.recon) paymentRows.push({ label: t('app.proof.reconciledAt'), value: dateTime(payment.recon.matchedAt, locale) })

  const networkRows: Row[] = [
    { label: t('app.proof.network'), value: <NetworkTag network={net} />, note: t(`app.net.${net}.long`) },
    { label: t('app.proof.token'), value: t(`app.net.${net}.token`) },
    {
      label: t('app.proof.wallet'),
      value: (
        <span className={code}>
          <HashGroups value={wallet?.address ?? ''} />
        </span>
      ),
      note: wallet ? t('app.proof.walletVersion', { n: wallet.version }) : undefined,
    },
    {
      label: t(`app.net.${net}.tx`),
      value: (
        <span className={code}>
          <HashGroups value={s.txHash} />
        </span>
      ),
    },
    { label: t(`app.net.${net}.height`), value: <span className={`${code} tabular-nums`}>{s.blockNumber.toLocaleString(numberLocale)}</span> },
  ]

  return (
    <div>
      <FactGroup heading={t('app.proof.paymentGroup')} rows={paymentRows} />
      <FactGroup heading={t('app.proof.networkGroup')} rows={networkRows} />
    </div>
  )
}
