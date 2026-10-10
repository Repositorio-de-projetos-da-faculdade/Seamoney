import clsx from 'clsx'
import type { ReactNode } from 'react'
import { label as labelClass } from '../type'

/**
 * A numbered field of the declaration form: a ruled head with its number and name, then its content. The rule is
 * drawn in on scroll by the Declaration wrapper.
 */
export function Box({ n, label, tone = 'mint', className, children }: { n: string; label: string; tone?: 'mint' | 'signal'; className?: string; children: ReactNode }) {
  const signal = tone === 'signal'
  return (
    <div className={className}>
      <p className={clsx(labelClass, 'relative flex items-baseline gap-4 pt-4', signal ? 'text-signal' : 'text-foam/70')}>
        <span data-rule aria-hidden="true" className={clsx('absolute inset-x-0 top-0 h-px origin-left', signal ? 'bg-signal/70' : 'bg-foam/25')} />
        <span className={signal ? 'text-signal' : 'text-mint'}>{n}</span>
        <span>{label}</span>
      </p>
      <div className="mt-6">{children}</div>
    </div>
  )
}
