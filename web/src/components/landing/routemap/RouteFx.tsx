import type { Pt, StopKey } from './geometry'

// The moving parts drawn over the chart, all hidden until routeTimeline brings them in: a sonar ring that sweeps the
// chart open from São Paulo, a ripple at each bank as the wire calls there, the payment travelling the wire, the
// lit head of the Seamoney arc with the memo chip above it, and the pulse that keeps running along the arc after.

const KEYS: StopKey[] = ['origin', 'ny', 'hk', 'dest']

export function SonarDefs({ origin }: { origin: Pt }) {
  return (
    <>
      <radialGradient id="rm-sonar-fill">
        <stop offset="0.82" stopColor="#fff" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      {/* the land and the grid show only inside the sonar's reach; the mask is large because the chart bleeds past its box */}
      <mask id="rm-land-mask" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
        <circle className="rm-sonar" cx={origin[0]} cy={origin[1]} r={2400} fill="url(#rm-sonar-fill)" />
      </mask>
    </>
  )
}

export function RouteFx({ points, sea }: { points: Record<StopKey, Pt>; sea: string }) {
  const [ox, oy] = points.origin
  const [dx, dy] = points.dest
  return (
    <>
      <circle className="rm-sonar-ring fill-none stroke-mint" cx={ox} cy={oy} r={0} strokeWidth={1} opacity={0} vectorEffect="non-scaling-stroke" />

      {KEYS.map((key) => (
        <circle key={key} data-ping={key} className="fill-none stroke-bank" cx={points[key][0]} cy={points[key][1]} r={0} strokeWidth={1.5} opacity={0} />
      ))}
      <circle className="rm-ping-sea fill-none stroke-mint" cx={dx} cy={dy} r={0} strokeWidth={1.5} opacity={0} />
      <circle className="rm-ping-sea fill-none stroke-mint" cx={dx} cy={dy} r={0} strokeWidth={1} opacity={0} />

      {/* after arrival, a short pulse keeps running São Paulo to Shenzhen (CSS, see .lp-flow) */}
      <path d={sea} pathLength={1} className="rm-sea-flow lp-flow fill-none stroke-mint" strokeWidth={3} strokeLinecap="round" strokeDasharray="0.07 0.93" filter="url(#rm-glow-soft)" opacity={0} />

      <g className="rm-packet" opacity={0}>
        <circle r={9} className="fill-bank/30" />
        <circle r={3.5} className="fill-white" />
      </g>

      <g className="rm-comet" opacity={0}>
        <circle r={12} className="fill-mint/35" filter="url(#rm-glow)" />
        <circle r={4} className="fill-white" />
      </g>
    </>
  )
}
