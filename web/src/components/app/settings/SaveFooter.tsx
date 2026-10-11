'use client'

import type { ReactNode } from 'react'
import { Check } from 'iconoir-react'
import { useT } from '@/lib/i18n/client'
import { btnGo, btnSmall } from '../kit/styles'

/**
 * The foot of a settings panel: Save, enabled only when the panel changed, then a brief "Saved".
 * For people who cannot edit it says so instead of showing a button.
 */
export function SaveFooter({ show, dirty, busy, saved, onSave, children }: { show: boolean; dirty: boolean; busy: boolean; saved: boolean; onSave: () => void; children?: ReactNode }) {
  const { t } = useT()
  if (!show) {
    return <div className="border-t border-hair px-5 py-3 text-[13px] text-muted">{t('app.set.readOnly')}</div>
  }
  const showSaved = saved && !dirty
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3.5">
      <div className="min-w-0 text-[13px] text-muted">{children}</div>
      <div className="flex items-center gap-3">
        <span role="status" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-600">
          {showSaved ? (
            <>
              <Check aria-hidden width={16} height={16} strokeWidth={2.5} />
              {t('app.set.saved')}
            </>
          ) : null}
        </span>
        <button type="button" className={`${btnGo} ${btnSmall}`} disabled={!dirty || busy} onClick={onSave}>
          {t('app.save')}
        </button>
      </div>
    </div>
  )
}
