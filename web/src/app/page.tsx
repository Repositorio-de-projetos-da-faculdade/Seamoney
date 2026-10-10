import '@fontsource-variable/funnel-display'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import { LandingPage } from '@/components/landing/LandingPage'
import { getT } from '@/lib/i18n/server'

// The landing page itself lives in components/landing/LandingPage.tsx, shared with the static build (landing-static/).
export default async function Home() {
  const { t, locale } = await getT()
  return <LandingPage t={t} locale={locale} />
}
