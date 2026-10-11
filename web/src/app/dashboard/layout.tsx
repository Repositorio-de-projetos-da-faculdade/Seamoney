import { BottomNav } from '@/components/BottomNav'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { redirect } from 'next/navigation'
import { sessionToken } from '@/lib/session'

// Everything under /dashboard reads live data, so it is rendered per request.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The Java service answers only signed-in users; an expired token is caught by the API client and also lands on /login.
  if (!(await sessionToken())) redirect('/login')
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-5 pb-28 pt-6 lg:px-10 lg:pb-14 lg:pt-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
