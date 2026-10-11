'use client'

import { useT } from '@/lib/i18n/client'
import { usd } from '@/lib/format'
import { explorerTxOn } from '@/lib/links'
import type { DemoState, Payment, Supplier, Wallet } from '@/lib/demo/types'
import { Stamp, stampDate } from '../kit/Stamp'
import { figure, label } from '../kit/styles'
import { ProofBanner } from './ProofBanner'
import { ProofFacts } from './ProofFacts'
import { ProofLetterhead } from './ProofLetterhead'
import { ProofRoute } from './ProofRoute'
import { ReceiptBlock } from './ReceiptBlock'

/** The paper the supplier receives: letterhead, the settlement banner, the amount and route, the facts, and the checks that closed it. */
export function ProofSheet({ state, payment, supplier, wallet }: { state: DemoState; payment: Payment; supplier: Supplier | undefined; wallet: Wallet | undefined }) {
  const { t, locale } = useT()
  const s = payment.settlement
  if (!s) return null
  const live = s.mode === 'testnet'
  const recon = payment.recon

  return (
    <article className="bg-paper-hi text-ink shadow-[0_1px_0_rgb(6_24_44/0.06),0_2px_6px_-2px_rgb(6_24_44/0.1)] print:bg-white print:shadow-none">
      <ProofLetterhead companyName={state.settings.companyName} supplierName={supplier?.name ?? ''}>
        {payment.status === 'reconciled' && recon ? (
          <Stamp kind="reconciled" word={t('app.proof.word')} lines={[stampDate(recon.matchedAt, locale), payment.reference]} at={recon.matchedAt} />
        ) : null}
      </ProofLetterhead>

      <ProofBanner live={live} href={explorerTxOn(s.network, s.txHash)} />

      <div className="border-b border-hair px-5 py-6 sm:px-8">
        <p className={`${label} !text-ink/60`}>{t('app.proof.amount')}</p>
        <p className={`${figure} mt-2 text-[clamp(2rem,8vw,3rem)] leading-none`}>{usd(payment.quote.amountCents, locale)}</p>
      </div>

      <ProofRoute
        origin={t('app.proof.origin')}
        destination={supplier ? `${supplier.city} (${supplier.port})` : ''}
        paidAt={s.paidAt}
        reconciledAt={recon?.matchedAt ?? null}
      />

      <ProofFacts payment={payment} supplier={supplier} wallet={wallet} />

      {recon ? (
        <div className="border-t border-ink px-5 py-6 sm:px-8">
          <ReceiptBlock
            title={t('app.proof.checks')}
            checks={recon.checks}
            passLabel={t('app.proof.pass')}
            failLabel={t('app.proof.fail')}
            checkLabel={(k) => t(`app.proof.check.${k}`)}
            note={live ? null : t('app.proof.simulated')}
            link={live ? { href: explorerTxOn(s.network, s.txHash), label: t('app.proof.explorer') } : null}
          />
        </div>
      ) : null}
    </article>
  )
}
