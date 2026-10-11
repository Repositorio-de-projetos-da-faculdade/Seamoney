'use client'

import { useRef, type ReactNode } from 'react'
import type { Locale } from '@/lib/format'
import { useScrollScene, type SceneTools } from '../motion'
import { pctText } from './RouteTickets'

type Gsap = SceneTools['gsap']

// Chapter 05 as one scrubbed timeline, like the paper chapter: the frame pins with its title, the two route tickets
// come in, their bars fill and figures count up, a pause, then the tickets fade out and the calculator rises in the
// same place, and holds before the chapter scrolls on. Layout in globals.css (.lp-stage). Phones and screens too
// short for the frame play the pieces in the normal flow; reduced motion and no JavaScript show both, settled.

/** Tall enough for the title and the calculator in one frame. */
const PIN = '(min-width: 768px) and (min-height: 760px)'

function pinned(gsap: Gsap, root: HTMLElement, locale: Locale) {
  root.dataset.stage = 'on'
  const q = (sel: string) => root.querySelectorAll(`[data-s="${sel}"]`)
  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 45%', end: 'bottom bottom', scrub: 0.5 } })

  tl.fromTo(q('kicker'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.04)
  tl.fromTo(
    q('ticket'),
    { y: 160, rotate: (i: number) => (i ? 7 : -7), autoAlpha: 0 },
    { y: 0, rotate: (i: number) => (i ? 1.2 : -1.2), autoAlpha: 1, duration: 0.16, stagger: 0.05, ease: 'power3.out' },
    0.04,
  )
  counts(tl, root, locale, 0.24, 0.1)
  tl.fromTo(q('diff'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.48)
  // after a pause with both tickets on the table, they leave and the calculator takes their place
  tl.to(q('ticket'), { y: -110, rotate: (i: number) => (i ? 5 : -5), scale: 0.95, autoAlpha: 0, duration: 0.12, stagger: 0.03, ease: 'power2.in' }, 0.62)
  tl.to([...q('kicker'), ...q('diff')], { autoAlpha: 0, duration: 0.08 }, 0.62)
  // autoAlpha keeps the hidden calculator out of the tab order and away from the pointer
  tl.fromTo(q('calc'), { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: 'power3.out' }, 0.72)
  // the hold: the calculator settles before the chapter scrolls on
  tl.to({}, { duration: 0.14 })

  return () => {
    delete root.dataset.stage
  }
}

function inFlow(gsap: Gsap, root: HTMLElement, locale: Locale) {
  const q = (sel: string) => root.querySelectorAll(`[data-s="${sel}"]`)
  const tl = gsap.timeline({ scrollTrigger: { trigger: q('tickets')[0], start: 'top 85%', end: 'bottom 60%', scrub: 0.5 } })
  tl.fromTo(q('ticket'), { y: 120, rotate: (i: number) => (i ? 5 : -5), autoAlpha: 0 }, { y: 0, rotate: 0, autoAlpha: 1, duration: 0.3, stagger: 0.15 }, 0)
  counts(tl, root, locale, 0.3, 0.2)
  gsap.fromTo(q('calc'), { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: q('calc')[0], start: 'top 85%', once: true } })
}

/** Each ticket's bar fills while its figure counts up from zero, one ticket after the other. */
function counts(tl: ReturnType<Gsap['timeline']>, root: HTMLElement, locale: Locale, at: number, step: number) {
  root.querySelectorAll<HTMLElement>('[data-s="ticket"]').forEach((ticket, i) => {
    const pct = ticket.querySelector<HTMLElement>('[data-s="pct"]')
    if (!pct) return
    const count = { v: 0 }
    const start = at + i * step
    tl.fromTo(ticket.querySelector('[data-s="fill"]'), { scaleX: 0 }, { scaleX: 1, duration: 0.14, ease: 'power2.out' }, start)
    tl.fromTo(count, { v: 0 }, { v: Number(pct.dataset.to), duration: 0.14, ease: 'power2.out', onUpdate: () => void (pct.textContent = pctText(count.v, locale)) }, start)
  })
}

export function SavingsStage({
  locale,
  header,
  tickets,
  calculator,
}: {
  locale: Locale
  header: ReactNode
  tickets: ReactNode
  calculator: ReactNode
}) {
  const wrap = useRef<HTMLElement>(null)

  useScrollScene(wrap, ({ gsap, reduced }) => {
    const root = wrap.current
    if (reduced || !root) return
    const mm = gsap.matchMedia()
    mm.add(PIN, () => pinned(gsap, root, locale))
    mm.add(`not all and ${PIN}`, () => inFlow(gsap, root, locale))
    return () => mm.revert()
  })

  return (
    <section ref={wrap} id="savings" data-chapter="savings" className="lp-stage relative z-10 bg-night px-5 py-28 text-foam md:px-10 md:py-40 lg:pl-24">
      <div className="lp-stage-frame">
        {header}
        <div className="lp-stage-swap mt-16 md:mt-20">
          {tickets}
          <div data-s="calc" className="mt-20 md:mt-28">
            {calculator}
          </div>
        </div>
      </div>
    </section>
  )
}
