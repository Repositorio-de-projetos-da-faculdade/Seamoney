'use client'

import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n/client'
import { label } from '../kit/styles'

/** Up to two initials of the company name, for the square monogram. */
function monogram(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  )
}

/** The sheet's head: the importer's monogram and name, the title, the addressed supplier, and a slot for the stamp. */
export function ProofLetterhead({ companyName, supplierName, children }: { companyName: string; supplierName: string; children?: ReactNode }) {
  const { t } = useT()
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-b border-ink px-5 pb-5 pt-6 sm:px-8">
      <div className="flex min-w-0 gap-4">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center bg-ink font-grotesk text-[17px] font-semibold text-paper-hi">
          {monogram(companyName)}
        </span>
        <div className="min-w-0">
          <p className={`${label} !text-ink/60`}>{t('app.proof.issuer')}</p>
          <p className="mt-0.5 break-words font-grotesk text-[16px] font-semibold">{companyName}</p>
          <h1 className="mt-4 font-grotesk text-[clamp(1.6rem,5vw,2.2rem)] font-medium leading-none tracking-[-0.02em]">{t('app.proof.title')}</h1>
          <p className="mt-2 text-[14.5px] text-muted">{t('app.proof.to', { supplier: supplierName })}</p>
        </div>
      </div>
      {children}
    </header>
  )
}
