'use client'

import clsx from 'clsx'
import { useEffect, useState, type ReactNode } from 'react'

/**
 * The landing header's behaviour: transparent over the opening shot, a dark glass bar once the page moves, tucked
 * away while the visitor scrolls down through a scene and back as soon as they scroll up (or tab into it).
 */
export function NavShell({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ scrolled: false, hidden: false })

  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - last
      last = y
      setState((s) => {
        const scrolled = y > 24
        const hidden = y > 200 && (delta > 3 ? true : delta < -3 ? false : s.hidden)
        return s.scrolled === scrolled && s.hidden === hidden ? s : { scrolled, hidden }
      })
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <header
      onFocusCapture={() => setState((s) => (s.hidden ? { ...s, hidden: false } : s))}
      className={clsx(
        'fixed inset-x-0 top-0 z-50 border-b transition-[translate,background-color,border-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]',
        state.hidden && '-translate-y-full',
        state.scrolled ? 'border-foam/10 bg-abyss/75 backdrop-blur-md' : 'border-transparent',
      )}
    >
      {children}
    </header>
  )
}
