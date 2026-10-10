'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LanguageToggle } from './LanguageToggle'
import { btnPrimary } from './ui'

interface Props {
  links: { href: string; label: string }[]
  cta: { href: string; label: string }
  openLabel: string
  closeLabel: string
}

/** Hamburger menu for the public pages on small screens. */
export function MobileNav({ links, cta, openLabel, closeLabel }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-xl text-white transition hover:bg-white/10"
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open ? (
        <div id="mobile-nav" className="absolute inset-x-0 top-full border-t border-white/10 bg-navy-900/95 px-5 pb-6 pt-3 shadow-pop backdrop-blur-xl">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center border-b border-white/10 font-display text-lg font-semibold text-white/90"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3">
            <LanguageToggle onDark />
            <Link href={cta.href} onClick={() => setOpen(false)} className={btnPrimary}>
              {cta.label}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
