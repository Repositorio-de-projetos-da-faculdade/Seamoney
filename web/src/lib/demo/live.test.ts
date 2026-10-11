import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type LiveOrder, mergeLiveOrders } from './live.ts'
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
