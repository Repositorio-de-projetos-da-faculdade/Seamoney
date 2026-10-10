import clsx from 'clsx'
import type { T } from '@/lib/i18n/server'
import { label } from '../type'

function Readout({ title, rows, tone, className }: { title: string; rows: string[]; tone: 'bank' | 'mint'; className?: string }) {
  const mint = tone === 'mint'
  return (
    <div className={clsx('border-t pt-3', mint ? 'border-mint' : 'border-bank/60', className)}>
      <p className={clsx(label, mint ? 'text-mint' : 'text-bank')}>{title}</p>
      <ul className={clsx('mt-2 space-y-0.5 font-grotesk text-[0.95rem] leading-tight tracking-[-0.02em] md:mt-3 md:space-y-1 md:text-[1.4rem]', mint ? 'text-white' : 'font-light text-foam/60')}>
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </div>
  )
}

// Two readouts side by side: the bank wire, then Seamoney. They reuse the estimates already in the copy.
export function RouteHud({ t }: { t: T }) {
  return (
    <div className="grid grid-cols-2 gap-6 md:min-w-[30rem] md:gap-10">
      <Readout
        className="rm-bank-dim rm-hud-bank"
        tone="bank"
        title={t('lp.speed.bank')}
        rows={[t('lp.speed.time.bank'), t('lp.speed.fee.bank'), t('lp.speed.recon.bank')]}
      />
      <Readout
        className="rm-hud-sea"
        tone="mint"
        title={t('lp.speed.sea')}
        rows={[t('lp.speed.time.sea'), t('lp.speed.fee.sea'), t('lp.speed.recon.sea')]}
      />
    </div>
  )
}
