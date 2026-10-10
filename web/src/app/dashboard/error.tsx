'use client'

import { TriangleAlert } from 'lucide-react'
import { Card, btnPrimary } from '@/components/ui'
import { useT } from '@/lib/i18n/client'

/** Shown when the Java rules service cannot be reached or fails while rendering a dashboard page. */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT()
  return (
    <Card className="mx-auto mt-10 max-w-lg space-y-4 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warn-bg text-warn-ink">
        <TriangleAlert size={26} aria-hidden="true" />
      </span>
      <h1 className="font-display text-xl font-extrabold">{t('error.generic')}</h1>
      <p className="text-sm leading-relaxed text-muted">{t('error.service')}</p>
      <button type="button" className={btnPrimary} onClick={reset}>
        {t('error.retry')}
      </button>
    </Card>
  )
}
