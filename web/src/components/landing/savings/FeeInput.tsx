'use client'

import { useState } from 'react'
import type { Locale } from '@/lib/format'

export const FEE = { min: 0.5, max: 6 } as const

/** Bank fee as a percentage. The text is kept as typed so the field never fights the user; the value is committed when valid. */
export function FeeInput({
  id,
  label,
  hint,
  value,
  locale,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  locale: Locale
  onChange: (value: number) => void
}) {
  const format = (n: number) => n.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const [text, setText] = useState(() => format(value))
  const [invalid, setInvalid] = useState(false)

  const parse = (raw: string) => {
    const n = Number(raw.replace(',', '.').trim())
    return raw.trim() !== '' && Number.isFinite(n) ? n : null
  }

  const handleChange = (raw: string) => {
    setText(raw)
    const n = parse(raw)
    const ok = n !== null && n >= FEE.min && n <= FEE.max
    setInvalid(!ok)
    if (ok) onChange(n)
  }

  const handleBlur = () => {
    const n = parse(text)
    const clamped = n === null ? value : Math.min(FEE.max, Math.max(FEE.min, n))
    setText(format(clamped))
    setInvalid(false)
    onChange(clamped)
  }

  return (
    <div>
      <label htmlFor={id} className="block max-w-[34ch] font-text text-[15px] leading-snug text-foam/75">
        {label}
      </label>
      <div className="mt-4 flex w-fit items-baseline gap-2 border-b border-foam/30 pb-1 transition-colors focus-within:border-mint hover:border-foam/60 has-[[aria-invalid=true]]:border-signal">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="w-[3.6ch] min-w-[1.5ch] bg-transparent field-sizing-content supports-[field-sizing:content]:w-auto font-grotesk text-[clamp(2.2rem,4vw,3.4rem)] font-light leading-none tracking-[-0.045em] text-white tabular-nums caret-mint focus-visible:outline-none"
        />
        <span className="font-grotesk text-[clamp(1.4rem,2.4vw,2rem)] font-light text-foam/50" aria-hidden="true">
          %
        </span>
      </div>
      <p id={`${id}-hint`} className="mt-4 max-w-[46ch] font-text text-[13px] leading-relaxed text-foam/50">
        {hint}
      </p>
    </div>
  )
}
