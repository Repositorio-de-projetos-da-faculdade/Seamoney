'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import type { Key } from '@/lib/i18n/dict'

// The voyage's log, fixed on the left edge: the five chapters as a numbered scale (they are a sequence), the current
// one lit, a hairline track with the ship's position between Santos and Shenzhen, and its coordinates.

const CHAPTERS: { id: string; label: Key }[] = [
  { id: 'cargo', label: 'lp.ch.1' },
  { id: 'speed', label: 'lp.ch.2' },
  { id: 'route', label: 'lp.ch.3' },
  { id: 'arrival', label: 'lp.ch.4' },
  { id: 'savings', label: 'lp.ch.5' },
]

const SANTOS = { lat: -23.96, lon: -46.33 }
const SHENZHEN = { lat: 22.53, lon: 114.06 }

function dms(value: number, pos: string, neg: string) {
  const a = Math.abs(value)
  const d = Math.floor(a)
  const m = Math.floor((a - d) * 60)
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}′${value >= 0 ? pos : neg}`
}

export function ChapterRail() {
  const { t } = useT()
  const [active, setActive] = useState(-1)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const sections = CHAPTERS.map((c) => document.querySelector<HTMLElement>(`[data-chapter="${c.id}"]`))
    let frame = 0
    const update = () => {
      frame = 0
      const mid = window.innerHeight * 0.5
      let current = -1
      sections.forEach((s, i) => {
        if (s && s.getBoundingClientRect().top < mid) current = i
      })
      setActive(current)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // a straight-line interpolation is enough for a position readout; the route chapter draws the real paths
  const lat = SANTOS.lat + (SHENZHEN.lat - SANTOS.lat) * progress
  const lon = SANTOS.lon + (SHENZHEN.lon - SANTOS.lon) * progress
  const visible = active >= 0
  // over the paper chapter the rail is inked, not lit
  const paper = CHAPTERS[active]?.id === 'arrival'

  return (
    <nav
      aria-label={t('lp.rail')}
      className={clsx(
        'pointer-events-none fixed bottom-8 left-5 top-28 z-40 hidden w-12 flex-col gap-6 transition-opacity duration-700 lg:flex xl:left-7',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <ol className="pointer-events-auto">
        {CHAPTERS.map((c, i) => {
          const on = i === active
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={on ? 'step' : undefined}
                className={clsx(
                  'group relative flex items-center gap-2 py-1.5 font-data text-[10px] tabular-nums tracking-[0.06em] transition-colors duration-500',
                  on ? (paper ? 'text-brand-600' : 'text-mint') : paper ? 'text-ink/35 hover:text-ink/80' : 'text-foam/35 hover:text-foam/80',
                )}
              >
                {String(i + 1).padStart(2, '0')}
                <span
                  className={clsx('h-px bg-current transition-[width] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]', on ? 'w-5' : 'w-2 group-hover:w-4')}
                  aria-hidden="true"
                />
                {/* the chapter name shows on hover, on a dark tab so it reads over any scene */}
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap bg-abyss/85 px-2 py-1 uppercase text-foam opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {t(c.label)}
                </span>
              </a>
            </li>
          )
        })}
      </ol>

      {/* the ship's position along the whole page */}
      <div className={clsx('relative ml-[3px] w-px flex-1 transition-colors duration-500', paper ? 'bg-ink/15' : 'bg-foam/12')} aria-hidden="true">
        <span className={clsx('absolute inset-x-0 top-0', paper ? 'bg-brand-600/60' : 'bg-mint/60')} style={{ height: `${progress * 100}%` }} />
        <span
          className={clsx('absolute left-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 border', paper ? 'border-brand-600 bg-paper' : 'border-mint bg-abyss')}
          style={{ top: `${progress * 100}%` }}
        />
      </div>

      <p
        className={clsx('font-data text-[10px] leading-relaxed tracking-[0.06em] transition-colors duration-500 [writing-mode:vertical-rl] rotate-180 tabular-nums', paper ? 'text-ink/50' : 'text-foam/45')}
        aria-hidden="true"
      >
        {dms(lat, 'N', 'S')} {dms(lon, 'E', 'W')}
      </p>
    </nav>
  )
}
