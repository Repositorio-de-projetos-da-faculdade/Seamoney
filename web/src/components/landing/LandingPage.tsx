import type { Locale } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { ChapterRail } from './ChapterRail'
import { Business } from './dossier/Business'
import { Networks } from './dossier/Networks'
import { Rules } from './dossier/Rules'
import { Finale } from './Finale'
import { LandingFooter } from './LandingFooter'
import { LandingNav } from './LandingNav'
import { Loader } from './Loader'
import { Reconcile } from './Reconcile'
import { RouteMap } from './RouteMap'
import { Savings } from './Savings'
import { SmoothScroll } from './SmoothScroll'
import { Voyage } from './Voyage'

// The landing page is one voyage: a WebGL ship carries the 32-byte memo (Voyage), the old route is drawn on a map
// (RouteMap), the payment reconciles itself on paper (Reconcile), the calculator (Savings); then the dossier (the
// networks, the rules with their sources, the business and roadmap) and the ship sails off (Finale). Rendered by src/app/page.tsx (Next) and by landing-static/ (the
// static build for Firebase Hosting), so it takes the translations as props and imports nothing server-only.
export function LandingPage({ t, locale }: { t: T; locale: Locale }) {
  return (
    <div className="lp">
      {/* demo switch, see prefersReducedMotion in motion.ts (the static build runs the same line from its index.html) */}
      <script dangerouslySetInnerHTML={{ __html: "if(/[?&]motion=full/.test(location.search))document.documentElement.classList.add('motion-full')" }} />
      <SmoothScroll />
      {/* without JavaScript there is no loader to lift: show everything */}
      <noscript>
        <style>{'.lp-loader{display:none}.lp-fade{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      <Loader />
      <LandingNav t={t} />
      <ChapterRail />
      <main>
        <Voyage />
        <RouteMap t={t} />
        <Reconcile t={t} locale={locale} />
        <Savings />
        <Networks t={t} />
        <Rules t={t} />
        <Business t={t} />
        <Finale t={t} />
      </main>
      <LandingFooter t={t} />
    </div>
  )
}
