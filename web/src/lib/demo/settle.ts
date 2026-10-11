// How a demo payment reaches the "chain". Two modes, chosen in Settings:
//  - simulated: nothing leaves the browser. A random hash stands in for the transaction and is labelled simulated.
//  - testnet: the same payment is created in the Java rules API and sent for real (Tempo testnet or Solana devnet) through the
//    existing /api proxy (web -> Java -> Python -> Tempo). Only works when that stack is running (docker compose)
//    and the visitor signed in at /app/login with an account that may pay (owner or approver).
// Testnet mode covers both networks: Tempo Moderato and Solana devnet, through the same Java and Python services.
import { base58, cryptoRand, hex } from './codes'
import type { LiveOrder, LiveSupplier } from './live'
import type { Network, Payment, Reconciliation, Settlement, Wallet } from './types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ------------------------------ simulated ------------------------------ */

/** Does this payment go to a real test network (Tempo testnet or Solana devnet)? Only when Settings ask for it. */
export const goesLive = (_network: Network, mode: Settlement['mode']) => mode === 'testnet'

export async function simulateTransfer(network: Network, walletId: string): Promise<Settlement> {
  const started = performance.now()
  await sleep(1_300 + Math.random() * 900)
  const since = (Date.now() - Date.UTC(2026, 9, 1)) / 1000
  return {
    mode: 'simulated',
    network,
    walletId,
    txHash: network === 'tempo' ? hex(32, cryptoRand) : base58(88, cryptoRand),
    // a plausible, always-increasing block (Tempo) or slot (Solana); not a real one
    blockNumber: network === 'tempo' ? 4_600_000 + Math.floor(since) : 412_000_000 + Math.floor(since * 2.5),
    logIndex: 0,
    confirmMs: Math.round(performance.now() - started),
    paidAt: new Date().toISOString(),
  }
}

export async function simulateMatch(payment: Payment): Promise<Reconciliation> {
  await sleep(900)
  const cents = payment.quote.amountCents
  return {
    matchedAt: new Date().toISOString(),
    checks: { token: true, recipient: true, amount: true, memo: true, receipt: true },
    expectedCents: cents,
    paidCents: cents,
  }
}

/* ------------------------------ live testnet ------------------------------ */

export class LiveError extends Error {}

/** Can a testnet payment go out now: the stack answers ('ok'), it does but nobody signed in ('signin'), or 'no'. */
export async function liveAvailable(): Promise<'ok' | 'signin' | 'no'> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(6_000) })
    const body = (await res.json()) as { checks?: Record<string, string> }
    if (body.checks?.rulesApi !== 'ok' || body.checks?.chainService !== 'ok') return 'no'
    const session = await fetch('/api/session', { cache: 'no-store', signal: AbortSignal.timeout(6_000) })
    return session.ok ? 'ok' : 'signin'
  } catch {
    return 'no'
  }
}

/** Errors of the Java service, in words a person can act on. */
function liveMessage(status: number, error: string | undefined): string {
  if (status === 401) return 'The testnet session ended. Sign in again to pay on the testnet.'
  if (status === 403) return 'The signed-in testnet account may not do this. Use an owner or approver account.'
  return error ?? `The rules service answered ${status}.`
}

export class LiveHttpError extends LiveError {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export async function call<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new LiveError('The live testnet stack is not reachable.')
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new LiveHttpError(liveMessage(res.status, json.error), res.status)
  return json
}

const post = <T>(path: string, body?: unknown) => call<T>(path, 'POST', body)

/** The fields a new order needs: the payment, its supplier and the approved wallet it pays. */
function orderBody(payment: Payment, supplier: { name: string; country: string }, wallet: Wallet) {
  return {
    supplierName: supplier.name,
    supplierCountry: supplier.country || undefined,
    supplierWallet: wallet.address,
    invoiceNumber: payment.invoiceNumber,
    reference: payment.reference,
    network: payment.network,
    amountCents: payment.quote.amountCents,
    dueDate: payment.dueDate ?? undefined,
    extractionSource: payment.source,
    invoiceFilename: payment.invoiceFilename ?? undefined,
  }
}

/** The Java order made for this payment by an earlier attempt, found by its reference. */
async function existingOrder(reference: string): Promise<LiveOrder | null> {
  const { orders } = await listLiveOrders()
  return orders.find((o) => o.reference === reference) ?? null
}

export const listLiveOrders = () => call<{ orders: LiveOrder[] }>('/api/orders?limit=500', 'GET')

/* suppliers and wallet versions in the rules service (see live.ts) */
export const listLiveSuppliers = () => call<{ suppliers: LiveSupplier[] }>('/api/suppliers', 'GET')
export const importDemoSuppliers = (seed: unknown) => post<{ suppliers: LiveSupplier[] }>('/api/suppliers/import-demo', seed)
export const addLiveSupplier = (body: { name: string; country: string; city: string; port: string; email: string; wallet: { network: Network; address: string } }) =>
  post<{ supplier: LiveSupplier }>('/api/suppliers', body)
export const proposeLiveWallet = (supplierLiveId: string, network: Network, address: string) =>
  post<{ supplier: LiveSupplier }>(`/api/suppliers/${encodeURIComponent(supplierLiveId)}/wallets`, { network, address })
export const decideLiveWallet = (supplierLiveId: string, walletLiveId: string, action: 'approve' | 'reject') =>
  post<{ supplier: LiveSupplier }>(`/api/suppliers/${encodeURIComponent(supplierLiveId)}/wallets/${encodeURIComponent(walletLiveId)}/${action}`)

/**
 * Creates the order in the rules service, with this workspace's opaque reference as the memo (same SM-XXXXXXXX
 * format). From the approval threshold up it waits there for a second person, exactly as here.
 */
export async function createLiveOrder(payment: Payment, supplier: { name: string; country: string }, wallet: Wallet): Promise<LiveOrder> {
  try {
    return (await post<{ order: LiveOrder }>('/api/orders', orderBody(payment, supplier, wallet))).order
  } catch (e) {
    // a retry after a lost answer: the order with this reference is already there
    if (!(e instanceof LiveHttpError && e.status === 409)) throw e
    const order = await existingOrder(payment.reference)
    if (!order) throw e
    return order
  }
}

/** Approve, reject or cancel the order in the rules service; it checks roles and who created the order. */
export async function liveDecision(orderId: string, action: 'approve' | 'reject' | 'cancel', reason?: string): Promise<LiveOrder> {
  return (await post<{ order: LiveOrder }>(`/api/orders/${encodeURIComponent(orderId)}/${action}`, reason === undefined ? undefined : { reason })).order
}

/**
 * Pays the order on its network (Tempo testnet or Solana devnet). Java's idempotency key makes sure a payment that did
 * reach the chain is not sent again. A payment made before the workspace was connected is created in the rules
 * service first; it can only be paid there if the policy approves it (below the threshold).
 */
export async function sendOnTestnet(payment: Payment, supplier: { name: string; country: string }, wallet: Wallet): Promise<Settlement> {
  let orderId = payment.liveOrderId
  if (!orderId) {
    const order = await createLiveOrder(payment, supplier, wallet)
    if (order.status !== 'approved' && order.status !== 'sent' && order.status !== 'reconciled') {
      throw new LiveError('This payment was approved before the workspace was connected to the testnet. Create it again so a second person approves it there.')
    }
    orderId = order.id
  }
  let paid: LiveOrder
  try {
    paid = (await post<{ order: LiveOrder }>(`/api/orders/${encodeURIComponent(orderId)}/pay`)).order
  } catch (e) {
    // already paid (another tab, or an answer that got lost): take the transaction the service has
    if (!(e instanceof LiveHttpError && e.status === 409)) throw e
    const order = await existingOrder(payment.reference)
    if (!order?.txHash) throw e
    paid = order
  }
  if (!paid.txHash || paid.blockNumber == null) throw new LiveError('The payment did not return a transaction.')
  return {
    mode: 'testnet',
    network: payment.network,
    walletId: wallet.id,
    txHash: paid.txHash,
    blockNumber: paid.blockNumber,
    logIndex: paid.logIndex ?? 0,
    confirmMs: paid.confirmMs ?? 0,
    paidAt: paid.paidAt ?? new Date().toISOString(),
    liveOrderId: paid.id,
  }
}

/**
 * Asks the Java service to find the transfer on-chain by memo and check it. Returns null while no matching transfer
 * is found yet (try again in a moment); a transfer that does not match comes back with the failed checks.
 */
export async function matchOnTestnet(liveOrderId: string, expectedCents: number): Promise<Reconciliation | null> {
  const res = await post<{ ok: boolean; order: LiveOrder; checks?: Reconciliation['checks'] | null }>(
    `/api/orders/${encodeURIComponent(liveOrderId)}/reconcile`,
  )
  const recon = res.order.recon
  if (res.ok && recon) return { matchedAt: recon.matchedAt, checks: recon.checks, expectedCents: recon.expectedCents, paidCents: recon.paidCents }
  if (!res.checks) return null
  return { matchedAt: new Date().toISOString(), checks: res.checks, expectedCents, paidCents: 0 }
}
