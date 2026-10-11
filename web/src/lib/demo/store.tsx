'use client'

// The demo's "backend": one state object in memory, saved to localStorage so each visitor gets a private sandbox
// that survives reloads and syncs across tabs. Every change goes through a pure function from rules.ts and is
// applied synchronously, so the checks (role, approval hash, single claim before sending) cannot interleave.
import { useEffect, useSyncExternalStore } from 'react'
import * as rules from './rules'
import { buildSeed, DEMO_VERSION } from './seed'
import { cryptoRand, orderReference } from './codes'
import { memberOf, paymentOf, supplierOf, walletOf } from './selectors'
import { goesLive, LiveError, matchOnTestnet, sendOnTestnet, simulateMatch, simulateTransfer } from './settle'
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

  async createPayment(input: rules.NewPayment): Promise<string> {
    await pause(450)
    const by = actor()
    const id = newId('pay')
    commit((s) => rules.createPayment(s, input, by, now(), id, orderReference(cryptoRand)))
    return id
  },
  async approve(id: string) {
    await pause(350)
    commit((s) => rules.approvePayment(s, id, actor(), now()))
  },
  async reject(id: string, reason: string) {
    await pause(350)
    commit((s) => rules.rejectPayment(s, id, actor(), now(), reason))
  },
  async cancel(id: string, reason: string) {
    await pause(300)
    commit((s) => rules.cancelPayment(s, id, actor(), now(), reason))
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
    const id = newId('sup')
    const walletId = newId('wal')
    commit((s) => rules.addSupplier(s, input, by, now(), id, walletId))
    return id
  },
  async updateSupplier(id: string, input: rules.SupplierProfile) {
    await pause(300)
    commit((s) => rules.updateSupplier(s, id, input, actor(), now()))
  },
  async proposeWallet(supplierId: string, network: Network, address: string) {
    await pause(300)
    const by = actor()
    const walletId = newId('wal')
    commit((s) => rules.proposeWallet(s, supplierId, network, address, by, now(), walletId))
  },
  async approveWallet(supplierId: string, walletId: string) {
    await pause(400)
    commit((s) => rules.approveWallet(s, supplierId, walletId, actor(), now()))
  },
  async rejectWallet(supplierId: string, walletId: string) {
    await pause(300)
    commit((s) => rules.rejectWallet(s, supplierId, walletId, actor(), now()))
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
    commit((s) => rules.updateSettings(s, patch, actor(), now()))
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
    return () => window.removeEventListener('storage', onStorage)
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
