import clsx from 'clsx'
import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MARK, WORDMARK } from '@/lib/brand-paths'

/* ------------------------------ brand ------------------------------ */

type Surface = 'onDark' | 'onLight'
const ink: Record<Surface, { white: string; green: string }> = {
  onDark: { white: '#ffffff', green: '#24e4b4' },
  onLight: { white: '#0b2540', green: '#10b894' },
}

/** The "S" mark, traced from the official logo. */
export function LogoMark({ size = 32, tone = 'onDark' }: { size?: number; tone?: Surface }) {
  const c = ink[tone]
  return (
    <svg width={(size * MARK.width) / MARK.height} height={size} viewBox={`0 0 ${MARK.width} ${MARK.height}`} aria-hidden="true">
      <path d={MARK.green} fill={c.green} fillRule="evenodd" />
      <path d={MARK.white} fill={c.white} fillRule="evenodd" />
    </svg>
  )
}

/** Mark + wordmark, traced from the official logo. `height` is the height of the whole lockup. */
export function Logo({ tone = 'onDark', height = 30, className }: { tone?: Surface; height?: number; className?: string }) {
  const c = ink[tone]
  return (
    <svg
      width={(height * WORDMARK.width) / WORDMARK.height}
      height={height}
      viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
      role="img"
      aria-label="Seamoney"
      className={className}
    >
      <path d={WORDMARK.green} fill={c.green} fillRule="evenodd" />
      <path d={WORDMARK.white} fill={c.white} fillRule="evenodd" />
    </svg>
  )
}

/* ------------------------------ controls ------------------------------ */

export const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 font-display text-[15px] font-bold tracking-tight transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px'
export const btnPrimary = clsx(
  btn,
  'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-button hover:from-brand-600 hover:to-brand-700 hover:shadow-[0_8px_22px_-8px_rgb(7_128_96/0.7)]',
)
export const btnOutline = clsx(btn, 'border border-line bg-white text-ink shadow-sm hover:border-brand-500/40 hover:bg-brand-50')
export const btnOnDark = clsx(btn, 'border border-white/20 bg-white/5 text-white backdrop-blur hover:border-white/40 hover:bg-white/10')
export const btnLight = clsx(btn, 'bg-white text-navy-900 shadow-sm hover:bg-brand-50')

export const input =
  'block min-h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink shadow-[0_1px_0_rgb(0_29_56/0.03)] transition placeholder:text-muted/60 hover:border-navy-500/30 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  )
}

/* ------------------------------ surfaces ------------------------------ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('min-w-0 rounded-card border border-line bg-white shadow-card', className)}>{children}</div>
}

/** Frosted panel for use over the dark hero and ship imagery. */
export function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('rounded-[22px] border border-white/15 bg-navy-900/55 shadow-pop backdrop-blur-xl', className)}>{children}</div>
  )
}

/** Icon on a soft brand-tinted tile. */
export function IconTile({ icon: Icon, tone = 'brand', size = 44 }: { icon: LucideIcon; tone?: 'brand' | 'dark' | 'aqua'; size?: number }) {
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center rounded-2xl',
        tone === 'brand' && 'bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-500/15',
        tone === 'dark' && 'bg-white/10 text-aqua ring-1 ring-white/15',
        tone === 'aqua' && 'bg-gradient-to-br from-aqua/25 to-mint/10 text-aqua ring-1 ring-aqua/30',
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.46)} aria-hidden="true" />
    </span>
  )
}

export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide',
        onDark ? 'bg-white/10 text-aqua ring-1 ring-white/15' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-500/15',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', onDark ? 'bg-mint' : 'bg-brand-500')} aria-hidden="true" />
      {children}
    </p>
  )
}

/* ------------------------------ feedback ------------------------------ */

type Tone = 'ok' | 'warn' | 'info' | 'bad'
const tones: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-ink',
  warn: 'bg-warn-bg text-warn-ink',
  info: 'bg-info-bg text-info-ink',
  bad: 'bg-bad-bg text-bad-ink',
}

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', tones[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  )
}

const noticeIcon: Record<Tone, LucideIcon> = { ok: CircleCheck, warn: TriangleAlert, info: Info, bad: TriangleAlert }

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const Icon = noticeIcon[tone]
  return (
    <div role="status" className={clsx('flex gap-3 rounded-xl px-4 py-3.5 text-sm leading-relaxed', tones[tone])}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('h-5 w-5 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
