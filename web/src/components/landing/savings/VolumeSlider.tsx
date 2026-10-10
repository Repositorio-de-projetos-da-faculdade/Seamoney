import type { CSSProperties } from 'react'
import { usdWhole, type Locale } from '@/lib/format'

export const VOLUME = { min: 5000, max: 500000, step: 5000 } as const

/** Monthly volume in whole dollars. The native range input keeps keyboard and screen reader support for free. */
export function VolumeSlider({
  id,
  label,
  value,
  locale,
  onChange,
}: {
  id: string
  label: string
  value: number
  locale: Locale
  onChange: (value: number) => void
}) {
  const pct = ((value - VOLUME.min) / (VOLUME.max - VOLUME.min)) * 100

  return (
    <div>
      <label htmlFor={id} className="block max-w-[34ch] font-text text-[15px] leading-snug text-foam/75">
        {label}
      </label>
      <output htmlFor={id} className="mt-4 block font-grotesk text-[clamp(2.2rem,4vw,3.4rem)] font-light leading-none tracking-[-0.045em] text-white tabular-nums">
        {usdWhole(value * 100, locale)}
      </output>
      <input
        id={id}
        type="range"
        min={VOLUME.min}
        max={VOLUME.max}
        step={VOLUME.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lp-range mt-3"
        style={{ '--pct': `${pct}%` } as CSSProperties}
      />
      <div className="flex justify-between font-data text-[10px] font-medium uppercase tracking-[0.08em] text-foam/35" aria-hidden="true">
        <span>{usdWhole(VOLUME.min * 100, locale)}</span>
        <span>{usdWhole(VOLUME.max * 100, locale)}</span>
      </div>
    </div>
  )
}
