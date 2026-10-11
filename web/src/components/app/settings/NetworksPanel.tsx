'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { liveAvailable } from '@/lib/demo/settle'
import type { Settings, SettlementMode } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Note, Panel, PanelHead } from '../kit/Panel'
import { Simulated } from '../kit/Status'
import { ModeOption } from './ModeOption'
import { NetworkRow } from './NetworkRow'
import { type Availability, TestnetStatus } from './NetworkStatus'
import { SaveFooter } from './SaveFooter'
import { useSettingsSave } from './useSettingsSave'

export function NetworksPanel({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const { t } = useT()
  const { save, busy, saved } = useSettingsSave()
  const name = useId()
  const [mode, setMode] = useState<SettlementMode>(settings.settlementMode)
  const [live, setLive] = useState<Availability>(settings.settlementMode === 'testnet' ? 'checking' : null)
  const asked = useRef(0)
  const dirty = mode !== settings.settlementMode

  // Looks for the Docker stack whenever the testnet option is chosen; only the latest answer counts.
  const check = () => {
    const ticket = ++asked.current
    void liveAvailable().then((ok) => {
      if (ticket === asked.current) setLive(ok ? 'ok' : 'no')
    })
  }
  const pick = (next: SettlementMode) => {
    setMode(next)
    if (next === 'testnet') {
      setLive('checking')
      check()
    } else {
      asked.current++
      setLive(null)
    }
  }
  // When the page opens with testnet already on, check once.
  useEffect(() => {
    if (settings.settlementMode === 'testnet') check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Panel aria-labelledby="set-networks">
      <PanelHead id="set-networks" title={t('app.set.networks')} meta={t('app.set.networksMeta')} />
      <div className="space-y-4 px-5 py-4">
        <fieldset className="min-w-0 space-y-2">
          <legend className="mb-2 text-[13.5px] font-medium text-ink">{t('app.set.mode')}</legend>
          <NetworkRow
            htmlFor={`${name}-simulated`}
            control={<ModeOption id={`${name}-simulated`} name={name} value="simulated" current={mode} onPick={pick} disabled={!canEdit} />}
            title={t('app.set.modeSimulated')}
            hint={t('app.set.modeSimulatedHint')}
            token={t('app.set.tokenSimulated')}
            status={<Simulated />}
          />
          <NetworkRow
            htmlFor={`${name}-testnet`}
            control={<ModeOption id={`${name}-testnet`} name={name} value="testnet" current={mode} onPick={pick} disabled={!canEdit} />}
            title={t('app.set.modeTestnet')}
            hint={t('app.set.modeTestnetHint')}
            token={t('app.set.tokenTempo')}
            status={<TestnetStatus state={live} />}
          />
          <NetworkRow title={t('app.set.solana')} hint={t('app.set.solanaNote')} token={t('app.set.tokenSolana')} status={<Simulated />} />
        </fieldset>
        {live ? (
          <div role="status">
            <Note tone={live === 'ok' ? 'ok' : live === 'no' ? 'warn' : 'info'}>
              {live === 'checking' ? t('app.set.checking') : live === 'ok' ? t('app.set.liveOk') : t('app.set.liveNo')}
            </Note>
          </div>
        ) : null}
      </div>
      <SaveFooter show={canEdit} dirty={dirty} busy={busy === 'networks'} saved={saved} onSave={() => save('networks', { settlementMode: mode })} />
    </Panel>
  )
}
