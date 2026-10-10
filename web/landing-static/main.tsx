import '@fontsource-variable/funnel-display'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'
import { createRoot } from 'react-dom/client'
import { LandingPage } from '@/components/landing/LandingPage'
import { I18nProvider } from '@/lib/i18n/client'
import { DEFAULT_LOCALE, translate, type Key, type Locale } from '@/lib/i18n/dict'

// Entry of the static landing build. The Next app reads the language from the `lang` cookie on the server; here the
// browser reads the same cookie, so the language switch behaves the same way (it sets the cookie and reloads).
const saved = document.cookie.match(/(?:^|;\s*)lang=(en|pt)\b/)?.[1] as Locale | undefined
const locale = saved ?? DEFAULT_LOCALE
const t = (key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars)

document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en'
document.title = `Seamoney | ${t('brand.tagline')}`

createRoot(document.getElementById('root')!).render(
  <I18nProvider locale={locale}>
    <LandingPage t={t} locale={locale} />
  </I18nProvider>,
)
