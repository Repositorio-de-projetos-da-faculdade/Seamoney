// Ports and sea routes of the demo chart, in real coordinates, projected with the same Mercator as land.ts.
// Routes follow the usual way from Santos to Asia: around the Cape of Good Hope, across the Indian Ocean and,
// for East Asia, through the Strait of Malacca and Singapore. Waypoints are approximate (good for a picture,
// not for navigation).
import { CHART } from './land'

export type LonLat = readonly [number, number]
export interface Point {
  x: number
  y: number
}

const rad = (d: number) => (d * Math.PI) / 180

// Rounded to 1/100 px: Math.log and Math.tan may differ in the last digits between Node and the browser, which
// would make server-rendered SVG attributes mismatch on hydration.
const r2 = (v: number) => Math.round(v * 100) / 100

/** Mercator, identical to d3.geoMercator().scale(k).translate([tx, ty]) used to draw the coast. */
export function project([lon, lat]: LonLat): Point {
  return { x: r2(CHART.k * rad(lon) + CHART.tx), y: r2(-CHART.k * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) + CHART.ty) }
}

export interface Port {
  /** UN/LOCODE */
  code: string
  city: string
  country: string
  at: LonLat
}

export const ORIGIN: Port = { code: 'BRSSZ', city: 'Santos', country: 'BR', at: [-46.3, -23.97] }

// shared legs
const CAPE: LonLat[] = [[-46.3, -23.97], [-45.1, -24.7], [-38, -28.6], [-20, -33.6], [0, -36.3], [15, -36.9], [20.5, -37.1], [27, -36.2]]
const INDIAN_TO_MALACCA: LonLat[] = [[45, -32.5], [64, -24.5], [81, -12.5], [92, 0.5], [95.4, 5.9], [98.6, 4.3], [101.3, 2.6], [103.8, 1.15]]
const SOUTH_CHINA_SEA: LonLat[] = [[105.4, 1.9], [107.6, 5.6], [110.6, 11.2], [113.4, 17.4], [114.5, 21.4]]

const PORTS_AND_LEGS: { port: Port; leg: LonLat[] }[] = [
  { port: { code: 'INBOM', city: 'Mumbai', country: 'IN', at: [72.84, 18.94] }, leg: [[40, -31], [52, -20], [58.5, -6], [64.5, 8], [70.2, 16.6], [72.84, 18.94]] },
  { port: { code: 'SGSIN', city: 'Singapore', country: 'SG', at: [103.8, 1.26] }, leg: [...INDIAN_TO_MALACCA, [103.8, 1.26]] },
  {
    port: { code: 'VNSGN', city: 'Ho Chi Minh City', country: 'VN', at: [106.78, 10.75] },
    leg: [...INDIAN_TO_MALACCA, [105.4, 1.9], [107.6, 5.6], [107.7, 9.4], [107.05, 10.25], [106.78, 10.75]],
  },
  { port: { code: 'HKHKG', city: 'Hong Kong', country: 'HK', at: [114.17, 22.29] }, leg: [...INDIAN_TO_MALACCA, ...SOUTH_CHINA_SEA, [114.3, 22.12], [114.17, 22.29]] },
  { port: { code: 'CNSZX', city: 'Shenzhen', country: 'CN', at: [114.28, 22.57] }, leg: [...INDIAN_TO_MALACCA, ...SOUTH_CHINA_SEA, [114.5, 22.3], [114.28, 22.57]] },
  { port: { code: 'CNCAN', city: 'Guangzhou', country: 'CN', at: [113.62, 22.68] }, leg: [...INDIAN_TO_MALACCA, ...SOUTH_CHINA_SEA, [113.9, 22.08], [113.62, 22.68]] },
  { port: { code: 'TWKHH', city: 'Kaohsiung', country: 'TW', at: [120.27, 22.6] }, leg: [...INDIAN_TO_MALACCA, ...SOUTH_CHINA_SEA, [117.8, 21.7], [120.05, 22.4], [120.27, 22.6]] },
  {
    port: { code: 'CNNGB', city: 'Ningbo', country: 'CN', at: [121.95, 29.92] },
    leg: [...INDIAN_TO_MALACCA, ...SOUTH_CHINA_SEA, [117.4, 23], [119.8, 24.9], [121.5, 27.6], [122.45, 29.6], [121.95, 29.92]],
  },
  {
    port: { code: 'CNSHA', city: 'Shanghai', country: 'CN', at: [121.6, 31.3] },
    leg: [...INDIAN_TO_MALACCA, ...SOUTH_CHINA_SEA, [117.4, 23], [119.8, 24.9], [121.5, 27.6], [122.6, 30.1], [122.3, 31.0], [121.6, 31.3]],
  },
]

export const PORTS: Port[] = PORTS_AND_LEGS.map((p) => p.port)
export const portByCode = (code: string | null | undefined) => PORTS.find((p) => p.code === code)

/* ------------------------------ routes ------------------------------ */

export interface Route {
  port: Port
  points: Point[]
  /** cumulative length at each point */
  lengths: number[]
  total: number
  d: string
}

/** Catmull-Rom through the waypoints, sampled densely so the polyline reads as a smooth track. */
function smooth(points: Point[], steps = 10): Point[] {
  const out: Point[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  out.push(points[points.length - 1])
  return out
}

function build(port: Port, leg: LonLat[]): Route {
  const points = smooth([...CAPE, ...leg].map(project))
  const lengths = [0]
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
  return { port, points, lengths, total: lengths[lengths.length - 1], d }
}

const ROUTES = new Map(PORTS_AND_LEGS.map(({ port, leg }) => [port.code, build(port, leg)]))
export const routeTo = (code: string | null | undefined): Route | undefined => (code ? ROUTES.get(code) : undefined)

/** Where a vessel is after sailing `t` (0..1) of the route, and its heading in degrees (0 = east, clockwise). */
export function along(route: Route, t: number): Point & { heading: number } {
  const target = Math.min(1, Math.max(0, t)) * route.total
  let i = route.lengths.findIndex((l) => l >= target)
  if (i <= 0) i = 1
  const a = route.points[i - 1]
  const b = route.points[i]
  const seg = route.lengths[i] - route.lengths[i - 1] || 1
  const f = (target - route.lengths[i - 1]) / seg
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI }
}

/** The travelled part of a route, for drawing the wake. */
export function wake(route: Route, t: number): string {
  const end = along(route, t)
  const target = t * route.total
  const pts = route.points.filter((_, i) => route.lengths[i] < target)
  return [...pts, end].map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
}

/** Graticule every `step` degrees inside the chart, for the fine grid. */
export function graticule(step = 10) {
  const lines: { d: string; label: string; axis: 'lon' | 'lat'; at: number }[] = []
  for (let lon = -50; lon <= 120; lon += step) {
    const x = project([lon, 0]).x
    lines.push({ d: `M${x.toFixed(1)} 0V${CHART.height}`, label: lon === 0 ? '0°' : `${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`, axis: 'lon', at: x })
  }
  for (let lat = -40; lat <= 30; lat += step) {
    const y = project([0, lat]).y
    lines.push({ d: `M0 ${y.toFixed(1)}H${CHART.width}`, label: lat === 0 ? '0°' : `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}`, axis: 'lat', at: y })
  }
  return lines
}
