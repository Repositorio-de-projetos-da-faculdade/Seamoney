'use client'

import { useState } from 'react'
import { approvalImpact } from '@/lib/demo/settings'
import type { Payment, Settings } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { FormField } from '../kit/Fields'
import { Note, Panel, PanelHead } from '../kit/Panel'
import { fieldInput } from '../kit/styles'
import { formatUsdInput, parseUsd } from './number'
import { SaveFooter } from './SaveFooter'
import { useSettingsSave } from './useSettingsSave'

export function PolicyPanel({ settings, canEdit, payments }: { settings: Settings; canEdit: boolean; payments: Payment[] }) {
  const { t } = useT()
  const { save, busy, saved } = useSettingsSave()
  const [nowMs] = useState(() => Date.now())
  const [text, setText] = useState(formatUsdInput(settings.approvalThresholdCents / 100))
  const dollars = parseUsd(text)
  const cents = dollars === null ? null : Math.round(dollars * 100)
  const dirty = cents !== null && cents !== settings.approvalThresholdCents
  const impact = cents === null ? null : approvalImpact(payments, cents, nowMs)

  return (
    <Panel aria-labelledby="set-policy">
      <PanelHead id="set-policy" title={t('app.set.policy')} meta={t('app.set.policyMeta')} />
      <div className="space-y-4 px-5 py-4">
        <FormField label={t('app.set.threshold')} htmlFor="set-threshold" hint={t('app.set.thresholdHint')} error={cents === null ? t('app.set.invalidNumber') : undefined}>
          <div className="relative max-w-[14rem]">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] font-medium text-muted">
              {t('app.set.usdPrefix')}
            </span>
            <input
              id="set-threshold"
              inputMode="decimal"
              className={`${fieldInput} pl-12 tabular-nums`}
              value={text}
              readOnly={!canEdit}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                if (dollars !== null) setText(formatUsdInput(dollars))
              }}
            />
          </div>
        </FormField>
        {impact ? (
          <p aria-live="polite" className="text-[13.5px] leading-snug text-ink">
            {t('app.set.impact', { wouldNeed: impact.wouldNeed, total: impact.total })}
          </p>
        ) : null}
        <Note tone="ok">{t('app.set.walletRule')}</Note>
      </div>
      <SaveFooter
        show={canEdit}
        dirty={dirty}
        busy={busy === 'policy'}
        saved={saved}
        onSave={() => {
          if (cents !== null) save('policy', { approvalThresholdCents: cents })
        }}
      />
    </Panel>
  )
}
