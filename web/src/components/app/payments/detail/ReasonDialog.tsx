'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { Dialog } from '../../kit/Dialog'
import { FormField } from '../../kit/Fields'
import { btnDanger, btnLine, fieldInput } from '../../kit/styles'

/** Saying no to a payment (reject or cancel) always carries a reason the creator will read. */
export function ReasonDialog({
  open,
  onClose,
  title,
  intro,
  confirm,
  busy,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  intro: string
  confirm: string
  busy: boolean
  onConfirm: (reason: string) => void
}) {
  const { t } = useT()
  const [reason, setReason] = useState('')
  const ok = reason.trim().length >= 3
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onConfirm(reason.trim())
        }}
        className="space-y-5"
      >
        <p className="text-[14px] leading-relaxed text-muted">{intro}</p>
        <FormField label={t('app.doc.reason')} htmlFor="reason" hint={t('app.doc.reasonHint')}>
          <textarea id="reason" rows={3} className={`${fieldInput} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </FormField>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" className={btnLine} onClick={onClose}>
            {t('app.cancel')}
          </button>
          <button type="submit" className={btnDanger} disabled={!ok || busy}>
            {confirm}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
