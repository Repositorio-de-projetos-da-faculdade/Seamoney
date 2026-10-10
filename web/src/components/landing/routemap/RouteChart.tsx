import { label } from '../type'
import { VIEW_H, VIEW_W, type Pt, type RouteGeometry, type StopKey } from './geometry'

type Place = 'topRight' | 'bottom' | 'belowRight' | 'aboveRight'

const LABEL_AT: Record<Place, string> = {
  // centred on desktop; on phones the Americas sit at the left edge, so the label starts at the point instead
  bottom: 'top-3 -left-2 md:left-1/2 md:-translate-x-1/2',
  // New York starts at its point and runs right, away from the chapter text on the left
  topRight: 'bottom-3 -left-2',
  // Hong Kong and Shenzhen are almost the same point: one label below to the left, the other above to the left
  belowRight: 'right-4 top-1',
  aboveRight: 'right-4 -top-1 -translate-y-full',
}

const STOPS: { key: StopKey; place: Place }[] = [
  { key: 'origin', place: 'bottom' },
  { key: 'ny', place: 'topRight' },
  { key: 'hk', place: 'belowRight' },
  { key: 'dest', place: 'aboveRight' },
]

const at = ([x, y]: Pt) => ({ left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` })

// Map as SVG (land, graticule, routes), with HTML labels on top so the text wraps and stays readable.
export function RouteChart({ geo, labels }: { geo: RouteGeometry; labels: Record<StopKey | 'sea', string> }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <filter id="rm-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {/* The dashed bank wire is revealed through this mask as the solid line draws, so it appears only where the wire has travelled. */}
          <mask id="rm-bank-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={VIEW_H}>
            <path
              className="rm-bank-solid"
              d={geo.bank}
              pathLength={1}
              fill="none"
              stroke="#fff"
              strokeWidth={3}
              strokeDasharray="1 1"
              strokeDashoffset={1}
            />
          </mask>
        </defs>

        <g className="rm-grid">
          <path d={geo.graticule} className="fill-none stroke-foam/[0.07]" strokeWidth={0.6} />
          <path d={geo.land} className="fill-tide stroke-foam/20" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        </g>

        <g className="rm-bank-dim">
          <path
            d={geo.bank}
            pathLength={1}
            fill="none"
            className="stroke-bank"
            strokeWidth={2}
            strokeDasharray="0.02 0.016"
            mask="url(#rm-bank-mask)"
          />
        </g>

        <path
          d={geo.sea}
          pathLength={1}
          fill="none"
          className="rm-sea-glow stroke-mint"
          strokeWidth={8}
          strokeDasharray="1 1"
          strokeDashoffset={1}
          filter="url(#rm-glow)"
          opacity={0.7}
        />
        <path
          d={geo.sea}
          pathLength={1}
          fill="none"
          className="rm-sea stroke-mint"
          strokeWidth={2}
          strokeDasharray="1 1"
          strokeDashoffset={1}
        />

        <g className="rm-chip" opacity={0}>
          <rect x={-92} y={-14} width={184} height={28} rx={14} className="fill-abyss stroke-mint" strokeWidth={1} />
          <text textAnchor="middle" dominantBaseline="central" className="fill-mint font-data" fontSize={11} fontWeight={500} letterSpacing={0.8}>
            memo INV-2026-0845
          </text>
        </g>
      </svg>

      {STOPS.map(({ key, place }) => (
        <div key={key} data-stop={key} className="rm-stop rm-bank-dim absolute size-0" style={at(geo.points[key])}>
          <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bank bg-abyss ring-4 ring-bank/15" />
          <span className={`${label} absolute whitespace-nowrap text-foam/70 ${LABEL_AT[place]}`}>
            {labels[key]}
          </span>
        </div>
      ))}

      {/* Own element, not inside the dest stop, so the bank dimming does not fade the mint label. */}
      <div data-sea className="rm-sea-label absolute size-0" style={at(geo.points.dest)}>
        <span className={`${label} absolute right-4 top-8 whitespace-nowrap text-mint`}>
          {labels.sea}
        </span>
      </div>
    </div>
  )
}
