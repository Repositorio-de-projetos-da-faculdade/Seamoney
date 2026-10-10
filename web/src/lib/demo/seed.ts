// Fictitious starting data for the SaaS demo: one importer, its team, six suppliers and seven months of payments.
// Names, e-mails (on the reserved .example domain), wallets and hashes are invented. Dates are relative to `now`
// so the demo always looks current. Seeded settlements are simulated: they never touched a chain.
import { base58, hex, orderReference } from './codes.ts'
import { approvalHash } from './rules.ts'
import { quote } from './pricing.ts'
import type { Activity, DemoState, Member, Network, Payment, PaymentStatus, Settings, Supplier, Wallet } from './types.ts'

export const DEMO_VERSION = 3

const HOUR = 3_600_000
const DAY = 24 * HOUR

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export const DEFAULT_SETTINGS: Settings = {
  companyName: 'Porto Claro Importadora',
  approvalThresholdCents: 1_000_000,
  bankFeePct: 3,
  fxRate: 5.4,
  feeBps: 100,
  settlementMode: 'simulated',
  notifyApprovals: true,
  notifyReconciled: true,
  weeklyDigest: false,
}

const MEMBERS: Omit<Member, 'joinedAt'>[] = [
  { id: 'mem_marina', name: 'Marina Costa', email: 'marina@portoclaro.example', role: 'owner', status: 'active' },
  { id: 'mem_rafael', name: 'Rafael Nogueira', email: 'rafael@portoclaro.example', role: 'approver', status: 'active' },
  { id: 'mem_julia', name: 'Júlia Santos', email: 'julia@portoclaro.example', role: 'operator', status: 'active' },
  { id: 'mem_carlos', name: 'Carlos Mendes', email: 'carlos@contabil.example', role: 'accountant', status: 'active' },
  { id: 'mem_beatriz', name: 'Beatriz Lima', email: 'beatriz@portoclaro.example', role: 'operator', status: 'invited' },
]

interface WalletPlan {
  network: Network
  /** days ago it was proposed */
  ago: number
  status: Wallet['status']
}

interface SupplierPlan extends Omit<Supplier, 'wallets' | 'createdAt'> {
  /** oldest first; the last approved one on each network is the address in use */
  wallets: WalletPlan[]
}

const SUPPLIERS: SupplierPlan[] = [
  {
    id: 'sup_shenzhen', port: 'CNSZX', name: 'Shenzhen Tech Co.', country: 'CN', city: 'Shenzhen', email: 'billing@shenzhentech.example',
    wallets: [{ network: 'tempo', ago: 200, status: 'approved' }],
  },
  {
    id: 'sup_hongkong', port: 'HKHKG', name: 'Hong Kong Electronics', country: 'HK', city: 'Hong Kong', email: 'ar@hkelectronics.example',
    // moved to a new address in the summer: version 1 revoked, version 2 in use
    wallets: [
      { network: 'tempo', ago: 190, status: 'revoked' },
      { network: 'tempo', ago: 70, status: 'approved' },
    ],
  },
  {
    id: 'sup_guangzhou', port: 'CNCAN', name: 'Guangzhou Textiles', country: 'CN', city: 'Guangzhou', email: 'finance@gztextiles.example',
    wallets: [{ network: 'tempo', ago: 180, status: 'approved' }],
  },
  {
    id: 'sup_hcmc', port: 'VNSGN', name: 'Global Parts Ltd.', country: 'VN', city: 'Ho Chi Minh City', email: 'accounts@globalparts.example',
    wallets: [
      { network: 'tempo', ago: 170, status: 'approved' },
      { network: 'solana', ago: 40, status: 'approved' },
    ],
  },
  {
    id: 'sup_mumbai', port: 'INBOM', name: 'Mumbai Components', country: 'IN', city: 'Mumbai', email: 'payments@mumbaicomp.example',
    wallets: [{ network: 'solana', ago: 150, status: 'approved' }],
  },
  {
    id: 'sup_ningbo', port: 'CNNGB', name: 'Ningbo Home Goods', country: 'CN', city: 'Ningbo', email: 'sales@ningbohome.example',
    // added two weeks ago; its address still waits for a second person
    wallets: [{ network: 'tempo', ago: 14, status: 'proposed' }],
  },
]

interface Plan {
  supplier: string
  network?: Network
  invoice: string
  usd: number
  /** how long ago it was created */
  ago: number
  status: PaymentStatus
  by?: string
  approver?: string
  reason?: string
  source?: Payment['source']
  /** what actually arrived, when it differs from the invoice (a review case) */
  paidUsd?: number
}

// Oldest first. Most history is reconciled; the last few are in flight so every role has something to do.
const PLANS: Plan[] = [
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0412', usd: 38_500, ago: 192 * DAY, status: 'reconciled' },
  { supplier: 'sup_hongkong', invoice: 'HKE-24-1187', usd: 21_300, ago: 176 * DAY, status: 'reconciled' },
  { supplier: 'sup_guangzhou', invoice: 'GZT-0391', usd: 14_750, ago: 161 * DAY, status: 'reconciled' },
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0455', usd: 52_000, ago: 149 * DAY, status: 'reconciled', source: 'ai' },
  { supplier: 'sup_mumbai', network: 'solana', invoice: 'MC/26/0098', usd: 9_800, ago: 131 * DAY, status: 'reconciled' },
  { supplier: 'sup_hcmc', invoice: 'GP-2026-221', usd: 27_400, ago: 119 * DAY, status: 'reconciled' },
  { supplier: 'sup_hongkong', invoice: 'HKE-24-1302', usd: 33_900, ago: 104 * DAY, status: 'reconciled', source: 'ai' },
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0533', usd: 61_200, ago: 95 * DAY, status: 'reconciled', by: 'mem_marina', approver: 'mem_rafael' },
  { supplier: 'sup_guangzhou', invoice: 'GZT-0447', usd: 18_600, ago: 80 * DAY, status: 'reconciled', source: 'ai' },
  { supplier: 'sup_hcmc', invoice: 'GP-2026-260', usd: 12_900, ago: 66 * DAY, status: 'reconciled' },
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0601', usd: 54_000, ago: 52 * DAY, status: 'reconciled', source: 'ai' },
  { supplier: 'sup_hongkong', invoice: 'HKE-24-1419', usd: 42_300, ago: 45 * DAY, status: 'reconciled' },
  { supplier: 'sup_mumbai', network: 'solana', invoice: 'MC/26/0131', usd: 22_500, ago: 31 * DAY, status: 'reconciled', source: 'ai' },
  { supplier: 'sup_guangzhou', invoice: 'GZT-0502', usd: 31_000, ago: 24 * DAY, status: 'reconciled' },
  { supplier: 'sup_hcmc', network: 'solana', invoice: 'GP-2026-288', usd: 19_200, ago: 18 * DAY, status: 'reconciled', source: 'ai' },
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0721', usd: 68_000, ago: 15 * DAY, status: 'reconciled', source: 'ai', by: 'mem_marina', approver: 'mem_rafael' },
  {
    supplier: 'sup_guangzhou',
    invoice: 'GZT-0533',
    usd: 29_400,
    ago: 13 * DAY,
    status: 'rejected',
    reason: 'Amount does not match the purchase order. Ask Guangzhou for a corrected invoice.',
  },
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0733', usd: 7_400, ago: 11 * DAY, status: 'cancelled', reason: 'Supplier sent a corrected invoice, INV-2026-0772.' },
  { supplier: 'sup_hcmc', invoice: 'GP-2026-301', usd: 15_600, ago: 9 * DAY, status: 'reconciled' },
  { supplier: 'sup_hongkong', invoice: 'HKE-24-1533', usd: 42_300, ago: 3 * DAY, status: 'in_review', source: 'ai', paidUsd: 42_030 },
  { supplier: 'sup_shenzhen', invoice: 'INV-2026-0772', usd: 120_000, ago: 2 * DAY, status: 'approved', source: 'ai' },
  { supplier: 'sup_guangzhou', invoice: 'GZT-0561', usd: 31_000, ago: 26 * HOUR, status: 'pending_approval', source: 'ai' },
  { supplier: 'sup_hcmc', invoice: 'GP-2026-318', usd: 15_600, ago: 6 * HOUR, status: 'pending_approval', by: 'mem_marina' },
  { supplier: 'sup_mumbai', network: 'solana', invoice: 'MC/26/0167', usd: 8_400, ago: 4 * HOUR, status: 'approved' },
]

const iso = (ms: number) => new Date(ms).toISOString()

export function buildSeed(nowMs: number): DemoState {
  // same wallets, references and hashes on every reset
  const rnd = lcg(20261012)
  const address = (network: Network) => (network === 'tempo' ? hex(20, rnd) : base58(44, rnd))
  const txId = (network: Network) => (network === 'tempo' ? hex(32, rnd) : base58(88, rnd))
  /** Moves a timestamp into Brazilian office hours (13:00-20:00 UTC) so the history reads like a real week. */
  const officeHours = (ms: number) => {
    const d = new Date(ms)
    d.setUTCHours(13 + Math.floor(rnd() * 7), Math.floor(rnd() * 60), 0, 0)
    return d.getTime()
  }

  const settings = { ...DEFAULT_SETTINGS }
  const oldest = nowMs - 220 * DAY
  const members: Member[] = MEMBERS.map((m, i) => ({ ...m, joinedAt: iso(m.status === 'invited' ? nowMs - 2 * DAY : oldest + i * DAY) }))

  const activity: Activity[] = []
  let act = 0
  const push = (a: Omit<Activity, 'id'>) => activity.push({ id: `act_${++act}`, ...a })

  let walletSeq = 0
  const suppliers: Supplier[] = SUPPLIERS.map(({ wallets: plans, ...profile }) => {
    const createdAt = iso(officeHours(nowMs - plans[0].ago * DAY))
    const versions: Record<Network, number> = { tempo: 0, solana: 0 }
    const wallets: Wallet[] = plans.map((w) => {
      const proposedAt = officeHours(nowMs - w.ago * DAY)
      const approvedAt = proposedAt + (2 + rnd() * 20) * HOUR
      return {
        id: `wal_${String(++walletSeq).padStart(3, '0')}`,
        network: w.network,
        address: address(w.network),
        version: ++versions[w.network],
        status: w.status,
        proposedBy: 'mem_julia',
        proposedAt: iso(proposedAt),
        approvedBy: w.status === 'proposed' ? null : 'mem_rafael',
        approvedAt: w.status === 'proposed' ? null : iso(approvedAt),
      }
    })
    push({ at: createdAt, type: 'supplier_added', actorId: 'mem_julia', supplierId: profile.id })
    for (const w of wallets) {
      push({ at: w.proposedAt, type: 'wallet_proposed', actorId: w.proposedBy, supplierId: profile.id, walletId: w.id })
      if (w.approvedAt) push({ at: w.approvedAt, type: 'wallet_approved', actorId: w.approvedBy, supplierId: profile.id, walletId: w.id })
    }
    return { ...profile, wallets, createdAt }
  })

  let block = 4_100_000
  let slot = 412_000_000

  const state: DemoState = {
    version: DEMO_VERSION,
    sessionMemberId: null,
    members,
    suppliers,
    payments: [],
    activity,
    settings,
    readAt: iso(nowMs - 2 * DAY),
    seq: 0,
  }

  PLANS.forEach((plan, i) => {
    const id = `pay_${String(i + 1).padStart(4, '0')}`
    const network = plan.network ?? 'tempo'
    const recent = plan.ago < DAY
    const created = recent ? nowMs - plan.ago : officeHours(nowMs - plan.ago)
    const createdBy = plan.by ?? 'mem_julia'
    const amountCents = plan.usd * 100
    const needsSecond = amountCents >= settings.approvalThresholdCents
    const approver = plan.approver ?? (createdBy === 'mem_rafael' ? 'mem_marina' : 'mem_rafael')
    const approvedAt = created + (1 + rnd() * 3) * HOUR
    const paidAt = approvedAt + (0.5 + rnd()) * HOUR
    const due = new Date(created + 21 * DAY).toISOString().slice(0, 10)

    const payment: Payment = {
      id,
      reference: orderReference(rnd),
      supplierId: plan.supplier,
      network,
      invoiceNumber: plan.invoice,
      dueDate: due,
      source: plan.source ?? 'manual',
      invoiceFilename: plan.source === 'ai' ? `${plan.invoice.replace(/\W+/g, '_')}.pdf` : null,
      quote: quote(amountCents, settings),
      status: plan.status,
      createdBy,
      createdAt: iso(created),
      approval: null,
      rejection: null,
      cancellation: null,
      settlement: null,
      recon: null,
      error: null,
    }
    push({ at: payment.createdAt, type: 'payment_created', actorId: createdBy, paymentId: id })

    if (plan.status === 'pending_approval' || plan.status === 'rejected') {
      push({ at: payment.createdAt, type: 'approval_requested', actorId: createdBy, paymentId: id })
      if (plan.status === 'rejected') {
        payment.rejection = { by: approver, at: iso(approvedAt), reason: plan.reason ?? '' }
        push({ at: iso(approvedAt), type: 'rejected', actorId: approver, paymentId: id })
      }
    } else {
      const auto = !needsSecond
      payment.approval = {
        by: auto ? null : approver,
        at: auto ? payment.createdAt : iso(approvedAt),
        dataHash: approvalHash(state, payment),
        auto,
      }
      if (auto) push({ at: payment.createdAt, type: 'auto_approved', actorId: null, paymentId: id })
      else {
        push({ at: payment.createdAt, type: 'approval_requested', actorId: createdBy, paymentId: id })
        push({ at: iso(approvedAt), type: 'approved', actorId: approver, paymentId: id })
      }
    }
    if (plan.status === 'cancelled') {
      const at = iso(approvedAt + HOUR)
      payment.cancellation = { by: createdBy, at, reason: plan.reason ?? '' }
      push({ at, type: 'cancelled', actorId: createdBy, paymentId: id })
    }

    if (plan.status === 'reconciled' || plan.status === 'in_review') {
      const height = network === 'tempo' ? (block += 40_000 + Math.floor(rnd() * 30_000)) : (slot += 900_000 + Math.floor(rnd() * 400_000))
      // the version that was in use on the day it was paid
      const supplier = suppliers.find((s) => s.id === plan.supplier)!
      const wallet = supplier.wallets
        .filter((w) => w.network === network && w.approvedAt && w.approvedAt <= iso(paidAt))
        .sort((a, b) => b.version - a.version)[0]
      payment.settlement = {
        mode: 'simulated',
        network,
        walletId: wallet.id,
        txHash: txId(network),
        blockNumber: height,
        logIndex: 0,
        confirmMs: (network === 'tempo' ? 1_400 : 900) + Math.floor(rnd() * 900),
        paidAt: iso(paidAt),
      }
      // senders are approvers or owners (the plan's permission table)
      push({ at: iso(paidAt), type: 'payment_started', actorId: approver, paymentId: id })
      push({ at: iso(paidAt + 2_000), type: 'payment_sent', actorId: null, paymentId: id })
      const matchedAt = iso(paidAt + (2 + rnd() * 20) * 60_000)
      const paidCents = (plan.paidUsd ?? plan.usd) * 100
      payment.recon = {
        matchedAt,
        checks: { token: true, recipient: true, amount: paidCents === amountCents, memo: true, receipt: true },
        expectedCents: amountCents,
        paidCents,
      }
      push({ at: matchedAt, type: plan.status === 'reconciled' ? 'reconciled' : 'review_opened', actorId: null, paymentId: id })
    }
    state.payments.unshift(payment)
  })

  push({ at: members[4].joinedAt, type: 'member_invited', actorId: 'mem_marina', memberId: members[4].id })

  activity.sort((a, b) => b.at.localeCompare(a.at))
  state.seq = act + PLANS.length + 100
  return state
}
