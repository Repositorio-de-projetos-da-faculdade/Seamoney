'use client'

import clsx from 'clsx'
import { CHART } from '@/lib/chart/land'
import { ORIGIN, portByCode, project, routeTo, type Port } from '@/lib/chart/geo'
import { useT } from '@/lib/i18n/client'
import { ChartBase } from './ChartBase'
import { Vessel } from './Vessel'
import type { VesselSpec } from './voyage'

/** Where each port writes its name, so the Pearl River Delta ports (1 px apart at this scale) do not collide. */
const LABEL: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
  BRSSZ: { dx: -16, dy: -30, anchor: 'end' },
  CNSZX: { dx: 14, dy: -16, anchor: 'start' },
  HKHKG: { dx: 14, dy: 22, anchor: 'start' },
  CNCAN: { dx: -14, dy: -16, anchor: 'end' },
  CNNGB: { dx: 14, dy: 4, anchor: 'start' },
  CNSHA: { dx: 14, dy: -8, anchor: 'start' },
  TWKHH: { dx: 14, dy: 14, anchor: 'start' },
  VNSGN: { dx: -14, dy: 18, anchor: 'end' },
  SGSIN: { dx: -12, dy: 26, anchor: 'end' },
  INBOM: { dx: -14, dy: 4, anchor: 'end' },
}

function PortMark({ port, origin = false, named = true }: { port: Port; origin?: boolean; named?: boolean }) {
  const p = project(port.at)
  const l = LABEL[port.code] ?? { dx: 14, dy: 4, anchor: 'start' as const }
  return (
    <g>
      {origin ? <circle cx={p.x} cy={p.y} r="9" fill="none" stroke="#e3ebee" strokeWidth="1.2" /> : null}
      <rect x={p.x - 4} y={p.y - 4} width="8" height="8" fill="#e3ebee" transform={`rotate(45 ${p.x} ${p.y})`} />
      <g className="max-md:hidden" display={named ? undefined : 'none'}>
        <text x={p.x + l.dx} y={p.y + l.dy} textAnchor={l.anchor} fill="#e3ebee" fontSize="14" className="font-data">
          {port.code}
        </text>
        <text x={p.x + l.dx} y={p.y + l.dy + 17} textAnchor={l.anchor} fill="#8fa9bc" fontSize="14" className="font-text">
          {port.city}
        </text>
      </g>
    </g>
  )
}

/**
 * The night chart: Santos to the suppliers' ports in Mercator, with each payment as a vessel. `focus` draws one
 * payment's voyage only (payment page); otherwise every payment at sea is shown (overview).
 */
export function NightChart({
  vessels,
  focus,
  selected,
  onSelect,
  className,
  title,
  cover = false,
  labels = !cover,
}: {
  vessels: VesselSpec[]
  focus?: string
  selected?: string | null
  onSelect?: (id: string | null) => void
  className?: string
  title: string
  /** fill the box and crop the edges (backgrounds) instead of keeping the whole chart */
  cover?: boolean
  /** water and port names, the degree scale; on by default unless `cover` */
  labels?: boolean
}) {
  const { t } = useT()
  const ports = [...new Set(vessels.map((v) => v.supplier.port))].map(portByCode).filter((p): p is Port => !!p)
  const routes = ports.map((p) => routeTo(p.code)).filter((r) => !!r)
  const waters = {
    atlantic: t('app.chart.atlantic'),
    indian: t('app.chart.indian'),
    arabian: t('app.chart.arabian'),
    bengal: t('app.chart.bengal'),
    scs: t('app.chart.scs'),
  }
  // vessels that wait in the same place (at anchor, or ready at the harbour mouth) each get their own spot
  const berths = { anchor: 0, ready: 0 }

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      preserveAspectRatio={cover ? 'xMidYMid slice' : undefined}
      className={clsx('block select-none', cover ? 'h-full w-full' : 'h-auto w-full', className)}
      role="img"
      aria-label={title}
    >
      <ChartBase waters={waters} bare={!labels} />

      {/* planned tracks */}
      <g fill="none" stroke="#24e4b4" strokeLinecap="round">
        {routes.map((r) => (
          <path key={r.port.code} d={r.d} strokeWidth={focus ? 2.6 : 2.2} strokeDasharray="1 8" opacity={focus ? 0.85 : 0.55} />
        ))}
      </g>

      <PortMark port={ORIGIN} origin named={labels} />
      {ports.map((p) => (
        <PortMark key={p.code} port={p} named={labels} />
      ))}

      {vessels.map((v) => {
        const st = v.payment.status
        const berth = st === 'pending_approval' ? berths.anchor++ : st === 'approved' || st === 'sending' ? berths.ready++ : 0
        return (
          <Vessel
            key={v.payment.id}
            spec={v}
            berth={berth}
            selected={selected === v.payment.id || focus === v.payment.id}
            showWake
            onSelect={onSelect}
          />
        )
      })}
    </svg>
  )
}
