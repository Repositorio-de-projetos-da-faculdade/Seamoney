'use client'

import { useT } from '@/lib/i18n/client'
import { Live } from '../kit/Status'

/** Result of looking for the Docker stack: still asking, answered yes or no, or never asked. */
export type Availability = 'checking' | 'ok' | 'no' | null

/** Status chip for the Tempo testnet row, from the availability check. */
export function TestnetStatus({ state }: { state: Availability }) {
  const { t } = useT()
  if (state === 'ok') return <Live>{t('app.set.statusLive')}</Live>
  if (state === 'no') return <span className="inline-flex border border-rule px-2 py-0.5 text-[12.5px] font-medium text-ink">{t('app.set.statusUnavailable')}</span>
  if (state === 'checking') return <span className="text-[13px] text-muted">{t('app.set.statusChecking')}</span>
  return <span className="text-[13px] text-muted">{t('app.set.statusIdle')}</span>
}
