import '@fontsource-variable/funnel-display'
import '@fontsource-variable/funnel-sans'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import { ChapterRail } from '@/components/landing/ChapterRail'
import { Finale } from '@/components/landing/Finale'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { Loader } from '@/components/landing/Loader'
import { Manifest } from '@/components/landing/Manifest'
import { Reconcile } from '@/components/landing/Reconcile'
import { RouteMap } from '@/components/landing/RouteMap'
import { Savings } from '@/components/landing/Savings'
import { SmoothScroll } from '@/components/landing/SmoothScroll'
import { Voyage } from '@/components/landing/Voyage'
import { getT } from '@/lib/i18n/server'

// The landing page is one voyage: a WebGL ship carries the 32-byte memo (Voyage), the old route is drawn on a map
// (RouteMap), the payment reconciles itself on paper (Reconcile), the calculator (Savings), the honesty section
// (Manifest) and the ship sails off (Finale). See src/components/landing.
export default async function Home() {
  const { t, locale } = await getT()

  return (
    <div className="lp">
      {/* demo switch, see prefersReducedMotion in components/landing/motion.ts */}
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
        <Manifest t={t} />
        <Finale t={t} />
      </main>
      <LandingFooter t={t} />
    </div>
  )
}
