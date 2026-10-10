import { Suspense } from 'react'
import { PaymentsList } from '@/components/app/payments/list/PaymentsList'

export default function PaymentsPage() {
  // the list reads its view from the query string (?view=approval)
  return (
    <Suspense>
      <PaymentsList />
    </Suspense>
  )
}
