import { redirect } from 'next/navigation'

// Approvals are a view of the payments list now, next to the other queues.
export default function ApprovalsPage() {
  redirect('/app/payments?view=approval')
}
