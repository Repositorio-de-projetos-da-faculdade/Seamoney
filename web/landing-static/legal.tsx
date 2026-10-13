import '@fontsource-variable/funnel-display'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader/opsz.css'
import './styles.css'
import { createRoot } from 'react-dom/client'
import { LegalPage } from '@/components/legal/LegalPage'
import type { LegalKind } from '@/components/legal/types'
import { locale, t } from './locale'

// Entry of the legal pages in the static build (terms.html, privacy.html); each page names its document in <body data-doc>.
const kind: LegalKind = document.body.dataset.doc === 'privacy' ? 'privacy' : 'terms'
document.title = `${t(`legal.${kind}`)} | Seamoney`

createRoot(document.getElementById('root')!).render(<LegalPage kind={kind} t={t} locale={locale} />)
