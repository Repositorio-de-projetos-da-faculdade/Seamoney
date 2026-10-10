import clsx from 'clsx'
import type { Locale } from '@/lib/format'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/** One rolling column: a strip of digits 0-9 that slides to the current one. */
function Column({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] overflow-hidden align-top">
      <span
        className="flex flex-col transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translate3d(0, -${digit}em, 0)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] text-center leading-[1]">
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

/** A giant rolling number. Digits are split from Intl parts so currency, separators and sign stay correct per locale. */
export function Odometer({ value, locale, className }: { value: number; locale: Locale; className?: string }) {
  const parts = new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).formatToParts(Math.abs(value))
  const negative = value < 0

  return (
    <span aria-hidden="true" className={clsx('inline-flex items-baseline whitespace-nowrap font-grotesk font-light tabular-nums leading-[0.9] tracking-[-0.05em]', className)}>
      {negative && <span>-</span>}
      {parts.map((part, i) =>
        part.type === 'integer' ? (
          [...part.value].map((ch, j, all) => <Column key={`${i}-${all.length - j}`} digit={Number(ch)} />)
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  )
}
