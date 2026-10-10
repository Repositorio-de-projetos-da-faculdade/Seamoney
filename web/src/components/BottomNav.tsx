'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { dashboardItems, isActive } from './Sidebar'

/** Tab bar for phones, like the mobile screens of the mockup. */
export function BottomNav() {
  const { t } = useT()
  const pathname = usePathname()

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(0_29_56/0.18)] backdrop-blur-xl lg:hidden"
    >
      {dashboardItems.map(({ href, key, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={clsx('flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors', active ? 'text-brand-600' : 'text-muted')}
          >
            <span className={clsx('grid h-8 w-12 place-items-center rounded-full transition-colors', active && 'bg-brand-50')}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="max-w-full truncate">{t(key)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
