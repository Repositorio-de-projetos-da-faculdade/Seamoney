'use client'

import clsx from 'clsx'
import { Check } from 'iconoir-react'
import { useState } from 'react'
import { roleCan } from '@/lib/demo/rules'
import { demo } from '@/lib/demo/store'
import { ROLES, type Activity, type Member, type Role } from '@/lib/demo/types'
import { relative } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { Initials } from '../kit/Initials'
import { fieldInput, td, th, tr } from '../kit/styles'
import { useRun } from '../kit/useRun'
import { roleName } from './labels'
import { lastActiveAt } from './teamRules'

/** Owners change roles in place; the rule refuses to remove the last owner and the error shows as a toast. */
function RoleCell({ member, canManage }: { member: Member; canManage: boolean }) {
  const { t } = useT()
  const { run, busy } = useRun()
  if (!canManage) return <span>{t(roleName[member.role])}</span>
  return (
    <select
      aria-label={t('app.team.changeRoleFor', { name: member.name })}
      className={clsx(fieldInput, '!h-9 max-w-[11rem]')}
      value={member.role}
      disabled={busy === member.id}
      onChange={(e) => void run(member.id, () => demo.changeRole(member.id, e.target.value as Role), () => t('app.team.roleChanged'))}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {t(roleName[r])}
        </option>
      ))}
    </select>
  )
}

/** Mint check for roles that can approve; a muted dash otherwise, with the words kept for screen readers. */
function CanApprove({ role }: { role: Role }) {
  const { t } = useT()
  return roleCan(role, 'approve') ? (
    <span className="inline-flex items-center gap-1.5 text-ok-ink">
      <Check width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">{t('app.team.yes')}</span>
    </span>
  ) : (
    <span className="text-muted">
      <span aria-hidden="true">-</span>
      <span className="sr-only">{t('app.team.no')}</span>
    </span>
  )
}

function Person({ member, meId }: { member: Member; meId: string }) {
  const { t } = useT()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Initials member={member} size={32} />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">
          {member.name}
          {member.id === meId ? <span className="ml-2 font-normal text-muted">({t('app.team.you')})</span> : null}
        </p>
        <p className="truncate text-[13px] text-muted">{member.email}</p>
      </div>
    </div>
  )
}

/** Last activity as a relative time; "Never" when the member has no entries in the log yet. */
function LastActive({ iso, now }: { iso: string | null; now: number }) {
  const { t, locale } = useT()
  return <span className="tabular-nums text-muted">{iso ? relative(iso, locale, now) : t('app.team.never')}</span>
}

/** Active people only. Invitations live in their own panel. */
export function PeopleTable({ members, activity, meId, canManage }: { members: Member[]; activity: Activity[]; meId: string; canManage: boolean }) {
  const { t } = useT()
  const [now] = useState(() => Date.now())
  return (
    <>
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className={th}>{t('app.team.name')}</th>
              <th scope="col" className={th}>{t('app.team.role')}</th>
              <th scope="col" className={th}>{t('app.team.lastActive')}</th>
              <th scope="col" className={th}>{t('app.team.canApprove')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className={tr}>
                <td className={td}><Person member={m} meId={meId} /></td>
                <td className={td}><RoleCell member={m} canManage={canManage} /></td>
                <td className={td}><LastActive iso={lastActiveAt(activity, m.id)} now={now} /></td>
                <td className={td}><CanApprove role={m.role} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-hair md:hidden">
        {members.map((m) => (
          <li key={m.id} className="space-y-3 px-5 py-4">
            <Person member={m} meId={meId} />
            <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
              <RoleCell member={m} canManage={canManage} />
              <span className="flex items-center gap-3">
                <LastActive iso={lastActiveAt(activity, m.id)} now={now} />
                <CanApprove role={m.role} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
