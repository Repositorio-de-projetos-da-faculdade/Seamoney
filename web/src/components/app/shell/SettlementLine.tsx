'use client'

import { useT } from '@/lib/i18n/client'
import type { DemoState } from '@/lib/demo/types'

/** One line on the state of settlement: live on the Tempo testnet, or simulated (the default). Always labelled. */
export function SettlementLine({ state }: { state: DemoState }) {
  const { t } = useT()
  const live = state.settings.settlementMode === 'testnet'
  return (
    <p className="flex items-center gap-2 text-[12px] text-foam/55">
      {live ? (
        <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
      ) : (
        <span className="size-[6px] rotate-45 bg-signal" aria-hidden="true" />
      )}
      <span>{live ? t('app.side.settleLive') : t('app.side.settleSim')}</span>
    </p>
  )
}
