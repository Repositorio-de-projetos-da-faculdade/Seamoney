import clsx from 'clsx'
import { Simulated } from '../kit/Status'
import type { ReconChecks } from '@/lib/demo/types'

const ORDER: (keyof ReconChecks)[] = ['token', 'recipient', 'amount', 'memo', 'receipt']

/** The five checks, printed like the landing's receipt: a dark block with one line per check and its result. */
export function ReceiptBlock({
  title,
  checks,
  passLabel,
  failLabel,
  checkLabel,
  note,
  link,
}: {
  title: string
  checks: ReconChecks
  passLabel: string
  failLabel: string
  checkLabel: (key: keyof ReconChecks) => string
  /** shown under the checks when the settlement is simulated */
  note: string | null
  /** the explorer link, only for a real testnet transfer */
  link: { href: string; label: string } | null
}) {
  return (
    <div className="bg-night p-5 font-data text-[12px] text-foam print:bg-night print:[print-color-adjust:exact] md:p-6">
      <p className="mb-4 border-b border-foam/15 pb-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-foam/55">{title}</p>
      <ol className="space-y-2.5">
        {ORDER.map((key, i) => (
          <li key={key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3">
            <span className="text-foam/40 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="min-w-0 text-foam">{checkLabel(key)}</span>
            <span className={clsx('uppercase tracking-[0.08em]', checks[key] ? 'text-mint' : 'text-[#ff9b9b]')}>{checks[key] ? passLabel : failLabel}</span>
          </li>
        ))}
      </ol>
      {note ? (
        <p className="mt-5 border-t border-foam/15 pt-4 normal-case leading-relaxed">
          <Simulated onNight className="!normal-case !tracking-normal">
            {note}
          </Simulated>
        </p>
      ) : null}
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block border-t border-foam/15 pt-4 text-mint underline decoration-mint/40 underline-offset-[4px] hover:decoration-mint print:hidden"
        >
          {link.label}
        </a>
      ) : null}
    </div>
  )
}
