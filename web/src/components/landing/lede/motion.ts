import type gsap from 'gsap'

// The reading of a Lede as one timeline: words come up out of the dark one after another, and each glyph does its
// own small thing when the reading reaches it. Times are in "beats"; the caller plays it (opening) or scrubs it.

const BEAT = 0.06
const HEX = '0123456789ABCDEF'

/** What each glyph does when it is reached (see lede/glyphs.tsx). */
function glyph(g: typeof gsap, el: Element): gsap.core.Timeline {
  const tl = g.timeline()
  const q = (sel: string) => el.querySelectorAll(sel)
  tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: BEAT * 2 }, 0)
  switch (el.getAttribute('data-g')) {
    case 'memo':
    case 'event': {
      const text = el.querySelector('[data-scramble]')
      if (text) tl.to(text, { scrambleText: { text: text.textContent ?? '', chars: HEX, speed: 0.6 }, duration: BEAT * 8, ease: 'none' }, 0)
      break
    }
    case 'route':
      tl.fromTo(q('[data-draw]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: BEAT * 6, ease: 'power2.inOut' }, 0)
        .fromTo(q('[data-end]'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: BEAT * 3, ease: 'back.out(3)' }, BEAT * 5)
        .fromTo(q('[data-travel]'), { opacity: 0 }, { opacity: 1, duration: BEAT * 2 }, BEAT * 6)
      break
    case 'hops':
      tl.fromTo(q('[data-draw]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: BEAT * 6, ease: 'none' }, 0)
        .fromTo(q('[data-hop]'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: BEAT * 2, ease: 'back.out(3)', stagger: BEAT * 2.5 }, 0)
      break
    case 'check':
      tl.fromTo(q('[data-draw]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: BEAT * 4, ease: 'power2.out', stagger: BEAT * 3 }, 0)
      break
    case 'bytes':
    case 'five':
      tl.fromTo(q('[data-cell="used"]'), { opacity: 0.15, scaleY: 0.3 }, { opacity: 1, scaleY: 1, duration: BEAT, stagger: BEAT * 0.6 }, 0)
      break
  }
  return tl
}

export function buildReading(g: typeof gsap, root: HTMLElement, tl: gsap.core.Timeline) {
  root.querySelectorAll('[data-w], [data-g]').forEach((el, i) => {
    const at = i * BEAT
    if (el.hasAttribute('data-w')) {
      tl.fromTo(el, { opacity: 0.14, yPercent: 30, filter: 'blur(3px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: BEAT * 5, ease: 'power2.out' }, at)
    } else {
      tl.add(glyph(g, el), at)
    }
  })
  return tl
}

/** The route glyph's payment loops on SMIL; it waits for the reading, and never runs for reduced motion. */
export function pauseLoops(root: HTMLElement, paused: boolean) {
  root.querySelectorAll('svg[data-g]').forEach((svg) => {
    const s = svg as SVGSVGElement
    if (paused) s.pauseAnimations()
    else s.unpauseAnimations()
  })
}
