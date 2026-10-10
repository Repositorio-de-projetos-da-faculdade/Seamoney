'use client'

import { useState } from 'react'
import type { Settings } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Panel, PanelHead } from '../kit/Panel'
import { SaveFooter } from './SaveFooter'
import { Switch } from './Switch'
import { useSettingsSave } from './useSettingsSave'

type Flags = Pick<Settings, 'notifyApprovals' | 'notifyReconciled' | 'weeklyDigest'>

export function NotifyPanel({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const { t } = useT()
  const { save, busy, saved } = useSettingsSave()
  const current: Flags = { notifyApprovals: settings.notifyApprovals, notifyReconciled: settings.notifyReconciled, weeklyDigest: settings.weeklyDigest }
  const [flags, setFlags] = useState<Flags>(current)
  const dirty = (Object.keys(current) as (keyof Flags)[]).some((k) => current[k] !== flags[k])
  const set = (k: keyof Flags) => (v: boolean) => setFlags((f) => ({ ...f, [k]: v }))

  return (
    <Panel aria-labelledby="set-notify">
      <PanelHead id="set-notify" title={t('app.set.notify')} meta={t('app.set.notifyMeta')} />
      <div className="divide-y divide-hair">
        <Switch checked={flags.notifyApprovals} onChange={set('notifyApprovals')} disabled={!canEdit}>
          {t('app.set.notifyApprovals')}
        </Switch>
        <Switch checked={flags.notifyReconciled} onChange={set('notifyReconciled')} disabled={!canEdit}>
          {t('app.set.notifyReconciled')}
        </Switch>
        <Switch checked={flags.weeklyDigest} onChange={set('weeklyDigest')} disabled={!canEdit}>
          {t('app.set.weeklyDigest')}
        </Switch>
      </div>
      <SaveFooter show={canEdit} dirty={dirty} busy={busy === 'notify'} saved={saved} onSave={() => save('notify', flags)} />
    </Panel>
  )
}
