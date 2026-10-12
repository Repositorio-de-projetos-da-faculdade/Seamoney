'use client'

import type { DemoState, Payment, Supplier, Wallet } from '@/lib/demo/types'
import { ProofSheetView } from './ProofSheetView'

/** The proof of a payment kept in this browser (the offline demo, or a testnet payment made here). */
export function ProofSheet({ state, payment, supplier, wallet }: { state: DemoState; payment: Payment; supplier: Supplier | undefined; wallet: Wallet | undefined }) {
  const s = payment.settlement
  if (!s) return null
  const recon = payment.status === 'reconciled' ? payment.recon : null
  return (
    <ProofSheetView
      data={{
        companyName: state.settings.companyName,
        supplierName: supplier?.name ?? '',
        invoiceNumber: payment.invoiceNumber,
        reference: payment.reference,
        amountCents: payment.quote.amountCents,
        destination: supplier ? `${supplier.city} (${supplier.port})` : '',
        live: s.mode === 'testnet',
        paidAt: s.paidAt,
        reconciledAt: recon?.matchedAt ?? null,
        checks: payment.recon?.checks ?? null,
        network: payment.network,
        walletAddress: wallet?.address ?? '',
        walletVersion: wallet?.version ?? null,
        txHash: s.txHash,
        blockNumber: s.blockNumber,
      }}
    />
  )
}
