'use client'

import clsx from 'clsx'
import { useId, useState } from 'react'

export type StampKind = 'reconciled' | 'review' | 'rejected' | 'cancelled'

// the landing's stamp is brand green; refusals and open cases are red ink, a cancelled order plain graphite
const INK: Record<StampKind, string> = {
  reconciled: '#078060',
  review: '#a12626',
  rejected: '#a12626',
  cancelled: '#55687a',
}

/** "10 OCT 2026": how a date stamp reads. */
export function stampDate(iso: string, locale: 'en' | 'pt') {
  const d = new Date(iso)
  const month = new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-GB', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', '')
  return `${String(d.getUTCDate()).padStart(2, '0')} ${month} ${d.getUTCFullYear()}`.toUpperCase()
}

/**
 * A rubber stamp on the document, like the one on the landing's invoice: double frame, heavy capitals and an ink texture (slightly wobbly edges, gaps where
 * the ink did not take). When it was applied a moment ago it lands with a press; otherwise it is simply there.
 */
export function Stamp({
  kind,
  word,
  lines,
  at,
  rotate = -5,
  className,
}: {
  kind: StampKind
  /** the big word, already translated */
  word: string
  /** one or two short lines under it (date, who, reference) */
  lines: string[]
  /** when it was applied; recent stamps animate in */
  at: string
  rotate?: number
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  // decided once, on first render: stamps applied in the last few seconds press down, older ones are just there
  const [fresh] = useState(() => Date.now() - Date.parse(at) < 4_000)
  const ink = INK[kind]

  return (
    <svg
      viewBox="0 0 230 104"
      role="img"
      aria-label={[word, ...lines].join(', ')}
      className={clsx('h-auto w-[188px] mix-blend-multiply sm:w-[212px]', fresh && 'stamp-press', className)}
      style={{ transform: `rotate(${rotate}deg)`, ['--stamp-rot' as string]: `${rotate}deg` }}
    >
      <defs>
        <filter id={`ink${id}`} x="-4%" y="-6%" width="108%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={kind.length} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="edge" />
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed={kind.length + 4} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.15" result="holes" />
          <feComposite in="edge" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#ink${id})`} opacity="0.86">
        <rect x="3" y="3" width="224" height="98" rx="7" fill="none" stroke={ink} strokeWidth="3.4" />
        <rect x="10" y="10" width="210" height="84" rx="3" fill="none" stroke={ink} strokeWidth="1.3" />
        <text
          x="115"
          y={lines.length > 1 ? 48 : 56}
          textAnchor="middle"
          fill={ink}
          style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 800, fontSize: Math.min(30, 196 / (word.length * 0.78)), letterSpacing: '0.03em' }}
        >
          {word}
        </text>
        {lines.map((line, i) => (
          <text
            key={line}
            x="115"
            y={(lines.length > 1 ? 68 : 78) + i * 15}
            textAnchor="middle"
            fill={ink}
            style={{ fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 10.5, letterSpacing: '0.12em' }}
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  )
}
