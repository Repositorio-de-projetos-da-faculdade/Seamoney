'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { roleCan } from '@/lib/demo/rules'
import { useDemoState, useMe } from '@/lib/demo/store'
import { Segments } from '../kit/Segments'
import { Page } from '../shell/DeskShell'
import { AuditView } from './AuditView'
import { ServiceAuditPanel } from './ServiceAuditPanel'
import { SummaryView } from './SummaryView'

type View = 'summary' | 'audit'

export function ReportsView() {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  // ?view=audit opens the trail directly (the home page links there)
  const params = useSearchParams()
  const [view, setView] = useState<View>(params.get('view') === 'audit' ? 'audit' : 'summary')
  if (!state || !me) return null

  const canAudit = roleCan(me.role, 'view_audit')
  const current: View = canAudit ? view : 'summary'
  return (
    <Page title={t('app.rep.title')} lede={current === 'audit' ? t('app.rep.lede.audit') : t('app.rep.lede')}>
      <div className="space-y-6">
        {canAudit ? (
          <Segments
            label={t('app.rep.views')}
            value={current}
            onChange={setView}
            options={[
              { value: 'summary', label: t('app.rep.view.summary') },
              { value: 'audit', label: t('app.rep.view.audit') },
            ]}
          />
        ) : null}
        {current === 'audit' ? (
          <div className="space-y-6">
            <AuditView state={state} />
            {state.settings.settlementMode === 'testnet' ? <ServiceAuditPanel /> : null}
          </div>
        ) : (
          <SummaryView state={state} me={me} />
        )}
      </div>
    </Page>
  )
}
