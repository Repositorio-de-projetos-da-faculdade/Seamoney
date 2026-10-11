'use client'

import { useT } from '@/lib/i18n/client'
import { activeWallet } from '@/lib/demo/rules'
import { NETWORKS, type Supplier } from '@/lib/demo/types'
import { btnLine } from '../../kit/styles'

/** Compact chips for suppliers with at least one approved wallet; each starts a manual order with that supplier chosen. */
export function SupplierChips({ suppliers, onPick }: { suppliers: Supplier[]; onPick: (id: string) => void }) {
  const { t } = useT()
  const ready = suppliers.filter((s) => NETWORKS.some((n) => activeWallet(s, n)))
  if (ready.length === 0) return null

  return (
    <section aria-labelledby="np-or" className="space-y-2.5 border-t border-rule pt-5">
      <h3 id="np-or" className="text-[13.5px] font-medium text-ink">
        {t('app.pnew.or')}
      </h3>
      <p className="text-[12.5px] text-muted">{t('app.pnew.or.hint')}</p>
      <ul className="flex flex-wrap gap-2">
        {ready.map((s) => (
          <li key={s.id}>
            <button type="button" className={btnLine + ' !h-8 !px-3 !text-[13px]'} onClick={() => onPick(s.id)}>
              {s.name}
              <span className="text-muted">{s.city}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
