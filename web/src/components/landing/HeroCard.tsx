import { Check } from 'lucide-react'
import type { T } from '@/lib/i18n/server'
import { GlassCard } from '../ui'

/** Static example of the end state, in the spirit of the "payment sent" screen of the mockup. Clearly labelled as an example. */
export function HeroCard({ t }: { t: T }) {
  return (
    <div className="relative mx-auto w-full max-w-[360px] lg:ml-auto lg:mr-0 lg:self-start">
      <div className="animate-float">
        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint/15 text-mint ring-8 ring-mint/10">
              <Check size={24} strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-tight text-white/90">{t('wiz.pay.done')}</p>
              <p className="font-display text-[28px] font-extrabold leading-tight tabular-nums tracking-tight">US$ 80,000.00</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm">
            <span className="text-white/55">{t('wiz.pay.memo')}</span>
            <span className="font-mono text-xs font-semibold text-aqua">INV-2026-0845</span>
          </div>

          <p className="mt-4 flex items-center gap-2 rounded-xl bg-mint/10 px-3.5 py-2.5 text-sm font-semibold text-mint">
            <Check size={16} strokeWidth={3} aria-hidden="true" />
            {t('wiz.pay.reconciled')}
          </p>
        </GlassCard>
      </div>
      <p className="mt-3 text-center text-xs text-white/55 lg:text-right">{t('hero.note')}</p>
    </div>
  )
}
