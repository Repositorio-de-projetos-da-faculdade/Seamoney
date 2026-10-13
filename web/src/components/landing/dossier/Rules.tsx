import clsx from 'clsx'
import type { Key } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { label } from '../type'
import { Chapter } from './Chapter'
import { RULES } from './facts'
import { SourceLink } from './SourceLink'

/**
 * Chapter 07, on paper: the rules the route has to live within, each with what it sets, what it means for Seamoney
 * and a link to the official text. Then what is real and what is simulated.
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
      <div className="mt-10 grid max-w-[64rem] gap-6 md:grid-cols-2">
        <div className="border border-ink/15 bg-paper-hi p-6">
          <p className={clsx(label, 'text-brand-600')}>{t('lp.law.real.title')}</p>
          <p className="mt-3 font-text text-[15px] leading-relaxed text-ink/80">{t('lp.law.real.body')}</p>
        </div>
        <div className="border border-signal/50 bg-paper-hi p-6">
          <p className={clsx(label, 'flex items-center gap-2 text-ink')}>
            <span aria-hidden="true" className="size-2 rotate-45 bg-signal" />
            {t('lp.law.sim.title')}
          </p>
          <p className="mt-3 font-text text-[15px] leading-relaxed text-ink/80">{t('lp.law.sim.body')}</p>
        </div>
      </div>
    </Chapter>
  )
}
