'use client'

// The demo's "backend": one state object in memory, saved to localStorage so each visitor gets a private sandbox
// that survives reloads and syncs across tabs. Every change goes through a pure function from rules.ts and is
// applied synchronously, so the checks (role, approval hash, single claim before sending) cannot interleave.
import { useEffect, useSyncExternalStore } from 'react'
import * as rules from './rules'
import { buildSeed, DEMO_VERSION } from './seed'
import { cryptoRand, orderReference } from './codes'
import { memberOf, paymentOf, supplierOf, walletOf } from './selectors'
import { mergeLiveOrders, mergeLiveSuppliers, seedSuppliers } from './live'
import {
  addLiveSupplier,
  createLiveOrder,
  decideLiveWallet,
  goesLive,
  getLiveSettings,
  importDemoSuppliers,
  listLiveOrders,
  listLiveSuppliers,
  liveDecision,
  LiveError,
  matchOnTestnet,
  proposeLiveWallet,
  putLiveThreshold,
  sendOnTestnet,
  simulateMatch,
  simulateTransfer,
} from './settle'
import type { DemoState, Member, Network, Payment, PaymentStatus, Reconciliation, Role, Settings, Settlement } from './types'

const KEY = 'seamoney.demo'

let current: DemoState | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function save(state: DemoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // private mode or full storage: the demo still works for this tab
  }
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed?.version === DEMO_VERSION) return parsed
    }
  } catch {
    // corrupt data: start over
  }
  return buildSeed(Date.now())
}

function init() {
  if (current) return
  current = load()
  save(current)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Applies a pure change. Throws the rule error to the caller, leaving the state untouched. */
function commit(change: (s: DemoState) => DemoState): DemoState {
  if (!current) throw new Error('demo state not loaded')
  const next = change(current)
  current = next
  save(next)
  emit()
  return next
}

const now = () => new Date().toISOString()
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Connected to the rules service: payments live there too (see live.ts). */
const isLive = () => current?.settings.settlementMode === 'testnet'

/** Approve or turn down a wallet version in the rules service too, when it is known there. */
async function decideWallet(supplierId: string, walletId: string, action: 'approve' | 'reject') {
  const supplier = current?.suppliers.find((s) => s.id === supplierId)
  const wallet = supplier?.wallets.find((w) => w.id === walletId)
  if (isLive() && supplier?.liveId && wallet?.liveId) await decideLiveWallet(supplier.liveId, wallet.liveId, action)
}

/** The rules-service order of a payment, when it has one. */
const liveOrderOf = (id: string) => current?.payments.find((p) => p.id === id)?.liveOrderId

function actor(): string {
  const id = current?.sessionMemberId
  if (!id) throw new rules.DemoRuleError('role')
  return id
}

function newId(prefix: string): string {
  let id = ''
  commit((s) => {
    const r = rules.nextId(s, prefix)
    id = r.id
    return r.state
  })
  return id
}

/* ------------------------------ actions ------------------------------ */

/** Asks the network for the transfer, a few times: an indexer can be a block or two behind the send. */
async function findTransfer(payment: Payment): Promise<Reconciliation | null> {
  const live = payment.settlement?.mode === 'testnet' ? payment.settlement.liveOrderId : undefined
  if (!live) return simulateMatch(payment)
  for (let attempt = 0; attempt < 3; attempt++) {
    const recon = await matchOnTestnet(live, payment.quote.amountCents)
    if (recon) return recon
    await pause(2_000)
  }
  return null
}

export const demo = {
  signIn(memberId: string) {
    commit((s) => ({ ...s, sessionMemberId: memberId }))
  },
  /**
   * Signed in with a real account of the rules service: sit at the desk as the member with the same role and settle
   * Tempo payments on the testnet. The people, suppliers and history stay the fictitious ones of this browser.
   */
  connect(role: Role) {
    commit((s) => {
      const m = s.members.find((x) => x.role === role && x.status === 'active')
      if (!m) throw new rules.DemoRuleError('role')
      return { ...s, sessionMemberId: m.id, settings: { ...s.settings, settlementMode: 'testnet' } }
    })
  },
  /** Offline: sit at the desk as anyone, with simulated settlement (no account of the rules service involved). */
  signInOffline(memberId: string) {
    commit((s) => ({ ...s, sessionMemberId: memberId, settings: { ...s.settings, settlementMode: 'simulated' } }))
  },
  signOut() {
    commit((s) => ({ ...s, sessionMemberId: null }))
  },
  /** Back to the seeded workspace, keeping who is signed in. */
  reset() {
    const who = current?.sessionMemberId ?? null
    current = { ...buildSeed(Date.now()), sessionMemberId: who }
    save(current)
    emit()
  },
  markRead() {
    commit((s) => ({ ...s, readAt: now() }))
  },

  /**
   * Connected to the rules service, the order is created there too (and comes back with its id), so the approver can
   * act from another computer. The local rules run first, so nothing they refuse ever reaches the service.
   */
  async createPayment(input: rules.NewPayment): Promise<string> {
    await pause(450)
    const by = actor()
    const reference = orderReference(cryptoRand)
    if (!isLive()) {
      const id = newId('pay')
      commit((s) => rules.createPayment(s, input, by, now(), id, reference))
      return id
    }
    const at = now()
    const preview = rules.createPayment(current!, input, by, at, 'pay_preview', reference)
    const draft = paymentOf(preview, 'pay_preview')!
    const order = await createLiveOrder(draft, supplierOf(preview, draft)!, walletOf(preview, draft)!)
    const id = newId('pay')
    commit((s) => mergeLiveOrders(rules.createPayment(s, input, by, at, id, reference), [order], at))
    return id
  },
  async approve(id: string) {
    await pause(350)
    const by = actor()
    const live = liveOrderOf(id)
    // the local rules first (they throw on a refusal), so the service never records what this workspace would not
    rules.approvePayment(current!, id, by, now())
    if (live) await liveDecision(live, 'approve')
    commit((s) => rules.approvePayment(s, id, by, now()))
  },
  async reject(id: string, reason: string) {
    await pause(350)
    const by = actor()
    const live = liveOrderOf(id)
    rules.rejectPayment(current!, id, by, now(), reason)
    if (live) await liveDecision(live, 'reject', reason)
    commit((s) => rules.rejectPayment(s, id, by, now(), reason))
  },
  async cancel(id: string, reason: string) {
    await pause(300)
    const by = actor()
    const live = liveOrderOf(id)
    rules.cancelPayment(current!, id, by, now(), reason)
    if (live) await liveDecision(live, 'cancel', reason)
    commit((s) => rules.cancelPayment(s, id, by, now(), reason))
  },
  /**
   * Brings what happened in the rules service into this browser: orders created, approved, rejected, cancelled or
   * paid by someone at another computer. Only when connected; a failed call just waits for the next one.
   */
  async syncLive() {
    if (!current || !isLive() || !current.sessionMemberId) return
    try {
      // suppliers and wallets first: an order made elsewhere only maps onto a supplier and wallet known here
      let { suppliers } = await listLiveSuppliers()
      if (suppliers.length === 0 && current.suppliers.length > 0) suppliers = (await importDemoSuppliers(seedSuppliers(current))).suppliers
      commit((s) => mergeLiveSuppliers(s, suppliers, now()))
      // the approval threshold is the company's, kept by the service: follow it here
      const { approvalThresholdCents } = await getLiveSettings()
      if (current.settings.approvalThresholdCents !== approvalThresholdCents) {
        commit((s) => ({ ...s, settings: { ...s.settings, approvalThresholdCents } }))
      }
      const { orders } = await listLiveOrders()
      commit((s) => mergeLiveOrders(s, orders, now()))
    } catch {
      // not signed in any more, or the stack is down: the settings page says which
    }
  },
  async requestReapproval(id: string) {
    await pause(250)
    commit((s) => rules.requestReapproval(s, id, actor(), now()))
  },

  /**
   * Claim, send, then let the reconciliation job look for the transfer. The claim is synchronous, so a double click
   * or a second tab gets "bad_state" instead of a second transfer. Resolves to the final status.
   */
  async send(id: string): Promise<PaymentStatus> {
    const by = actor()
    const claimed = commit((s) => rules.claimSend(s, id, by, now()))
    const payment = paymentOf(claimed, id)!
    const supplier = supplierOf(claimed, payment)!
    const wallet = walletOf(claimed, payment)!
    let settlement: Settlement
    try {
      settlement = goesLive(payment.network, claimed.settings.settlementMode)
        ? await sendOnTestnet(payment, supplier, wallet)
        : await simulateTransfer(payment.network, wallet.id)
    } catch (e) {
      const message = e instanceof LiveError ? e.message : 'The transfer could not be sent.'
      commit((s) => rules.failSend(s, id, now(), message))
      throw e instanceof LiveError ? e : new Error(message)
    }
    const sent = commit((s) => rules.completeSend(s, id, settlement))
    const recon = await findTransfer(paymentOf(sent, id)!)
    if (!recon) return 'sent'
    const done = commit((s) => rules.reconcilePayment(s, id, recon, null))
    return paymentOf(done, id)!.status
  },

  /** A person asks for another lookup of a sent payment that was not found yet. Resolves to the final status. */
  async recheck(id: string): Promise<PaymentStatus> {
    const by = actor()
    const payment = paymentOf(current!, id)
    if (!payment) throw new rules.DemoRuleError('not_found')
    const verdict = rules.checkRecheck(memberOf(current!, by)!, payment)
    if (!verdict.ok) throw new rules.DemoRuleError(verdict.code)
    const recon = await findTransfer(payment)
    if (!recon) return 'sent'
    const next = commit((s) => rules.reconcilePayment(s, id, recon, by))
    return paymentOf(next, id)!.status
  },

  async addSupplier(input: rules.NewSupplier): Promise<string> {
    await pause(300)
    const by = actor()
    const at = now()
    rules.addSupplier(current!, input, by, at, 'sup_preview', 'wal_preview')
    const live = isLive()
      ? await addLiveSupplier({ name: input.name, country: input.country, city: input.city, port: input.port, email: input.email, wallet: { network: input.network, address: input.wallet.trim() } })
      : null
    const id = newId('sup')
    const walletId = newId('wal')
    commit((s) => {
      const added = rules.addSupplier(s, input, by, at, id, walletId)
      return live ? mergeLiveSuppliers(added, [live.supplier], at) : added
    })
    return id
  },
  async updateSupplier(id: string, input: rules.SupplierProfile) {
    await pause(300)
    commit((s) => rules.updateSupplier(s, id, input, actor(), now()))
  },
  async proposeWallet(supplierId: string, network: Network, address: string) {
    await pause(300)
    const by = actor()
    const at = now()
    rules.proposeWallet(current!, supplierId, network, address, by, at, 'wal_preview')
    const supplierLive = current!.suppliers.find((s) => s.id === supplierId)?.liveId
    const live = isLive() && supplierLive ? await proposeLiveWallet(supplierLive, network, address.trim()) : null
    const walletId = newId('wal')
    commit((s) => {
      const proposed = rules.proposeWallet(s, supplierId, network, address, by, at, walletId)
      return live ? mergeLiveSuppliers(proposed, [live.supplier], at) : proposed
    })
  },
  async approveWallet(supplierId: string, walletId: string) {
    await pause(400)
    const by = actor()
    rules.approveWallet(current!, supplierId, walletId, by, now())
    await decideWallet(supplierId, walletId, 'approve')
    commit((s) => rules.approveWallet(s, supplierId, walletId, by, now()))
  },
  async rejectWallet(supplierId: string, walletId: string) {
    await pause(300)
    const by = actor()
    rules.rejectWallet(current!, supplierId, walletId, by, now())
    await decideWallet(supplierId, walletId, 'reject')
    commit((s) => rules.rejectWallet(s, supplierId, walletId, by, now()))
  },

  async inviteMember(input: { name: string; email: string; role: Role }) {
    await pause(350)
    const by = actor()
    const id = newId('mem')
    commit((s) => rules.inviteMember(s, input, by, now(), id))
  },
  async changeRole(memberId: string, role: Role) {
    await pause(250)
    commit((s) => rules.changeRole(s, memberId, role, actor(), now()))
  },
  async updateSettings(patch: Partial<Settings>) {
    await pause(300)
    const by = actor()
    rules.updateSettings(current!, patch, by, now())
    // connected, the approval threshold belongs to the company in the rules service (owners only)
    if (isLive() && patch.approvalThresholdCents != null && patch.approvalThresholdCents !== current!.settings.approvalThresholdCents) {
      await putLiveThreshold(patch.approvalThresholdCents)
    }
    commit((s) => rules.updateSettings(s, patch, by, now()))
  },
}

/* ------------------------------ hooks ------------------------------ */

/** Loads the sandbox once on the client and keeps open tabs in sync. Render it once, high in the tree. */
export function DemoBoot() {
  useEffect(() => {
    init()
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        current = JSON.parse(e.newValue) as DemoState
        emit()
      } catch {
        // ignore a half-written value
      }
    }
    window.addEventListener('storage', onStorage)
    // connected to the rules service: pick up what others did, on opening, every few seconds and on coming back
    const sync = () => void demo.syncLive()
    sync()
    const timer = window.setInterval(sync, 8_000)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', sync)
      window.clearInterval(timer)
    }
  }, [])
  return null
}

/** The whole demo state, or null until it is loaded in the browser (always null on the server). */
export function useDemoState(): DemoState | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}

/** The person signed in to the demo. */
export function useMe(): Member | null {
  const state = useDemoState()
  return state?.members.find((m) => m.id === state.sessionMemberId) ?? null
}
