'use client'

import { useSyncExternalStore } from 'react'
import { useT } from '@/lib/i18n/client'
import { formatClock } from './detailFormat'

/** Re-renders every 10 seconds. */
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 10_000)
  return () => window.clearInterval(id)
}

/** Local time at the supplier's port. Renders --:-- on the server so the first paint never shows a stale clock. */
export function LocalTime({ zone }: { zone: string }) {
  const { t, locale } = useT()
  const time = useSyncExternalStore(
    subscribe,
    () => formatClock(zone, locale),
    () => '--:--',
  )
  return <span className="font-data text-[13px] tabular-nums">{t('app.sdoc.clock', { time })}</span>
}
