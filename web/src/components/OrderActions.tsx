'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import type { OrderStatus } from '@/lib/types'
import { btnOutline, btnPrimary, Notice, Spinner } from './ui'

/** "Pay now" for a quoted order and "Reconcile now" for a paid one. Refreshes the server-rendered page after. */
export function OrderActions({ orderId, status, compact = false }: { orderId: string; status: OrderStatus; compact?: boolean }) {
  const { t } = useT()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function call(path: 'pay' | 'reconcile') {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/${path}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('error.generic'))
      if (path === 'pay') {
        await fetch(`/api/orders/${orderId}/reconcile`, { method: 'POST' })
      } else if (json.ok === false) {
        setMessage(t('wiz.pay.notFound'))
      }
      router.refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  if (status !== 'quoted' && status !== 'sent') return null
  const isPay = status === 'quoted'

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={compact ? btnOutline : btnPrimary}
        disabled={busy}
        onClick={() => void call(isPay ? 'pay' : 'reconcile')}
      >
        {busy ? <Spinner className="h-4 w-4" /> : null}
        {isPay ? t('od.pay') : t('od.recon.run')}
      </button>
      {message ? <Notice tone="warn">{message}</Notice> : null}
    </div>
  )
}
