'use client'

import { Page } from 'iconoir-react'
import { useT } from '@/lib/i18n/client'
import type { InvoiceSource } from '@/lib/demo/types'
import { textLink } from '../../kit/styles'

/** The invoice file this order was read from, with the tag for how it was read and a way back to step 1. */
export function FileChip({ filename, source, onReplace }: { filename: string; source: InvoiceSource; onReplace: () => void }) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-rule bg-sheet px-4 py-3">
      <Page width={18} height={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink/70" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink" title={filename}>
        {filename}
      </span>
      <span className="border border-ink/25 px-2 py-0.5 text-[12px] text-muted">{source === 'ai' ? t('app.pnew.file.ai') : t('app.pnew.file.sample')}</span>
      <button type="button" className={textLink} onClick={onReplace}>
        {t('app.pnew.file.replace')}
      </button>
    </div>
  )
}
