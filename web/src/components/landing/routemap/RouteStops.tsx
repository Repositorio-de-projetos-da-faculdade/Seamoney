import { label } from '../type'
import { VIEW_H, VIEW_W, type Pt, type StopKey } from './geometry'

type Place = 'topRight' | 'bottom' | 'belowRight' | 'aboveRight'

const LABEL_AT: Record<Place, string> = {
  // centred on desktop; on phones the Americas sit at the left edge, so the label starts at the point instead
  bottom: 'top-3 -left-2 md:left-1/2 md:-translate-x-1/2',
  // New York starts at its point and runs right, away from the chapter text on the left
  topRight: 'bottom-3 -left-2',
  // Hong Kong and Shenzhen are almost the same point: one label below to the left, the other above to the left
  belowRight: 'right-4 top-1 items-end',
  aboveRight: 'right-4 -top-1 -translate-y-full items-end',
}

/** The banks along the wire. The two in the middle are the port calls: each one takes a fee and some time. */
const STOPS: { key: StopKey; place: Place; toll?: boolean }[] = [
  { key: 'origin', place: 'bottom' },
  { key: 'ny', place: 'topRight', toll: true },
  { key: 'hk', place: 'belowRight', toll: true },
  { key: 'dest', place: 'aboveRight' },
]

export const at = ([x, y]: Pt) => ({ left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` })

/** HTML markers over the chart, so the labels wrap and stay readable at any zoom. routeTimeline animates the data-* hooks. */
export function RouteStops({ points, labels, toll }: { points: Record<StopKey, Pt>; labels: Record<StopKey, string>; toll: string }) {
  return STOPS.map(({ key, place, toll: calls }) => (
    <div key={key} data-stop={key} className="rm-stop rm-bank-dim absolute size-0" style={at(points[key])}>
      <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bank bg-abyss ring-4 ring-bank/15" />
      <span className={`${label} absolute flex flex-col gap-1 whitespace-nowrap ${LABEL_AT[place]}`}>
        <span data-label className="text-foam/75">
          {labels[key]}
        </span>
        {calls && (
          <span data-toll className="flex items-center gap-1.5 text-bank-soft">
            <span className="size-1.5 rotate-45 bg-bank" aria-hidden="true" />
            {toll}
          </span>
        )}
      </span>
    </div>
  ))
}
