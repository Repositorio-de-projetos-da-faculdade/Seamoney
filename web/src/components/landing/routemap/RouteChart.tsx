import { SAMPLE_REFERENCE } from '../sample'
import { label } from '../type'
import { VIEW_H, VIEW_W, type RouteGeometry, type StopKey } from './geometry'
import { RouteFx, SonarDefs } from './RouteFx'
import { at, RouteStops } from './RouteStops'

// Map as SVG (land, graticule, routes, moving parts), with HTML labels on top so the text wraps and stays readable.
// The whole chart is one camera (.rm-cam): routeTimeline zooms it in on São Paulo and pulls back as the wire travels.
export function RouteChart({ geo, labels }: { geo: RouteGeometry; labels: Record<StopKey | 'sea' | 'toll', string> }) {
  return (
    <div className="rm-cam relative w-full will-change-transform" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <filter id="rm-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="rm-glow-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
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
          <SonarDefs origin={geo.points.origin} />
        </defs>

        <g className="rm-grid" mask="url(#rm-land-mask)">
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

        <RouteFx points={geo.points} sea={geo.sea} />

        <g className="rm-chip" opacity={0}>
          <g transform="translate(0 -30)">
            <rect x={-92} y={-14} width={184} height={28} rx={14} className="fill-abyss stroke-mint" strokeWidth={1} />
            <text textAnchor="middle" dominantBaseline="central" className="fill-mint font-data" fontSize={11} fontWeight={500} letterSpacing={0.8}>
              memo {SAMPLE_REFERENCE}
            </text>
          </g>
        </g>
      </svg>

      <RouteStops points={geo.points} labels={labels} toll={labels.toll} />

      {/* Own element, not inside the dest stop, so the bank dimming does not fade the mint label. */}
      <div data-sea className="rm-sea-label absolute size-0" style={at(geo.points.dest)}>
        <span className={`${label} absolute right-4 top-8 whitespace-nowrap text-mint`}>
          {labels.sea}
        </span>
      </div>
    </div>
  )
}
