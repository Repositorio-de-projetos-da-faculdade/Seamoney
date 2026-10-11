import type { Key } from '@/lib/i18n/dict'

export interface NavItem {
  href: string
  key: Key
  /** which to-do count to show next to it */
  count?: 'payments' | 'suppliers'
}

/** Day-to-day work first; the company's own setup under its heading. Approvals live inside Payments. */
export const WORK: NavItem[] = [
  { href: '/app', key: 'app.nav.home' },
  { href: '/app/payments', key: 'app.nav.payments', count: 'payments' },
  { href: '/app/suppliers', key: 'app.nav.suppliers', count: 'suppliers' },
  { href: '/app/reports', key: 'app.nav.reports' },
]

export const COMPANY: NavItem[] = [
  { href: '/app/team', key: 'app.nav.team' },
  { href: '/app/settings', key: 'app.nav.settings' },
]

export const isActive = (pathname: string, href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href))
