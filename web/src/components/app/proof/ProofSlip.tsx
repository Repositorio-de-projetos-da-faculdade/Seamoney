'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Copy, Printer } from 'lucide-react'
import { useT } from '@/lib/i18n/client'
import { useDemoState } from '@/lib/demo/store'
import { paymentOf, supplierOf, walletOf } from '@/lib/demo/selectors'
import { Empty, Panel } from '../kit/Panel'
import { btnGo, btnLine } from '../kit/styles'
import { LangSwitch } from '../shell/LangSwitch'
import { ProofSheet } from './ProofSheet'

/** What the supplier gets as proof of payment (/app/proof/[id]). Reads the demo state of this browser. */
export function ProofSlip({ id }: { id: string }) {
  const { t } = useT()
  const state = useDemoState()
  const [copied, setCopied] = useState(false)
  if (!state) return null

  const payment = paymentOf(state, id)
  const ready = payment?.settlement != null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // clipboard blocked: nothing to do
    }
  }

  return (
    <main id="main" className="min-h-dvh bg-paper px-4 py-8 print:bg-white print:p-0 sm:px-6 md:py-14">
      <div className="mx-auto w-full max-w-[44rem]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <LangSwitch />
          {payment && ready ? (
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
        {payment && ready ? (
          <ProofSheet state={state} payment={payment} supplier={supplierOf(state, payment)} wallet={walletOf(state, payment)} />
        ) : (
          <Panel>
            <Empty
              title={payment ? t('app.proof.pendingTitle') : t('app.proof.missingTitle')}
              action={
                <Link href="/app" className={btnLine}>
                  {t('app.proof.back')}
                </Link>
              }
            >
              {payment ? t('app.proof.pendingBody') : t('app.proof.missingBody')}
            </Empty>
          </Panel>
        )}
      </div>
    </main>
  )
}
