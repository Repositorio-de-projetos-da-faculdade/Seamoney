import clsx from 'clsx'
import type { Key } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { label } from '../type'
import { Chapter } from './Chapter'
import { RULES } from './facts'
import { SourceLink } from './SourceLink'

/**
 * Chapter 07, on paper: the rules the route has to live within, each with what it sets, what it means for Seamoney
 * and a link to the official text. What is still simulated is told in the roadmap (Business.tsx).
 */
export function Rules({ t }: { t: T }) {
  return (
    <Chapter id="rules" n={7} name={t('lp.ch.7')} title={t('lp.law.title')} body={t('lp.law.body')} tone="paper">
      <ol className="max-w-[64rem] divide-y divide-ink/15 border-y border-ink/15">
        {RULES.map((r, i) => (
          <li key={r.id} className="grid gap-4 py-7 md:grid-cols-[3rem_minmax(0,16rem)_minmax(0,1fr)] md:gap-8">
            <span className={clsx(label, 'text-ink/40')}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="font-grotesk text-[1.35rem] tracking-[-0.02em] text-ink">{t(`lp.law.${r.id}.name` as Key)}</h3>
              <p className={clsx(label, 'mt-2 text-ink/50')}>{t(`lp.law.${r.id}.date` as Key)}</p>
            </div>
            <div className="space-y-3">
              <p className="font-text text-[15.5px] leading-relaxed text-ink/80">{t(`lp.law.${r.id}.what` as Key)}</p>
              <p className="font-text text-[15.5px] leading-relaxed text-ink">
                <span className="font-semibold">{t('lp.law.forUs')} </span>
                {t(`lp.law.${r.id}.us` as Key)}
              </p>
              <SourceLink href={r.href} text={t('lp.src.official')} tone="paper" />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-[64rem] font-text text-[15px] leading-relaxed text-ink/70">{t('lp.law.note')}</p>
    </Chapter>
  )
}
