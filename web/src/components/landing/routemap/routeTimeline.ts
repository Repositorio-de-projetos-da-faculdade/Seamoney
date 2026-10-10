import type { SceneTools } from '../motion'
import { VIEW_H, VIEW_W } from './geometry'

// Scroll timeline for the map, 0 to 1. A sonar ping from São Paulo sweeps the chart open while the camera sits close
// on the city. The payment then travels the bank wire, slowing into each bank, where a ripple goes out and the
// label decodes; the camera pulls back as it goes. The wire dims, the Seamoney arc draws in one quick stroke with
// the memo chip riding its head, Shenzhen ripples in mint and a pulse keeps running along the arc. Reduced motion
// jumps straight to the final frame.

/** How close the camera starts on São Paulo. */
const ZOOM = 1.5
const HEX = '0123456789ABCDEF'

type Pt = [number, number]

/** Fraction of the way along `path` that passes closest to `pt` (sampled; plenty for a few stops). */
function fractionAt(path: SVGPathElement, [x, y]: Pt) {
  const total = path.getTotalLength()
  let best = 0
  let bestD = Infinity
  for (let i = 0; i <= 400; i++) {
    const p = path.getPointAtLength((total * i) / 400)
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d < bestD) [best, bestD] = [i / 400, d]
  }
  return best
}

const pingAt = (scope: HTMLElement, key: string): Pt => {
  const c = scope.querySelector<SVGCircleElement>(`[data-ping="${key}"]`)
  return c ? [c.cx.baseVal.value, c.cy.baseVal.value] : [0, 0]
}

export function buildRouteTimeline({ gsap, reduced }: SceneTools, scope: HTMLElement) {
  const q = <E extends Element>(sel: string) => scope.querySelector<E>(sel)
  const sea = q<SVGPathElement>('.rm-sea')
  const wire = q<SVGPathElement>('.rm-bank-solid')
  const cam = q<HTMLElement>('.rm-cam')
  const packet = q<SVGGElement>('.rm-packet')
  const comet = q<SVGGElement>('.rm-comet')
  const chip = q<SVGGElement>('.rm-chip')
  if (!sea || !wire || !cam || !packet || !comet || !chip) return

  if (reduced) {
    gsap.set('.rm-bank-solid, .rm-sea, .rm-sea-glow', { strokeDashoffset: 0 })
    gsap.set('.rm-bank-dim', { opacity: 0.4 })
    gsap.set('.rm-hud-sea, .rm-sea-label, .rm-stop', { opacity: 1 })
    gsap.set('.rm-chip, .rm-packet, .rm-comet, .rm-sea-flow', { opacity: 0 })
    return
  }

  const state = { wire: 0, sea: 0, zoom: ZOOM }
  const place = (el: SVGGElement, path: SVGPathElement, p: number) => {
    const { x, y } = path.getPointAtLength(path.getTotalLength() * p)
    el.setAttribute('transform', `translate(${x} ${y})`)
    return { x, y }
  }
  // the wire is drawn up to the payment, and the camera keeps the payment where it is on screen while it pulls back
  const frameWire = () => {
    const { x, y } = place(packet, wire, state.wire)
    wire.style.strokeDashoffset = String(1 - state.wire)
    cam.style.transformOrigin = `${(x / VIEW_W) * 100}% ${(y / VIEW_H) * 100}%`
    cam.style.transform = `scale(${state.zoom})`
  }
  const frameSea = () => {
    place(comet, sea, state.sea)
    place(chip, sea, state.sea)
  }
  frameWire()
  frameSea()

  const stops = { ny: fractionAt(wire, pingAt(scope, 'ny')), hk: fractionAt(wire, pingAt(scope, 'hk')) }

  const tl = gsap.timeline({
    scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  })

  /** A bank on the wire: the marker appears, a ripple goes out, the name decodes and the toll tag slides in. */
  const callAt = (key: string, time: number) => {
    const stop = q<HTMLElement>(`[data-stop="${key}"]`)
    if (!stop) return
    const name = stop.querySelector<HTMLElement>('[data-label]')
    const toll = stop.querySelector<HTMLElement>('[data-toll]')
    tl.fromTo(stop, { opacity: 0 }, { opacity: 1, duration: 0.015 }, time)
      .fromTo(`[data-ping="${key}"]`, { attr: { r: 4 }, opacity: 0.9 }, { attr: { r: 34 }, opacity: 0, duration: 0.07, ease: 'power2.out', immediateRender: false }, time)
    if (name) tl.to(name, { scrambleText: { text: name.textContent ?? '', chars: HEX, speed: 0.6 }, duration: 0.05, ease: 'none' }, time)
    if (toll) tl.fromTo(toll, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.03 }, time + 0.02)
  }
  const wireTo = (to: number, time: number, duration: number) =>
    tl.to(state, { wire: to, duration, ease: 'power2.inOut', onUpdate: frameWire }, time)

  // the chart opens from São Paulo
  tl.fromTo('.rm-sonar', { attr: { r: 0 } }, { attr: { r: 2400 }, duration: 0.18, ease: 'power1.in' }, 0)
    .fromTo('.rm-sonar-ring', { attr: { r: 0 }, opacity: 0.7 }, { attr: { r: 2400 }, opacity: 0, duration: 0.18, ease: 'power1.in' }, 0)
  callAt('origin', 0.04)

  // the bank wire, port call by port call, while the camera pulls back
  tl.fromTo(packet, { opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.08)
    .to(state, { zoom: 1, duration: 0.36, ease: 'power2.inOut', onUpdate: frameWire }, 0.1)
  wireTo(stops.ny, 0.1, 0.12)
  callAt('ny', 0.22)
  wireTo(stops.hk, 0.27, 0.13)
  callAt('hk', 0.4)
  wireTo(1, 0.45, 0.04)
  callAt('dest', 0.49)
  tl.fromTo('.rm-hud-bank', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.5)
    .fromTo('.rm-hud-bank li', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.03, stagger: 0.012 }, 0.51)
    .to(packet, { opacity: 0, duration: 0.03 }, 0.55)

  // the direct arc: one quick stroke, the memo riding its head
  tl.to('.rm-bank-dim', { opacity: 0.35, duration: 0.08 }, 0.58)
    .fromTo('.rm-sea, .rm-sea-glow', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.12, ease: 'power2.inOut' }, 0.62)
    .fromTo(state, { sea: 0 }, { sea: 1, duration: 0.12, ease: 'power2.inOut', onUpdate: frameSea }, 0.62)
    .fromTo('.rm-comet, .rm-chip', { opacity: 0 }, { opacity: 1, duration: 0.015 }, 0.62)
    .to('.rm-comet', { opacity: 0, duration: 0.03 }, 0.74)
    // the chip hands over to the destination label when it arrives, so the two never overlap
    .to('.rm-chip', { opacity: 0, duration: 0.03 }, 0.77)
    .fromTo('.rm-ping-sea', { attr: { r: 4 }, opacity: 1 }, { attr: { r: 48 }, opacity: 0, duration: 0.09, ease: 'power2.out', stagger: 0.035, immediateRender: false }, 0.74)
    .fromTo('.rm-sea-label', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.79)
    .fromTo('.rm-hud-sea', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.78)
    .fromTo('.rm-hud-sea li', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.03, stagger: 0.012 }, 0.79)
    .fromTo('.rm-sea-flow', { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.82)
    .to({}, { duration: 0.14 }, 0.86)
}
