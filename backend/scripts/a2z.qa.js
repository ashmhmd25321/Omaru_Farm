#!/usr/bin/env node
/**
 * A-to-Z API smoke test — public + auth boundaries + business logic probes.
 * Run: node scripts/a2z.qa.js
 */
import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000'
const ADMIN_USER = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? 'dev-only-admin-password'

const results = []
function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail })
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function json(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

async function adminLogin() {
  const res = await fetch(`${API}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  })
  const body = await json(res)
  if (!res.ok) throw new Error(`admin login ${res.status} ${JSON.stringify(body)}`)
  return body.token
}

async function customerRegister() {
  const email = `a2z-${Date.now()}@example.com`
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password: 'testpass1234', fullName: 'A2Z Tester', phone: '0400111222' }),
  })
  const body = await json(res)
  if (!res.ok) throw new Error(`register ${res.status}`)
  const cookie = res.headers.get('set-cookie') ?? ''
  return { email, cookie, id: body.id }
}

function customerHeaders(cookie) {
  const m = cookie.match(/omaru_customer_session=([^;]+)/)
  return m ? { Cookie: `omaru_customer_session=${m[1]}` } : {}
}

async function main() {
  console.log(`A-to-Z API QA → ${API}\n`)

  // ── Public content ──────────────────────────────────────
  for (const path of [
    '/api/health',
    '/api/products',
    '/api/product-categories',
    '/api/testimonials',
    '/api/menu',
    '/api/content/about',
    '/api/content/contact',
    '/api/content/site-settings',
    '/api/content/stay',
    '/api/commerce/config',
    '/api/properties',
    '/api/cafe/availability?date=2026-09-01',
  ]) {
    try {
      const res = await fetch(`${API}${path}`)
      if (!res.ok) throw new Error(`${res.status}`)
      pass(`GET ${path}`, `${res.status}`)
    } catch (e) {
      fail(`GET ${path}`, e.message)
    }
  }

  // ── Cart / shipping logic ───────────────────────────────
  try {
    const products = await fetch(`${API}/api/products`).then(json)
    const shippable = products.find((p) => p.shippable && p.stockQty > 0)
    if (!shippable) throw new Error('no shippable product')
    const bad = await fetch(`${API}/api/cart/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: shippable.id, quantity: 1 }], postcode: '9999', shippingMethod: 'delivery' }),
    })
    if (bad.status !== 400) throw new Error(`invalid postcode expected 400 got ${bad.status}`)
    const good = await fetch(`${API}/api/cart/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: shippable.id, quantity: 1 }], postcode: '3000', shippingMethod: 'delivery' }),
    }).then(json)
    if (!good.total || good.shipping?.fee == null) throw new Error('missing quote fields')
    pass('Cart quote valid/invalid postcode', `$${good.shipping.fee} to 3000`)
  } catch (e) {
    fail('Cart quote valid/invalid postcode', e.message)
  }

  // ── Stay validation logic ───────────────────────────────
  try {
    const props = await fetch(`${API}/api/properties`).then(json)
    const pid = props[0]?.id
    const past = await fetch(`${API}/api/stays/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: pid, checkIn: '2020-01-01', checkOut: '2020-01-05', guests: 2 }),
    })
    if (past.status !== 400) throw new Error(`past dates expected 400 got ${past.status}`)
    const badGuests = await fetch(`${API}/api/stays/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: pid, checkIn: '2027-06-01', checkOut: '2027-06-05', guests: 999 }),
    })
    if (badGuests.status !== 400) throw new Error(`over guests expected 400 got ${badGuests.status}`)
    pass('Stay date/guest validation', 'past + max guests rejected')
  } catch (e) {
    fail('Stay date/guest validation', e.message)
  }

  // ── Contact / enquiry booking ───────────────────────────
  try {
    const res = await fetch(`${API}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'A2Z Contact',
        email: `a2z-contact-${Date.now()}@example.com`,
        phone: '0400123456',
        bookingDate: '2026-12-01',
        source: 'a2z-test',
        message: 'A2Z test enquiry message for QA.',
      }),
    })
    const body = await json(res)
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`)
    pass('POST /api/bookings enquiry', body.id ? `id ${body.id}` : 'created')
  } catch (e) {
    fail('POST /api/bookings enquiry', e.message)
  }

  // ── Table hold ──────────────────────────────────────────
  try {
    const res = await fetch(`${API}/api/table-holds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'A2Z Cafe',
        email: `a2z-cafe-${Date.now()}@example.com`,
        phone: '0400222333',
        partyDate: '2026-09-05',
        slot: 'lunch',
        covers: 2,
        notes: 'A2Z QA',
      }),
    })
    const body = await json(res)
    if (res.status !== 201) throw new Error(`${res.status} ${JSON.stringify(body)}`)
    pass('POST /api/table-holds', body.holdNumber)
  } catch (e) {
    fail('POST /api/table-holds', e.message)
  }

  // ── Auth boundaries ─────────────────────────────────────
  try {
    const noAdmin = await fetch(`${API}/api/admin/orders`)
    if (noAdmin.status !== 401) throw new Error(`unauth admin expected 401 got ${noAdmin.status}`)
    const noCustomer = await fetch(`${API}/api/account/orders`)
    if (noCustomer.status !== 401) throw new Error(`unauth customer expected 401 got ${noCustomer.status}`)
    pass('Auth boundaries', '401 without tokens')
  } catch (e) {
    fail('Auth boundaries', e.message)
  }

  // ── Customer JWT cannot access admin ────────────────────
  try {
    const { cookie } = await customerRegister()
    const custCookie = customerHeaders(cookie)
    const token = cookie.match(/omaru_customer_session=([^;]+)/)?.[1]
    const asAdmin = await fetch(`${API}/api/admin/orders`, {
      headers: { ...custCookie, Authorization: token ? `Bearer ${token}` : undefined },
    })
    if (asAdmin.status !== 401) throw new Error(`customer token on admin expected 401 got ${asAdmin.status}`)
    pass('Customer token blocked from admin', '401')
  } catch (e) {
    fail('Customer token blocked from admin', e.message)
  }

  // ── Admin endpoints smoke ─────────────────────────────────
  try {
    const token = await adminLogin()
    const headers = { Authorization: `Bearer ${token}` }
    const checks = [
      ['/api/admin/me', 'GET'],
      ['/api/admin/products', 'GET'],
      ['/api/admin/orders', 'GET'],
      ['/api/admin/stay-bookings', 'GET'],
      ['/api/admin/properties', 'GET'],
      ['/api/admin/table-holds', 'GET'],
      ['/api/admin/shipping-rules', 'GET'],
      ['/api/admin/sales-summary', 'GET'],
      ['/api/admin/bookings', 'GET'],
      ['/api/admin/content/about', 'GET'],
      ['/api/admin/content/stay-page', 'GET'],
      ['/api/admin/stay-listings', 'GET'],
    ]
    for (const [path] of checks) {
      const res = await fetch(`${API}${path}`, { headers })
      if (!res.ok) throw new Error(`${path} ${res.status}`)
    }
    pass('Admin endpoints load', `${checks.length} routes`)
  } catch (e) {
    fail('Admin endpoints load', e.message)
  }

  // ── Refund request logic (needs paid order) ─────────────
  try {
    const token = await adminLogin()
    const orders = await fetch(`${API}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(json)
    const paid = orders.find((o) => o.status === 'paid')
    if (!paid) {
      pass('Refund request flow', 'skipped — no paid order in DB')
    } else {
      const { cookie } = await customerRegister()
      const badOwner = await fetch(`${API}/api/account/orders/${paid.id}/refund-request`, {
        method: 'POST',
        headers: { ...customerHeaders(cookie), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not my order test' }),
      })
      if (badOwner.status !== 403) throw new Error(`wrong owner expected 403 got ${badOwner.status}`)
      pass('Refund request ownership check', '403 for non-owner')
    }
  } catch (e) {
    fail('Refund request ownership check', e.message)
  }

  // ── Concurrency sanity (sequential re-check) ────────────
  try {
    const props = await fetch(`${API}/api/properties`).then(json)
    const pid = props[0]?.id
    let checkIn
    let checkOut
    for (let day = 90; day < 200; day++) {
      const start = new Date()
      start.setUTCDate(start.getUTCDate() + day)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 3)
      const ci = start.toISOString().slice(0, 10)
      const co = end.toISOString().slice(0, 10)
      const q = await fetch(`${API}/api/stays/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: pid, checkIn: ci, checkOut: co, guests: 2 }),
      })
      if (q.ok) {
        checkIn = ci
        checkOut = co
        break
      }
    }
    if (!checkIn) throw new Error('no open stay window for concurrency test')
    const ts = Date.now()
    const [a, b] = await Promise.all([
      fetch(`${API}/api/stays/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: pid,
          checkIn,
          checkOut,
          guests: 2,
          fullName: 'Conc A',
          email: `conc-a-${ts}@example.com`,
          phone: '0400000001',
        }),
      }),
      fetch(`${API}/api/stays/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: pid,
          checkIn,
          checkOut,
          guests: 2,
          fullName: 'Conc B',
          email: `conc-b-${ts}@example.com`,
          phone: '0400000002',
        }),
      }),
    ])
    const codes = [a.status, b.status].sort().join(',')
    if (codes !== '201,409') throw new Error(`expected 201+409 got ${a.status}+${b.status}`)
    pass('Stay checkout concurrency', codes)
  } catch (e) {
    fail('Stay checkout concurrency', e.message)
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.log('\nFailed:')
    for (const f of failed) console.log(`- ${f.name}: ${f.detail}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
