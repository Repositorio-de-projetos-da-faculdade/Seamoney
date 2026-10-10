'use client'

import clsx from 'clsx'
import { useRef } from 'react'
import { Lede } from '../lede/Lede'
import { useScrollScene, type SceneTools } from '../motion'
import { Reveal } from '../Reveal'
import { ChapterTag, displayL } from '../type'
import { Checks } from './Checks'
import type { ReconcileCopy } from './copy'
import { EventLog } from './EventLog'
import { InvoiceSheet } from './InvoiceSheet'
import { Outcomes } from './Outcomes'
import { Stamp } from './Stamp'

type Gsap = SceneTools['gsap']

// One scrubbed timeline across the chapter: the invoice arrives, the event prints line by line, the five checks
// tick, the stamp slams down and the paper jolts, then the outcomes appear. Desktop pins the stage; phones play it
// in the normal flow with a shorter trigger window.
function scene(gsap: Gsap, root: HTMLElement, trigger: { start: string; end: string }) {
  const q = (sel: string) => root.querySelectorAll(`[data-r="${sel}"]`)
  return gsap
    .timeline({ scrollTrigger: { trigger: root, scrub: 0.5, ...trigger } })
    .fromTo(q('sheet'), { y: 140, rotate: 5, opacity: 0 }, { y: 0, rotate: -2, opacity: 1, duration: 0.12 }, 0)
    .fromTo(q('log'), { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.08 }, 0.1)
    .fromTo(q('line'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.04, stagger: 0.045 }, 0.16)
    .fromTo(q('fill'), { scaleX: 0 }, { scaleX: 1, duration: 0.05, stagger: 0.06 }, 0.45)
    .fromTo(q('tick'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.03, stagger: 0.06 }, 0.48)
    .fromTo(q('stamp'), { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.07, ease: 'power4.in' }, 0.78)
    .fromTo(q('sheet'), { x: 0, y: 0 }, { x: 5, y: 3, duration: 0.01, yoyo: true, repeat: 3, ease: 'none' }, 0.85)
    .fromTo(q('outcome'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.08, stagger: 0.04 }, 0.88)
}

export function ReconcileStage({ copy }: { copy: ReconcileCopy }) {
  const wrap = useRef<HTMLElement>(null)

  // Reduced motion skips the scene: the layout below is already the final state.
  useScrollScene(wrap, ({ gsap, reduced }) => {
    const root = wrap.current
    if (reduced || !root) return
    // the paper comes up as a sheet with rounded corners and opens out to the full width
    gsap.fromTo(
      root,
      { clipPath: 'inset(0% 5% 0% 5% round 36px 36px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'top top', scrub: true } },
    )
    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px)', () => {
      scene(gsap, root, { start: 'top top', end: 'bottom bottom' })
    })
    mm.add('(max-width: 767px)', () => {
      scene(gsap, root, { start: 'top 70%', end: 'bottom 60%' })
    })
    return () => mm.revert()
  })

  return (
    <section
      ref={wrap}
      id="arrival"
      data-chapter="arrival"
      aria-labelledby="recon-title"
      className="lp-paper relative z-10 overflow-x-clip text-ink md:h-[320vh]"
    >
      <div className="grid gap-12 px-5 py-24 md:sticky md:top-0 md:h-[100svh] md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-center md:gap-10 md:overflow-hidden md:px-10 md:py-0 lg:pl-24">
        <div className="space-y-7 md:pt-14">
          <div>
            <ChapterTag n={4} name={copy.chapter} className="text-ink/55 [&>span:first-child]:text-brand-600" />
            <Reveal id="recon-title" text={copy.title} className={clsx(displayL, 'mt-5 !text-[clamp(2.4rem,4.6vw,5rem)]')} />
          </div>
          <Lede tone="paper" size="md" text={copy.body} />
          <Checks copy={copy} />
          <Outcomes copy={copy} />
        </div>

        <div className="relative flex justify-center md:h-[min(78svh,48rem)] md:pt-14">
          <div className="relative w-full md:h-full md:w-auto">
            <InvoiceSheet copy={copy} className="w-full md:h-full md:w-auto">
              <Stamp label={copy.stamp} invoiceNo={copy.invoiceNo} />
            </InvoiceSheet>
            {/* hangs off the sheet's lower left corner, clear of the total */}
            <div className="mt-8 md:absolute md:-left-32 md:bottom-[-3%] md:mt-0 md:w-[19rem]">
              <EventLog copy={copy} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
