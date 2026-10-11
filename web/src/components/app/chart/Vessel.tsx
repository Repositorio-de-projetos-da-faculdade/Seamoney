'use client'

import { useRouter } from 'next/navigation'
import { along, project, routeTo, wake } from '@/lib/chart/geo'
import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { ANCHORAGE, useVoyage, VESSEL_COLOR, type VesselSpec } from './voyage'

/** AIS-style vessel symbol: a pointed hull, drawn heading east and rotated to the course. */
export const HULL = 'M11 0 L-7 -6.2 L-3.4 0 L-7 6.2 Z'

/**
 * One payment on the chart. Under way it follows its route and leaves a wake; awaiting approval it swings at
 * anchor off Santos. The data block (reference and amount, as an AIS label) shows when it is selected.
 */
export function Vessel({
  spec,
  berth,
  selected,
  showWake,
  onSelect,
}: {
  spec: VesselSpec
  /** index that gives vessels waiting in the same place their own spot */
  berth: number
  selected: boolean
  showWake: boolean
  onSelect?: (id: string | null) => void
}) {
  const { t, locale } = useT()
  const router = useRouter()
  const { payment, supplier } = spec
  const route = routeTo(supplier.port)
  const progress = useVoyage(payment.status, berth)
  const color = VESSEL_COLOR[payment.status]
  const atAnchor = payment.status === 'pending_approval' || !route

  const pos = atAnchor ? { ...project(ANCHORAGE[berth % ANCHORAGE.length]), heading: -90 } : along(route!, progress)
  const label = `${payment.invoiceNumber}, ${usd(payment.quote.amountCents, locale)}, ${t(`app.status.${payment.status}`)}`

  const ref = payment.invoiceNumber
  const amount = usd(payment.quote.amountCents, locale)
  const boxW = Math.max(ref.length, amount.length) * 9 + 22
  // put the data block on the side with more room
  const left = pos.x > 1200
  const bx = left ? pos.x - 20 - boxW : pos.x + 20
  const by = pos.y - 52

  return (
    <g>
      {showWake && route && !atAnchor && payment.status !== 'in_review' && progress > 0.12 ? (
        <path d={wake(route, progress)} fill="none" stroke={color} strokeWidth={selected ? 3 : 2} strokeLinecap="round" opacity={selected ? 0.95 : 0.6} />
      ) : null}
      <a
        href={`/app/payments/${payment.id}`}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault()
          router.push(`/app/payments/${payment.id}`)
        }}
        onMouseEnter={() => onSelect?.(payment.id)}
        onMouseLeave={() => onSelect?.(null)}
        onFocus={() => onSelect?.(payment.id)}
        onBlur={() => onSelect?.(null)}
        className="cursor-pointer outline-none"
      >
        <title>{label}</title>
        {/* generous invisible target */}
        <circle cx={pos.x} cy={pos.y} r="18" fill="transparent" />
        {selected ? <circle cx={pos.x} cy={pos.y} r="17" fill="none" stroke="#e3ebee" strokeWidth="1.2" strokeDasharray="3 3" /> : null}
        <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.heading})`}>
          <g style={atAnchor ? { animation: 'swing 3.2s ease-in-out infinite alternate', transformBox: 'fill-box', transformOrigin: 'center' } : undefined}>
            <path d={HULL} transform="scale(1.35)" fill={color} stroke="#020810" strokeWidth="1.2" />
          </g>
        </g>
      </a>
      {selected ? (
        <g className="pointer-events-none max-md:hidden">
          <path d={`M${pos.x + (left ? -12 : 12)} ${pos.y - 10} L${left ? bx + boxW : bx} ${by + 22}`} stroke="#e3ebee" strokeWidth="1" opacity="0.7" />
          <rect x={bx} y={by} width={boxW} height="46" fill="#020810" stroke="#e3ebee" strokeOpacity="0.55" strokeWidth="1" />
          <text x={bx + 11} y={by + 19} fill="#e3ebee" fontSize="14" className="font-data">
            {ref}
          </text>
          <text x={bx + 11} y={by + 37} fill={color} fontSize="16" className="font-grotesk">
            {amount}
          </text>
        </g>
      ) : null}
    </g>
  )
}
