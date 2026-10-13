import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './globals.css'
import { I18nProvider } from '@/lib/i18n/client'
import { getLocale } from '@/lib/i18n/server'
import { TestnetBanner } from '@/components/TestnetBanner'

export const metadata: Metadata = {
  // Needed to turn the share image into an absolute URL; set SITE_URL to the public address when deploying.
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'Seamoney | International payments, simpler, cheaper, with automatic reconciliation',
  description:
    'Pay import invoices to suppliers in Asia with lower fees, in seconds, with automatic reconciliation. Running on the Tempo testnet.',
}

export const viewport: Viewport = {
  themeColor: '#001d38',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    // suppressHydrationWarning: the landing page may add a class to <html> before hydration (?motion=full)
    <html lang={locale === 'pt' ? 'pt-BR' : 'en'} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale}>
          <TestnetBanner locale={locale} />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
