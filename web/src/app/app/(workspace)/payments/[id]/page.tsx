'use client'

import { use } from 'react'
import { PaymentPage } from '@/components/app/payments/detail/PaymentPage'

export default function PaymentRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PaymentPage id={id} />
}
