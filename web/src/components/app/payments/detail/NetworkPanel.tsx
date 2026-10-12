'use client'

import clsx from 'clsx'
import { Check, ExternalLink, X } from 'lucide-react'
import { dateTime, seconds, usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { explorerTxOn } from '@/lib/links'
import type { Payment, ReconChecks } from '@/lib/demo/types'
import { Live, Simulated } from '../../kit/Status'
import { CopyButton } from './CopyButton'

const CHECKS: (keyof ReconChecks)[] = ['token', 'recipient', 'amount', 'memo', 'receipt']

/**
 * What the network shows, printed like the receipt clipped to the invoice on the landing: the transfer, then the
 * five checks reconciliation runs before it closes the invoice. A failed check is said plainly, with the numbers.
 */
export function NetworkPanel({ payment: p }: { payment: Payment }) {
  const { t, locale } = useT()
  const s = p.settlement
  const recon = p.recon
  const live = s?.mode === 'testnet'

  const rows: { key: string; value: React.ReactNode; tone?: 'mint' | 'dim' }[] = s
    ? [
        {
          key: t(`app.net.${s.network}.tx`),
          value: (
            <span className="flex items-start gap-2">
              <span className="min-w-0 break-all">{s.txHash}</span>
              <CopyButton value={s.txHash} what={t(`app.net.${s.network}.tx`)} onNight />
            </span>
          ),
          tone: 'mint',
        },
        { key: t(`app.net.${s.network}.height`), value: s.blockNumber.toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US') },
        { key: t('app.doc.n.confirm'), value: seconds(s.confirmMs, locale) },
        { key: t('app.doc.n.paidAt'), value: dateTime(s.paidAt, locale), tone: 'dim' },
        { key: t('app.doc.n.memo'), value: p.reference, tone: 'mint' },
      ]
    : []

  return (
    <section aria-labelledby="doc-net" className="bg-night text-foam">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foam/12 px-5 py-4">
        <h2 id="doc-net" className="font-grotesk text-[17px] font-medium tracking-[-0.015em] text-white">
          {t('app.doc.onNetwork')}
        </h2>
        {s ? live ? <Live onNight>{t(`app.net.${s.network}.long`)}</Live> : <Simulated onNight>{t('app.doc.n.simulated', { network: t(`app.net.${s.network}`) })}</Simulated> : null}
      </div>

      {!s ? (
        <p className="px-5 py-5 text-[14px] text-foam/65">{p.status === 'sending' ? t('app.doc.n.sending') : t('app.doc.n.none')}</p>
      ) : (
        <>
          <dl className="space-y-2 px-5 py-4 font-data text-[12px]">
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[minmax(6.5rem,8.5rem)_minmax(0,1fr)] gap-3">
                <dt className="text-foam/45">{r.key}</dt>
                <dd className={clsx('break-all', r.tone === 'mint' ? 'text-mint' : r.tone === 'dim' ? 'text-foam/60' : 'text-foam')}>{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-foam/12 px-5 py-3 text-[13px] leading-relaxed text-foam/60">
            {live ? (
              <a href={explorerTxOn(s.network, s.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-mint underline decoration-mint/40 underline-offset-4 hover:decoration-mint">
                {t('app.doc.n.explorer')}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : (
              t('app.doc.n.simNote')
            )}
          </p>

          <div className="border-t border-foam/12 px-5 py-4">
            <p className="font-data text-[10.5px] font-medium uppercase tracking-[0.08em] text-foam/45">{t('app.doc.checks')}</p>
            {recon ? (
              <ol className="mt-2">
                {CHECKS.map((key, i) => {
                  const ok = recon.checks[key]
                  return (
                    <li key={key} className="flex items-center gap-3 border-b border-foam/8 py-2 last:border-b-0">
                      <span className="w-5 font-data text-[10px] tabular-nums text-foam/35">{String(i + 1).padStart(2, '0')}</span>
                      <span className={clsx('flex-1 text-[14px]', ok ? 'text-foam/85' : 'font-medium text-[#ff9a90]')}>{t(`app.doc.check.${key}`)}</span>
                      <span className={clsx('grid size-5 place-items-center rounded-full', ok ? 'bg-brand-600 text-white' : 'bg-bad-ink text-white')} aria-hidden="true">
                        {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                      </span>
                      <span className="sr-only">{ok ? t('app.doc.check.ok') : t('app.doc.check.failed')}</span>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="mt-2 text-[14px] text-foam/65">{t('app.doc.checksWaiting')}</p>
            )}
            {recon && p.status === 'in_review' ? (
              <p className="mt-3 border-l-2 border-[#ff7a6e] pl-3 text-[13.5px] leading-relaxed text-foam/85">
                {recon.checks.amount
                  ? t('app.doc.reviewNote')
                  : t('app.doc.reviewAmount', { expected: usd(recon.expectedCents, locale), paid: usd(recon.paidCents, locale) })}
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}
