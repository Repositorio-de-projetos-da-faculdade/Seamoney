'use client'

import { useMemo } from 'react'
import { useT } from '@/lib/i18n/client'
import type { DemoState } from '@/lib/demo/types'
import { NightChart } from '../chart/NightChart'
import { vesselsOf } from '../chart/voyage'

/** The night chart beside the login list, with a caption cartouche in the corner. Wide screens only. */
export function SeaChart({ state }: { state: DemoState }) {
  const { t } = useT()
  const vessels = useMemo(() => vesselsOf(state), [state])
  return (
    // the whole chart at its own proportions, centred in the column: Santos and the Asian ports both stay in view
    <div className="flex h-full min-h-[60dvh] w-full flex-col justify-center gap-6 px-8 py-10">
      <NightChart vessels={vessels} title={t('app.login2.chart.title')} labels />
      <div className="max-w-[44ch] bg-abyss/85 p-1 lg:border lg:border-foam/20">
        <div className="p-4 lg:border lg:border-foam/10">
          <p className="font-data text-[10px] uppercase tracking-[0.12em] text-mint">{t('app.login2.sea.kicker')}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-foam/65">{t('app.login2.sea.note')}</p>
        </div>
      </div>
    </div>
  )
}
