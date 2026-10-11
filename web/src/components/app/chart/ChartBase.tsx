'use client'

import { memo } from 'react'
import { CHART, LAND_PATH } from '@/lib/chart/land'
import { graticule, project, type LonLat } from '@/lib/chart/geo'

const W = CHART.width
const H = CHART.height
const GRID = graticule(10)

/** Alternating bars every 5° along the frame, the border scale of a printed chart. */
function neatline() {
  const bars: { x: number; y: number; w: number; h: number; dark: boolean }[] = []
  const band = 7
  let dark = true
  for (let lon = -60; lon < 130; lon += 5) {
    const x0 = Math.max(0, project([lon, 0]).x)
    const x1 = Math.min(W, project([lon + 5, 0]).x)
    if (x1 <= 0 || x0 >= W) continue
    bars.push({ x: x0, y: 0, w: x1 - x0, h: band, dark }, { x: x0, y: H - band, w: x1 - x0, h: band, dark })
    dark = !dark
  }
  dark = true
  for (let lat = 40; lat > -45; lat -= 5) {
    const y0 = Math.max(0, project([0, lat]).y)
    const y1 = Math.min(H, project([0, lat - 5]).y)
    if (y1 <= 0 || y0 >= H) continue
    bars.push({ x: 0, y: y0, w: band, h: y1 - y0, dark }, { x: W - band, y: y0, w: band, h: y1 - y0, dark })
    dark = !dark
  }
  return bars
}
const BARS = neatline()

const WATERS: { key: 'atlantic' | 'indian' | 'arabian' | 'bengal' | 'scs'; at: LonLat; size: number }[] = [
  { key: 'atlantic', at: [-19, -20], size: 28 },
  { key: 'indian', at: [74, -27], size: 30 },
  { key: 'arabian', at: [62.5, 12.5], size: 19 },
  { key: 'bengal', at: [88.5, 13], size: 19 },
  { key: 'scs', at: [113.5, 13.6], size: 17 },
]

/**
 * The parts of the chart that never change: deep water, graticule, land with a glow of shallow water along the
 * coast, water names in italics (as charts write them) and the framed border with its degree scale.
 */
export const ChartBase = memo(function ChartBase({ waters, bare = false }: { waters: Record<(typeof WATERS)[number]['key'], string>; bare?: boolean }) {
  return (
    <g>
      <defs>
        <radialGradient id="deep" cx="48%" cy="55%" r="70%">
          <stop offset="0" stopColor="#0a1d30" />
          <stop offset="1" stopColor="#020810" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#deep)" />

      <g stroke="#0f2840" strokeWidth="0.7">
        {GRID.map((g) => (
          <path key={g.d} d={g.d} />
        ))}
      </g>

      {/* shallow water: the coastline drawn wide and soft under the land */}
      <path d={LAND_PATH} fill="none" stroke="#0a2133" strokeWidth="9" strokeLinejoin="round" opacity="0.9" />
      <path d={LAND_PATH} fill="none" stroke="#0f2a40" strokeWidth="3.5" strokeLinejoin="round" opacity="0.8" />
      <path d={LAND_PATH} fill="#0c2136" stroke="#24475f" strokeWidth="0.8" strokeLinejoin="round" />

      <g fill="#6f8ea6" fontStyle="italic" style={{ fontFamily: 'var(--font-accent)', letterSpacing: '0.02em' }} display={bare ? 'none' : undefined}>
        {WATERS.map((w) => {
          const p = project(w.at)
          return (
            <text key={w.key} x={p.x} y={p.y} fontSize={w.size} textAnchor="middle" opacity="0.85">
              {waters[w.key]}
            </text>
          )
        })}
      </g>

      {/* degree labels just inside the frame */}
      <g fill="#6f8ea6" fontSize="13" style={{ fontFamily: 'var(--font-data)' }} display={bare ? 'none' : undefined}>
        {GRID.filter((g) => g.axis === 'lon' && g.at > 30 && g.at < W - 30).map((g) => (
          <text key={g.label} x={g.at + 5} y={26}>
            {g.label}
          </text>
        ))}
        {GRID.filter((g) => g.axis === 'lat' && g.at > 24 && g.at < H - 18).map((g) => (
          <text key={g.label} x={14} y={g.at - 5}>
            {g.label}
          </text>
        ))}
      </g>

      <g>
        {BARS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.dark ? '#06121f' : '#c9d6df'} />
        ))}
        <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#c9d6df" strokeWidth="1" />
        <rect x="7.5" y="7.5" width={W - 15} height={H - 15} fill="none" stroke="#c9d6df" strokeWidth="0.6" opacity="0.6" />
      </g>
    </g>
  )
})
