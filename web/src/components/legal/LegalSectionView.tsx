import clsx from 'clsx'
import { label } from '../landing/type'
import type { LegalSection } from './types'

const text = 'font-text text-[16px] leading-[1.7] text-ink/80'

/** One numbered section of a legal document: its heading, then paragraphs and lists. */
export function LegalSectionView({ section, n }: { section: LegalSection; n: number }) {
  return (
    <section id={section.id} className="scroll-mt-24 border-t border-ink/15 pt-8">
      <p className={clsx(label, 'text-ink/45')}>{String(n).padStart(2, '0')}</p>
      <h2 className="mt-2 font-grotesk text-[1.5rem] font-normal tracking-[-0.025em] text-ink">{section.heading}</h2>
      <div className="mt-4 space-y-4">
        {section.blocks.map((block, i) =>
          typeof block === 'string' ? (
            <p key={i} className={text}>
              {block}
            </p>
          ) : (
            <ul key={i} className="space-y-2.5">
              {block.list.map((item) => (
                <li key={item} className={clsx(text, 'grid grid-cols-[1.25rem_minmax(0,1fr)]')}>
                  <span aria-hidden="true" className="mt-[0.7em] size-1.5 rotate-45 bg-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
          ),
        )}
      </div>
    </section>
  )
}
