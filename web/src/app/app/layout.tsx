import type { Metadata } from 'next'
// the landing's type system: Funnel Display and Funnel Sans, Geist Mono for data, Instrument Serif for the italic
import '@fontsource-variable/funnel-display'
import '@fontsource-variable/funnel-sans'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import { ToastProvider } from '@/components/app/kit/Toaster'
import { DemoBoot } from '@/lib/demo/store'
import { getT } from '@/lib/i18n/server'

// The SaaS demo runs entirely in the browser (see lib/demo): no backend, no keys, a private sandbox per visitor.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: t('app.title'), robots: { index: false } }
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="desk min-h-dvh">
      <ToastProvider>
        <DemoBoot />
        {children}
      </ToastProvider>
    </div>
  )
}
