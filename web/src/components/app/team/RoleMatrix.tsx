'use client'

import clsx from 'clsx'
import { Check } from 'iconoir-react'
import { roleCan } from '@/lib/demo/rules'
import { ROLES, type Role } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Panel, PanelHead } from '../kit/Panel'
import { label } from '../kit/styles'
import { permName, permSections, roleName } from './labels'

const cell = 'px-3 py-2.5 text-center'

/** Built from the rules themselves, so what it says can never drift from what the demo enforces. */
export function RoleMatrix({ myRole }: { myRole: Role }) {
  const { t } = useT()
  return (
    <Panel aria-labelledby="team-matrix">
      <PanelHead id="team-matrix" title={t('app.team.matrix')} meta={t('app.team.matrixMeta')} />
      <div className="relative max-h-[30rem] overflow-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
          <thead className="sticky top-0 z-10 bg-paper">
            <tr className="border-b border-rule">
              <th scope="col" className={clsx(label, 'px-3 py-2.5 text-left align-bottom')}>
                {t('app.team.action')}
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  scope="col"
                  className={clsx(label, cell, 'align-bottom', r === myRole && 'bg-paper-hi text-ink')}
                >
                  {t(roleName[r])}
                </th>
              ))}
            </tr>
          </thead>
          {permSections.map((section) => (
            <tbody key={section.id} className="border-b border-rule last:border-b-0">
              <tr>
                <th scope="colgroup" colSpan={ROLES.length + 1} className={clsx(label, 'bg-paper-hi px-3 py-2 text-left text-ink')}>
                  {t(section.title)}
                </th>
              </tr>
              {section.perms.map((p) => (
                <tr key={p} className="border-b border-hair last:border-b-0">
                  <th scope="row" className="px-3 py-2.5 font-normal text-ink">
                    {t(permName[p])}
                  </th>
                  {ROLES.map((r) => {
                    const can = roleCan(r, p)
                    return (
                      <td key={r} className={clsx(cell, r === myRole && 'bg-paper-hi')}>
                        {can ? (
                          <Check width={16} height={16} strokeWidth={1.5} className="mx-auto text-ok-ink" aria-hidden="true" />
                        ) : (
                          <span className="text-muted" aria-hidden="true">
                            -
                          </span>
                        )}
                        <span className="sr-only">{can ? t('app.team.can') : t('app.team.cannot')}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </Panel>
  )
}
