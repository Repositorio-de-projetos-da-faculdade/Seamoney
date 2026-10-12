import clsx from 'clsx'
import { label } from '../type'

/** "Source ↗" to the official page a statement comes from (in a new tab), or to a chapter of this page. */
export function SourceLink({ href, text, tone = 'night' }: { href: string; text: string; tone?: 'night' | 'paper' }) {
  return (
    <a
      href={href}
      // a link within the page (the calculator) stays in this tab
      {...(href.startsWith('#') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className={clsx(
        label,
        'inline-flex items-center gap-1.5 underline decoration-1 underline-offset-[5px] transition-colors',
        tone === 'paper' ? 'text-ink/60 decoration-ink/25 hover:text-ink' : 'text-foam/55 decoration-foam/25 hover:text-white',
      )}
    >
      {text}
      <span aria-hidden="true">{href.startsWith('#') ? '↓' : '↗'}</span>
    </a>
  )
}
