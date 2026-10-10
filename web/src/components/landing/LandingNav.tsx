import Link from 'next/link'
import type { T } from '@/lib/i18n/server'
import { MobileNav } from '../MobileNav'
import { Logo } from '../ui'
import { Cta } from './Cta'
import { LangSwitch } from './LangSwitch'
import { NavShell } from './NavShell'
import { appLink, externalProps, primaryCta } from './site'
import { fadeDelay } from './type'

/** The landing header: the mark, three links with a drawn underline, the language and the way in. */
export function LandingNav({ t }: { t: T }) {
  const links = [
    { href: '#cargo', label: t('nav.how') },
    { href: '#savings', label: t('nav.calculator') },
    appLink(t),
  ]
  const cta = primaryCta(t)
  const linkClass = 'group relative py-2 font-text text-[14px] text-foam/70 transition-colors duration-300 hover:text-foam'
  const underline = (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 bottom-1 h-px origin-right scale-x-0 bg-mint transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:origin-left group-hover:scale-x-100"
    />
  )

  return (
    <NavShell>
      <div className="lp-fade relative mx-auto flex h-[72px] max-w-[1800px] items-center justify-between gap-6 px-5 md:px-10" style={fadeDelay(1)}>
        <Link href="/" aria-label="Seamoney" className="shrink-0">
          <Logo height={26} />
        </Link>

        <nav aria-label="Main" className="absolute left-1/2 flex -translate-x-1/2 items-center gap-9 max-md:hidden">
          {links.map((l) =>
            l.href.startsWith('#') ? (
              <a key={l.href} href={l.href} className={linkClass}>
                {l.label}
                {underline}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className={linkClass} {...externalProps(l.href)}>
                {l.label}
                {underline}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-5">
          <LangSwitch className="max-md:hidden" />
          <Cta href={cta.href} size="sm" className="max-md:hidden">
            {cta.label}
          </Cta>
          <MobileNav links={links} cta={cta} openLabel={t('nav.menu')} closeLabel={t('nav.close')} />
        </div>
      </div>
    </NavShell>
  )
}
