'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { Simulated } from '../kit/Status'
import { REVEAL } from './reveal'

/** Two letters from the first words of the name, for the square that stands in for the company. */
export function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/**
 * The company, set like a letterhead: the monogram square sits on the rail's icon column; the name in display type
 * and the verification label fade in beside it when the column opens. The text has a fixed width, so it never
 * reflows while the column moves.
 */
export function CompanyBlock({ name }: { name: string }) {
  const { t } = useT()
  return (
    <div className="flex items-center gap-3 pl-5" title={name}>
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[3px] bg-foam/10 font-grotesk text-[13px] font-semibold text-white">
        {monogram(name)}
      </span>
      <div className={clsx('w-[150px] shrink-0', REVEAL)}>
        <p className="line-clamp-2 font-grotesk text-[16px] leading-tight tracking-[-0.02em] text-white">{name}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-[10px] uppercase tracking-[0.08em] text-foam/45">
          <span>{t('app.side.verified')}</span>
          <Simulated onNight className="!text-[10px]" />
        </p>
      </div>
    </div>
  )
}
