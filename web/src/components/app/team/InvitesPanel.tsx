'use client'

import { type Member } from '@/lib/demo/types'
import { dateShort } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { quiet } from '../kit/styles'
import { roleName } from './labels'

/** People invited but not yet joined. Kept apart from the people table so pending access is easy to spot. */
export function InvitesPanel({ invites }: { invites: Member[] }) {
  const { t, locale } = useT()
  return (
    <Panel aria-labelledby="team-invites">
      <PanelHead
        id="team-invites"
        title={t('app.team.invitations')}
        meta={t('app.team.invitationsMeta', { n: invites.length })}
      />
      {invites.length === 0 ? (
        <Empty title={t('app.team.noInvites')}>{t('app.team.noInvitesHint')}</Empty>
      ) : (
        <ul className="divide-y divide-hair">
          {invites.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{m.name}</p>
                <p className="truncate text-[13px] text-muted">{m.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
                <span className="text-ink">{t(roleName[m.role])}</span>
                <span className={`${quiet} tabular-nums text-[13px]`}>
                  {t('app.team.invitedWhen')} {dateShort(m.joinedAt, locale)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
