'use client'

import clsx from 'clsx'
import { ROLES, type Member, type Role } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Initials } from '../kit/Initials'
import { Panel } from '../kit/Panel'
import { figure, label, quiet } from '../kit/styles'
import { roleDoes, roleName } from './labels'

/** One cell per role: active count, the people in it, and what the role does. The signed-in role is marked. */
function RoleCell({ role, members, isMine }: { role: Role; members: Member[]; isMine: boolean }) {
  const { t } = useT()
  const shown = members.slice(0, 4)
  return (
    <div className="flex min-w-0 flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className={clsx(label, isMine && 'text-ink')}>{t(roleName[role])}</h3>
        {isMine ? <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-brand-600">{t('app.team.yourRole')}</span> : null}
      </div>
      <p className={clsx(figure, 'text-[34px] leading-none text-ink')}>
        {members.length}
        <span className="sr-only"> {t('app.team.activeCount', { n: members.length })}</span>
      </p>
      <div className="flex min-h-7 items-center">
        {shown.map((m, i) => (
          <span key={m.id} className={clsx('rounded-full ring-2 ring-paper', i > 0 && '-ml-2')}>
            <Initials member={m} size={28} />
          </span>
        ))}
        {members.length > shown.length ? <span className="ml-2 text-[13px] text-muted">+{members.length - shown.length}</span> : null}
      </div>
      <p className={clsx('text-[13px] leading-relaxed', quiet)}>{t(roleDoes[role])}</p>
    </div>
  )
}

/** Four cells in one panel, split by hairlines instead of separate cards. */
export function RoleStrip({ members, myRole }: { members: Member[]; myRole: Role }) {
  const { t } = useT()
  return (
    <Panel aria-labelledby="team-strip">
      <h2 id="team-strip" className="sr-only">
        {t('app.team.stripLabel')}
      </h2>
      <div className="grid grid-cols-1 divide-y divide-rule md:grid-cols-4 md:divide-x md:divide-y-0">
        {ROLES.map((r) => (
          <RoleCell
            key={r}
            role={r}
            members={members.filter((m) => m.role === r && m.status === 'active')}
            isMine={r === myRole}
          />
        ))}
      </div>
    </Panel>
  )
}
