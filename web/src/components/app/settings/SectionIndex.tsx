'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { label } from '../kit/styles'

export type SectionLink = { id: string; label: string }

/** Sticky "On this page" index for wide screens. Highlights the section in view. */
export function SectionIndex({ sections }: { sections: SectionLink[] }) {
  const { t } = useT()
  const [active, setActive] = useState(sections[0]?.id)
  const ids = sections.map((s) => s.id).join(',')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = ids
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries.find((e) => e.isIntersecting)
        if (first) setActive(first.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])

  return (
    <nav aria-label={t('app.set.onThisPage')} className="sticky top-8 hidden self-start lg:block">
      <p className={label}>{t('app.set.onThisPage')}</p>
      <ul className="mt-3 space-y-0.5">
        {sections.map((s) => {
          const on = active === s.id
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={on ? 'location' : undefined}
                className={`block border-l-2 py-1.5 pl-3 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint ${on ? 'border-brand-600 font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
              >
                {s.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
