'use client'

import { useState } from 'react'
import type { Settings } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Facts, FormField } from '../kit/Fields'
import { Note, Panel, PanelHead } from '../kit/Panel'
import { Simulated } from '../kit/Status'
import { fieldInput } from '../kit/styles'
import { SaveFooter } from './SaveFooter'
import { useSettingsSave } from './useSettingsSave'

export function CompanyPanel({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const { t } = useT()
  const { save, busy, saved } = useSettingsSave()
  const [name, setName] = useState(settings.companyName)
  const trimmed = name.trim()
  const dirty = trimmed !== '' && trimmed !== settings.companyName

  return (
    <Panel aria-labelledby="set-company">
      <PanelHead id="set-company" title={t('app.set.company')} />
      <div className="px-5 py-4">
        <FormField label={t('app.set.companyName')} htmlFor="set-company-name">
          <input id="set-company-name" className={fieldInput} value={name} readOnly={!canEdit} onChange={(e) => setName(e.target.value)} />
        </FormField>
      </div>
      <div className="border-t border-hair">
        <Facts
          rows={[
            {
              label: t('app.set.kyb'),
              value: (
                <span className="inline-flex flex-wrap items-center gap-3">
                  {t('app.set.kybValue')}
                  <Simulated />
                </span>
              ),
              note: t('app.set.kybNote'),
            },
          ]}
        />
      </div>
      <div className="px-5 pb-4">
        <Note>{t('app.set.isolation')}</Note>
      </div>
      <SaveFooter show={canEdit} dirty={dirty} busy={busy === 'company'} saved={saved} onSave={() => save('company', { companyName: trimmed })} />
    </Panel>
  )
}
