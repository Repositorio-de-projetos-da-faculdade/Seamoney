import type { T } from '@/lib/i18n/server'

// Where the landing page is published. The static build (landing-static/, on Firebase Hosting) has no app behind it:
// no dashboard to open and no rules engine to price the calculator, so the ways in point to the source code instead.
// Set at build time; the Next app leaves it unset.

export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_LANDING === '1'
export const REPO_URL = 'https://github.com/Repositorio-de-projetos-da-faculdade/Seamoney-Hackathon'

export interface SiteLink {
  href: string
  label: string
}

/** The main way in: a new payment order in the app, or the source code on the static site. */
export const primaryCta = (t: T): SiteLink =>
  STATIC_SITE ? { href: REPO_URL, label: t('lp.code') } : { href: '/dashboard/orders/new', label: t('lp.cta') }

/** The app's dashboard in the menus; the source code on the static site. */
export const appLink = (t: T): SiteLink =>
  STATIC_SITE ? { href: REPO_URL, label: t('lp.code.nav') } : { href: '/dashboard', label: t('nav.dashboard') }

/** Links that leave the site open in a new tab. */
export const isExternal = (href: string) => /^https?:\/\//.test(href)
export const externalProps = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})
