import { usd, type Locale } from '@/lib/format'

/** Two bars on the same scale: the bank wire cost against our route. Widths are shares of the larger value. */
export function CompareBars({
  bankLabel,
  routeLabel,
  bankCents,
  routeCents,
  locale,
}: {
  bankLabel: string
  routeLabel: string
  bankCents: number
  routeCents: number
  locale: Locale
}) {
  const max = Math.max(bankCents, routeCents, 1)
  const bars = [
    { label: bankLabel, cents: bankCents, width: (bankCents / max) * 100, color: 'bg-bank' },
    { label: routeLabel, cents: routeCents, width: (routeCents / max) * 100, color: 'bg-mint' },
  ]

  return (
    <ul className="space-y-6">
      {bars.map((bar) => (
        <li key={bar.label}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-text text-[14px] text-foam/70">{bar.label}</span>
            <span className="font-data text-[13px] font-medium tabular-nums text-foam">{usd(bar.cents, locale)}</span>
          </div>
          <div className="mt-2.5 h-1 w-full bg-foam/10">
            <div
              className={`h-full ${bar.color} transition-[width] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none`}
              style={{ width: `${bar.width}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
