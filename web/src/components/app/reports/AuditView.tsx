'use client'

import { DataTransferBoth, Download, Group, Packages, Search, Settings } from 'iconoir-react'
import Link from 'next/link'
import { useState, type ComponentType, type SVGProps } from 'react'
import { dateShort, dateTime } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { downloadText } from '@/lib/demo/csv'
import { memberOf } from '@/lib/demo/selectors'
import type { Activity, ActivityType, DemoState } from '@/lib/demo/types'
import { LogoMark } from '../../ui'
import { Initials } from '../kit/Initials'
import { Empty, Panel, PanelHead } from '../kit/Panel'
import { Segments } from '../kit/Segments'
import { btnLine, btnSmall, fieldInput, label } from '../kit/styles'
import { useActivitySubject, useActivityText } from '../log/activity'

type Kind = 'all' | 'payments' | 'suppliers' | 'team'
const KINDS: readonly Kind[] = ['all', 'payments', 'suppliers', 'team']

const GROUP: Record<Exclude<Kind, 'all'>, readonly ActivityType[]> = {
  payments: ['payment_created', 'approval_requested', 'auto_approved', 'approved', 'rejected', 'cancelled', 'payment_started', 'payment_sent', 'payment_failed', 'reconciled', 'review_opened'],
  suppliers: ['supplier_added', 'supplier_updated', 'wallet_proposed', 'wallet_approved', 'wallet_rejected'],
  team: ['member_invited', 'role_changed', 'settings_changed'],
}

const kindOf = (type: ActivityType): Exclude<Kind, 'all'> => (GROUP.payments.includes(type) ? 'payments' : GROUP.suppliers.includes(type) ? 'suppliers' : 'team')

/** One icon per kind of entry, so a long trail can be scanned by eye. */
const KIND_ICON: Record<Exclude<Kind, 'all'>, ComponentType<SVGProps<SVGSVGElement>>> = {
  payments: DataTransferBoth,
  suppliers: Packages,
  team: Group,
}

const PAGE = 60
const SYSTEM = '__system'
const DAY = 86_400_000

/** "Today", "Yesterday", or the date: the heading of each day in the trail. */
function useDayLabel(nowMs: number) {
  const { t, locale } = useT()
  const today = new Date(nowMs).toISOString().slice(0, 10)
  const yesterday = new Date(nowMs - DAY).toISOString().slice(0, 10)
  return (day: string) => (day === today ? t('app.rep.day.today') : day === yesterday ? t('app.rep.day.yesterday') : dateShort(`${day}T12:00:00Z`, locale))
}

/** One line of the trail: who (initials, or the Seamoney mark for the system), what, about what, and the time. */
function AuditLine({ state, entry }: { state: DemoState; entry: Activity }) {
  const { locale } = useT()
  const text = useActivityText()(state, entry)
  const subject = useActivitySubject()(state, entry)
  const actor = memberOf(state, entry.actorId)
  const Icon = entry.type === 'settings_changed' ? Settings : KIND_ICON[kindOf(entry.type)]
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 py-3">
      {actor ? (
        <Initials member={actor} size={28} />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-night" aria-hidden="true">
          <LogoMark size={14} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[14px] leading-snug text-ink">{text}</p>
        {subject ? (
          <Link href={subject.href} className="mt-0.5 inline-block max-w-full truncate text-[12.5px] text-muted underline decoration-ink/20 underline-offset-[3px] hover:text-ink">
            {subject.text}
          </Link>
        ) : null}
      </div>
      <span className="flex items-center gap-2 pt-0.5 text-[12.5px] tabular-nums text-muted">
        <Icon width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
        <time dateTime={entry.at}>{dateTime(entry.at, locale).split(', ').at(-1)}</time>
      </span>
    </li>
  )
}

/**
 * The append-only log of who did what, grouped by day with the newest first. Filter by kind and person, search the
 * text, and export what is on screen.
 */
export function AuditView({ state }: { state: DemoState }) {
  const { t } = useT()
  const [kind, setKind] = useState<Kind>('all')
  const [who, setWho] = useState('')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [nowMs] = useState(() => Date.now())
  const textOf = useActivityText()
  const subjectOf = useActivitySubject()
  const dayLabel = useDayLabel(nowMs)

  const q = query.trim().toLowerCase()
  const rows = [...state.activity]
    .filter((a) => kind === 'all' || GROUP[kind].includes(a.type))
    .filter((a) => !who || (who === SYSTEM ? a.actorId === null : a.actorId === who))
    .filter((a) => !q || `${textOf(state, a)} ${subjectOf(state, a)?.text ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => b.at.localeCompare(a.at))

  const visible = rows.slice(0, shown)
  const days = [...new Set(visible.map((a) => a.at.slice(0, 10)))]

  const exportTrail = () => {
    const cell = (s: string) => `"${s.replaceAll('"', '""')}"`
    const lines = rows.map((a) =>
      [a.at, memberOf(state, a.actorId)?.name ?? t('app.system'), textOf(state, a), subjectOf(state, a)?.text ?? ''].map(cell).join(','),
    )
    const head = [t('app.rep.col.time'), t('app.rep.col.actor'), t('app.rep.col.action'), t('app.rep.col.subject')].map(cell).join(',')
    downloadText(`seamoney-audit-${new Date(nowMs).toISOString().slice(0, 10)}.csv`, [head, ...lines].join('\n') + '\n')
  }

  return (
    <Panel aria-labelledby="rep-audit">
      <PanelHead
        id="rep-audit"
        title={t('app.rep.audit')}
        meta={t('app.rep.audit.meta', { count: rows.length })}
        action={
          <button type="button" onClick={exportTrail} disabled={rows.length === 0} className={`${btnLine} ${btnSmall}`}>
            <Download width={14} height={14} aria-hidden="true" />
            {t('app.rep.audit.export')}
          </button>
        }
      />
      <div className="space-y-4 border-b border-hair px-5 py-4">
        <Segments
          label={t('app.rep.audit.kind')}
          value={kind}
          onChange={(k) => {
            setKind(k)
            setShown(PAGE)
          }}
          options={KINDS.map((k) => ({ value: k, label: t(`app.rep.audit.kind.${k}`) }))}
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="relative block">
            <span className="sr-only">{t('app.rep.audit.search')}</span>
            <Search width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input type="search" className={`${fieldInput} pl-9`} placeholder={t('app.rep.audit.search.hint')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="block">
            <span className="sr-only">{t('app.rep.audit.who')}</span>
            <select
              className={fieldInput}
              value={who}
              onChange={(e) => {
                setWho(e.target.value)
                setShown(PAGE)
              }}
            >
              <option value="">{t('app.rep.audit.who.all')}</option>
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              <option value={SYSTEM}>{t('app.system')}</option>
            </select>
          </label>
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty title={t('app.rep.audit.empty')}>{t('app.rep.audit.empty.body')}</Empty>
      ) : (
        <div>
          {days.map((day) => (
            <section key={day} aria-label={dayLabel(day)}>
              <h3 className={`${label} sticky top-14 z-10 border-b border-hair bg-paper-hi px-5 py-2 lg:top-0`}>{dayLabel(day)}</h3>
              <ol className="divide-y divide-hair px-5">
                {visible
                  .filter((a) => a.at.startsWith(day))
                  .map((a) => (
                    <AuditLine key={a.id} state={state} entry={a} />
                  ))}
              </ol>
            </section>
          ))}
          {rows.length > shown ? (
            <div className="border-t border-hair px-5 py-4">
              <button type="button" className={btnLine} onClick={() => setShown((n) => n + PAGE)}>
                {t('app.rep.audit.more', { count: rows.length - shown })}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  )
}
