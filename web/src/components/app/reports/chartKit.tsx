'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

/** A clean top for the y scale: 1, 2 or 5 times a power of ten, at or above the largest value. */
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10
  return step * power
}

/** Recessive hairline gridlines with compact labels on the left, drawn behind the marks. */
export function Gridlines({ max, format, steps = 2 }: { max: number; format: (v: number) => string; steps?: number }) {
  const ticks = Array.from({ length: steps + 1 }, (_, i) => (max / steps) * i)
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {ticks.map((v) => (
        <div key={v} className="absolute inset-x-0 border-t border-hair" style={{ bottom: `${(v / max) * 100}%` }}>
          <span className="absolute -top-2 left-0 -translate-x-full pr-2 font-data text-[10px] tabular-nums text-muted">{format(v)}</span>
        </div>
      ))}
    </div>
  )
}

/** The hover/focus readout: values lead, series names follow, each row keyed by a short stroke of its colour. */
export function ChartTip({ title, rows, left, className }: { title: string; rows: { key: string; color?: string; label: string; value: string; strong?: boolean }[]; left: number; className?: string }) {
  return (
    <div
      role="status"
      className={clsx('pointer-events-none absolute top-0 z-10 min-w-[220px] -translate-x-1/2 border border-rule bg-white px-3 py-2.5 shadow-[0_12px_30px_-16px_rgb(6_24_44/0.45)]', className)}
      style={{ left: `clamp(110px, ${left}%, calc(100% - 110px))` }}
    >
      <p className="font-data text-[10px] uppercase tracking-[0.08em] text-muted">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 text-[12.5px]">
            <span className="flex items-center gap-2 whitespace-nowrap text-muted">
              {r.color ? <span className="h-[2px] w-3" style={{ background: r.color }} aria-hidden="true" /> : null}
              {r.label}
            </span>
            <span className={clsx('tabular-nums', r.strong ? 'font-medium text-ink' : 'text-ink')}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A legend entry: the mark's shape in its colour, the name in text ink. */
export function Key({ color, shape = 'rect', children }: { color: string; shape?: 'rect' | 'line'; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-muted">
      <span className={shape === 'line' ? 'h-[2px] w-4' : 'size-2.5 rounded-[2px]'} style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  )
}

/** Series colours of the Reports page (validated: Tempo/Solana ΔE 17.5 normal vision, 11+ for colour-blind readers). */
export const SERIES = {
  tempo: '#078060',
  solana: '#155ba1',
  saving: '#078060',
}
