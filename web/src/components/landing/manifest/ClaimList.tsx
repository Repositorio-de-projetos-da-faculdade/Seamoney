import { Check } from 'lucide-react'

/** Real items get a mint check; simulated items get an amber marker, so the two kinds read differently at a glance. */
export function ClaimList({ items, tone }: { items: string[]; tone: 'real' | 'sim' }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={item} data-row className="grid grid-cols-[1.75rem_1fr_auto] gap-3 border-b border-foam/10 py-4 font-text text-[15px] leading-relaxed text-foam/85 first:pt-0">
          <span className="pt-[0.2em] font-data text-[10px] font-medium tabular-nums text-foam/35">{String(i + 1).padStart(2, '0')}</span>
          <span>{item}</span>
          {tone === 'real' ? (
            <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-mint" />
          ) : (
            <span aria-hidden="true" className="mt-2 size-2 shrink-0 rotate-45 bg-signal" />
          )}
        </li>
      ))}
    </ul>
  )
}
