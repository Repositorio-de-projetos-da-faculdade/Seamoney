'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useT } from '@/lib/i18n/client'

/** Native <dialog>: focus trap, Escape and inert background come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { t } = useT()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop lands on the dialog element itself
        if (e.target === e.currentTarget) onClose()
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} border border-rule bg-sheet p-0 font-text text-ink shadow-[0_40px_90px_-36px_rgb(6_24_44/0.55)] backdrop:bg-abyss/70`}
    >
      {open ? (
        <div>
          <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
            <h2 id={titleId} className="font-grotesk text-[18px] font-medium tracking-[-0.02em] text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-m-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-desk hover:text-ink"
              aria-label={t('app.close')}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  )
}
