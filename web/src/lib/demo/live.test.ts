import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type LiveOrder, type LiveSupplier, mergeLiveOrders, mergeLiveSuppliers, seedSuppliers } from './live.ts'
import { activeWallet } from './rules.ts'
import { buildSeed } from './seed.ts'
import type { DemoState } from './types.ts'

const NOW = Date.UTC(2026, 9, 11, 12)
const at = new Date(NOW).toISOString()

/** A rules-service order for a seeded supplier and its approved Tempo wallet, as another computer would create it. */
function orderFor(state: DemoState, patch: Partial<LiveOrder> = {}): LiveOrder {
  const supplier = state.suppliers.find((s) => activeWallet(s, 'tempo'))!
  return {
    id: 'ORD-ABC123',
    proofId: 'ORD-ABC123.c2lnbmF0dXJl',
    reference: 'SM-7K3QX9PA',
    status: 'pending_approval',
    supplierName: supplier.name,
    supplierWallet: activeWallet(supplier, 'tempo')!.address,
    network: 'tempo',
    invoiceNumber: 'INV-LIVE-1',
    amountCents: 2_500_000,
    dueDate: null,
    extractionSource: 'manual',
    invoiceFilename: null,
    createdAt: at,
    createdRole: 'OPERATOR',
    approval: null,
    closure: null,
    txHash: null,
    blockNumber: null,
    logIndex: null,
    confirmMs: null,
    paidAt: null,
    recon: null,
    ...patch,
  }
}

test('a payment created at another computer shows up, waiting for approval, made by the operator', () => {
  const state = buildSeed(NOW)
  const next = mergeLiveOrders(state, [orderFor(state)], at)
  const p = next.payments.find((x) => x.reference === 'SM-7K3QX9PA')!
  assert.equal(p.liveOrderId, 'ORD-ABC123')
  assert.equal(p.status, 'pending_approval')
  assert.equal(next.members.find((m) => m.id === p.createdBy)?.role, 'operator')
  assert.equal(next.payments.length, state.payments.length + 1)
  // merging the same order again changes nothing
  assert.equal(mergeLiveOrders(next, [orderFor(state)], at), next)
})

test('an approval made elsewhere moves the payment forward, and nothing moves it back', () => {
  const state = buildSeed(NOW)
  const created = mergeLiveOrders(state, [orderFor(state)], at)
  const approval = { by: 'usr_porto_1', role: 'APPROVER', at, dataHash: 'abc', auto: false }
  const approved = mergeLiveOrders(created, [orderFor(state, { status: 'approved', approval })], at)
  const p = approved.payments.find((x) => x.reference === 'SM-7K3QX9PA')!
  assert.equal(p.status, 'approved')
  assert.equal(approved.members.find((m) => m.id === p.approval?.by)?.role, 'approver')
  assert.notEqual(p.approval?.dataHash, 'abc', 'the local approval is bound to the local hash')
  const stale = mergeLiveOrders(approved, [orderFor(state)], at)
  assert.equal(stale.payments.find((x) => x.reference === 'SM-7K3QX9PA')!.status, 'approved')
})

test('an order whose supplier wallet is not approved here is left out', () => {
  const state = buildSeed(NOW)
  const next = mergeLiveOrders(state, [orderFor(state, { supplierWallet: '0x' + '1'.repeat(40) })], at)
  assert.equal(next, state)
})

/** The workspace's own registry as the rules service returns it after importing the seed. */
function registryOf(state: DemoState): LiveSupplier[] {
  return seedSuppliers(state).map((s, i) => ({
    id: `sup_live_${i}`,
    name: s.name,
    country: s.country,
    city: s.city,
    port: s.port,
    email: s.email,
    createdAt: at,
    wallets: s.wallets.map((w, j) => ({ id: `wal_live_${i}_${j}`, ...w, proposedBy: 'seed', proposedRole: 'SEED', proposedAt: at, approvedBy: null, approvedRole: null, approvedAt: null })),
  }))
}

test('the imported seed only links ids: no supplier or wallet is duplicated', () => {
  const state = buildSeed(NOW)
  const next = mergeLiveSuppliers(state, registryOf(state), at)
  assert.equal(next.suppliers.length, state.suppliers.length)
  assert.deepEqual(next.suppliers.map((s) => s.wallets.length), state.suppliers.map((s) => s.wallets.length))
  assert.ok(next.suppliers.every((s) => s.liveId && s.wallets.every((w) => w.liveId)))
})

test('a new version approved at another computer replaces the one in use here', () => {
  const state = buildSeed(NOW)
  const registry = registryOf(state)
  const supplier = registry.find((s) => s.wallets.some((w) => w.network === 'tempo' && w.status === 'approved'))!
  const current = supplier.wallets.find((w) => w.network === 'tempo' && w.status === 'approved')!
  current.status = 'revoked'
  const version = Math.max(...supplier.wallets.filter((w) => w.network === 'tempo').map((w) => w.version)) + 1
  supplier.wallets.push({
    id: 'wal_new', network: 'tempo', address: '0x' + 'ab'.repeat(20), version, status: 'approved',
    proposedBy: 'u1', proposedRole: 'OPERATOR', proposedAt: at, approvedBy: 'u2', approvedRole: 'APPROVER', approvedAt: at,
  })
  const next = mergeLiveSuppliers(state, registry, at)
  const local = next.suppliers.find((s) => s.name === supplier.name)!
  const inUse = activeWallet(local, 'tempo')!
  assert.equal(inUse.address, '0x' + 'ab'.repeat(20))
  assert.equal(next.members.find((m) => m.id === inUse.proposedBy)?.role, 'operator')
  assert.equal(next.members.find((m) => m.id === inUse.approvedBy)?.role, 'approver')
  assert.equal(local.wallets.find((w) => w.address === current.address && w.version === current.version)?.status, 'revoked')
})

test('a supplier added at another computer appears with its proposed wallet', () => {
  const state = buildSeed(NOW)
  const next = mergeLiveSuppliers(state, [{
    id: 'sup_x', name: 'Busan Marine Parts', country: 'KR', city: 'Busan', port: 'KRPUS', email: null, createdAt: at,
    wallets: [{ id: 'wal_x', network: 'tempo', address: '0x' + 'cd'.repeat(20), version: 1, status: 'proposed', proposedBy: 'u1', proposedRole: 'OPERATOR', proposedAt: at, approvedBy: null, approvedRole: null, approvedAt: null }],
  }], at)
  const added = next.suppliers.find((s) => s.name === 'Busan Marine Parts')!
  assert.equal(added.liveId, 'sup_x')
  assert.equal(added.wallets[0].status, 'proposed')
  assert.equal(activeWallet(added, 'tempo'), undefined, 'nobody can pay it before a second person approves')
})
