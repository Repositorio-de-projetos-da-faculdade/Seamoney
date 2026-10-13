import '@fontsource-variable/funnel-display'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader/opsz.css'
import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: `${t('legal.privacy')} | Seamoney` }
}

export default async function PrivacyPage() {
  const { t, locale } = await getT()
  return <LegalPage kind="privacy" t={t} locale={locale} />
}
