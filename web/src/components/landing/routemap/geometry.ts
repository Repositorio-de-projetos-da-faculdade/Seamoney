import { geoGraticule, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import land110 from 'world-atlas/land-110m.json'

// Projects the chart once on the server, so the client only receives SVG strings and numbers.

export const VIEW_W = 1000
export const VIEW_H = 560

export type Pt = [number, number]
export type StopKey = 'origin' | 'ny' | 'hk' | 'dest'

const CITIES: Record<StopKey, [number, number]> = {
  origin: [-46.63, -23.55], // São Paulo
  ny: [-74.0, 40.71],
  hk: [114.17, 22.32],
  dest: [114.06, 22.54], // Shenzhen
}

export interface RouteGeometry {
  land: string
  graticule: string
  /** Bank wire: three legs as one path, so the draw can run along the whole route. */
  bank: string
  /** Seamoney direct arc, São Paulo to Shenzhen. */
  sea: string
  points: Record<StopKey, Pt>
}

const round = (n: number) => Math.round(n * 10) / 10

/** Quadratic leg from a to b. `lift` > 0 bulges up (bank legs), < 0 sags down (the direct arc). */
function leg(a: Pt, b: Pt, lift: number): string {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1])
  const cx = (a[0] + b[0]) / 2
  const cy = (a[1] + b[1]) / 2 - d * lift
  return `Q${round(cx)} ${round(cy)} ${round(b[0])} ${round(b[1])}`
}

export function buildRouteGeometry(): RouteGeometry {
  const cities = Object.values(CITIES)
  const projection = geoNaturalEarth1().fitExtent(
    [
      [150, 110],
      [VIEW_W - 150, VIEW_H - 110],
    ],
    { type: 'MultiPoint', coordinates: cities },
  )
  const project = (lonLat: [number, number]): Pt => {
    const [x, y] = projection(lonLat) ?? [0, 0]
    return [round(x), round(y)]
  }
  const points = {
    origin: project(CITIES.origin),
    ny: project(CITIES.ny),
    hk: project(CITIES.hk),
    dest: project(CITIES.dest),
  }
  const path = geoPath(projection)
  const world = land110 as unknown as Topology<{ land: GeometryCollection }>
  const landFeature = feature(world, world.objects.land)

  const bank = [
    `M${points.origin.join(' ')}`,
    leg(points.origin, points.ny, 0.32),
    leg(points.ny, points.hk, 0.32),
    leg(points.hk, points.dest, 0.32),
  ].join(' ')

  return {
    land: path(landFeature) ?? '',
    graticule: path(geoGraticule().step([20, 20])()) ?? '',
    bank,
    sea: `M${points.origin.join(' ')} ${leg(points.origin, points.dest, -0.22)}`,
    points,
  }
}
