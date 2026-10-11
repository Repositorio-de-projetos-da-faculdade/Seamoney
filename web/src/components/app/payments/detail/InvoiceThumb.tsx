'use client'

import clsx from 'clsx'
import { useState } from 'react'
import { dateShort, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Payment, Supplier } from '@/lib/demo/types'
import { Dialog } from '../../kit/Dialog'
import { code, display, figure, label } from '../../kit/styles'

/** Two letters from the supplier's name, for the square monogram. */
function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** A commercial invoice drawn from the payment's data, on a sheet of paper. Small on the panel, larger in the dialog. */
function InvoiceSheet({ payment: p, supplier, large = false }: { payment: Payment; supplier: Supplier | undefined; large?: boolean }) {
  const { t, locale } = useT()
  const name = supplier?.name ?? ''
  return (
    <div className={clsx('bg-paper-hi text-ink shadow-[0_2px_6px_rgba(7,21,31,0.18)]', large ? 'p-8' : '-rotate-1 p-4')}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={clsx('grid shrink-0 place-items-center bg-night font-grotesk font-medium text-foam', large ? 'size-14 text-[20px]' : 'size-9 text-[13px]')}>
          {monogram(name)}
        </span>
        <div className="min-w-0">
          <p className={clsx(display, 'truncate', large ? 'text-[22px]' : 'text-[14px]')}>{name}</p>
          <p className={label}>{t('app.pdoc.inv.kind')}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hair pt-3">
        <div className="min-w-0">
          <dt className={label}>{t('app.pdoc.inv.no')}</dt>
          <dd className={clsx(code, 'mt-0.5 break-all text-[12px] text-ink')}>{p.invoiceNumber}</dd>
        </div>
        <div className="min-w-0">
          <dt className={label}>{t('app.pdoc.inv.due')}</dt>
          <dd className="mt-0.5 text-[13px] text-ink">{dateShort(p.dueDate, locale)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-hair pt-3">
        <p className={label}>{t('app.pdoc.inv.total')}</p>
        <p className={clsx(figure, 'text-[24px] leading-none tabular-nums text-ink', large && 'text-[34px]')}>{usd(p.quote.totalCents, locale)}</p>
      </div>
    </div>
  )
}

/** The invoice as a small paper sheet under the panel; a click opens it larger. The caption says what it is not. */
export function InvoiceThumb({ payment: p, supplier }: { payment: Payment; supplier: Supplier | undefined }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  return (
    <figure className="m-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('app.pdoc.inv.open')}
        className="block w-full max-w-[250px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
      >
        <InvoiceSheet payment={p} supplier={supplier} />
      </button>
      <figcaption className="mt-3 max-w-[260px] text-[12.5px] leading-relaxed text-muted">{t('app.pdoc.inv.caption')}</figcaption>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('app.pdoc.inv.title')} wide>
        <InvoiceSheet payment={p} supplier={supplier} large />
        <p className="mt-4 text-[13px] text-muted">{t('app.pdoc.inv.caption')}</p>
      </Dialog>
    </figure>
  )
}
