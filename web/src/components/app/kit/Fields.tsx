import clsx from 'clsx'
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { label as labelClass } from './styles'

export interface Row {
  label: ReactNode
  value: ReactNode
  /** a line under the value: who, when, why */
  note?: ReactNode
  /** sums and totals get a rule above and a heavier value */
  total?: boolean
}

/**
 * Facts as label and value, one per line, the label in the form's small capitals. Lines with nothing to say are
 * skipped by the caller, never shown as a dash wall.
 */
export function Facts({ rows, className }: { rows: Row[]; className?: string }) {
  return (
    // side by side only when the panel itself is wide enough; a narrow side panel stacks label over value
    <dl className={clsx('@container divide-y divide-hair', className)}>
      {rows.map((row, i) => (
        <div key={i} className={clsx('grid gap-x-6 gap-y-1 px-5 py-3 @lg:grid-cols-[minmax(9rem,13rem)_minmax(0,1fr)]', row.total && 'border-t border-ink/70')}>
          <dt className={clsx(labelClass, 'pt-[3px]')}>{row.label}</dt>
          <dd className={clsx('min-w-0 break-words', row.total ? 'font-medium text-ink' : 'text-ink')}>
            {row.value}
            {row.note ? <span className="mt-0.5 block text-[13px] text-muted">{row.note}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A form field: label, the control, then a hint or the error. The control is told which text describes it. */
export function FormField({ label, htmlFor, hint, error, children, className }: { label: ReactNode; htmlFor: string; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  const noteId = `${htmlFor}-note`
  const note = error ?? hint
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
      </label>
      {control}
      {note ? (
        <p id={noteId} className={clsx('mt-1.5 text-[13px] leading-snug', error ? 'text-bad-ink' : 'text-muted')}>
          {note}
        </p>
      ) : null}
    </div>
  )
}
