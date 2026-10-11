'use client'

import type { ReactNode } from 'react'
import { roleCan } from '@/lib/demo/rules'
import { useDemoState, useMe } from '@/lib/demo/store'
import { useT } from '@/lib/i18n/client'
import { Note } from '../kit/Panel'
import { Page } from '../shell/DeskShell'
import { CompanyPanel } from './CompanyPanel'
import { CostsPanel } from './CostsPanel'
import { DemoPanel } from './DemoPanel'
import { NetworksPanel } from './NetworksPanel'
import { NotifyPanel } from './NotifyPanel'
import { PolicyPanel } from './PolicyPanel'
import { SectionIndex } from './SectionIndex'

/** Wraps a panel with the anchor the "On this page" index points to. */
function Anchored({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24">
      {children}
    </div>
  )
}

export function SettingsView() {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  if (!state || !me) return null
  const canEdit = roleCan(me.role, 'manage_settings')
  const s = state.settings
  const sections = [
    { id: 'sec-company', label: t('app.set.company') },
    { id: 'sec-policy', label: t('app.set.policy') },
    { id: 'sec-networks', label: t('app.set.networks') },
    { id: 'sec-costs', label: t('app.set.costs') },
    { id: 'sec-notify', label: t('app.set.notify') },
    { id: 'sec-demo', label: t('app.set.demo') },
  ]

  return (
    <Page title={t('app.set.title')} lede={t('app.set.lede')}>
      {!canEdit ? <Note className="mb-6">{t('app.set.ownersOnly')}</Note> : null}
      <div className="lg:grid lg:grid-cols-[minmax(0,760px)_12rem] lg:justify-between lg:gap-10">
        <div className="min-w-0 space-y-6">
          <Anchored id="sec-company">
            <CompanyPanel settings={s} canEdit={canEdit} />
          </Anchored>
          <Anchored id="sec-policy">
            <PolicyPanel settings={s} canEdit={canEdit} payments={state.payments} />
          </Anchored>
          <Anchored id="sec-networks">
            <NetworksPanel settings={s} canEdit={canEdit} />
          </Anchored>
          <Anchored id="sec-costs">
            <CostsPanel settings={s} canEdit={canEdit} />
          </Anchored>
          <Anchored id="sec-notify">
            <NotifyPanel settings={s} canEdit={canEdit} />
          </Anchored>
          <Anchored id="sec-demo">
            <DemoPanel />
          </Anchored>
        </div>
        <SectionIndex sections={sections} />
      </div>
    </Page>
  )
}
