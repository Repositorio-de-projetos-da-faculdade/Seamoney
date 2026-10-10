// Dev-only stand-in for the Java rules API, same JSON shapes (web/src/lib/types.ts). Used to iterate on the UI.
import http from 'node:http'

const PORT = Number(process.env.PORT ?? 8089)
const now = Date.now()
const day = 86_400_000
const iso = (ms) => new Date(ms).toISOString()
const hex = (n) => '0x' + [...Array(n)].map((_, i) => ((i * 7 + n * 3) % 16).toString(16)).join('')

const WALLET = '0x7d1a4b0c3e92f85d6a1b7c20e49f3d8a5b6c7e10'
const mk = (i, over) => {
  const amountCents = over.amountCents
  const feeCents = Math.round(amountCents * 0.01)
  const totalCents = amountCents + feeCents
  const bankCostCents = Math.round(amountCents * 0.03)
  const o = {
    id: `ord_${String(i).padStart(4, '0')}`,
    reference: over.invoiceNumber,
    supplierId: 'sup_1',
    supplierName: over.supplierName,
    supplierCountry: over.country ?? 'CN',
    supplierWallet: WALLET,
    invoiceNumber: over.invoiceNumber,
    amountCents,
    currency: 'USD',
    dueDate: over.dueDate ?? '2026-10-25',
    feeBps: 100,
    feeCents,
    totalCents,
    bankFeePct: 3,
    fxRate: 5.4,
    totalBrlCents: Math.round(totalCents * 5.4),
    status: over.status,
    extractionSource: over.source ?? 'demo',
    invoiceFilename: 'Fatura_3245.pdf',
    txHash: over.status === 'quoted' ? null : '0x' + (i * 977).toString(16).padStart(8, '0') + hex(56),
    blockNumber: over.status === 'quoted' ? null : 4_120_000 + i,
    logIndex: over.status === 'quoted' ? null : 0,
    memoHex: null,
    confirmMs: over.status === 'quoted' ? null : 1700 + i * 130,
    paidAt: over.status === 'quoted' ? null : iso(over.at + 60_000),
    reconciledAt: over.status === 'reconciled' ? iso(over.at + 120_000) : null,
    recon:
      over.status === 'reconciled'
        ? {
            txHash: '0x' + hex(64).slice(2),
            logIndex: 0,
            blockNumber: 4_120_000 + i,
            matchedAt: iso(over.at + 120_000),
            expectedCents: amountCents,
            paidCents: amountCents,
            checks: { token: true, recipient: true, amount: true, memo: true, receipt: true },
          }
        : null,
    error: null,
    isDemo: over.demo ?? true,
    createdAt: iso(over.at),
    updatedAt: iso(over.at + 120_000),
    bankCostCents,
    savingsCents: bankCostCents - feeCents,
  }
  return o
}

const orders = [
  mk(8, { invoiceNumber: 'INV-2026-0845', supplierName: 'Shenzhen Tech Co.', amountCents: 8_000_000, status: 'reconciled', at: now - 1 * day }),
  mk(7, { invoiceNumber: 'INV-2026-0821', supplierName: 'Hong Kong Electronics', amountCents: 4_230_000, status: 'reconciled', at: now - 3 * day, country: 'HK' }),
  mk(6, { invoiceNumber: 'INV-2026-0772', supplierName: 'Shenzhen Tech Co.', amountCents: 12_000_000, status: 'sent', at: now - 5 * day }),
  mk(5, { invoiceNumber: 'INV-2026-0709', supplierName: 'Global Parts Ltd.', amountCents: 1_560_000, status: 'sent', at: now - 9 * day, country: 'VN' }),
  mk(4, { invoiceNumber: 'INV-2026-0690', supplierName: 'Guangzhou Textiles', amountCents: 3_100_000, status: 'quoted', at: now - 10 * day }),
  mk(3, { invoiceNumber: 'INV-2026-0654', supplierName: 'Mumbai Components', amountCents: 2_250_000, status: 'reconciled', at: now - 24 * day, country: 'IN' }),
  mk(2, { invoiceNumber: 'INV-2026-0601', supplierName: 'Shenzhen Tech Co.', amountCents: 5_400_000, status: 'reconciled', at: now - 38 * day }),
  mk(1, { invoiceNumber: 'INV-2026-0544', supplierName: 'Hong Kong Electronics', amountCents: 6_800_000, status: 'reconciled', at: now - 61 * day, country: 'HK' }),
]

const series = [
  ['2026-04', 3_800_000, 1_900_000],
  ['2026-05', 5_200_000, 2_500_000],
  ['2026-06', 5_500_000, 2_700_000],
  ['2026-07', 6_300_000, 3_400_000],
  ['2026-08', 6_900_000, 3_700_000],
  ['2026-09', 7_700_000, 4_300_000],
  ['2026-10', 7_300_000, 4_200_000],
].map(([month, bankCents, routeCents]) => ({ month, bankCents, routeCents }))

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}
const readBody = (req) =>
  new Promise((resolve) => {
    let s = ''
    req.on('data', (c) => (s += c))
    req.on('end', () => {
      try {
        resolve(s ? JSON.parse(s) : {})
      } catch {
        resolve({})
      }
    })
  })

const eventsFor = (o) => {
  const ev = [['created', o.createdAt], ['quoted', o.createdAt]]
  if (o.status !== 'quoted') {
    ev.push(['fiat_received', o.paidAt], ['payment_started', o.paidAt], ['payment_confirmed', o.paidAt])
  }
  if (o.status === 'reconciled') ev.push(['reconciled', o.reconciledAt])
  return ev.map(([type, ts], i) => ({ id: i + 1, orderId: o.id, ts, type, detail: null }))
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const p = url.pathname
    const body = req.method === 'POST' ? await readBody(req) : {}
    await new Promise((r) => setTimeout(r, Number(process.env.LAG ?? 40)))

    if (p === '/api/health') return send(res, 200, { status: 'ok', checks: { chainService: 'ok', database: 'ok' } })
    if (p === '/api/orders' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? 200)
      return send(res, 200, { orders: orders.slice(0, limit) })
    }
    if (p === '/api/orders' && req.method === 'POST') {
      const o = mk(orders.length + 1, {
        invoiceNumber: body.invoiceNumber ?? 'INV-NEW',
        supplierName: body.supplierName ?? 'Supplier',
        amountCents: body.amountCents ?? 100_000,
        status: 'quoted',
        at: Date.now(),
        source: body.extractionSource ?? 'manual',
        demo: false,
      })
      orders.unshift(o)
      return send(res, 201, { order: o })
    }
    let m = p.match(/^\/api\/orders\/([^/]+)(?:\/(pay|reconcile))?$/)
    if (m) {
      const o = orders.find((x) => x.id === m[1])
      if (!o) return send(res, 404, { error: 'not found' })
      if (!m[2]) return send(res, 200, { order: o, events: eventsFor(o) })
      if (m[2] === 'pay') {
        await new Promise((r) => setTimeout(r, 1800))
        Object.assign(o, { status: 'sent', txHash: '0x' + hex(64).slice(2), blockNumber: 4_130_000, logIndex: 0, confirmMs: 1900, paidAt: iso(Date.now()) })
        return send(res, 200, { order: o })
      }
      await new Promise((r) => setTimeout(r, 900))
      Object.assign(o, {
        status: 'reconciled',
        reconciledAt: iso(Date.now()),
        recon: { txHash: o.txHash, logIndex: 0, blockNumber: o.blockNumber, matchedAt: iso(Date.now()), expectedCents: o.amountCents, paidCents: o.amountCents, checks: { token: true, recipient: true, amount: true, memo: true, receipt: true } },
      })
      return send(res, 200, { ok: true, order: o })
    }
    if (p === '/api/stats') {
      const done = orders.filter((o) => o.status === 'reconciled')
      return send(res, 200, {
        stats: {
          savingsCents: orders.filter((o) => o.status !== 'quoted').reduce((s, o) => s + o.savingsCents, 0),
          inProgress: orders.filter((o) => o.status === 'quoted' || o.status === 'sent').length,
          reconciled: done.length,
          avgConfirmMs: 1850,
          volumeCents: orders.reduce((s, o) => s + o.amountCents, 0),
          hasDemo: true,
        },
        series,
      })
    }
    if (p === '/api/compare') {
      const bank = Math.round((body.monthlyUsd ?? 0) * 100 * ((body.bankFeePct ?? 3) / 100))
      const route = Math.round((body.monthlyUsd ?? 0) * 100 * 0.01)
      return send(res, 200, { bankCents: bank, routeCents: route, savingsCents: bank - route, savingsShare: bank ? (bank - route) / bank : 0, feeBps: 100 })
    }
    m = p.match(/^\/api\/proof\/([^/]+)$/)
    if (m) {
      const o = orders.find((x) => x.id === m[1])
      if (!o || !o.txHash) return send(res, 404, { error: 'not found' })
      return send(res, 200, {
        order: { id: o.id, invoiceNumber: o.invoiceNumber, amountCents: o.amountCents, supplierName: o.supplierName, reference: o.reference, txHash: o.txHash, paidAt: o.paidAt },
        tx: { status: 'success', blockNumber: o.blockNumber, timestamp: o.paidAt },
      })
    }
    if (p === '/api/reports/orders') {
      const csv = 'reference,supplier,usd\n' + orders.map((o) => `${o.reference},${o.supplierName},${o.totalCents / 100}`).join('\n')
      return send(res, 200, csv, 'text/csv')
    }
    if (p === '/api/leads') return send(res, 201, { ok: true })
    return send(res, 404, { error: 'unknown ' + p })
  })
  .listen(PORT, () => console.log('mock rules api on', PORT))
