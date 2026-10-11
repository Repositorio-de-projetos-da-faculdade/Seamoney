// How a demo payment reaches the "chain". Two modes, chosen in Settings:
//  - simulated: nothing leaves the browser. A random hash stands in for the transaction and is labelled simulated.
//  - testnet: the same payment is created in the Java rules API and sent for real on the Tempo testnet through the
//    existing /api proxy (web -> Java -> Python -> Tempo). Only works when that stack is running (docker compose)
//    and the visitor signed in at /login with an account that may pay (owner or approver).
// Solana payments are always simulated here: its adapter is not wired to the Java service yet.
import { base58, cryptoRand, hex } from './codes'
import type { Network, Payment, Reconciliation, Settlement, Wallet } from './types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ------------------------------ simulated ------------------------------ */

/** Can this payment go to a real testnet? Only Tempo, and only when Settings ask for it. */
export const goesLive = (network: Network, mode: Settlement['mode']) => network === 'tempo' && mode === 'testnet'

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
  if (status === 401) return 'Sign in at /login to pay on the testnet.'
  if (status === 403) return 'The signed-in testnet account may not do this. Use an owner or approver account.'
  return error ?? `The rules service answered ${status}.`
}

class LiveHttpError extends LiveError {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function call<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
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

interface LiveOrder {
  id: string
  reference: string
  status: string
  txHash: string | null
  blockNumber: number | null
  logIndex: number | null
  confirmMs: number | null
  paidAt: string | null
  recon: { matchedAt: string; expectedCents: number; paidCents: number; checks: Reconciliation['checks'] } | null
}

/** The Java order made for this payment by an earlier attempt, found by its reference. */
async function existingOrder(reference: string): Promise<LiveOrder | null> {
  const { orders } = await call<{ orders: LiveOrder[] }>('/api/orders?limit=500', 'GET')
  return orders.find((o) => o.reference === reference) ?? null
}

/**
 * Creates the order in the Java service and pays it on the Tempo testnet. The opaque order reference of this demo
 * becomes the memo (Java accepts it in the same SM-XXXXXXXX format); the invoice number stays off-chain. A retry after
 * a failed send finds the order made the first time instead of creating a second one, and Java's idempotency key
 * makes sure a payment that did reach the chain is not sent again.
 */
export async function sendOnTestnet(payment: Payment, supplier: { name: string; country: string }, wallet: Wallet): Promise<Settlement> {
  let order: LiveOrder | null
  try {
    order = (
      await post<{ order: LiveOrder }>('/api/orders', {
        supplierName: supplier.name,
        supplierCountry: supplier.country || undefined,
        supplierWallet: wallet.address,
        invoiceNumber: payment.invoiceNumber,
        reference: payment.reference,
        amountCents: payment.quote.amountCents,
        dueDate: payment.dueDate ?? undefined,
        extractionSource: payment.source,
        invoiceFilename: payment.invoiceFilename ?? undefined,
      })
    ).order
  } catch (e) {
    if (!(e instanceof LiveHttpError && e.status === 409)) throw e
    order = await existingOrder(payment.reference)
    if (!order) throw e
  }
  const paid =
    order.status === 'quoted' ? (await post<{ order: LiveOrder }>(`/api/orders/${encodeURIComponent(order.id)}/pay`)).order : order
  if (!paid.txHash || paid.blockNumber == null) throw new LiveError('The payment did not return a transaction.')
  return {
    mode: 'testnet',
    network: 'tempo',
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
