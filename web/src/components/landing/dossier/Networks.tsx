import clsx from 'clsx'
import type { Key } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { label } from '../type'
import { Chapter } from './Chapter'
import { NETWORK_FACTS } from './facts'
import { SourceLink } from './SourceLink'

/**
 * Chapter 06: why the money crosses on Tempo and on Solana. For each network, what it is, why it fits an import
 * payment, how the memo travels, the confirmation time we measured on the test networks, and the official docs.
 */
export function Networks({ t }: { t: T }) {
  return (
    <Chapter id="networks" n={6} name={t('lp.ch.6')} title={t('lp.net.title')} body={t('lp.net.body')}>
      <div className="grid gap-6 lg:grid-cols-2">
        {NETWORK_FACTS.map((n) => (
          <article key={n.id} className="border border-foam/12 bg-night/60 p-6 md:p-8">
            <p className={clsx(label, 'text-mint')}>{t(`lp.net.${n.id}.kicker` as Key)}</p>
            <h3 className="mt-3 font-grotesk text-[2rem] font-light tracking-[-0.03em] text-white">{t(`lp.net.${n.id}.name` as Key)}</h3>
            <dl className="mt-6 divide-y divide-foam/10 border-t border-foam/10">
              {n.rows.map((row) => (
                <div key={row} className="grid gap-1 py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6">
                  <dt className={clsx(label, 'pt-1 text-foam/50')}>{t(`lp.net.row.${row}` as Key)}</dt>
                  <dd className="font-text text-[15.5px] leading-relaxed text-foam/85">{t(`lp.net.${n.id}.${row}` as Key)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {n.sources.map((s) => (
                <SourceLink key={s.href} href={s.href} text={t(s.label)} />
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className={clsx(label, 'mt-8 flex max-w-[60rem] items-start gap-2.5 text-foam/50')}>
        <span aria-hidden="true" className="mt-1 size-2 shrink-0 rotate-45 bg-signal" />
        {t('lp.net.note')}
      </p>
    </Chapter>
  )
}
