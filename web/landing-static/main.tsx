import '@fontsource-variable/funnel-display'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'
import { createRoot } from 'react-dom/client'
import { LandingPage } from '@/components/landing/LandingPage'
import { I18nProvider } from '@/lib/i18n/client'
import { locale, t } from './locale'

// Entry of the static landing build (index.html).
document.title = `Seamoney | ${t('brand.tagline')}`

createRoot(document.getElementById('root')!).render(
  <I18nProvider locale={locale}>
    <LandingPage t={t} locale={locale} />
  </I18nProvider>,
)
