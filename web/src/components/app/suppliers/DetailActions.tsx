'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'iconoir-react'
import { useT } from '@/lib/i18n/client'
import { activeWallet, roleCan } from '@/lib/demo/rules'
import { NETWORKS, type Member, type Supplier } from '@/lib/demo/types'
import { btnGo, btnLine, btnSmall } from '../kit/styles'
import { EditSupplierDialog } from './EditSupplierDialog'

/** Header actions: pay this supplier (needs an approved wallet) and edit the supplier. */
export function DetailActions({ me, supplier }: { me: Member; supplier: Supplier }) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const canPay = roleCan(me.role, 'create_payment') && NETWORKS.some((n) => activeWallet(supplier, n))
  const canEdit = roleCan(me.role, 'edit_suppliers')
  if (!canPay && !canEdit) return null

  return (
    <div className="flex flex-wrap gap-2">
      {canPay ? (
        <Link href={`/app/payments/new?supplier=${supplier.id}`} className={btnGo}>
          <Plus width={18} height={18} strokeWidth={1.5} aria-hidden />
          {t('app.sdoc.act.pay', { name: supplier.name })}
        </Link>
      ) : null}
      {canEdit ? (
        <>
          <button type="button" className={`${btnLine} ${btnSmall}`} onClick={() => setEditing(true)}>
            {t('app.sup.profile.edit')}
          </button>
          <EditSupplierDialog supplier={supplier} open={editing} onClose={() => setEditing(false)} />
        </>
      ) : null}
    </div>
  )
}
