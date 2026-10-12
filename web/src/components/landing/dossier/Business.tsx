import clsx from 'clsx'
import type { Key } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { label } from '../type'
import { Chapter } from './Chapter'
import { DOCS, MARKET, MODEL, PHASES, PREREQUISITES } from './facts'
import { SourceLink } from './SourceLink'

/** A titled block of the business chapter. */
function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx('border-t border-foam/15 pt-6', className)}>
      <h3 className={clsx(label, 'text-mint')}>{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/**
 * Chapter 08: the business around the route. How Seamoney earns (what is in the product today and what is a proposal),
 * the market with official figures, what has to exist before real money moves, the roadmap, and the documentation.
 */
export function Business({ t }: { t: T }) {
  return (
    <Chapter id="business" n={8} name={t('lp.ch.8')} title={t('lp.biz.title')} body={t('lp.biz.body')}>
      <div className="grid max-w-[72rem] gap-14 lg:grid-cols-2 lg:gap-x-16">
        <Block title={t('lp.biz.model')}>
          <ul className="space-y-5">
            {MODEL.map((m) => (
              <li key={m.id}>
                <p className="flex flex-wrap items-baseline gap-x-3 font-grotesk text-[1.25rem] tracking-[-0.02em] text-white">
                  {t(`lp.biz.model.${m.id}` as Key)}
                  <span className={clsx(label, m.live ? 'text-mint' : 'text-signal')}>{t(m.live ? 'lp.biz.live' : 'lp.biz.proposal')}</span>
                </p>
                <p className="mt-1.5 font-text text-[15px] leading-relaxed text-foam/75">{t(`lp.biz.model.${m.id}.how` as Key)}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title={t('lp.biz.market')}>
          <ul className="space-y-5">
            {MARKET.map((m) => (
              <li key={m.id}>
                <p className="font-grotesk text-[1.6rem] font-light tabular-nums tracking-[-0.03em] text-white">{t(`lp.biz.market.${m.id}` as Key)}</p>
                <p className="mt-1 font-text text-[15px] leading-relaxed text-foam/75">{t(`lp.biz.market.${m.id}.what` as Key)}</p>
                <div className="mt-2">
                  <SourceLink href={m.href} text={t(`lp.biz.market.${m.id}.src` as Key)} />
                </div>
              </li>
            ))}
          </ul>
        </Block>

        <Block title={t('lp.biz.min')}>
          <ol className="space-y-3">
            {PREREQUISITES.map((p, i) => (
              <li key={p} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 font-text text-[15px] leading-relaxed text-foam/85">
                <span className={clsx(label, 'pt-1 text-foam/40')}>{String(i + 1).padStart(2, '0')}</span>
                {t(`lp.biz.min.${p}` as Key)}
              </li>
            ))}
          </ol>
        </Block>

        <Block title={t('lp.biz.roadmap')}>
          <ol className="relative space-y-6 border-l border-foam/15 pl-6">
            {PHASES.map((p) => (
              <li key={p.id} className="relative">
                <span
                  aria-hidden="true"
                  className={clsx('absolute -left-[1.85rem] top-1.5 size-2.5 rotate-45', p.done ? 'bg-mint' : 'border border-foam/50 bg-abyss')}
                />
                <p className={clsx(label, p.done ? 'text-mint' : 'text-foam/50')}>{t(`lp.biz.phase.${p.id}.when` as Key)}</p>
                <p className="mt-1 font-grotesk text-[1.15rem] tracking-[-0.02em] text-white">{t(`lp.biz.phase.${p.id}` as Key)}</p>
                <p className="mt-1 font-text text-[15px] leading-relaxed text-foam/75">{t(`lp.biz.phase.${p.id}.what` as Key)}</p>
              </li>
            ))}
          </ol>
        </Block>

        <Block title={t('lp.biz.docs')} className="lg:col-span-2">
          <p className="max-w-[60ch] font-text text-[15px] leading-relaxed text-foam/75">{t('lp.biz.docs.body')}</p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {DOCS.map((d) => (
              <SourceLink key={d.href} href={d.href} text={t(d.label)} />
            ))}
          </div>
        </Block>
      </div>
      <p className={clsx(label, 'mt-12 flex max-w-[60rem] items-start gap-2.5 text-foam/50')}>
        <span aria-hidden="true" className="mt-1 size-2 shrink-0 rotate-45 bg-signal" />
        {t('lp.biz.note')}
      </p>
    </Chapter>
  )
}
