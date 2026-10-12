import type { Key } from '@/lib/i18n/dict'
import { REPO_URL } from '../site'

// The dossier's facts and where each one comes from. Every statement on the networks, the rules and the market links
// to the official page it was read on (11 Oct 2026); the copy itself lives in dict.ts (lp.net.*, lp.law.*, lp.biz.*).
// Confirmation times are our own measurements on the test networks, labelled as such.

const BCB = (n: number) => `https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=${n}`

export const NETWORK_FACTS: { id: 'tempo' | 'solana'; rows: readonly string[]; sources: { href: string; label: Key }[] }[] = [
  {
    id: 'tempo',
    rows: ['what', 'fees', 'memo', 'measured', 'why'],
    sources: [
      { href: 'https://tempo.xyz', label: 'lp.src.tempo' },
      { href: 'https://tempo.xyz/developers/docs/protocol/fees', label: 'lp.src.tempoFees' },
      { href: 'https://tempo.xyz/developers/docs/guide/payments/transfer-memos', label: 'lp.src.tempoMemo' },
    ],
  },
  {
    id: 'solana',
    rows: ['what', 'fees', 'memo', 'measured', 'why'],
    sources: [
      { href: 'https://solana.com/docs/core/fees', label: 'lp.src.solanaFees' },
      { href: 'https://www.solana-program.com/docs/memo', label: 'lp.src.solanaMemo' },
    ],
  },
]

export const RULES: { id: string; href: string }[] = [
  { id: 'l14478', href: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14478.htm' },
  { id: 'd11563', href: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/decreto/d11563.htm' },
  { id: 'l14286', href: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14286.htm' },
  { id: 'r519', href: BCB(520) },
  { id: 'r521', href: BCB(521) },
  { id: 'r561', href: BCB(561) },
]

export const MODEL: { id: string; live: boolean }[] = [
  { id: 'fee', live: true },
  { id: 'plan', live: false },
  { id: 'partner', live: false },
]

export const MARKET: { id: string; href: string }[] = [
  { id: 'china', href: 'https://comexstat.mdic.gov.br/pt/geral' },
  { id: 'g20', href: 'https://www.fsb.org/work-of-the-fsb/financial-innovation-and-structural-change/cross-border-payments/g20-targets-for-enhancing-cross-border-payments-2/' },
  { id: 'unit', href: '#savings' },
]

export const PREREQUISITES = ['partner', 'legal', 'kyc', 'custody', 'hardening'] as const

export const PHASES: { id: string; done: boolean }[] = [
  { id: 'now', done: true },
  { id: 'next', done: false },
  { id: 'pilot', done: false },
  { id: 'scale', done: false },
]

export const DOCS: { href: string; label: Key }[] = [
  { href: `${REPO_URL}#readme`, label: 'lp.biz.docs.readme' },
  { href: `${REPO_URL}/blob/main/docs/backend-api.md`, label: 'lp.biz.docs.api' },
  { href: `${REPO_URL}/blob/main/docs/prototype.md`, label: 'lp.biz.docs.prototype' },
]
