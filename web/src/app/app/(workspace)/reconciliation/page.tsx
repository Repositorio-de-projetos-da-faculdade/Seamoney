import { redirect } from 'next/navigation'

// Reconciliation runs on its own; what is left for people is the review queue in the payments list.
export default function ReconciliationPage() {
  redirect('/app/payments?view=review')
}
