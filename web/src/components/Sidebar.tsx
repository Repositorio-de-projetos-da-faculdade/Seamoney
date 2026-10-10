'use client'

import clsx from 'clsx'
import { ArrowLeft, FileBarChart, FileText, GitCompareArrows, House } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { ShipScene } from './ShipScene'
import { Logo } from './ui'

export const dashboardItems = [
  { href: '/dashboard', key: 'side.home', icon: House, exact: true },
  { href: '/dashboard/orders', key: 'side.orders', icon: FileText, exact: false },
  { href: '/dashboard/reconciliation', key: 'side.recon', icon: GitCompareArrows, exact: false },
  { href: '/dashboard/reports', key: 'side.reports', icon: FileBarChart, exact: false },
] as const

export function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

/** Desktop navigation: the dark rail of the mockup. On small screens the bottom bar is used instead. */
export function Sidebar() {
  const { t } = useT()
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 text-white lg:flex">
      <div className="px-6 pb-6 pt-7">
        <Link href="/" aria-label="Seamoney">
          <Logo height={36} />
        </Link>
      </div>

      <nav aria-label="Dashboard" className="flex flex-col gap-1.5 px-4">
        {dashboardItems.map(({ href, key, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'group relative flex min-h-12 items-center gap-3.5 rounded-xl px-4 text-[15px] font-semibold transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-navy-600 to-navy-700/70 text-white ring-1 ring-white/10'
                  : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              {active ? <span className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-mint" aria-hidden="true" /> : null}
              <Icon size={20} className={clsx('transition-colors', active ? 'text-mint' : 'text-white/55 group-hover:text-white/80')} aria-hidden="true" />
              {t(key)}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 p-4">
        <div className="relative isolate overflow-hidden rounded-2xl ring-1 ring-white/10">
          <ShipScene variant="wide" className="absolute inset-0 -z-10 h-full w-full" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-transparent" />
          <div className="px-4 pb-4 pt-16">
            <p className="flex items-center gap-2 text-sm font-bold text-aqua">
              <span className="h-2 w-2 animate-pulse rounded-full bg-mint" aria-hidden="true" />
              {t('side.demo')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">{t('side.demo.desc')}</p>
          </div>
        </div>
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" />
          {t('side.back')}
        </Link>
      </div>
    </aside>
  )
}
