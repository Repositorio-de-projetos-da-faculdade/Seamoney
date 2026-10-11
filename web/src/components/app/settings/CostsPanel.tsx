'use client'

import { useState } from 'react'
import type { Settings } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Facts, FormField } from '../kit/Fields'
import { Panel, PanelHead } from '../kit/Panel'
import { Simulated } from '../kit/Status'
import { fieldInput, label } from '../kit/styles'
import { ExampleQuote } from './ExampleQuote'
import { parseDecimal } from './number'
import { SaveFooter } from './SaveFooter'
import { useSettingsSave } from './useSettingsSave'

export function CostsPanel({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const { t } = useT()
  const { save, busy, saved } = useSettingsSave()
  const [bank, setBank] = useState(String(settings.bankFeePct))
  const [fx, setFx] = useState(String(settings.fxRate))
  const bankN = parseDecimal(bank)
  const fxN = parseDecimal(fx)
  const bankOk = bankN !== null && bankN < 100
  const fxOk = fxN !== null && fxN > 0
  const dirty = bankOk && fxOk && (bankN !== settings.bankFeePct || fxN !== settings.fxRate)
  // The example follows what is typed; an invalid field falls back to the saved value.
  const exampleBank = bankOk && bankN !== null ? bankN : settings.bankFeePct
  const exampleFx = fxOk && fxN !== null ? fxN : settings.fxRate

  return (
    <Panel aria-labelledby="set-costs">
      <PanelHead id="set-costs" title={t('app.set.costs')} meta={t('app.set.costsMeta')} />
      <Facts rows={[{ label: t('app.set.fee'), value: t('app.set.feeValue', { pct: settings.feeBps / 100 }), note: t('app.set.feeNote') }]} />
      <div className="grid gap-4 border-t border-hair px-5 py-4 sm:grid-cols-2">
        <FormField label={t('app.set.bankFee')} htmlFor="set-bank" hint={t('app.set.bankFeeHint')} error={bankOk ? undefined : t('app.set.invalidNumber')}>
          <input id="set-bank" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={bank} readOnly={!canEdit} onChange={(e) => setBank(e.target.value)} />
        </FormField>
        <FormField
          label={
            <span className="inline-flex flex-wrap items-center gap-2">
              {t('app.set.fx')}
              <Simulated />
            </span>
          }
          htmlFor="set-fx"
          hint={t('app.set.fxHint')}
          error={fxOk ? undefined : t('app.set.invalidNumber')}
        >
          <input id="set-fx" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={fx} readOnly={!canEdit} onChange={(e) => setFx(e.target.value)} />
        </FormField>
      </div>
      <div className="border-t border-hair">
        <div className="px-5 pt-4">
          <h3 className={label}>{t('app.set.exampleTitle')}</h3>
          <p className="mt-1 text-[13px] text-muted">{t('app.set.exampleMeta')}</p>
        </div>
        <ExampleQuote feeBps={settings.feeBps} bankFeePct={exampleBank} fxRate={exampleFx} />
      </div>
      <SaveFooter
        show={canEdit}
        dirty={dirty}
        busy={busy === 'costs'}
        saved={saved}
        onSave={() => {
          if (bankN !== null && fxN !== null) save('costs', { bankFeePct: bankN, fxRate: fxN })
        }}
      />
    </Panel>
  )
}
