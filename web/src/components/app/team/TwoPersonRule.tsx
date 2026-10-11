'use client'

import { ArrowRight } from 'iconoir-react'
import { type Member } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Initials } from '../kit/Initials'
import { Panel, PanelHead } from '../kit/Panel'
import { label, quiet } from '../kit/styles'
import { makerAndChecker } from './teamRules'

/** One step of the pair: the initials circle with its role above it, or a placeholder while nobody fills it. */
function Step({ title, member, nobody }: { title: string; member: Member | null; nobody: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span className={label}>{title}</span>
      {member ? (
        <Initials member={member} size={44} />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-muted text-muted" aria-hidden="true">
          ?
        </span>
      )}
      <span className="max-w-[10rem] truncate text-[14px] text-ink">{member ? member.name : nobody}</span>
    </div>
  )
}

/** Shows who creates and who approves, and the two rules that make the second person matter. */
export function TwoPersonRule({ members }: { members: Member[] }) {
  const { t } = useT()
  const { maker, checker } = makerAndChecker(members)
  return (
    <Panel aria-labelledby="team-rule">
      <PanelHead id="team-rule" title={t('app.team.ruleTitle')} />
      <div className="space-y-5 px-5 py-6">
        <div className="flex items-start justify-center gap-4 sm:gap-8">
          <Step title={t('app.team.ruleMaker')} member={maker} nobody={t('app.team.ruleNobody')} />
          <ArrowRight width={20} height={20} strokeWidth={1.5} className="mt-7 shrink-0 text-muted" aria-hidden="true" />
          <Step title={t('app.team.ruleChecker')} member={checker} nobody={t('app.team.ruleNobody')} />
        </div>
        <div className={`space-y-2 text-[14px] leading-relaxed ${quiet}`}>
          <p>{t('app.team.ruleSelf')}</p>
          <p>{t('app.team.ruleHash')}</p>
        </div>
      </div>
    </Panel>
  )
}
