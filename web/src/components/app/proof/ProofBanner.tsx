'use client'

import { useT } from '@/lib/i18n/client'
import { Simulated } from '../kit/Status'

/** The line under the letterhead: simulated settlements say so plainly, testnet ones link to the explorer. */
export function ProofBanner({ live, href }: { live: boolean; href: string }) {
  const { t } = useT()
  if (!live) {
    return (
      <div className="border-b border-ink/15 px-5 py-3 sm:px-8">
        <Simulated className="!normal-case !tracking-normal">{t('app.proof.bannerSimulated')}</Simulated>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink/15 px-5 py-3 text-[14px] sm:px-8">
      <p className="flex items-center gap-2.5 font-medium">
        <span aria-hidden="true" className="size-2 shrink-0 rotate-45 bg-mint" />
        {t('app.proof.bannerTestnet')}
      </p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-[4px] print:hidden">
        {t('app.proof.explorer')}
      </a>
    </div>
  )
}
