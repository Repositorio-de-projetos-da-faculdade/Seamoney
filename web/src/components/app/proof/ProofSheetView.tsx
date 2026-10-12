'use client'

import { useT } from '@/lib/i18n/client'
import { usd } from '@/lib/format'
import { explorerTxOn } from '@/lib/links'
import type { ReconChecks } from '@/lib/demo/types'
import { Stamp, stampDate } from '../kit/Stamp'
import { figure, label } from '../kit/styles'
import { ProofBanner } from './ProofBanner'
import { ProofFacts, type ProofFactsData } from './ProofFacts'
import { ProofLetterhead } from './ProofLetterhead'
import { ProofRoute } from './ProofRoute'
import { ReceiptBlock } from './ReceiptBlock'

export interface ProofSheetData extends ProofFactsData {
  companyName: string
  amountCents: number
  /** Where the supplier ships from, as "City (PORT)"; empty when unknown. */
  destination: string
  /** A real transfer on a test network (or a simulated one in the offline demo). */
  live: boolean
  checks: ReconChecks | null
}

/** The paper the supplier receives: letterhead, the settlement banner, the amount and route, the facts, and the checks that closed it. */
export function ProofSheetView({ data: d }: { data: ProofSheetData }) {
  const { t, locale } = useT()
  const explorer = explorerTxOn(d.network, d.txHash)

  return (
    <article className="bg-paper-hi text-ink shadow-[0_1px_0_rgb(6_24_44/0.06),0_2px_6px_-2px_rgb(6_24_44/0.1)] print:bg-white print:shadow-none">
      <ProofLetterhead companyName={d.companyName} supplierName={d.supplierName}>
        {d.reconciledAt && d.checks ? (
          <Stamp kind="reconciled" word={t('app.proof.word')} lines={[stampDate(d.reconciledAt, locale), d.reference]} at={d.reconciledAt} />
        ) : null}
      </ProofLetterhead>

      <ProofBanner live={d.live} href={explorer} network={d.network} />

      <div className="border-b border-hair px-5 py-6 sm:px-8">
        <p className={`${label} !text-ink/60`}>{t('app.proof.amount')}</p>
        <p className={`${figure} mt-2 text-[clamp(2rem,8vw,3rem)] leading-none`}>{usd(d.amountCents, locale)}</p>
      </div>

      <ProofRoute origin={t('app.proof.origin')} destination={d.destination} paidAt={d.paidAt} reconciledAt={d.reconciledAt} />

      <ProofFacts facts={d} />

      {d.checks ? (
        <div className="border-t border-ink px-5 py-6 sm:px-8">
          <ReceiptBlock
            title={t('app.proof.checks')}
            checks={d.checks}
            passLabel={t('app.proof.pass')}
            failLabel={t('app.proof.fail')}
            checkLabel={(k) => t(`app.proof.check.${k}`)}
            note={d.live ? null : t('app.proof.simulated')}
            link={d.live ? { href: explorer, label: t('app.proof.explorer') } : null}
          />
        </div>
      ) : null}
    </article>
  )
}
