'use client'

import { usd } from '@/lib/format'
import { useT } from '@/lib/i18n/client'
import { memberOf, paymentOf, supplierById } from '@/lib/demo/selectors'
import type { Activity, DemoState } from '@/lib/demo/types'

/** "Rafael Nogueira approved": what happened, in one sentence. The subject (which payment) is shown next to it. */
export function useActivityText() {
  const { t, locale } = useT()
  return (state: DemoState, a: Activity) => {
    const supplier = a.supplierId ? supplierById(state, a.supplierId) : undefined
    const wallet = supplier?.wallets.find((w) => w.id === a.walletId)
    return t(`app.act.${a.type}`, {
      who: memberOf(state, a.actorId)?.name ?? t('app.system'),
      member: memberOf(state, a.memberId)?.name ?? '',
      version: wallet?.version ?? '',
      network: wallet ? t(`app.net.${wallet.network}`) : '',
      limit: usd(state.settings.approvalThresholdCents, locale),
    })
  }
}

/** What a log line is about, and where it leads: the payment, the supplier, the team or the settings. */
export function useActivitySubject() {
  const { t } = useT()
  return (state: DemoState, a: Activity): { text: string; href: string } | null => {
    if (a.paymentId) {
      const p = paymentOf(state, a.paymentId)
      const s = p ? supplierById(state, p.supplierId) : undefined
      return p ? { text: `${p.invoiceNumber}, ${s?.name ?? ''}`, href: `/app/payments/${p.id}` } : null
    }
    if (a.supplierId) {
      const s = supplierById(state, a.supplierId)
      return s ? { text: s.name, href: `/app/suppliers/${s.id}` } : null
    }
    if (a.memberId) return { text: t('app.nav.team'), href: '/app/team' }
    if (a.type === 'settings_changed') return { text: t('app.nav.settings'), href: '/app/settings' }
    return null
  }
}
