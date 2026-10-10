#!/usr/bin/env node
// End-to-end check of the whole stack against the real Tempo testnet:
//   docker compose up -d --build && node scripts/e2e.mjs [http://localhost:3000]
// It goes web -> rules-api (Java) -> chain-service (Python) -> blockchain, the one path the unit
// tests cannot cover (they use a fake chain). Needs Node 18+ only.

const BASE = process.argv[2] ?? 'http://localhost:3000'
const invoice = `INV-E2E-${new Date().toTimeString().slice(0, 8).replaceAll(':', '')}`

const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}
const call = async (path, init) => {
  const res = await fetch(`${BASE}${path}`, init)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body }
}
const post = (path, data) =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })

const health = await call('/api/health')
console.log('health:    ', JSON.stringify(health.body.checks))
if (health.body.checks?.chainService !== 'ok') fail('the chain service is not reachable from the rules service')

const created = await post('/api/orders', {
  supplierName: 'Shenzhen Tech Co.',
  supplierCountry: 'CN',
  invoiceNumber: invoice,
  amountCents: 8_000_000,
  dueDate: '2026-10-25',
  extractionSource: 'demo',
})
if (created.status !== 201) fail(`create returned ${created.status}: ${JSON.stringify(created.body)}`)
const order = created.body.order
if (order.totalCents !== 8_080_000 || order.savingsCents !== 160_000) fail(`unexpected quote: ${JSON.stringify(order)}`)
console.log(`created:    ${order.id} (${order.reference})  total ${order.totalCents / 100} USD, savings ${order.savingsCents / 100} USD`)

const paid = await post(`/api/orders/${order.id}/pay`)
if (paid.status !== 200 || paid.body.order.status !== 'sent') fail(`pay returned ${paid.status}: ${JSON.stringify(paid.body)}`)
console.log(`paid:       tx ${paid.body.order.txHash} confirmed in ${paid.body.order.confirmMs} ms`)

const again = await post(`/api/orders/${order.id}/pay`)
if (again.status !== 409) fail(`a second payment was not blocked (HTTP ${again.status})`)
console.log('double pay: blocked (HTTP 409)')

const rec = await post(`/api/orders/${order.id}/reconcile`)
if (!rec.body.ok) fail(`reconciliation failed: ${JSON.stringify(rec.body)}`)
const checks = rec.body.order.recon.checks
if (!Object.values(checks).every(Boolean)) fail(`a reconciliation check failed: ${JSON.stringify(checks)}`)
console.log('reconciled: all 5 checks passed', JSON.stringify(checks))

const proof = await call(`/api/proof/${order.id}`)
if (proof.body.tx?.status !== 'success') fail(`proof page data is not verified on-chain: ${JSON.stringify(proof.body)}`)
console.log('proof:      verified on-chain at', proof.body.tx.timestamp)

const csv = await call('/api/reports/orders')
if (typeof csv.body !== 'string' || !csv.body.includes(order.reference)) fail('the CSV report does not list the new order')
console.log('report:     CSV lists the order')

console.log('OK')
