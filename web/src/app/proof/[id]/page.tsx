import type { Metadata } from 'next'
import { PublicProof } from '@/components/app/proof/PublicProof'
import { getProof } from '@/lib/api'
import { getT } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: t('proof.title'), robots: { index: false } }
}

/** Public page for the SUPPLIER: proof that the payment for their invoice arrived, checked live on-chain. */
export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicProof proof={await getProof(id)} />
}
