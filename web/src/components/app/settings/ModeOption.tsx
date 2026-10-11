'use client'

import type { SettlementMode } from '@/lib/demo/types'

/** The radio that picks a settlement mode. Its network row supplies the visible label. */
export function ModeOption({
  id,
  name,
  value,
  current,
  onPick,
  disabled,
}: {
  id: string
  name: string
  value: SettlementMode
  current: SettlementMode
  onPick: (m: SettlementMode) => void
  disabled: boolean
}) {
  return (
    <input
      id={id}
      type="radio"
      name={name}
      value={value}
      checked={current === value}
      disabled={disabled}
      onChange={() => onPick(value)}
      className="mt-1 size-4 shrink-0 accent-brand-600"
    />
  )
}
