'use client'

import { use } from 'react'
import { ProofSlip } from '@/components/app/proof/ProofSlip'

export default function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProofSlip id={id} />
}
