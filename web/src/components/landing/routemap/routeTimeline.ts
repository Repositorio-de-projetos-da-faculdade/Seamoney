import type { SceneTools } from '../motion'

// Scroll timeline for the map, 0 to 1. The bank wire draws and its stops appear, then the wire dims while the
// Seamoney arc draws fast and the memo chip rides along it. Reduced motion jumps straight to the final frame.
export function buildRouteTimeline({ gsap, reduced }: SceneTools, scope: HTMLElement) {
  const sea = scope.querySelector<SVGPathElement>('.rm-sea')
  const chip = scope.querySelector<SVGGElement>('.rm-chip')
  if (!sea || !chip) return

  const place = (p: number) => {
    const { x, y } = sea.getPointAtLength(sea.getTotalLength() * p)
    chip.setAttribute('transform', `translate(${x} ${y})`)
  }

  if (reduced) {
    gsap.set('.rm-bank-solid, .rm-sea, .rm-sea-glow', { strokeDashoffset: 0 })
    gsap.set('.rm-bank-dim', { opacity: 0.4 })
    gsap.set('.rm-hud-sea, .rm-sea-label, .rm-stop, .rm-grid', { opacity: 1 })
    gsap.set('.rm-chip', { opacity: 0 })
    place(1)
    return
  }

  const progress = { v: 0 }
  place(0)

  const tl = gsap.timeline({
    scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  })

  tl.fromTo('.rm-grid', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0)
    .fromTo('.rm-bank-solid', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35 }, 0.1)
    .fromTo('[data-stop="origin"]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.1)
    .fromTo('[data-stop="ny"]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.22)
    .fromTo('[data-stop="hk"]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.34)
    .fromTo('[data-stop="dest"]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.45)
    .fromTo('.rm-hud-bank', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.06 }, 0.47)
    .to('.rm-bank-dim', { opacity: 0.4, duration: 0.08 }, 0.6)
    .fromTo('.rm-sea, .rm-sea-glow', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.08 }, 0.6)
    .fromTo('.rm-chip', { opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.68)
    .to(progress, { v: 1, duration: 0.14, ease: 'none', onUpdate: () => place(progress.v) }, 0.68)
    // the chip hands over to the destination label when it arrives, so the two never overlap
    .to('.rm-chip', { opacity: 0, duration: 0.03 }, 0.81)
    .fromTo('.rm-sea-label', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.82)
    .fromTo('.rm-hud-sea', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.06 }, 0.8)
    .to({}, { duration: 0.14 }, 0.86)
}
