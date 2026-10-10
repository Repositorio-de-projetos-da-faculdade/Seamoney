'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { MEMO_SIZE, type MemoByte } from '@/lib/memo'
import { motion, prefersReducedMotion } from '../motion'
import type { VoyageScene } from './scene/createScene'
import { shots, type Shot } from './scene/shots'

export const READY_EVENT = 'seamoney:scene-ready'

// Scroll lengths of the three voyage sections, in viewport heights. VoyageStage uses the same numbers for the
// section heights, so the camera timeline lines up with what is on screen.
export const LENGTH = { hero: 100, cargo: 340, speed: 280 }

/** How many memo containers have landed for a load progress (mirrors the drop windows in scene/cargo.ts). */
export const landedCount = (load: number) => {
  let n = 0
  for (let i = 0; i < MEMO_SIZE; i++) if (load >= (i / MEMO_SIZE) * 0.78 + 0.16) n = i + 1
  return n
}

type ShotName = keyof ReturnType<typeof shots>

interface Options {
  root: RefObject<HTMLElement | null>
  canvas: RefObject<HTMLCanvasElement | null>
  /** HUD brackets that follow the memo tier on screen while the camera looks down on the deck. */
  frame: RefObject<HTMLElement | null>
  bytes: MemoByte[]
  /** Called with how many memo containers have landed, as the visitor scrolls. */
  onLanded: (count: number) => void
}

/**
 * Creates the WebGL scene (lazily: three.js is its own chunk) and drives it from the scroll position: the hero
 * shot, top-down over the cargo while the memo is loaded, water level for the speed chapter, then away. The
 * finale section (#finale) brings the camera back for the ship sailing off. Rendering pauses off screen.
 */
export function useVoyage({ root, canvas, frame, bytes, onLanded }: Options) {
  const scene = useRef<VoyageScene | null>(null)
  const [failed, setFailed] = useState(false)
  const firstBytes = useRef(bytes)
  const landed = useRef(onLanded)

  useEffect(() => {
    landed.current = onLanded
  }, [onLanded])

  useEffect(() => {
    const el = canvas.current
    const section = root.current
    const hud = frame.current
    if (!el || !section) return
    const { gsap, ScrollTrigger } = motion()
    const reduced = prefersReducedMotion()
    const finale = document.getElementById('finale')
    let all = shots(window.innerWidth / window.innerHeight)
    const cam: Shot = { ...all.hero }
    const progress = { load: reduced ? 1 : 0 }
    const on = { voyage: true, finale: false }
    let disposed = false

    const apply = () => scene.current?.setShot(cam)
    const cut = (name: ShotName) => {
      Object.assign(cam, all[name])
      apply()
    }
    // end values as functions, so a resize (new aspect, new framing) is picked up on refresh
    const to = (name: ShotName) =>
      Object.fromEntries((Object.keys(all.hero) as (keyof Shot)[]).map((k) => [k, () => all[name][k]])) as unknown as Shot
    const activate = () => scene.current?.setActive(on.voyage || on.finale)
    const showHud = (visible: boolean) => hud && gsap.set(hud, { autoAlpha: visible ? 1 : 0 })

    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: (s) => ((on.voyage = s.isActive), activate()) })
      if (finale) ScrollTrigger.create({ trigger: finale, start: 'top bottom', end: 'bottom top', onToggle: (s) => ((on.finale = s.isActive), activate()) })

      if (reduced) {
        // no camera moves: cut between still shots as each chapter comes in
        const cargo = section.querySelector('[data-chapter="cargo"]')
        const speed = section.querySelector('[data-chapter="speed"]')
        if (cargo)
          ScrollTrigger.create({
            trigger: cargo,
            start: 'top center',
            onEnter: () => (cut('cargo'), showHud(true)),
            onLeaveBack: () => (cut('hero'), showHud(false)),
          })
        if (speed)
          ScrollTrigger.create({
            trigger: speed,
            start: 'top center',
            onEnter: () => (cut('speed'), showHud(false)),
            onLeaveBack: () => (cut('cargo'), showHud(true)),
          })
        if (finale) ScrollTrigger.create({ trigger: finale, start: 'top center', onEnter: () => cut('finale'), onLeaveBack: () => cut('speed') })
        return
      }

      const total = LENGTH.hero + LENGTH.cargo + LENGTH.speed - 100
      const speedAt = LENGTH.hero + LENGTH.cargo
      const tl = gsap
        .timeline({
          defaults: { ease: 'power2.inOut', onUpdate: apply },
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1.1, invalidateOnRefresh: true },
        })
        .to(cam, { ...to('cargo'), duration: LENGTH.hero }, 0)
        .to(
          progress,
          {
            load: 1,
            ease: 'none',
            duration: 190,
            onUpdate: () => {
              scene.current?.setLoad(progress.load)
              landed.current(landedCount(progress.load))
            },
          },
          LENGTH.hero + 20,
        )
        .to(cam, { ...to('speed'), duration: 100 }, speedAt - 100)
        .to(cam, { px: () => all.speed.px - 34, pz: () => all.speed.pz + 12, duration: 120, ease: 'none' }, speedAt)
        .to(cam, { ...to('away'), duration: total - speedAt - 120 }, speedAt + 120)
      // the brackets frame the memo tier once the camera looks straight down, and let go as it pulls away
      if (hud)
        tl.fromTo(hud, { autoAlpha: 0 }, { autoAlpha: 1, duration: 16, ease: 'none' }, LENGTH.hero - 8).to(
          hud,
          { autoAlpha: 0, duration: 16, ease: 'none' },
          speedAt - 104,
        )

      if (finale)
        gsap.fromTo(cam, { ...to('away') }, {
          ...to('finale'),
          ease: 'power1.out',
          immediateRender: false,
          onUpdate: apply,
          scrollTrigger: { trigger: finale, start: 'top bottom', end: 'bottom bottom', scrub: 1.1, invalidateOnRefresh: true },
        })
    }, section)

    if (reduced) landed.current(MEMO_SIZE)

    import('./scene/createScene')
      .then(({ createVoyageScene }) => createVoyageScene(el, firstBytes.current, reduced))
      .then((s) => {
        if (disposed) return s.dispose()
        scene.current = s
        s.setLoad(progress.load)
        if (hud)
          s.setOverlay((r) => {
            hud.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0)`
            hud.style.width = `${r.w.toFixed(1)}px`
            hud.style.height = `${r.h.toFixed(1)}px`
          })
        apply()
        activate()
        window.dispatchEvent(new Event(READY_EVENT))
      })
      .catch(() => {
        setFailed(true)
        window.dispatchEvent(new Event(READY_EVENT))
      })

    // on a mouse or trackpad the camera leans towards the pointer (not for touch, not for reduced motion)
    const onPointer = (e: PointerEvent) =>
      scene.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    const leans = !reduced && window.matchMedia('(pointer: fine)').matches
    if (leans) window.addEventListener('pointermove', onPointer, { passive: true })

    // ScrollTrigger refreshes itself on resize and re-reads the function-based shot values
    const onResize = () => {
      all = shots(window.innerWidth / window.innerHeight)
      scene.current?.resize()
    }
    window.addEventListener('resize', onResize)
    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      ctx.revert()
      scene.current?.dispose()
      scene.current = null
    }
  }, [root, canvas, frame])

  useEffect(() => {
    scene.current?.setBytes(bytes)
  }, [bytes])

  return { failed }
}
