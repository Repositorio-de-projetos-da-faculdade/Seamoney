import { getLocale } from '@/lib/i18n/server'
import { UnlockForm } from './UnlockForm'

export default async function UnlockPage() {
  const locale = await getLocale()
  return <UnlockForm locale={locale} />
}
