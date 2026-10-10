'use client'

import clsx from 'clsx'
import { Copy } from 'iconoir-react'
import { useT } from '@/lib/i18n/client'
import { useToast } from '../../kit/Toaster'

/** Copies a value (memo, wallet, transaction hash) to the clipboard and confirms with a toast. */
export function CopyButton({ value, what, onNight = false }: { value: string; what: string; onNight?: boolean }) {
  const { t } = useT()
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.ok(t('app.copied'))
    } catch {
      toast.bad(t('app.err.generic'))
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('app.pdoc.copyFor', { what })}
      title={t('app.copy')}
      className={clsx(
        'inline-flex size-7 shrink-0 items-center justify-center print:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        onNight ? 'text-foam/60 hover:bg-foam/[0.08] hover:text-white' : 'text-muted hover:bg-ink/[0.06] hover:text-ink',
      )}
    >
      <Copy width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
    </button>
  )
}
