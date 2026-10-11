'use client'

import { GlassCard } from '@/components/ui'
import type { Key } from '@/lib/i18n/dict'
import { demoAccounts } from './demoAccounts'

/** The fictional accounts of the demo seed, one click to fill the form. Labelled as fictional on purpose. */
export function DemoAccountList({ t, onUse }: { t: (key: Key) => string; onUse: (email: string) => void }) {
  const companies = [...new Set(demoAccounts.map((a) => a.company))]
  return (
    <GlassCard className="p-6 text-white sm:p-8">
      <h2 className="font-display text-lg font-bold tracking-tight">{t('login.demo')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{t('login.demoHint')}</p>
      <div className="mt-5 space-y-5">
        {companies.map((company) => (
          <section key={company} aria-label={company}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-aqua">{company}</h3>
            <ul className="mt-2 divide-y divide-white/10">
              {demoAccounts
                .filter((a) => a.company === company)
                .map((a) => (
                  <li key={a.email} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.email}</span>
                      <span className="block text-xs text-white/60">{t(`role.${a.role}` as Key)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onUse(a.email)}
                      className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold transition hover:border-white/40 hover:bg-white/10"
                    >
                      {t('login.use')}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </GlassCard>
  )
}
