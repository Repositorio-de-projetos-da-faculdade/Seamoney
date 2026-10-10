import type { OrderStatus } from '@/lib/types'
import type { T } from '@/lib/i18n/server'
import { Chip } from './ui'

const tone = { quoted: 'warn', sending: 'info', sent: 'info', reconciled: 'ok' } as const

export function OrderStatusChip({ status, t }: { status: OrderStatus; t: T }) {
  return <Chip tone={tone[status]}>{t(`status.${status}` as const)}</Chip>
}

export function DemoTag({ t }: { t: T }) {
  return (
    <span className="ml-2 shrink-0 rounded-md bg-navy-900/[0.06] px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-muted">
      {t('demo.tag')}
    </span>
  )
}
