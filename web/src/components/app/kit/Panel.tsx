import clsx from 'clsx'
import type { ReactNode } from 'react'
import { heading } from './styles'

/** A sheet of paper on the desk. Every group of related information sits on one. */
export function Panel({ children, className, as: Tag = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <Tag className={clsx('border border-rule bg-sheet', className)} {...rest}>
      {children}
    </Tag>
  )
}

/** The head of a panel: what this group is, an optional line about it, and what you can do here. */
export function PanelHead({ title, meta, action, id }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-rule px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className={heading}>
          {title}
        </h2>
        {meta ? <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{meta}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

/** An aside inside a panel: an explanation, a caveat, a warning. Simulated things get their own <Simulated>. */
export function Note({ tone = 'info', children, className }: { tone?: 'info' | 'ok' | 'warn' | 'bad'; children: ReactNode; className?: string }) {
  return (
    <p
      className={clsx(
        'border-l-2 py-0.5 pl-3 text-[13.5px] leading-relaxed',
        tone === 'info' && 'border-info-ink/50 text-ink/80',
        tone === 'ok' && 'border-brand-600 text-ok-ink',
        tone === 'warn' && 'border-signal text-warn-ink',
        tone === 'bad' && 'border-bad-ink text-bad-ink',
        className,
      )}
    >
      {children}
    </p>
  )
}

/** What an empty list says: what goes here, and the way to fill it. */
export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-grotesk text-[18px] tracking-[-0.02em] text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-muted">{children}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
