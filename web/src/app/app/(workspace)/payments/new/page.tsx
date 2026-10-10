import { Suspense } from 'react'
import { NewPayment } from '@/components/app/payments/new/NewPayment'

export default function NewPaymentPage() {
  return (
    <Suspense fallback={null}>
      <NewPayment />
    </Suspense>
  )
}
