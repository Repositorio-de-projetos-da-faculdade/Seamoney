'use client'

import { useState } from 'react'
import { roleCan } from '@/lib/demo/rules'
import { useDemoState, useMe } from '@/lib/demo/store'
import { useT } from '@/lib/i18n/client'
import { Empty, Note, Panel, PanelHead } from '../kit/Panel'
import { btnGo, btnSmall } from '../kit/styles'
import { Page } from '../shell/DeskShell'
import { InvitesPanel } from './InvitesPanel'
import { InviteDialog } from './InviteDialog'
import { PeopleTable } from './PeopleTable'
import { RoleMatrix } from './RoleMatrix'
import { RoleStrip } from './RoleStrip'
import { TwoPersonRule } from './TwoPersonRule'

export function TeamView() {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  const [inviting, setInviting] = useState(false)
  if (!state || !me) return null

  const canManage = roleCan(me.role, 'manage_team')
  const active = state.members.filter((m) => m.status === 'active')
  const invites = state.members.filter((m) => m.status === 'invited')
  const invite = canManage ? (
    <button type="button" className={`${btnGo} ${btnSmall}`} onClick={() => setInviting(true)}>
      {t('app.team.invite')}
    </button>
  ) : null

  return (
    <Page title={t('app.team.title')} lede={t('app.team.lede')}>
      <div className="space-y-6">
        <RoleStrip members={state.members} myRole={me.role} />
        <Panel aria-labelledby="team-people">
          <PanelHead id="team-people" title={t('app.team.people')} meta={t('app.team.peopleMeta', { n: active.length })} action={invite} />
          {active.length === 0 ? (
            <Empty title={t('app.team.empty')} action={invite}>
              {t('app.team.emptyHint')}
            </Empty>
          ) : (
            <PeopleTable members={active} activity={state.activity} meId={me.id} canManage={canManage} />
          )}
          {!canManage ? (
            <div className="border-t border-rule px-5 py-4">
              <Note>{t('app.team.ownersOnly')}</Note>
            </div>
          ) : null}
        </Panel>
        <div className="grid gap-6 lg:grid-cols-2">
          <TwoPersonRule members={state.members} />
          <InvitesPanel invites={invites} />
        </div>
        <RoleMatrix myRole={me.role} />
      </div>
      {canManage ? <InviteDialog open={inviting} onClose={() => setInviting(false)} /> : null}
    </Page>
  )
}
