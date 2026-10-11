import { Suspense } from 'react'
import { ReportsView } from '@/components/app/reports/ReportsView'

export default function ReportsPage() {
  // the view can come from the query string (?view=audit)
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  )
}
