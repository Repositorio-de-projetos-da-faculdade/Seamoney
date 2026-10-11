'use client'

import { useEffect, useState } from 'react'
import { dateTime } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import type { Key } from '@/lib/i18n/dict'
import { call, LiveHttpError } from '@/lib/demo/settle'
import { Note, Panel, PanelHead } from '../kit/Panel'
import { code, label } from '../kit/styles'

/** One line of the rules service's audit trail (GET /api/audit). */
interface Entry {
  id: number
  at: string
  actorEmail: string | null
  actorRole: string | null
  action: string
  entityType: string | null
  entityId: string | null
}

type Load = { state: 'loading' } | { state: 'ok'; entries: Entry[] } | { state: 'forbidden' } | { state: 'error' }

/**
 * What the server itself recorded, next to the workspace's own trail: sign-ins and failed ones, and every order and
 * wallet decision made through the rules service. Shown only when the workspace is connected to it.
 */
export function ServiceAuditPanel() {
  const { t, locale } = useT()
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    call<{ entries: Entry[] }>('/api/audit?limit=200', 'GET')
      .then((r) => alive && setLoad({ state: 'ok', entries: r.entries }))
      .catch((e) => alive && setLoad(e instanceof LiveHttpError && e.status === 403 ? { state: 'forbidden' } : { state: 'error' }))
    return () => {
      alive = false
    }
  }, [])

  // a label for what the server sent, or the raw value when there is no translation for it
  const labelOr = (key: string, raw: string) => {
    const text = t(key as Key) as string | undefined
    return text && text !== key ? text : raw
  }
  const actionLabel = (action: string) => labelOr(`app.svcaudit.${action}`, action)

  return (
    <Panel aria-labelledby="rep-svc-audit">
      <PanelHead id="rep-svc-audit" title={t('app.svcaudit.title')} meta={t('app.svcaudit.meta')} />
      {load.state === 'loading' ? <p className="px-5 py-4 text-[14px] text-muted">{t('app.svcaudit.loading')}</p> : null}
      {load.state === 'forbidden' ? (
        <div className="px-5 py-4">
          <Note tone="warn">{t('app.svcaudit.forbidden')}</Note>
        </div>
      ) : null}
      {load.state === 'error' ? (
        <div className="px-5 py-4">
          <Note tone="warn">{t('app.svcaudit.error')}</Note>
        </div>
      ) : null}
      {load.state === 'ok' && load.entries.length === 0 ? <p className="px-5 py-4 text-[14px] text-muted">{t('app.svcaudit.empty')}</p> : null}
      {load.state === 'ok' && load.entries.length > 0 ? (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className="sticky top-0 bg-paper-hi">
              <tr>
                <th className={`${label} px-5 py-2.5`}>{t('app.svcaudit.when')}</th>
                <th className={`${label} px-3 py-2.5`}>{t('app.svcaudit.who')}</th>
                <th className={`${label} px-3 py-2.5`}>{t('app.svcaudit.what')}</th>
                <th className={`${label} px-5 py-2.5`}>{t('app.svcaudit.on')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {load.entries.map((e) => (
                <tr key={e.id} className={e.action === 'LOGIN_FAILED' ? 'text-bad-ink' : undefined}>
                  <td className="whitespace-nowrap px-5 py-2 text-muted">{dateTime(e.at, locale)}</td>
                  <td className="px-3 py-2">
                    <span className="block">{e.actorEmail ?? '—'}</span>
                    {e.actorRole ? <span className={label}>{labelOr(`role.${e.actorRole}`, e.actorRole)}</span> : null}
                  </td>
                  <td className="px-3 py-2">{actionLabel(e.action)}</td>
                  <td className={`${code} px-5 py-2 text-muted`}>{e.entityId ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  )
}
