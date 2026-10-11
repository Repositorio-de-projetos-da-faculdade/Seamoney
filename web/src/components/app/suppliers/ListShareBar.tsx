/** Thin bar with the share of the 90-day spend, and the percentage next to it. */
export function ListShareBar({ share }: { share: number }) {
  const pct = Math.round(share * 100)
  return (
    <span className="flex items-center gap-2.5 tabular-nums">
      <span aria-hidden="true" className="h-[3px] w-20 shrink-0 bg-rule">
        <span className="block h-full bg-brand-600" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[13px] text-ink/80">{pct}%</span>
    </span>
  )
}
