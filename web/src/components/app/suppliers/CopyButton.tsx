'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { btnLine, btnSmall } from '../kit/styles'

export function CopyButton({ value }: { value: string }) {
  const { t } = useT()
  const [done, setDone] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch {
      // clipboard blocked: the address stays selectable on the page
    }
  }

  return (
    <button type="button" onClick={copy} className={clsx(btnLine, btnSmall)} aria-label={t('app.sup.copy.label')}>
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{done ? t('app.copied') : t('app.copy')}</span>
    </button>
  )
}
