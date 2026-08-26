/**
 * Scope V2 Phase 04 — automated local QA against a running API.
 * Usage: node scripts/phase04.qa.js
 * Requires backend on PORT (default 4000) with Stripe test keys + MySQL.
 */
import 'dotenv/config'
import Stripe from 'stripe'
import { toDateOnly } from '../src/dates.js'

const API = String(process.env.PUBLIC_API_URL ?? `http://127.0.0.1:${process.env.PORT ?? 4000}`).replace(/\/$/, '')
const results = []

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function json(res) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return { raw: text }
  }
}

async function adminLogin() {
  const res = await fetch(`${API}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME ?? 'admin',
      password: process.env.ADMIN_PASSWORD,
    }),
  })
  const body = await json(res)
  assert(res.ok, `admin login failed (${res.status}) ${JSON.stringify(body)}`)
  assert(body.token, 'admin token missing')
  return body.token
}

function customerHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'x-customer-token': token,
  }
}

async function registerOrLogin() {
  const email = `phase04-${Date.now()}@example.com`
  const password = 'Phase04Test!'
  const fullName = 'Phase 04 QA'
  const reg = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, phone: '0400111222' }),
  })
  const regBody = await json(reg)
  assert(reg.ok, `register failed (${reg.status}) ${JSON.stringify(regBody)}`)

  // Cookie is set; also mint token path via login + Set-Cookie is enough for browser.
  // For API tests, login and decode is hard — create JWT is not exported.
  // Use login response cookie if present; otherwise re-register is enough with cookie jar.
  // Fallback: call login and extract cookie, or use raw JWT from register by reading Set-Cookie.
  const setCookie = reg.headers.getSetCookie?.() ?? []
  let token = ''
  for (const c of setCookie) {
    const m = c.match(/omaru_customer_session=([^;]+)/)
    if (m) token = decodeURIComponent(m[1])
  }
  if (!token) {
    const login = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const loginCookies = login.headers.getSetCookie?.() ?? []
    for (const c of loginCookies) {
      const m = c.match(/omaru_customer_session=([^;]+)/)
      if (m) token = decodeURIComponent(m[1])
    }
  }
  assert(token, 'customer session cookie missing after register/login')
  return { email, password, fullName, token }
}

async function nextOpenCafeDate() {
  // Café open days default Thu–Sun (4,5,6,0). Walk forward up to 14 days.
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const avail = await fetch(
      `${API}/api/cafe/availability?date=${iso}&slot=lunch&covers=2`,
    ).then(json)
    if (avail?.available) return iso
  }
  throw new Error('No open café lunch slot found in next 14 days')
}

async function main() {
  console.log(`Phase 04 QA → ${API}\n`)

  // ── Store / shipping ────────────────────────────────────
  try {
    const products = await fetch(`${API}/api/products`).then(json)
    assert(Array.isArray(products) && products.length > 0, 'no products')
    const shippable = products.filter((p) => p.shippable && Number(p.stockQty) > 0 && Number(p.weightGrams) > 0)
    assert(shippable.length >= 2, 'need 2+ shippable in-stock products')
    const items = [
      { productId: shippable[0].id, quantity: 1 },
      { productId: shippable[1].id, quantity: 1 },
    ]
    const quoteMel = await fetch(`${API}/api/cart/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, postcode: '3000', shippingMethod: 'delivery' }),
    }).then(async (r) => ({ status: r.status, body: await json(r) }))
    assert(quoteMel.status === 200, `quote 3000 failed: ${JSON.stringify(quoteMel.body)}`)
    assert(Number(quoteMel.body.shipping.fee) > 0, 'delivery fee should be > 0')

    const quotePickup = await fetch(`${API}/api/cart/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, postcode: '3000', shippingMethod: 'pickup' }),
    }).then(async (r) => ({ status: r.status, body: await json(r) }))
    assert(quotePickup.status === 200, `pickup quote failed`)
    assert(Number(quotePickup.body.shipping.fee) === 0, 'pickup fee should be 0')
    assert(quotePickup.body.shipping.method === 'pickup', 'shipping.method should be pickup')

    record('Store cart quote delivery vs pickup', true, `delivery $${quoteMel.body.shipping.fee} / pickup $0`)
  } catch (e) {
    record('Store cart quote delivery vs pickup', false, e.message)
  }

  // Declined card via PaymentIntent confirm
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    assert(stripeKey?.startsWith('sk_test_'), 'STRIPE_SECRET_KEY test key required')
    const stripe = new Stripe(stripeKey)
    const products = await fetch(`${API}/api/products`).then(json)
    const p = products.find((x) => x.shippable && Number(x.stockQty) > 0)
    const piRes = await fetch(`${API}/api/checkout/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: p.id, quantity: 1 }],
        email: 'declined-qa@example.com',
        fullName: 'Declined QA',
        phone: '0400000001',
        shippingMethod: 'pickup',
      }),
    })
    const piBody = await json(piRes)
    assert(piRes.ok, `create PI failed: ${JSON.stringify(piBody)}`)
    let declined = false
    try {
      await stripe.paymentIntents.confirm(piBody.clientSecret.split('_secret')[0], {
        payment_method: 'pm_card_chargeDeclined',
      })
    } catch (err) {
      declined = /declined|card_declined|generic_decline/i.test(String(err.message)) || err.code === 'card_declined'
      if (!declined && err.payment_intent?.status === 'requires_payment_method') declined = true
      if (!declined) throw err
    }
    assert(declined, 'expected declined payment')
    record('Store declined card surfaces error', true, 'pm_card_chargeDeclined')
  } catch (e) {
    record('Store declined card surfaces error', false, e.message)
  }

  // Admin orders + sales
  try {
    const token = await adminLogin()
    const orders = await fetch(`${API}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(json)
    assert(Array.isArray(orders), 'orders not array')
    const paid = orders.find((o) => o.status === 'paid')
    assert(paid, 'no paid order found (run a successful test pay first)')
    const sales = await fetch(`${API}/api/admin/sales-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(json)
    assert(Number(sales.storeOrders) >= 1 || Number(sales.storeRevenue) > 0, 'sales summary empty')
    record('Admin orders + sales summary', true, `paid ${paid.orderNumber}; storeOrders ${sales.storeOrders}`)
  } catch (e) {
    record('Admin orders + sales summary', false, e.message)
  }

  // Shipping rules editable load
  try {
    const token = await adminLogin()
    const rules = await fetch(`${API}/api/admin/shipping-rules`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(json)
    assert(Array.isArray(rules) && rules.length > 0, 'no shipping rules')
    record('Admin shipping rules load', true, `${rules.length} rules`)
  } catch (e) {
    record('Admin shipping rules load', false, e.message)
  }

  // ── Stays ───────────────────────────────────────────────
  try {
    const props = await fetch(`${API}/api/properties`).then(json)
    assert(Array.isArray(props) && props.length >= 4, `expected 4 properties, got ${props?.length}`)
    const daisy = props.find((p) => /daisy/i.test(p.name))
    assert(daisy, 'Daisy property missing')

    // Prefer a future Airbnb/iCal block; fall back to any future unavailable window
    const avail = await fetch(`${API}/api/properties/${daisy.id}/availability?from=${new Date().toISOString().slice(0, 10)}`).then(json)
    const futureBlock = (avail.blocks ?? []).find((b) => String(b.startDate).slice(0, 10) >= new Date().toISOString().slice(0, 10))
    let blockedCheckIn
    let blockedCheckOut
    if (futureBlock) {
      blockedCheckIn = String(futureBlock.startDate).slice(0, 10)
      const start = new Date(`${blockedCheckIn}T00:00:00Z`)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 2)
      const blockEnd = String(futureBlock.endDate).slice(0, 10)
      blockedCheckOut = end.toISOString().slice(0, 10) < blockEnd ? end.toISOString().slice(0, 10) : blockEnd
      if (!(blockedCheckIn < blockedCheckOut)) {
        blockedCheckOut = blockEnd
      }
    } else {
      // Force a known busy window far enough ahead that past-date validation still passes
      blockedCheckIn = '2026-10-25'
      blockedCheckOut = '2026-10-28'
    }
    const blockedQuote = await fetch(`${API}/api/stays/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: daisy.id,
        checkIn: blockedCheckIn,
        checkOut: blockedCheckOut,
        guests: 2,
      }),
    })
    const blockedBody = await json(blockedQuote)
    assert(blockedQuote.status === 409, `Airbnb-blocked dates should 409, got ${blockedQuote.status} ${JSON.stringify(blockedBody)}`)

    // Find an open window: start ~45 days out, skip known busy Oct window
    let openOk = false
    let openDetail = ''
    for (let day = 45; day < 90; day++) {
      const start = new Date()
      start.setUTCDate(start.getUTCDate() + day)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 2)
      const checkIn = start.toISOString().slice(0, 10)
      const checkOut = end.toISOString().slice(0, 10)
      const q = await fetch(`${API}/api/stays/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: daisy.id, checkIn, checkOut, guests: 2 }),
      })
      const body = await json(q)
      if (q.ok && Number(body.total) > 0) {
        openOk = true
        openDetail = `${checkIn}→${checkOut} $${body.total}`
        break
      }
    }
    assert(openOk, 'could not find an available 2-night Daisy quote')

    // Manual block-out
    const token = await adminLogin()
    const blockStart = new Date()
    blockStart.setUTCDate(blockStart.getUTCDate() + 120)
    const blockEnd = new Date(blockStart)
    blockEnd.setUTCDate(blockStart.getUTCDate() + 3)
    const startDate = blockStart.toISOString().slice(0, 10)
    const endDate = blockEnd.toISOString().slice(0, 10)
    const blockRes = await fetch(`${API}/api/admin/properties/${daisy.id}/blocks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, note: 'Phase04 manual block' }),
    })
    assert(blockRes.ok, `manual block failed ${await blockRes.text()}`)
    const manualBlocked = await fetch(`${API}/api/stays/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: daisy.id,
        checkIn: startDate,
        checkOut: toDateOnly(new Date(blockStart.getTime() + 86400000 * 2)),
        guests: 2,
      }),
    })
    assert(manualBlocked.status === 409, `manual block should 409, got ${manualBlocked.status}`)

    const sync = await fetch(`${API}/api/admin/ical-sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(json)
    assert(typeof sync.imported === 'number', 'ical sync missing imported count')

    record('Stay Airbnb + manual blocks + iCal sync', true, `blocked ${blockedCheckIn} + open ${openDetail}; sync imported ${sync.imported}`)
  } catch (e) {
    record('Stay Airbnb + manual blocks + iCal sync', false, e.message)
  }

  // ── Café table holds ────────────────────────────────────
  try {
    const partyDate = await nextOpenCafeDate()
    const holdRes = await fetch(`${API}/api/table-holds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Phase04 Cafe',
        email: 'phase04-cafe@example.com',
        phone: '0400222333',
        partyDate,
        slot: 'lunch',
        covers: 2,
        notes: 'Phase 04 QA hold',
      }),
    })
    const hold = await json(holdRes)
    assert(holdRes.status === 201, `table hold failed ${holdRes.status} ${JSON.stringify(hold)}`)
    assert(hold.status === 'pending', 'hold should be pending')
    assert(hold.holdNumber, 'holdNumber missing')

    const token = await adminLogin()
    const holds = await fetch(`${API}/api/admin/table-holds`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(json)
    const found = holds.find((h) => h.holdNumber === hold.holdNumber)
    assert(found, 'hold not visible in admin')
    assert(found.expiresAt, 'expiresAt missing')
    record('Café table hold + Admin visibility', true, `${hold.holdNumber} on ${partyDate}`)
  } catch (e) {
    record('Café table hold + Admin visibility', false, e.message)
  }

  // ── Account + SetupIntent ───────────────────────────────
  try {
    const { token, email } = await registerOrLogin()
    const me = await fetch(`${API}/api/auth/me`, { headers: customerHeaders(token) }).then(async (r) => ({
      status: r.status,
      body: await json(r),
    }))
    assert(me.status === 200, `auth/me failed ${me.status}`)
    assert(me.body.user?.email === email, 'email mismatch')

    const siRes = await fetch(`${API}/api/account/setup-intent`, {
      method: 'POST',
      headers: customerHeaders(token),
    })
    const siBody = await json(siRes)
    assert(siRes.ok, `setup-intent failed ${JSON.stringify(siBody)}`)
    assert(siBody.clientSecret, 'setup intent clientSecret missing')

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const setupIntentId = siBody.clientSecret.split('_secret')[0]
    const confirmed = await stripe.setupIntents.confirm(setupIntentId, {
      payment_method: 'pm_card_visa',
      return_url: 'http://127.0.0.1:5173/account',
    })
    const pmId =
      typeof confirmed.payment_method === 'string' ? confirmed.payment_method : confirmed.payment_method?.id
    assert(pmId, 'payment_method missing after setup confirm')

    const save = await fetch(`${API}/api/account/payment-methods`, {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify({ paymentMethodId: pmId }),
    })
    assert(save.ok, `save payment method failed ${await save.text()}`)
    const cards = await fetch(`${API}/api/account/payment-methods`, {
      headers: customerHeaders(token),
    }).then(json)
    assert(Array.isArray(cards) && cards.some((c) => c.last4 === '4242'), 'saved card 4242 not listed')
    record('Account register + SetupIntent vaulting', true, `${email} card ****4242`)
  } catch (e) {
    record('Account register + SetupIntent vaulting', false, e.message)
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    process.exitCode = 1
    console.error('\nFailed:')
    for (const f of failed) console.error(`- ${f.name}: ${f.detail}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
