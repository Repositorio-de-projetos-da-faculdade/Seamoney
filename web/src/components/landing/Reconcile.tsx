import type { Locale } from '@/lib/i18n/dict'
import type { T } from '@/lib/i18n/server'
import { reconcileCopy } from './reconcile/copy'
import { ReconcileStage } from './reconcile/ReconcileStage'

// Chapter 04: the invoice is matched to the on-chain memo. Copy is resolved on the server; the scroll scene is client-only.
export function Reconcile({ t, locale }: { t: T; locale: Locale }) {
  return <ReconcileStage copy={reconcileCopy(t, locale)} />
}
