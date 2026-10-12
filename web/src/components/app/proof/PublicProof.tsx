'use client'

import { Check, Copy, Printer } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import type { Proof } from '@/lib/types'
import { Empty, Note, Panel } from '../kit/Panel'
import { btnGo, btnLine } from '../kit/styles'
import { LangSwitch } from '../shell/LangSwitch'
import { ProofSheetView } from './ProofSheetView'

/**
 * The public proof page (/proof/[id]): the same sheet as in the workspace, filled by the rules service, which also
 * looks the transaction up on the network right now. Opens from any browser, with nothing to sign in to.
 */
export function PublicProof({ proof }: { proof: Proof | null }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // clipboard blocked: nothing to do
    }
  }

  const o = proof?.order
  const verified = proof?.tx?.status === 'success'

  return (
    <main id="main" className="min-h-dvh bg-paper px-4 py-8 print:bg-white print:p-0 sm:px-6 md:py-14">
      <div className="mx-auto w-full max-w-[44rem] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <LangSwitch />
          {o ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className={btnLine}>
                <Printer size={15} aria-hidden="true" />
                {t('app.proof.print')}
              </button>
              <button type="button" onClick={copy} className={btnGo} aria-live="polite">
                {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                {copied ? t('app.proof.copied') : t('app.proof.copy')}
              </button>
            </div>
          ) : null}
        </div>

        {o ? (
          <>
            <Note tone={verified ? 'ok' : 'warn'}>{verified ? `${t('proof.verified')}. ${t('proof.ship')}` : t('proof.pending')}</Note>
            <ProofSheetView
              data={{
                companyName: o.companyName ?? '',
                supplierName: o.supplierName,
                invoiceNumber: o.invoiceNumber,
                reference: o.reference,
                amountCents: o.amountCents,
                destination: o.supplierCity && o.supplierPort ? `${o.supplierCity} (${o.supplierPort})` : '',
                live: true,
                paidAt: proof.tx?.timestamp ?? o.paidAt ?? '',
                reconciledAt: o.reconciledAt,
                checks: o.recon?.checks ?? null,
                network: o.network,
                walletAddress: o.supplierWallet ?? '',
                walletVersion: null,
                txHash: o.txHash,
                blockNumber: proof.tx?.blockNumber ?? o.blockNumber,
              }}
            />
            <p className="text-center text-[12.5px] leading-relaxed text-muted print:hidden">{t('proof.how.desc')}</p>
            <p className="text-center text-[12.5px] leading-relaxed text-muted">{t('proof.demo')}</p>
          </>
        ) : (
          <Panel>
            <Empty title={t('proof.notFound')}>{t('proof.sub')}</Empty>
          </Panel>
        )}
      </div>
    </main>
  )
}
