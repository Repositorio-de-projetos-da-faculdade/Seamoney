import clsx from 'clsx'
import { label } from '../type'
import { StatusStamp, type Status } from './StatusStamp'

export interface ManifestLine {
  text: string
  status: Status
  stamp: string
}

export interface ManifestGroup {
  title: string
  tone: 'mint' | 'signal'
  lines: ManifestLine[]
}

/**
 * The declaration as a ledger: one short line per item, a dotted leader, and a stamp saying whether it is real.
 * Lines are numbered straight through the groups, like the items of a cargo manifest.
 */
export function ManifestTable({ groups }: { groups: ManifestGroup[] }) {
  // numbering carries on from the groups above
  const firstOf = (g: number) => groups.slice(0, g).reduce((sum, group) => sum + group.lines.length, 1)
  return (
    <div className="space-y-12 md:space-y-16">
      {groups.map((group, g) => (
        <div key={group.title}>
          <p className={clsx(label, 'relative pt-4', group.tone === 'mint' ? 'text-mint' : 'text-signal')}>
            <span data-rule aria-hidden="true" className={clsx('absolute inset-x-0 top-0 h-px origin-left', group.tone === 'mint' ? 'bg-foam/25' : 'bg-signal/60')} />
            {group.title}
          </p>
          <ul className="mt-2">
            {group.lines.map((line, i) => {
              const n = firstOf(g) + i
              return (
                <li
                  key={line.text}
                  data-row
                  className="grid grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-2 border-b border-foam/10 py-4 md:grid-cols-[3rem_auto_minmax(2rem,1fr)_auto] md:gap-x-5 md:py-5"
                >
                  <span className="font-data text-[10px] font-medium tabular-nums text-foam/35">{String(n).padStart(2, '0')}</span>
                  <span className="font-grotesk text-[1.2rem] font-light leading-snug tracking-[-0.015em] text-white/90 md:text-[clamp(1.25rem,1.7vw,1.6rem)]">
                    {line.text}
                  </span>
                  <span data-leader aria-hidden="true" className="h-0 origin-left border-b border-dotted border-foam/25 max-md:hidden" />
                  <StatusStamp status={line.status} text={line.stamp} className="justify-self-start max-md:col-start-2 md:justify-self-end" />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
