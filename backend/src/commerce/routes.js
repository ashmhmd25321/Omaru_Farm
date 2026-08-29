import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { resolveShippingQuote } from './shipping.js'
import { auspostConfigured, validateAustralianDestination } from './auspost.js'
import { getStripe, stripeConfigured, getPublishableKey, getCurrency, toStripeAmount } from './stripe.js'
import { fetchAndParseIcal } from './ical.js'
import {
  toDateOnly,
  isValidISODate,
  isPastDate,
  isValidEmail,
  isValidPhone,
} from '../dates.js'
import {
  PENDING_HOLD_MS,
  pendingExpiresAtDate,
  restoreOrderStock,
  expirePendingPayments,
  cancelByPaymentIntent,
  cancelPendingOrderById,
} from './holds.js'
import { getStoreRefundRequestState, storeRefundRequestErrorMessage } from './refundPolicy.js'
import {
  authConfig,
  changeCustomerPassword,
  customerVerificationEnabled,
  hashPassword,
  issueCustomerToken,
  loadCustomerById,
  loginWithAppleCredential,
  loginWithGoogleCredential,
  queueVerificationCodes,
  requestPasswordReset,
  resetPasswordWithCode,
  resendEmailVerification,
  resendPhoneVerification,
  serializeCustomer,
  verifyEmailCode,
  verifyPhoneCode,
} from './customerAuth.js'

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function orderNumber() {
  return `OF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
}

function holdNumber() {
  return `TH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
}

function stayNumber() {
  return `ST-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
}

function datesOverlap(aStart, aEnd, bStart, bEnd) {
  // half-open [start, end)
  return aStart < bEnd && bStart < aEnd
}

function nightsBetween(checkIn, checkOut) {
  const a = new Date(`${checkIn}T00:00:00Z`)
  const b = new Date(`${checkOut}T00:00:00Z`)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function getClientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] ?? '')
  if (xff.includes(',')) return xff.split(',')[0].trim()
  if (xff) return xff.trim()
  return String(req.ip ?? req.socket?.remoteAddress ?? 'unknown')
}

const tableHoldAttemptMap = new Map()
const TABLE_HOLD_WINDOW_MS = Number(process.env.TABLE_HOLD_WINDOW_MS ?? 15 * 60 * 1000)
const TABLE_HOLD_MAX_ATTEMPTS = Number(process.env.TABLE_HOLD_MAX_ATTEMPTS ?? 8)

function consumeWindowedAttempt(store, key, windowMs) {
  const now = Date.now()
  const current = store.get(key) ?? { count: 0, resetAt: now + windowMs }
  if (now > current.resetAt) {
    current.count = 0
    current.resetAt = now + windowMs
  }
  current.count += 1
  store.set(key, current)
  return current
}

function checkWindowedLimit(store, key, maxAttempts) {
  const now = Date.now()
  const current = store.get(key)
  if (!current) return null
  if (now > current.resetAt) {
    store.delete(key)
    return null
  }
  if (current.count >= maxAttempts) return Math.ceil((current.resetAt - now) / 1000)
  return null
}

async function loadShippingRules() {
  const [rows] = await pool.query(
    'SELECT id, name, postcode_prefixes, base_fee, per_kg_fee, free_over, sort_order, is_active FROM shipping_rules WHERE is_active = 1 ORDER BY sort_order ASC, id ASC',
  )
  return rows
}

async function quoteCartLines(items) {
  const lines = []
  let subtotal = 0
  let totalWeightGrams = 0
  let totalVolumeCm3 = 0
  for (const item of items ?? []) {
    const productId = toNumber(item.productId ?? item.id, 0)
    const qty = Math.max(0, Math.floor(toNumber(item.quantity, 0)))
    if (!productId || qty < 1) continue
    const [rows] = await pool.query(
      `SELECT id, name, size, price, weight_grams AS weightGrams, volume_cm3 AS volumeCm3, stock_qty AS stockQty, shippable
       FROM products WHERE id = ? LIMIT 1`,
      [productId],
    )
    const product = rows[0]
    if (!product) throw Object.assign(new Error(`Product ${productId} not found`), { status: 400 })
    if (toNumber(product.stockQty, 0) < qty) {
      throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { status: 409 })
    }
    const unit = toNumber(product.price, 0)
    const lineTotal = +(unit * qty).toFixed(2)
    const shippable = Boolean(product.shippable)
    const weight = shippable ? toNumber(product.weightGrams, 0) * qty : 0
    const volume = shippable ? toNumber(product.volumeCm3, 0) * qty : 0
    if (shippable && weight <= 0) {
      throw Object.assign(new Error(`Shipping weight is missing for ${product.name}`), { status: 400 })
    }
    if (shippable && volume <= 0) {
      throw Object.assign(
        new Error(`Packed volume is missing for ${product.name}. Add length × width × height in Admin → Products.`),
        { status: 400 },
      )
    }
    subtotal += lineTotal
    totalWeightGrams += weight
    totalVolumeCm3 += volume
    lines.push({
      productId: product.id,
      name: product.name,
      size: product.size,
      unitPrice: unit,
      quantity: qty,
      weightGrams: toNumber(product.weightGrams, 0),
      volumeCm3: toNumber(product.volumeCm3, 0),
      lineTotal,
      shippable,
    })
  }
  return { lines, subtotal: +subtotal.toFixed(2), totalWeightGrams, totalVolumeCm3 }
}

export function registerCommerceRoutes(app, {
  requireAdmin,
  sendServerError,
  parseCookies,
  cookieSecure,
}) {
  const CUSTOMER_COOKIE = process.env.CUSTOMER_COOKIE_NAME ?? 'omaru_customer_session'
  const isProduction = process.env.NODE_ENV === 'production'
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET ?? ''
  let CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET ?? ''
  if (!CUSTOMER_JWT_SECRET) {
    if (isProduction) {
      throw new Error('CUSTOMER_JWT_SECRET must be set in production')
    }
    CUSTOMER_JWT_SECRET = 'dev_customer_jwt'
  }
  if (isProduction) {
    if (CUSTOMER_JWT_SECRET.length < 32) {
      throw new Error('CUSTOMER_JWT_SECRET must be at least 32 characters in production')
    }
    if (CUSTOMER_JWT_SECRET === adminJwtSecret) {
      throw new Error('CUSTOMER_JWT_SECRET must be distinct from ADMIN_JWT_SECRET')
    }
  }
  const FEATURE_CHECKOUT = process.env.FEATURE_CHECKOUT !== 'false'

  function customerCookieOptions() {
    return {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSecure ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    }
  }

  function getCustomerToken(req) {
    const cookies = parseCookies(req)
    return cookies[CUSTOMER_COOKIE] || (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
      ? String(req.headers['x-customer-token'] ?? '')
      : '')
  }

  async function requireCustomer(req, res, next) {
    try {
      const token = getCustomerToken(req)
      if (!token) return res.status(401).json({ message: 'Sign in required' })
      const payload = jwt.verify(token, CUSTOMER_JWT_SECRET)
      if (payload.role && payload.role !== 'customer') {
        return res.status(401).json({ message: 'Invalid session' })
      }
      const [rows] = await pool.query(
        `SELECT id, email, full_name AS fullName, phone, delivery_line1 AS deliveryLine1, delivery_line2 AS deliveryLine2, delivery_city AS deliveryCity, delivery_state AS deliveryState, delivery_postcode AS deliveryPostcode, stripe_customer_id AS stripeCustomerId, email_verified AS emailVerified, phone_verified AS phoneVerified, auth_provider AS authProvider FROM customers WHERE id = ? LIMIT 1`,
        [payload.sub],
      )
      if (!rows[0]) return res.status(401).json({ message: 'Invalid session' })
      req.customer = serializeCustomer(rows[0])
      next()
    } catch {
      return res.status(401).json({ message: 'Invalid session' })
    }
  }

  function optionalCustomer(req, _res, next) {
    const token = getCustomerToken(req)
    if (!token) return next()
    try {
      const payload = jwt.verify(token, CUSTOMER_JWT_SECRET)
      pool
        .query('SELECT id, email, full_name AS fullName, stripe_customer_id AS stripeCustomerId FROM customers WHERE id = ? LIMIT 1', [
          payload.sub,
        ])
        .then(([rows]) => {
          if (rows[0]) req.customer = rows[0]
          next()
        })
        .catch(() => next())
    } catch {
      next()
    }
  }

  // ── Config ──────────────────────────────────────────────
  app.get('/api/commerce/config', (_req, res) => {
    res.json({
      checkoutEnabled: FEATURE_CHECKOUT,
      stripeConfigured: stripeConfigured(),
      publishableKey: getPublishableKey(),
      currency: getCurrency(),
      auspostConfigured: auspostConfigured() && process.env.AUSPOST_ENABLED !== 'false',
      shippingOriginPostcode: String(process.env.AUSPOST_ORIGIN_POSTCODE ?? '3922'),
    })
  })

  // ── Cart quote ──────────────────────────────────────────
  app.post('/api/cart/quote', async (req, res) => {
    try {
      const method = String(req.body?.shippingMethod ?? req.body?.method ?? 'delivery')
      const postcode = String(req.body?.postcode ?? '')
      const { lines, subtotal, totalWeightGrams, totalVolumeCm3 } = await quoteCartLines(req.body?.items ?? [])
      if (lines.length === 0) return res.status(400).json({ message: 'Cart is empty' })
      const needsShipping = lines.some((l) => l.shippable)
      const rules = await loadShippingRules()
      const shipping = needsShipping
        ? await resolveShippingQuote({
            rules,
            postcode,
            subtotal,
            totalWeightGrams,
            totalVolumeCm3,
            method: method === 'pickup' ? 'pickup' : 'delivery',
          })
        : {
            method: 'pickup',
            fee: 0,
            ruleName: 'Digital / non-shippable',
            provider: 'none',
            breakdown: {},
          }
      if (method === 'delivery' && needsShipping && shipping.breakdown?.error === 'NO_RULE') {
        return res.status(400).json({ message: 'No shipping rule matches this postcode' })
      }
      const total = +(subtotal + shipping.fee).toFixed(2)
      res.json({ lines, subtotal, shipping, total, currency: getCurrency() })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Failed to quote cart', error)
    }
  })

  // ── Checkout (store) ────────────────────────────────────
  app.post('/api/checkout/create-payment-intent', optionalCustomer, async (req, res) => {
    if (!FEATURE_CHECKOUT) return res.status(503).json({ message: 'Checkout temporarily disabled' })
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ message: 'Stripe is not configured (set STRIPE_SECRET_KEY)' })

    try {
      await expirePendingPayments()
      const body = req.body ?? {}
      const method = String(body.shippingMethod ?? 'delivery')
      if (customerVerificationEnabled() && req.customer?.id) {
        const profile = await loadCustomerById(req.customer.id)
        if (!profile?.emailVerified) {
          return res.status(403).json({
            message: 'Verify your email in My account before checkout',
            code: 'email_verification_required',
          })
        }
        if (method === 'delivery' && !profile?.phoneVerified) {
          return res.status(403).json({
            message: 'Verify your mobile number in My account before delivery checkout',
            code: 'phone_verification_required',
          })
        }
      }
      const email = String(body.email ?? req.customer?.email ?? '').trim()
      const fullName = String(body.fullName ?? req.customer?.fullName ?? '').trim()
      const phone = String(body.phone ?? '').trim()
      if (!email || !fullName) return res.status(400).json({ message: 'Name and email are required' })
      if (method === 'delivery') {
        if (!isValidPhone(phone)) {
          return res.status(400).json({ message: 'A valid phone number is required for delivery' })
        }
        const line1 = String(body.line1 ?? '').trim()
        const city = String(body.city ?? '').trim()
        const state = String(body.state ?? '').trim()
        const postcode = String(body.postcode ?? '').trim()
        if (!line1 || !city || !state || !postcode) {
          return res.status(400).json({ message: 'Complete delivery address is required' })
        }
        if (auspostConfigured() && process.env.AUSPOST_ENABLED !== 'false') {
          await validateAustralianDestination({ postcode, city, state })
        }
      }

      const { lines, subtotal, totalWeightGrams, totalVolumeCm3 } = await quoteCartLines(body.items ?? [])
      if (lines.length === 0) return res.status(400).json({ message: 'Cart is empty' })

      const rules = await loadShippingRules()
      const shipping = await resolveShippingQuote({
        rules,
        postcode: body.postcode,
        subtotal,
        totalWeightGrams,
        totalVolumeCm3,
        method,
      })
      if (method === 'delivery' && shipping.breakdown?.error === 'NO_RULE') {
        return res.status(400).json({ message: 'No shipping rule matches this postcode' })
      }
      const total = +(subtotal + shipping.fee).toFixed(2)
      const number = orderNumber()

      const conn = await pool.getConnection()
      let orderId
      const expiresAt = pendingExpiresAtDate()
      try {
        await conn.beginTransaction()
        // Reserve stock under lock (decrement now; restore on expire/fail/refund)
        for (const line of lines) {
          const [upd] = await conn.query(
            'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?',
            [line.quantity, line.productId, line.quantity],
          )
          if (upd.affectedRows === 0) {
            const [names] = await conn.query('SELECT name FROM products WHERE id = ? LIMIT 1', [line.productId])
            throw Object.assign(new Error(`Insufficient stock for ${names[0]?.name ?? line.name}`), { status: 409 })
          }
        }

        const [result] = await conn.query(
          `INSERT INTO orders (
            order_number, customer_id, email, full_name, phone, shipping_method,
            shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postcode,
            subtotal, shipping_fee, total, currency, status, fulfillment_status, shipping_breakdown_json,
            expires_at, stock_reserved
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'pending', ?, ?, 1)`,
          [
            number,
            req.customer?.id ?? null,
            email,
            fullName,
            phone,
            method,
            String(body.line1 ?? ''),
            String(body.line2 ?? ''),
            String(body.city ?? ''),
            String(body.state ?? 'VIC'),
            String(body.postcode ?? ''),
            subtotal,
            shipping.fee,
            total,
            getCurrency(),
            JSON.stringify(shipping),
            expiresAt,
          ],
        )
        orderId = result.insertId
        for (const line of lines) {
          await conn.query(
            `INSERT INTO order_items (order_id, product_id, product_name, product_size, unit_price, quantity, weight_grams, line_total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, line.productId, line.name, line.size, line.unitPrice, line.quantity, line.weightGrams, line.lineTotal],
          )
        }
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }

      let stripeCustomerId = req.customer?.stripeCustomerId || undefined
      if (req.customer && !stripeCustomerId) {
        const c = await stripe.customers.create({
          email: req.customer.email,
          name: req.customer.fullName,
          metadata: { localCustomerId: String(req.customer.id) },
        })
        stripeCustomerId = c.id
        await pool.query('UPDATE customers SET stripe_customer_id = ? WHERE id = ?', [stripeCustomerId, req.customer.id])
        req.customer.stripeCustomerId = stripeCustomerId
      }

      let pi
      try {
        pi = await stripe.paymentIntents.create({
          amount: toStripeAmount(total),
          currency: getCurrency(),
          automatic_payment_methods: { enabled: true },
          receipt_email: email,
          metadata: { orderId: String(orderId), orderNumber: number, type: 'store_order' },
          customer: stripeCustomerId,
        })
      } catch (piError) {
        await cancelPendingOrderById(orderId, { cancelStripe: false })
        throw piError
      }

      await pool.query('UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?', [pi.id, orderId])

      res.status(201).json({
        orderId,
        orderNumber: number,
        clientSecret: pi.client_secret,
        total,
        currency: getCurrency(),
        expiresAt: expiresAt.toISOString(),
        holdMinutes: Math.round(PENDING_HOLD_MS / 60000),
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Failed to start checkout', error)
    }
  })

  // Confirm payment without requiring webhooks (still validates via Stripe API).
  // This makes the UI show paid orders immediately after Stripe returns success.
  app.post('/api/checkout/confirm-payment-intent', async (req, res) => {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ message: 'Stripe is not configured (set STRIPE_SECRET_KEY)' })
    try {
      const orderId = toNumber(req.body?.orderId, 0)
      const paymentIntentId = String(req.body?.paymentIntentId ?? '').trim()
      if (!orderId || !paymentIntentId) return res.status(400).json({ message: 'orderId and paymentIntentId are required' })
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (!pi) return res.status(404).json({ message: 'PaymentIntent not found' })
      if (String(pi.metadata?.orderId ?? '') !== String(orderId)) {
        return res.status(400).json({ message: 'PaymentIntent does not match order' })
      }
      if (pi.status !== 'succeeded') {
        return res.status(400).json({ message: `Payment not completed (${pi.status})` })
      }
      await fulfillStoreOrder(pi)
      const [rows] = await pool.query(
        `SELECT id, order_number AS orderNumber, status, fulfillment_status AS fulfillmentStatus, total
         FROM orders WHERE id = ? LIMIT 1`,
        [orderId],
      )
      res.json({ ok: true, order: rows[0] })
    } catch (error) {
      sendServerError(res, 'Failed to confirm payment', error)
    }
  })

  // Stripe webhook — caller must mount with express.raw
  app.post('/api/stripe/webhook', async (req, res) => {
    const stripe = getStripe()
    if (!stripe) return res.status(503).send('Stripe not configured')
    const sig = req.headers['stripe-signature']
    const secret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()
    let event
    try {
      if (secret) {
        event = stripe.webhooks.constructEvent(req.body, sig, secret)
      } else if (isProduction) {
        return res.status(500).send('STRIPE_WEBHOOK_SECRET is required in production')
      } else {
        // Local/dev without webhook secret: parse JSON body
        event = typeof req.body === 'string' || Buffer.isBuffer(req.body)
          ? JSON.parse(req.body.toString())
          : req.body
      }
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      if (event?.id) {
        const [seen] = await pool.query(
          'SELECT event_id FROM stripe_webhook_events WHERE event_id = ? LIMIT 1',
          [event.id],
        )
        if (seen[0]) return res.json({ received: true, duplicate: true })
      }

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object
        const type = pi.metadata?.type
        if (type === 'store_order') {
          await fulfillStoreOrder(pi)
        } else if (type === 'stay_booking') {
          await fulfillStayBooking(pi)
        }
      } else if (
        event.type === 'payment_intent.payment_failed' ||
        event.type === 'payment_intent.canceled'
      ) {
        await cancelByPaymentIntent(event.data.object?.id)
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (piId) await syncExternalRefund(piId, charge)
      }

      if (event?.id) {
        await pool.query(
          'INSERT IGNORE INTO stripe_webhook_events (event_id, event_type) VALUES (?, ?)',
          [event.id, String(event.type ?? '')],
        )
      }
      res.json({ received: true })
    } catch (error) {
      console.error('Webhook handler error', error)
      res.status(500).json({ message: 'Webhook handler failed' })
    }
  })

  async function syncExternalRefund(piId, charge) {
    const refunded = toNumber(charge.amount_refunded, 0) / 100
    const [orders] = await pool.query(
      `SELECT id, status FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1`,
      [piId],
    )
    if (orders[0] && ['paid', 'refund_requested', 'partially_refunded'].includes(orders[0].status)) {
      await applyStoreRefund(orders[0].id, {
        amount: refunded,
        note: 'Synced from Stripe charge.refunded',
        stripeRefundId: charge.refunds?.data?.[0]?.id ?? null,
        alreadyRefundedInStripe: true,
        amountIsCumulative: true,
      })
      return
    }
    const [stays] = await pool.query(
      `SELECT id, status FROM stay_bookings WHERE stripe_payment_intent_id = ? LIMIT 1`,
      [piId],
    )
    if (stays[0] && ['confirmed', 'refund_requested'].includes(stays[0].status)) {
      await applyStayRefund(stays[0].id, {
        amount: refunded,
        note: 'Synced from Stripe charge.refunded',
        stripeRefundId: charge.refunds?.data?.[0]?.id ?? null,
        alreadyRefundedInStripe: true,
      })
    }
  }

  async function fulfillStoreOrder(pi) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [orders] = await conn.query(
        `SELECT id, status, total, currency, stock_reserved AS stockReserved
         FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1 FOR UPDATE`,
        [pi.id],
      )
      const order = orders[0]
      if (!order || ['paid', 'refund_requested', 'partially_refunded', 'refunded'].includes(order.status)) {
        await conn.commit()
        return
      }
      const expectedAmount = toStripeAmount(order.total)
      const currency = String(order.currency ?? getCurrency()).toLowerCase()
      if (toNumber(pi.amount, 0) !== expectedAmount || String(pi.currency ?? '').toLowerCase() !== currency) {
        throw new Error(`PaymentIntent amount/currency mismatch for order ${order.id}`)
      }

      // A payment can race with hold expiry. If stock was already restored, reserve it again
      // transactionally; if it is no longer available, record the payment and flag a refund
      // instead of leaving a charged customer with a silently cancelled order.
      if (order.status === 'cancelled' && !order.stockReserved) {
        const [items] = await conn.query(
          'SELECT product_id AS productId, product_name AS productName, quantity FROM order_items WHERE order_id = ?',
          [order.id],
        )
        const unavailable = []
        for (const item of items) {
          const [products] = await conn.query('SELECT stock_qty AS stockQty FROM products WHERE id = ? FOR UPDATE', [
            item.productId,
          ])
          if (!products[0] || toNumber(products[0].stockQty, 0) < toNumber(item.quantity, 0)) {
            unavailable.push(item.productName)
          }
        }
        if (unavailable.length > 0) {
          await conn.query(
            `UPDATE orders SET status = 'refund_requested', refund_status = 'requested',
             refund_reason = ?, refund_note = ?, refund_requested_at = NOW(),
             paid_at = COALESCE(paid_at, NOW()), expires_at = NULL, fulfillment_status = 'cancelled'
             WHERE id = ?`,
            [
              `Automatic refund required: stock unavailable after late payment (${unavailable.join(', ')})`,
              'Payment succeeded after the checkout hold expired; admin refund required.',
              order.id,
            ],
          )
          await conn.commit()
          return
        }
        for (const item of items) {
          await conn.query('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [
            item.quantity,
            item.productId,
          ])
        }
        await conn.query(
          `UPDATE orders SET status = 'paid', fulfillment_status = 'pending', stock_reserved = 1,
           paid_at = COALESCE(paid_at, NOW()), expires_at = NULL WHERE id = ?`,
          [order.id],
        )
        await conn.commit()
        return
      }

      await conn.query(
        `UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, NOW()), expires_at = NULL WHERE id = ?`,
        [order.id],
      )
      await conn.commit()
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  }

  async function fulfillStayBooking(pi) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [rows] = await conn.query(
        `SELECT id, property_id AS propertyId, check_in AS checkIn, check_out AS checkOut, status, total
         FROM stay_bookings WHERE stripe_payment_intent_id = ? FOR UPDATE`,
        [pi.id],
      )
      const booking = rows[0]
      if (!booking || booking.status === 'confirmed' || booking.status === 'refunded') {
        await conn.commit()
        return
      }
      if (booking.status === 'cancelled') {
        throw new Error(`Payment succeeded for cancelled stay ${booking.id}`)
      }
      const expectedAmount = toStripeAmount(booking.total)
      const currency = getCurrency().toLowerCase()
      if (toNumber(pi.amount, 0) !== expectedAmount || String(pi.currency ?? '').toLowerCase() !== currency) {
        throw new Error(`PaymentIntent amount/currency mismatch for stay ${booking.id}`)
      }

      await conn.query('SELECT id FROM properties WHERE id = ? FOR UPDATE', [booking.propertyId])
      const available = await isStayAvailable(booking.propertyId, booking.checkIn, booking.checkOut, conn, booking.id)
      if (!available) {
        await conn.query(
          `UPDATE stay_bookings SET status = 'refund_requested', refund_status = 'requested',
           refund_reason = ?, refund_requested_at = NOW(), refund_note = ?
           WHERE id = ?`,
          [
            'Automatic: dates became unavailable after payment',
            'Needs admin refund — double-booking conflict after payment',
            booking.id,
          ],
        )
        await conn.commit()
        console.error(`Stay ${booking.id} paid but dates conflict — flagged for refund`)
        return
      }

      await conn.query(`UPDATE stay_bookings SET status = 'confirmed', expires_at = NULL WHERE id = ?`, [booking.id])
      await conn.query(
        `INSERT INTO availability_blocks (property_id, start_date, end_date, source, external_uid, note)
         VALUES (?, ?, ?, 'booking', ?, 'Confirmed stay booking')
         ON DUPLICATE KEY UPDATE note = VALUES(note)`,
        [booking.propertyId, toDateOnly(booking.checkIn), toDateOnly(booking.checkOut), `stay-${booking.id}`],
      )
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }

  async function applyStoreRefund(
    orderId,
    { amount, note, stripeRefundId, alreadyRefundedInStripe = false, amountIsCumulative = false } = {},
  ) {
    const stripe = getStripe()
    const [rows] = await pool.query(
      `SELECT id, status, total, stripe_payment_intent_id AS pi, stock_reserved AS stockReserved,
              stripe_refund_id AS existingRefundId, refunded_amount AS refundedAmount
       FROM orders WHERE id = ? LIMIT 1`,
      [orderId],
    )
    const order = rows[0]
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
    if (order.status === 'refunded') {
      throw Object.assign(new Error('Order already refunded'), { status: 409 })
    }
    if (!['paid', 'refund_requested', 'partially_refunded'].includes(order.status)) {
      throw Object.assign(new Error('Order is not eligible for refund'), { status: 400 })
    }
    const total = toNumber(order.total, 0)
    const existingRefunded = toNumber(order.refundedAmount, 0)
    const refundAmount =
      amount == null || amount === ''
        ? Math.max(0, total - existingRefunded)
        : amountIsCumulative
          ? Math.max(0, toNumber(amount, 0) - existingRefunded)
          : toNumber(amount, 0)
    const targetRefunded = amountIsCumulative ? toNumber(amount, 0) : existingRefunded + refundAmount
    if (amountIsCumulative && targetRefunded <= existingRefunded + 0.001) {
      return { refundId: stripeRefundId ?? order.existingRefundId, refundAmount: 0, refundedTotal: existingRefunded, alreadyDone: true }
    }
    if (refundAmount <= 0 || targetRefunded > total + 0.001) {
      throw Object.assign(new Error('Invalid refund amount'), { status: 400 })
    }
    let refundId = stripeRefundId
    if (!alreadyRefundedInStripe) {
      if (!stripe || !order.pi) throw Object.assign(new Error('Stripe not configured'), { status: 503 })
      const refund = await stripe.refunds.create({
        payment_intent: order.pi,
        amount: toStripeAmount(refundAmount),
        reason: 'requested_by_customer',
        metadata: { orderId: String(orderId) },
      })
      refundId = refund.id
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [locked] = await conn.query(
        `SELECT id, status, total, stock_reserved AS stockReserved,
                stripe_refund_id AS existingRefundId, refunded_amount AS refundedAmount
         FROM orders WHERE id = ? FOR UPDATE`,
        [orderId],
      )
      if (!locked[0]) {
        await conn.rollback()
        throw Object.assign(new Error('Order not found'), { status: 404 })
      }
      const currentRefunded = toNumber(locked[0].refundedAmount, 0)
      const refundedTotal = amountIsCumulative
        ? Math.max(currentRefunded, toNumber(amount, 0))
        : currentRefunded + refundAmount
      if (amountIsCumulative && refundedTotal <= currentRefunded + 0.001) {
        await conn.rollback()
        return { refundId, refundAmount: 0, refundedTotal: currentRefunded, alreadyDone: true }
      }
      const fullyRefunded = refundedTotal >= toNumber(locked[0].total, 0) - 0.001
      if (fullyRefunded && locked[0].stockReserved) {
        await restoreOrderStock(conn, orderId)
      }
      await conn.query(
        `UPDATE orders SET
         status = ?,
         fulfillment_status = CASE WHEN ? THEN 'cancelled' ELSE fulfillment_status END,
         stock_reserved = CASE WHEN ? THEN 0 ELSE stock_reserved END,
         refund_status = ?,
         refunded_amount = ?,
         stripe_refund_id = COALESCE(?, stripe_refund_id),
         refund_note = ?
         WHERE id = ?`,
        [
          fullyRefunded ? 'refunded' : 'partially_refunded',
          fullyRefunded,
          fullyRefunded,
          fullyRefunded ? 'refunded' : 'partially_refunded',
          refundedTotal,
          refundId ?? null,
          note ?? null,
          orderId,
        ],
      )
      await conn.commit()
      return {
        refundId,
        refundAmount,
        refundedTotal,
        status: fullyRefunded ? 'refunded' : 'partially_refunded',
      }
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }

  async function applyStayRefund(bookingId, { amount, note, stripeRefundId, alreadyRefundedInStripe = false } = {}) {
    const stripe = getStripe()
    const [rows] = await pool.query(
      `SELECT id, status, total, stripe_payment_intent_id AS pi, stripe_refund_id AS existingRefundId
       FROM stay_bookings WHERE id = ? LIMIT 1`,
      [bookingId],
    )
    const booking = rows[0]
    if (!booking) throw Object.assign(new Error('Stay booking not found'), { status: 404 })
    if (booking.status === 'refunded' || booking.existingRefundId) {
      throw Object.assign(new Error('Stay already refunded'), { status: 409 })
    }
    if (!['confirmed', 'refund_requested'].includes(booking.status)) {
      throw Object.assign(new Error('Stay is not eligible for refund'), { status: 400 })
    }
    const refundAmount = amount == null || amount === '' ? toNumber(booking.total, 0) : toNumber(amount, 0)
    if (refundAmount <= 0 || refundAmount > toNumber(booking.total, 0) + 0.001) {
      throw Object.assign(new Error('Invalid refund amount'), { status: 400 })
    }
    let refundId = stripeRefundId
    if (!alreadyRefundedInStripe) {
      if (!stripe || !booking.pi) throw Object.assign(new Error('Stripe not configured'), { status: 503 })
      const refund = await stripe.refunds.create({
        payment_intent: booking.pi,
        amount: toStripeAmount(refundAmount),
        reason: 'requested_by_customer',
        metadata: { stayBookingId: String(bookingId) },
      })
      refundId = refund.id
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [locked] = await conn.query(
        `SELECT id, status, stripe_refund_id AS existingRefundId FROM stay_bookings WHERE id = ? FOR UPDATE`,
        [bookingId],
      )
      if (!locked[0] || locked[0].status === 'refunded' || locked[0].existingRefundId) {
        await conn.rollback()
        return { refundId, refundAmount, alreadyDone: true }
      }
      await conn.query(
        `UPDATE stay_bookings SET status = 'refunded', refund_status = 'refunded',
         refunded_amount = ?, stripe_refund_id = ?, refund_note = ?, expires_at = NULL
         WHERE id = ?`,
        [refundAmount, refundId ?? null, note ?? null, bookingId],
      )
      await conn.query(
        `DELETE FROM availability_blocks WHERE source = 'booking' AND external_uid = ? LIMIT 1`,
        [`stay-${bookingId}`],
      )
      await conn.commit()
      return { refundId, refundAmount }
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }

  // ── Admin: shipping rules ───────────────────────────────
  app.get('/api/admin/shipping-rules', requireAdmin, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, name, postcode_prefixes AS postcodePrefixes, base_fee AS baseFee, per_kg_fee AS perKgFee,
                free_over AS freeOver, sort_order AS sortOrder, is_active AS isActive
         FROM shipping_rules ORDER BY sort_order ASC, id ASC`,
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load shipping rules', error)
    }
  })

  app.post('/api/admin/shipping-rules', requireAdmin, async (req, res) => {
    try {
      const [result] = await pool.query(
        `INSERT INTO shipping_rules (name, postcode_prefixes, base_fee, per_kg_fee, free_over, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          String(req.body?.name ?? ''),
          String(req.body?.postcodePrefixes ?? '*'),
          toNumber(req.body?.baseFee, 0),
          toNumber(req.body?.perKgFee, 0),
          req.body?.freeOver == null || req.body?.freeOver === '' ? null : toNumber(req.body.freeOver, 0),
          toNumber(req.body?.sortOrder, 100),
          req.body?.isActive === false ? 0 : 1,
        ],
      )
      res.status(201).json({ id: result.insertId })
    } catch (error) {
      sendServerError(res, 'Failed to create shipping rule', error)
    }
  })

  app.put('/api/admin/shipping-rules/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      await pool.query(
        `UPDATE shipping_rules SET name=?, postcode_prefixes=?, base_fee=?, per_kg_fee=?, free_over=?, sort_order=?, is_active=? WHERE id=?`,
        [
          String(req.body?.name ?? ''),
          String(req.body?.postcodePrefixes ?? '*'),
          toNumber(req.body?.baseFee, 0),
          toNumber(req.body?.perKgFee, 0),
          req.body?.freeOver == null || req.body?.freeOver === '' ? null : toNumber(req.body.freeOver, 0),
          toNumber(req.body?.sortOrder, 100),
          req.body?.isActive === false ? 0 : 1,
          id,
        ],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to update shipping rule', error)
    }
  })

  app.delete('/api/admin/shipping-rules/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    try {
      await pool.query('DELETE FROM shipping_rules WHERE id = ? LIMIT 1', [id])
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to delete shipping rule', error)
    }
  })

  // ── Admin: orders + sales ───────────────────────────────
  app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, order_number AS orderNumber, email, full_name AS fullName, phone, shipping_method AS shippingMethod,
                shipping_postcode AS shippingPostcode, subtotal, shipping_fee AS shippingFee, total, status,
                fulfillment_status AS fulfillmentStatus, shipping_breakdown_json AS shippingBreakdownJson,
                refund_status AS refundStatus, refund_reason AS refundReason, refund_note AS refundNote,
                refunded_amount AS refundedAmount, carrier, tracking_number AS trackingNumber,
                tracking_url AS trackingUrl, paid_at AS paidAt, packed_at AS packedAt, shipped_at AS shippedAt,
                delivered_at AS deliveredAt, refund_requested_at AS refundRequestedAt,
                created_at AS createdAt, updated_at AS updatedAt
         FROM orders
         WHERE status IN ('paid', 'refund_requested', 'partially_refunded', 'refunded')
         ORDER BY id DESC LIMIT 500`,
      )
      res.json(
        rows.map((r) => ({
          ...r,
          shippingBreakdown: r.shippingBreakdownJson ? JSON.parse(r.shippingBreakdownJson) : null,
          shippingBreakdownJson: undefined,
        })),
      )
    } catch (error) {
      sendServerError(res, 'Failed to load orders', error)
    }
  })

  app.get('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    try {
      const [orders] = await pool.query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id])
      if (!orders[0]) return res.status(404).json({ message: 'Order not found' })
      const [items] = await pool.query(
        `SELECT id, product_id AS productId, product_name AS productName, product_size AS productSize,
                unit_price AS unitPrice, quantity, line_total AS lineTotal
         FROM order_items WHERE order_id = ?`,
        [id],
      )
      res.json({ order: orders[0], items })
    } catch (error) {
      sendServerError(res, 'Failed to load order', error)
    }
  })

  app.put('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      const fulfillmentStatus =
        req.body?.fulfillmentStatus == null ? null : String(req.body.fulfillmentStatus).trim().toLowerCase()
      const allowedFulfillment = new Set(['pending', 'packed', 'shipped', 'delivered', 'cancelled'])
      if (fulfillmentStatus && !allowedFulfillment.has(fulfillmentStatus)) {
        return res.status(400).json({ message: 'Invalid fulfillment status' })
      }
      const carrier = req.body?.carrier == null ? null : String(req.body.carrier).trim().slice(0, 80)
      const trackingNumber =
        req.body?.trackingNumber == null ? null : String(req.body.trackingNumber).trim().slice(0, 160)
      const trackingUrl = req.body?.trackingUrl == null ? null : String(req.body.trackingUrl).trim().slice(0, 500)
      const adminNote = req.body?.adminNote == null ? null : String(req.body.adminNote).trim().slice(0, 4000)
      if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
        return res.status(400).json({ message: 'Tracking link must start with http:// or https://' })
      }
      const [orders] = await pool.query('SELECT status FROM orders WHERE id = ? LIMIT 1', [id])
      if (!orders[0]) return res.status(404).json({ message: 'Order not found' })
      if (
        fulfillmentStatus &&
        ['packed', 'shipped', 'delivered'].includes(fulfillmentStatus) &&
        !['paid', 'partially_refunded'].includes(orders[0].status)
      ) {
        return res.status(400).json({ message: 'Only paid orders can be packed, shipped, or delivered' })
      }

      const [result] = await pool.query(
        `UPDATE orders SET
           fulfillment_status = COALESCE(?, fulfillment_status),
           carrier = COALESCE(?, carrier),
           tracking_number = COALESCE(?, tracking_number),
           tracking_url = COALESCE(?, tracking_url),
           admin_note = COALESCE(?, admin_note),
           packed_at = CASE WHEN ? = 'packed' THEN COALESCE(packed_at, NOW()) ELSE packed_at END,
           shipped_at = CASE WHEN ? = 'shipped' THEN COALESCE(shipped_at, NOW()) ELSE shipped_at END,
           delivered_at = CASE WHEN ? = 'delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END
         WHERE id = ?`,
        [
          fulfillmentStatus,
          carrier,
          trackingNumber,
          trackingUrl,
          adminNote,
          fulfillmentStatus,
          fulfillmentStatus,
          fulfillmentStatus,
          id,
        ],
      )
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' })
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to update order', error)
    }
  })

  app.post('/api/admin/orders/:id/refund', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      const result = await applyStoreRefund(id, {
        amount: req.body?.amount,
        note: req.body?.note ? String(req.body.note) : 'Admin approved refund',
      })
      res.json({ ok: true, ...result })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Failed to refund order', error)
    }
  })

  app.post('/api/admin/orders/:id/refund-reject', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      const [rows] = await pool.query(`SELECT id, status FROM orders WHERE id = ? LIMIT 1`, [id])
      if (!rows[0]) return res.status(404).json({ message: 'Order not found' })
      if (rows[0].status !== 'refund_requested') {
        return res.status(400).json({ message: 'No refund request to reject' })
      }
      await pool.query(
        `UPDATE orders SET status = 'paid', refund_status = 'rejected', refund_note = ? WHERE id = ?`,
        [String(req.body?.note ?? 'Refund request declined'), id],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to reject refund', error)
    }
  })

  app.get('/api/admin/sales-summary', requireAdmin, async (_req, res) => {
    try {
      const [orderStats] = await pool.query(
        `SELECT COUNT(*) AS orderCount,
                COALESCE(SUM(total), 0) AS grossRevenue,
                COALESCE(SUM(refunded_amount), 0) AS refundedRevenue,
                COALESCE(SUM(total - COALESCE(refunded_amount, 0)), 0) AS netRevenue
         FROM orders
         WHERE status IN ('paid', 'refund_requested', 'partially_refunded', 'refunded')`,
      )
      const [stayStats] = await pool.query(
        `SELECT COUNT(*) AS stayCount, COALESCE(SUM(total),0) AS stayRevenue
         FROM stay_bookings WHERE status = 'confirmed'`,
      )
      res.json({
        storeOrders: toNumber(orderStats[0]?.orderCount, 0),
        storeRevenue: toNumber(orderStats[0]?.netRevenue, 0),
        storeGrossRevenue: toNumber(orderStats[0]?.grossRevenue, 0),
        storeRefunds: toNumber(orderStats[0]?.refundedRevenue, 0),
        stayBookings: toNumber(stayStats[0]?.stayCount, 0),
        stayRevenue: toNumber(stayStats[0]?.stayRevenue, 0),
        onlineRevenue: toNumber(orderStats[0]?.netRevenue, 0) + toNumber(stayStats[0]?.stayRevenue, 0),
      })
    } catch (error) {
      sendServerError(res, 'Failed to load sales summary', error)
    }
  })

  // ── Café capacity & table holds ─────────────────────────
  // Pending + confirmed + seated count toward capacity.
  // Pending auto-expires the morning after the dining day if staff never confirmed.
  const ACTIVE_HOLD_STATUSES = ['pending', 'held', 'confirmed', 'seated']
  const ALLOWED_HOLD_STATUSES = ['pending', 'confirmed', 'seated', 'cancelled', 'declined', 'expired']
  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  function normalizeCafeSlot(slot) {
    const s = String(slot ?? 'lunch').toLowerCase()
    return s.includes('dinner') ? 'dinner' : 'lunch'
  }

  function parseOpenDays(raw) {
    return String(raw ?? '4,5,6,0')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  }

  async function getCafeCapacitySettings() {
    const [rows] = await pool.query(
      `SELECT lunch_covers AS lunchCovers, dinner_covers AS dinnerCovers,
              max_party_size AS maxPartySize, open_days AS openDays
       FROM cafe_capacity WHERE id = 1 LIMIT 1`,
    )
    const row = rows[0] ?? {}
    return {
      lunchCovers: Math.max(1, toNumber(row.lunchCovers, 40)),
      dinnerCovers: Math.max(1, toNumber(row.dinnerCovers, 30)),
      maxPartySize: Math.max(1, toNumber(row.maxPartySize, 10)),
      openDays: parseOpenDays(row.openDays),
    }
  }

  async function getSlotBookedCovers(partyDate, slot, excludeHoldId = 0, db = pool) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(covers), 0) AS booked
       FROM table_holds
       WHERE party_date = ? AND slot = ? AND status IN (?, ?, ?, ?)
         AND id <> ?`,
      [partyDate, slot, ...ACTIVE_HOLD_STATUSES, excludeHoldId || 0],
    )
    return toNumber(rows[0]?.booked, 0)
  }

  async function getCafeAvailability(partyDate, slotInput, covers = 1, excludeHoldId = 0, options = {}) {
    const ignoreClosed = Boolean(options.ignoreClosed)
    const db = options.db ?? pool
    const settings = options.settings ?? (await getCafeCapacitySettings())
    const slot = normalizeCafeSlot(slotInput)
    const partyCovers = Math.max(1, Math.floor(toNumber(covers, 1)))
    const day = new Date(`${partyDate}T12:00:00`).getDay()
    const open = settings.openDays.includes(day)
    const capacity = slot === 'dinner' ? settings.dinnerCovers : settings.lunchCovers
    const treatAsOpen = open || ignoreClosed
    const booked = treatAsOpen ? await getSlotBookedCovers(partyDate, slot, excludeHoldId, db) : 0
    const remaining = treatAsOpen ? Math.max(0, capacity - booked) : 0
    let reason = ''
    if (!open && !ignoreClosed) {
      reason = `Café is closed on ${WEEKDAY_NAMES[day] ?? 'this day'}. Open Thu–Sun.`
    } else if (partyCovers > settings.maxPartySize) {
      reason = `Maximum party size is ${settings.maxPartySize} guests. Please contact us for larger groups.`
    } else if (remaining <= 0) {
      reason = `This ${slot} service is fully booked (${capacity} covers).`
    } else if (partyCovers > remaining) {
      reason = `Only ${remaining} seat${remaining === 1 ? '' : 's'} left for this ${slot}.`
    }
    return {
      date: partyDate,
      slot,
      open,
      capacity,
      booked,
      remaining,
      covers: partyCovers,
      maxPartySize: settings.maxPartySize,
      available:
        (open || ignoreClosed) &&
        partyCovers <= settings.maxPartySize &&
        partyCovers <= remaining,
      reason,
      openDays: settings.openDays,
      openDayNames: settings.openDays.map((d) => WEEKDAY_NAMES[d]),
    }
  }

  async function expireTableHolds() {
    await pool.query(
      `UPDATE table_holds
       SET expires_at = TIMESTAMP(DATE_ADD(party_date, INTERVAL 1 DAY))
       WHERE status IN ('pending', 'held')
         AND expires_at < TIMESTAMP(party_date)`,
    )
    await pool.query(
      `UPDATE table_holds SET status = 'expired'
       WHERE status IN ('pending', 'held') AND expires_at < NOW()`,
    )
  }

  app.get('/api/cafe/availability', async (req, res) => {
    try {
      const date = String(req.query.date ?? '').slice(0, 10)
      const slot = String(req.query.slot ?? 'lunch')
      const covers = toNumber(req.query.covers, 2)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Valid date is required (YYYY-MM-DD)' })
      }
      res.json(await getCafeAvailability(date, slot, covers))
    } catch (error) {
      sendServerError(res, 'Failed to load café availability', error)
    }
  })

  app.get('/api/admin/cafe-capacity', requireAdmin, async (_req, res) => {
    try {
      res.json(await getCafeCapacitySettings())
    } catch (error) {
      sendServerError(res, 'Failed to load café capacity', error)
    }
  })

  app.put('/api/admin/cafe-capacity', requireAdmin, async (req, res) => {
    try {
      const body = req.body ?? {}
      const lunchCovers = Math.max(1, Math.floor(toNumber(body.lunchCovers, 40)))
      const dinnerCovers = Math.max(1, Math.floor(toNumber(body.dinnerCovers, 30)))
      const maxPartySize = Math.max(1, Math.floor(toNumber(body.maxPartySize, 10)))
      let openDays = Array.isArray(body.openDays)
        ? body.openDays.map((d) => Number(d)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
        : parseOpenDays(body.openDays)
      if (openDays.length === 0) openDays = [4, 5, 6, 0]
      await pool.query(
        `INSERT INTO cafe_capacity (id, lunch_covers, dinner_covers, max_party_size, open_days)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           lunch_covers = VALUES(lunch_covers),
           dinner_covers = VALUES(dinner_covers),
           max_party_size = VALUES(max_party_size),
           open_days = VALUES(open_days)`,
        [lunchCovers, dinnerCovers, maxPartySize, openDays.join(',')],
      )
      res.json(await getCafeCapacitySettings())
    } catch (error) {
      sendServerError(res, 'Failed to update café capacity', error)
    }
  })

  app.post('/api/table-holds', async (req, res) => {
    const ip = getClientIp(req)
    const retryAfter = checkWindowedLimit(tableHoldAttemptMap, ip, TABLE_HOLD_MAX_ATTEMPTS)
    if (retryAfter !== null) {
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({ message: `Too many table requests. Try again in ${retryAfter}s.` })
    }
    consumeWindowedAttempt(tableHoldAttemptMap, ip, TABLE_HOLD_WINDOW_MS)

    const body = req.body ?? {}
    // Honeypot — bots that fill hidden "website" get a fake success.
    if (body.website) {
      return res.status(202).json({
        message: 'Request received — pending confirmation from our team.',
        status: 'pending',
      })
    }

    const fullName = String(body.fullName ?? '').trim().slice(0, 180)
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 180)
    const phone = String(body.phone ?? '').trim().slice(0, 40)
    const normalizedPartyDate = toDateOnly(body.partyDate ?? body.date ?? '')
    const slot = normalizeCafeSlot(body.slot)
    const covers = Math.max(1, Math.floor(toNumber(body.covers ?? body.guestCount, 2)))
    const notes = String(body.notes ?? '').slice(0, 2000)

    if (!fullName || !email || !normalizedPartyDate) {
      return res.status(400).json({ message: 'Name, email, and date are required' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: 'Please enter a valid phone number so we can confirm your table.' })
    }
    if (!isValidISODate(normalizedPartyDate)) {
      return res.status(400).json({ message: 'Please enter a valid dining date.' })
    }
    if (isPastDate(normalizedPartyDate)) {
      return res.status(400).json({ message: 'Please choose today or a future dining date.' })
    }

    const conn = await pool.getConnection()
    try {
      await expireTableHolds()
      await conn.beginTransaction()
      // Serialize capacity checks so two concurrent requests cannot overbook.
      await conn.query('SELECT id FROM cafe_capacity WHERE id = 1 FOR UPDATE')
      const settings = await getCafeCapacitySettings()
      const availability = await getCafeAvailability(normalizedPartyDate, slot, covers, 0, {
        db: conn,
        settings,
      })
      if (!availability.available) {
        await conn.rollback()
        return res.status(409).json({
          message: availability.reason || 'This service is not available',
          availability,
        })
      }

      const number = holdNumber()
      const [result] = await conn.query(
        `INSERT INTO table_holds (hold_number, full_name, email, phone, party_date, slot, covers, notes, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', TIMESTAMP(DATE_ADD(?, INTERVAL 1 DAY)))`,
        [number, fullName, email, phone, normalizedPartyDate, slot, covers, notes, normalizedPartyDate],
      )
      await conn.commit()

      res.status(201).json({
        id: result.insertId,
        holdNumber: number,
        partyDate: normalizedPartyDate,
        slot,
        covers,
        status: 'pending',
        message: 'Request received — pending confirmation from our team.',
        availability: await getCafeAvailability(normalizedPartyDate, slot, 1),
      })
    } catch (error) {
      try {
        await conn.rollback()
      } catch {
        // ignore rollback errors
      }
      sendServerError(res, 'Failed to create table hold', error)
    } finally {
      conn.release()
    }
  })

  app.get('/api/admin/table-holds', requireAdmin, async (_req, res) => {
    try {
      await expireTableHolds()
      const [rows] = await pool.query(
        `SELECT id, hold_number AS holdNumber, full_name AS fullName, email, phone, party_date AS partyDate,
                slot, covers, notes, status, expires_at AS expiresAt, created_at AS createdAt
         FROM table_holds ORDER BY id DESC LIMIT 500`,
      )
      res.json(
        rows.map((row) => ({
          ...row,
          partyDate: toDateOnly(row.partyDate),
          expiresAt: toDateOnly(row.expiresAt) || row.expiresAt,
        })),
      )
    } catch (error) {
      sendServerError(res, 'Failed to load table holds', error)
    }
  })

  app.put('/api/admin/table-holds/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid hold id' })

    try {
      const [existingRows] = await pool.query(
        `SELECT id, full_name AS fullName, email, phone, party_date AS partyDate, slot, covers, notes, status
         FROM table_holds WHERE id = ? LIMIT 1`,
        [id],
      )
      const existing = existingRows[0]
      if (!existing) return res.status(404).json({ message: 'Table hold not found' })

      const body = req.body ?? {}
      const status = body.status !== undefined ? String(body.status) : String(existing.status)
      if (!ALLOWED_HOLD_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${ALLOWED_HOLD_STATUSES.join(', ')}` })
      }

      const fullName = body.fullName !== undefined ? String(body.fullName).trim() : String(existing.fullName)
      const email = body.email !== undefined ? String(body.email).trim() : String(existing.email)
      const phone = body.phone !== undefined ? String(body.phone).trim() : String(existing.phone ?? '')
      const partyDate = body.partyDate !== undefined
        ? toDateOnly(body.partyDate)
        : toDateOnly(existing.partyDate)
      const slot = body.slot !== undefined ? normalizeCafeSlot(body.slot) : normalizeCafeSlot(existing.slot)
      const covers = body.covers !== undefined
        ? Math.max(1, Math.floor(toNumber(body.covers, existing.covers)))
        : Math.max(1, Math.floor(toNumber(existing.covers, 1)))
      const notes = body.notes !== undefined ? String(body.notes) : String(existing.notes ?? '')

      if (!fullName || !email || !/^\d{4}-\d{2}-\d{2}$/.test(partyDate)) {
        return res.status(400).json({ message: 'Name, email, and a valid dining date are required' })
      }

      const existingPartyDate = toDateOnly(existing.partyDate)
      const existingSlot = normalizeCafeSlot(existing.slot)
      const existingCovers = Math.max(1, Math.floor(toNumber(existing.covers, 1)))
      const scheduleChanged =
        partyDate !== existingPartyDate || slot !== existingSlot || covers !== existingCovers
      const bodyKeys = Object.keys(body)
      const statusOnly = bodyKeys.length === 1 && body.status !== undefined

      // Status-only changes (Confirm / Decline / dropdown) must never be blocked by
      // open-day / capacity re-checks — those only apply when admin moves the booking.
      if (!statusOnly && scheduleChanged && ACTIVE_HOLD_STATUSES.includes(status)) {
        const availability = await getCafeAvailability(partyDate, slot, covers, id, {
          ignoreClosed: true,
        })
        if (!availability.available) {
          return res.status(409).json({
            message: availability.reason || 'That date/slot does not have enough capacity',
            availability,
          })
        }
      }

      await pool.query(
        `UPDATE table_holds
         SET full_name = ?, email = ?, phone = ?, party_date = ?, slot = ?, covers = ?, notes = ?,
             status = ?, expires_at = TIMESTAMP(DATE_ADD(?, INTERVAL 1 DAY))
         WHERE id = ?`,
        [fullName, email, phone, partyDate, slot, covers, notes, status, partyDate, id],
      )

      const [updatedRows] = await pool.query(
        `SELECT id, hold_number AS holdNumber, full_name AS fullName, email, phone, party_date AS partyDate,
                slot, covers, notes, status, expires_at AS expiresAt, created_at AS createdAt
         FROM table_holds WHERE id = ? LIMIT 1`,
        [id],
      )
      const hold = updatedRows[0]
      res.json({
        ok: true,
        hold: hold
          ? {
              ...hold,
              partyDate: toDateOnly(hold.partyDate),
              expiresAt: toDateOnly(hold.expiresAt) || hold.expiresAt,
            }
          : null,
      })
    } catch (error) {
      sendServerError(res, 'Failed to update table hold', error)
    }
  })

  // ── Properties & stays ──────────────────────────────────
  app.get('/api/properties', async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, slug, name, description, nightly_rate AS nightlyRate, min_nights AS minNights,
                max_guests AS maxGuests, cleaning_fee AS cleaningFee
         FROM properties WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load properties', error)
    }
  })

  app.get('/api/properties/:id/availability', async (req, res) => {
    try {
      const id = toNumber(req.params.id, 0)
      const from = String(req.query.from ?? new Date().toISOString().slice(0, 10))
      const to = String(req.query.to ?? '')
      const [blocks] = await pool.query(
        `SELECT start_date AS startDate, end_date AS endDate, source, note
         FROM availability_blocks
         WHERE property_id = ? AND end_date > ? ${to ? 'AND start_date < ?' : ''}
         ORDER BY start_date ASC`,
        to ? [id, from, to] : [id, from],
      )
      res.json({
        blocks: blocks.map((b) => ({
          ...b,
          startDate: toDateOnly(b.startDate),
          endDate: toDateOnly(b.endDate),
        })),
      })
    } catch (error) {
      sendServerError(res, 'Failed to load availability', error)
    }
  })

  app.post('/api/stays/quote', async (req, res) => {
    try {
      await expirePendingPayments()
      const propertyId = toNumber(req.body?.propertyId, 0)
      const checkIn = toDateOnly(req.body?.checkIn)
      const checkOut = toDateOnly(req.body?.checkOut)
      const guests = Math.max(1, Math.floor(toNumber(req.body?.guests, 1)))
      if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) {
        return res.status(400).json({ message: 'Valid check-in and check-out dates are required' })
      }
      if (isPastDate(checkIn)) {
        return res.status(400).json({ message: 'Check-in must be today or later' })
      }
      if (!(checkIn < checkOut)) {
        return res.status(400).json({ message: 'Check-out must be after check-in' })
      }
      const [props] = await pool.query(
        `SELECT id, nightly_rate AS nightlyRate, min_nights AS minNights, max_guests AS maxGuests, cleaning_fee AS cleaningFee, name
         FROM properties WHERE id = ? AND is_active = 1 LIMIT 1`,
        [propertyId],
      )
      const property = props[0]
      if (!property) return res.status(404).json({ message: 'Property not found' })
      const nights = nightsBetween(checkIn, checkOut)
      if (nights < 1) {
        return res.status(400).json({ message: 'Stay must be at least 1 night' })
      }
      if (nights < property.minNights) {
        return res.status(400).json({ message: `Minimum stay is ${property.minNights} nights` })
      }
      if (guests > property.maxGuests) {
        return res.status(400).json({ message: `Max guests is ${property.maxGuests}` })
      }
      const available = await isStayAvailable(propertyId, checkIn, checkOut)
      if (!available) return res.status(409).json({ message: 'Selected dates are unavailable' })
      const stayTotal = +(nights * toNumber(property.nightlyRate, 0)).toFixed(2)
      const cleaning = toNumber(property.cleaningFee, 0)
      const total = +(stayTotal + cleaning).toFixed(2)
      res.json({
        propertyId,
        propertyName: property.name,
        nights,
        nightlyRate: toNumber(property.nightlyRate, 0),
        cleaningFee: cleaning,
        stayTotal,
        total,
        currency: getCurrency(),
      })
    } catch (error) {
      sendServerError(res, 'Failed to quote stay', error)
    }
  })

  async function isStayAvailable(propertyId, checkIn, checkOut, db = pool, excludeBookingId = null) {
    const start = toDateOnly(checkIn)
    const end = toDateOnly(checkOut)
    const [blocks] = await db.query(
      `SELECT start_date AS startDate, end_date AS endDate FROM availability_blocks WHERE property_id = ?`,
      [propertyId],
    )
    for (const b of blocks) {
      if (datesOverlap(start, end, toDateOnly(b.startDate), toDateOnly(b.endDate))) {
        return false
      }
    }
    const [bookings] = await db.query(
      `SELECT id, check_in AS checkIn, check_out AS checkOut FROM stay_bookings
       WHERE property_id = ?
         AND (
           status IN ('confirmed', 'refund_requested')
           OR (status = 'pending_payment' AND (expires_at IS NULL OR expires_at > NOW()))
         )`,
      [propertyId],
    )
    for (const b of bookings) {
      if (excludeBookingId && toNumber(b.id, 0) === toNumber(excludeBookingId, 0)) continue
      if (datesOverlap(start, end, toDateOnly(b.checkIn), toDateOnly(b.checkOut))) {
        return false
      }
    }
    return true
  }

  app.post('/api/stays/checkout', optionalCustomer, async (req, res) => {
    if (!FEATURE_CHECKOUT) return res.status(503).json({ message: 'Checkout temporarily disabled' })
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ message: 'Stripe is not configured' })
    try {
      await expirePendingPayments()
      const body = req.body ?? {}
      const propertyId = toNumber(body.propertyId, 0)
      const checkIn = toDateOnly(body.checkIn)
      const checkOut = toDateOnly(body.checkOut)
      const guests = Math.max(1, Math.floor(toNumber(body.guests, 1)))
      const email = String(body.email ?? req.customer?.email ?? '').trim()
      const fullName = String(body.fullName ?? req.customer?.fullName ?? '').trim()
      if (!email || !fullName) return res.status(400).json({ message: 'Name and email required' })
      if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) {
        return res.status(400).json({ message: 'Valid check-in and check-out dates are required' })
      }
      if (isPastDate(checkIn)) {
        return res.status(400).json({ message: 'Check-in must be today or later' })
      }
      if (!(checkIn < checkOut)) {
        return res.status(400).json({ message: 'Check-out must be after check-in' })
      }

      const conn = await pool.getConnection()
      let bookingId
      let property
      let nights
      let total
      let number
      const expiresAt = pendingExpiresAtDate()
      try {
        await conn.beginTransaction()
        const [props] = await conn.query(
          `SELECT * FROM properties WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE`,
          [propertyId],
        )
        property = props[0]
        if (!property) {
          throw Object.assign(new Error('Property not found'), { status: 404 })
        }
        nights = nightsBetween(checkIn, checkOut)
        if (nights < 1) throw Object.assign(new Error('Stay must be at least 1 night'), { status: 400 })
        if (nights < property.min_nights) {
          throw Object.assign(new Error('Below minimum nights'), { status: 400 })
        }
        if (guests > property.max_guests) {
          throw Object.assign(new Error(`Max guests is ${property.max_guests}`), { status: 400 })
        }
        if (!(await isStayAvailable(propertyId, checkIn, checkOut, conn))) {
          throw Object.assign(new Error('Dates unavailable'), { status: 409 })
        }
        const nightly = toNumber(property.nightly_rate, 0)
        const cleaning = toNumber(property.cleaning_fee, 0)
        total = +(nights * nightly + cleaning).toFixed(2)
        number = stayNumber()

        const [result] = await conn.query(
          `INSERT INTO stay_bookings (
            booking_number, property_id, customer_id, email, full_name, phone,
            check_in, check_out, guests, nights, nightly_rate, cleaning_fee, total, status, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?)`,
          [
            number,
            propertyId,
            req.customer?.id ?? null,
            email,
            fullName,
            String(body.phone ?? ''),
            checkIn,
            checkOut,
            guests,
            nights,
            nightly,
            cleaning,
            total,
            expiresAt,
          ],
        )
        bookingId = result.insertId
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }

      let pi
      try {
        pi = await stripe.paymentIntents.create({
          amount: toStripeAmount(total),
          currency: getCurrency(),
          automatic_payment_methods: { enabled: true },
          receipt_email: email,
          metadata: { stayBookingId: String(bookingId), bookingNumber: number, type: 'stay_booking' },
        })
      } catch (piError) {
        await pool.query(`UPDATE stay_bookings SET status = 'cancelled' WHERE id = ?`, [bookingId])
        throw piError
      }
      await pool.query('UPDATE stay_bookings SET stripe_payment_intent_id = ? WHERE id = ?', [pi.id, bookingId])

      res.status(201).json({
        bookingId,
        bookingNumber: number,
        clientSecret: pi.client_secret,
        total,
        currency: getCurrency(),
        expiresAt: expiresAt.toISOString(),
        holdMinutes: Math.round(PENDING_HOLD_MS / 60000),
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Failed to start stay checkout', error)
    }
  })

  app.post('/api/stays/confirm-payment-intent', async (req, res) => {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ message: 'Stripe is not configured (set STRIPE_SECRET_KEY)' })
    try {
      const bookingId = toNumber(req.body?.bookingId, 0)
      const paymentIntentId = String(req.body?.paymentIntentId ?? '').trim()
      if (!bookingId || !paymentIntentId) return res.status(400).json({ message: 'bookingId and paymentIntentId are required' })
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (!pi) return res.status(404).json({ message: 'PaymentIntent not found' })
      if (String(pi.metadata?.stayBookingId ?? '') !== String(bookingId)) {
        return res.status(400).json({ message: 'PaymentIntent does not match booking' })
      }
      if (pi.status !== 'succeeded') {
        return res.status(400).json({ message: `Payment not completed (${pi.status})` })
      }
      await fulfillStayBooking(pi)
      const [rows] = await pool.query(
        `SELECT id, booking_number AS bookingNumber, status, total FROM stay_bookings WHERE id = ? LIMIT 1`,
        [bookingId],
      )
      res.json({ ok: true, booking: rows[0] })
    } catch (error) {
      sendServerError(res, 'Failed to confirm stay payment', error)
    }
  })

  app.get('/api/admin/properties', requireAdmin, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, slug, name, description, nightly_rate AS nightlyRate, min_nights AS minNights,
                max_guests AS maxGuests, cleaning_fee AS cleaningFee, ical_airbnb_url AS icalAirbnbUrl,
                ical_booking_url AS icalBookingUrl, is_active AS isActive, sort_order AS sortOrder
         FROM properties ORDER BY sort_order ASC, id ASC`,
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load properties', error)
    }
  })

  app.put('/api/admin/properties/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    try {
      await pool.query(
        `UPDATE properties SET name=?, description=?, nightly_rate=?, min_nights=?, max_guests=?, cleaning_fee=?,
         ical_airbnb_url=?, ical_booking_url=?, is_active=?, sort_order=? WHERE id=?`,
        [
          String(req.body?.name ?? ''),
          String(req.body?.description ?? ''),
          toNumber(req.body?.nightlyRate, 0),
          toNumber(req.body?.minNights, 1),
          toNumber(req.body?.maxGuests, 2),
          toNumber(req.body?.cleaningFee, 0),
          req.body?.icalAirbnbUrl ? String(req.body.icalAirbnbUrl) : null,
          req.body?.icalBookingUrl ? String(req.body.icalBookingUrl) : null,
          req.body?.isActive === false ? 0 : 1,
          toNumber(req.body?.sortOrder, 100),
          id,
        ],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to update property', error)
    }
  })

  app.post('/api/admin/properties/:id/blocks', requireAdmin, async (req, res) => {
    const propertyId = toNumber(req.params.id, 0)
    try {
      const startDate = String(req.body?.startDate ?? '')
      const endDate = String(req.body?.endDate ?? '')
      const [result] = await pool.query(
        `INSERT INTO availability_blocks (property_id, start_date, end_date, source, external_uid, note)
         VALUES (?, ?, ?, 'manual', ?, ?)`,
        [
          propertyId,
          startDate,
          endDate,
          `manual-${propertyId}-${startDate}-${endDate}-${Date.now()}`,
          String(req.body?.note ?? 'Manual block-out'),
        ],
      )
      res.status(201).json({ id: result.insertId })
    } catch (error) {
      sendServerError(res, 'Failed to create block', error)
    }
  })

  app.delete('/api/admin/blocks/:id', requireAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM availability_blocks WHERE id = ? AND source = \'manual\' LIMIT 1', [
        toNumber(req.params.id, 0),
      ])
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to delete block', error)
    }
  })

  app.get('/api/admin/stay-bookings', requireAdmin, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT sb.id, sb.booking_number AS bookingNumber, sb.email, sb.full_name AS fullName,
                sb.check_in AS checkIn, sb.check_out AS checkOut, sb.guests, sb.nights, sb.total, sb.status,
                sb.refund_status AS refundStatus, sb.refund_reason AS refundReason, sb.refund_note AS refundNote,
                sb.refunded_amount AS refundedAmount, p.name AS propertyName
         FROM stay_bookings sb
         JOIN properties p ON p.id = sb.property_id
         ORDER BY sb.id DESC LIMIT 500`,
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load stay bookings', error)
    }
  })

  app.post('/api/admin/stay-bookings/:id/refund', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      const result = await applyStayRefund(id, {
        amount: req.body?.amount,
        note: req.body?.note ? String(req.body.note) : 'Admin approved stay refund',
      })
      res.json({ ok: true, ...result })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Failed to refund stay', error)
    }
  })

  app.post('/api/admin/stay-bookings/:id/refund-reject', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      const [rows] = await pool.query(`SELECT id, status FROM stay_bookings WHERE id = ? LIMIT 1`, [id])
      if (!rows[0]) return res.status(404).json({ message: 'Stay booking not found' })
      if (rows[0].status !== 'refund_requested') {
        return res.status(400).json({ message: 'No refund request to reject' })
      }
      await pool.query(
        `UPDATE stay_bookings SET status = 'confirmed', refund_status = 'rejected', refund_note = ? WHERE id = ?`,
        [String(req.body?.note ?? 'Refund request declined'), id],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to reject stay refund', error)
    }
  })

  app.post('/api/admin/ical-sync', requireAdmin, async (_req, res) => {
    try {
      const result = await syncAllIcalFeeds()
      res.json(result)
    } catch (error) {
      sendServerError(res, 'iCal sync failed', error)
    }
  })

  async function syncAllIcalFeeds() {
    const [properties] = await pool.query(
      `SELECT id, ical_airbnb_url AS airbnb, ical_booking_url AS booking FROM properties WHERE is_active = 1`,
    )
    let imported = 0
    for (const p of properties) {
      for (const [source, url] of [
        ['airbnb', p.airbnb],
        ['bookingcom', p.booking],
      ]) {
        if (!url) continue
        try {
          const events = await fetchAndParseIcal(url)
          // Clear previous imports for this source
          await pool.query(`DELETE FROM availability_blocks WHERE property_id = ? AND source = ?`, [p.id, source])
          for (const ev of events) {
            await pool.query(
              `INSERT INTO availability_blocks (property_id, start_date, end_date, source, external_uid, note)
               VALUES (?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE start_date=VALUES(start_date), end_date=VALUES(end_date), note=VALUES(note)`,
              [p.id, ev.startDate, ev.endDate, source, ev.uid.slice(0, 240), ev.summary.slice(0, 240)],
            )
            imported += 1
          }
        } catch (err) {
          console.warn(`iCal sync failed for property ${p.id} ${source}`, err.message)
        }
      }
    }
    return { imported, syncedAt: new Date().toISOString() }
  }

  // Periodic jobs
  setInterval(() => {
    expireTableHolds().catch((e) => console.warn('expire holds', e.message))
  }, 15 * 60 * 1000)

  setInterval(() => {
    expirePendingPayments().catch((e) => console.warn('expire pending payments', e.message))
  }, 5 * 60 * 1000)

  setInterval(() => {
    syncAllIcalFeeds().catch((e) => console.warn('ical sync', e.message))
  }, 30 * 60 * 1000)

  // Kick off once shortly after boot
  setTimeout(() => {
    expirePendingPayments().catch((e) => console.warn('expire pending payments', e.message))
  }, 10_000)

  // ── Customer auth & dashboard ───────────────────────────
  app.get('/api/auth/config', (_req, res) => {
    res.json(authConfig())
  })

  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const password = String(req.body?.password ?? '')
      const fullName = String(req.body?.fullName ?? '').trim()
      const phone = String(req.body?.phone ?? '').trim()
      const deliveryLine1 = String(req.body?.deliveryLine1 ?? '').trim()
      const deliveryLine2 = String(req.body?.deliveryLine2 ?? '').trim()
      const deliveryCity = String(req.body?.deliveryCity ?? '').trim()
      const deliveryState = String(req.body?.deliveryState ?? 'VIC').trim()
      const deliveryPostcode = String(req.body?.deliveryPostcode ?? '').trim()

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email is required' })
      }
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' })
      }
      if (!fullName) {
        return res.status(400).json({ message: 'Full name is required' })
      }
      if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({ message: 'A valid Australian mobile number is required' })
      }

      const hash = await hashPassword(password)
      const verificationEnabled = customerVerificationEnabled()
      const [result] = await pool.query(
        `INSERT INTO customers (
           email, password_hash, full_name, phone, delivery_line1, delivery_line2,
           delivery_city, delivery_state, delivery_postcode, auth_provider,
           email_verified, phone_verified
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', ?, ?)`,
        [
          email,
          hash,
          fullName,
          phone,
          deliveryLine1,
          deliveryLine2,
          deliveryCity,
          deliveryState,
          deliveryPostcode,
          verificationEnabled ? 0 : 1,
          verificationEnabled ? 0 : 1,
        ],
      )
      const customerId = result.insertId
      const delivery = verificationEnabled
        ? await queueVerificationCodes(customerId, { email, phone, fullName })
        : { devCodes: undefined }
      const token = issueCustomerToken(customerId, email, CUSTOMER_JWT_SECRET)
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions())
      const user = await loadCustomerById(customerId)
      res.status(201).json({
        user,
        verificationRequired: verificationEnabled,
        message: verificationEnabled
          ? 'Account created. Verify your email and mobile to finish setup.'
          : 'Account created.',
        devCodes: delivery.devCodes,
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already registered' })
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Registration failed', error)
    }
  })

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const password = String(req.body?.password ?? '')
      const [rows] = await pool.query(
        `SELECT id, email, password_hash AS passwordHash FROM customers WHERE email = ? LIMIT 1`,
        [email],
      )
      const user = rows[0]
      if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }
      const token = issueCustomerToken(user.id, user.email, CUSTOMER_JWT_SECRET)
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions())
      const profile = await loadCustomerById(user.id)
      res.json({ user: profile })
    } catch (error) {
      sendServerError(res, 'Login failed', error)
    }
  })

  app.post('/api/auth/google', async (req, res) => {
    try {
      const credential = String(req.body?.credential ?? '')
      if (!credential) return res.status(400).json({ message: 'Missing Google credential' })
      const user = await loginWithGoogleCredential(credential)
      const token = issueCustomerToken(user.id, user.email, CUSTOMER_JWT_SECRET)
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions())
      res.json({
        user,
        verificationRequired: customerVerificationEnabled() && (!user.emailVerified || !user.phoneVerified),
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Google sign-in failed', error)
    }
  })

  app.post('/api/auth/apple', async (req, res) => {
    try {
      const credential = String(req.body?.credential ?? '')
      const fullName = String(req.body?.fullName ?? '').trim()
      if (!credential) return res.status(400).json({ message: 'Missing Apple credential' })
      const user = await loginWithAppleCredential(credential, fullName)
      const token = issueCustomerToken(user.id, user.email, CUSTOMER_JWT_SECRET)
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions())
      res.json({
        user,
        verificationRequired: customerVerificationEnabled() && (!user.emailVerified || !user.phoneVerified),
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Apple sign-in failed', error)
    }
  })

  app.post('/api/auth/verify-email', requireCustomer, async (req, res) => {
    try {
      if (req.customer.emailVerified) return res.json({ ok: true, user: req.customer })
      await verifyEmailCode(req.customer.id, String(req.body?.code ?? ''))
      const user = await loadCustomerById(req.customer.id)
      res.json({ ok: true, user })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Email verification failed', error)
    }
  })

  app.post('/api/auth/verify-phone', requireCustomer, async (req, res) => {
    try {
      if (req.customer.phoneVerified) return res.json({ ok: true, user: req.customer })
      await verifyPhoneCode(req.customer.id, String(req.body?.code ?? ''))
      const user = await loadCustomerById(req.customer.id)
      res.json({ ok: true, user })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Phone verification failed', error)
    }
  })

  app.post('/api/auth/resend-email', requireCustomer, async (req, res) => {
    try {
      if (req.customer.emailVerified) return res.json({ ok: true, message: 'Email already verified' })
      const delivery = await resendEmailVerification(req.customer.id, {
        email: req.customer.email,
        fullName: req.customer.fullName,
      })
      res.json({ ok: true, message: 'Verification codes sent', devCodes: delivery.devCodes })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Could not resend email verification', error)
    }
  })

  app.post('/api/auth/resend-phone', requireCustomer, async (req, res) => {
    try {
      const phone = String(req.body?.phone ?? req.customer.phone ?? '').trim()
      if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({ message: 'A valid mobile number is required' })
      }
      if (phone !== req.customer.phone) {
        await pool.query(`UPDATE customers SET phone = ?, phone_verified = 0 WHERE id = ?`, [phone, req.customer.id])
      }
      if (req.customer.phoneVerified && phone === req.customer.phone) {
        return res.json({ ok: true, message: 'Phone already verified' })
      }
      const delivery = await resendPhoneVerification(req.customer.id, { phone })
      const user = await loadCustomerById(req.customer.id)
      res.json({ ok: true, message: 'Verification codes sent', user, devCodes: delivery.devCodes })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Could not resend phone verification', error)
    }
  })

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(CUSTOMER_COOKIE, { ...customerCookieOptions(), maxAge: undefined })
    res.json({ ok: true })
  })

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email is required' })
      }
      const result = await requestPasswordReset(email)
      res.json({
        ok: true,
        message: 'If an account exists with that email, we sent a reset code.',
        devCode: result.devCode,
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Could not start password reset', error)
    }
  })

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const code = String(req.body?.code ?? '').trim()
      const newPassword = String(req.body?.newPassword ?? '')
      await resetPasswordWithCode(email, code, newPassword)
      res.json({ ok: true, message: 'Password updated. You can sign in now.' })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Could not reset password', error)
    }
  })

  app.post('/api/auth/change-password', requireCustomer, async (req, res) => {
    try {
      await changeCustomerPassword(
        req.customer.id,
        String(req.body?.currentPassword ?? ''),
        String(req.body?.newPassword ?? ''),
      )
      res.json({ ok: true, message: 'Password updated' })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Could not change password', error)
    }
  })

  app.get('/api/auth/me', requireCustomer, (req, res) => {
    res.json({ user: req.customer })
  })

  app.put('/api/auth/me', requireCustomer, async (req, res) => {
    try {
      const fullName = String(req.body?.fullName ?? req.customer.fullName).trim()
      const phone = String(req.body?.phone ?? req.customer.phone ?? '').trim()
      const deliveryLine1 = String(req.body?.deliveryLine1 ?? req.customer.deliveryLine1 ?? '').trim()
      const deliveryLine2 = String(req.body?.deliveryLine2 ?? req.customer.deliveryLine2 ?? '').trim()
      const deliveryCity = String(req.body?.deliveryCity ?? req.customer.deliveryCity ?? '').trim()
      const deliveryState = String(req.body?.deliveryState ?? req.customer.deliveryState ?? 'VIC').trim()
      const deliveryPostcode = String(req.body?.deliveryPostcode ?? req.customer.deliveryPostcode ?? '').trim()

      if (!fullName) return res.status(400).json({ message: 'Full name is required' })
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ message: 'Enter a valid Australian mobile number' })
      }

      const phoneChanged = phone !== String(req.customer.phone ?? '').trim()
      await pool.query(
        `UPDATE customers SET
           full_name = ?, phone = ?, delivery_line1 = ?, delivery_line2 = ?,
           delivery_city = ?, delivery_state = ?, delivery_postcode = ?,
           phone_verified = CASE WHEN ? THEN 0 ELSE phone_verified END,
           phone_verify_code = CASE WHEN ? THEN NULL ELSE phone_verify_code END,
           phone_verify_expires = CASE WHEN ? THEN NULL ELSE phone_verify_expires END
         WHERE id = ?`,
        [
          fullName,
          phone,
          deliveryLine1,
          deliveryLine2,
          deliveryCity,
          deliveryState,
          deliveryPostcode,
          phoneChanged,
          phoneChanged,
          phoneChanged,
          req.customer.id,
        ],
      )
      const user = await loadCustomerById(req.customer.id)
      res.json({ ok: true, user })
    } catch (error) {
      sendServerError(res, 'Failed to update profile', error)
    }
  })

  app.get('/api/account/orders', requireCustomer, async (req, res) => {
    try {
      // Hide unfinished checkouts (pending_payment) — those are created when payment starts,
      // not when payment succeeds. Customers should only see completed / refunded activity.
      const [rows] = await pool.query(
        `SELECT id, order_number AS orderNumber, total, status, fulfillment_status AS fulfillmentStatus,
                refund_status AS refundStatus, refund_reason AS refundReason, refund_note AS refundNote,
                refunded_amount AS refundedAmount, paid_at AS paidAt, packed_at AS packedAt, shipped_at AS shippedAt,
                delivered_at AS deliveredAt, refund_requested_at AS refundRequestedAt,
                created_at AS createdAt
         FROM orders
         WHERE (customer_id = ? OR email = ?)
           AND status IN ('paid', 'refund_requested', 'partially_refunded', 'refunded')
         ORDER BY id DESC LIMIT 100`,
        [req.customer.id, req.customer.email],
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load orders', error)
    }
  })

  app.get('/api/account/orders/:id', requireCustomer, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    try {
      const [orders] = await pool.query(
        `SELECT id, order_number AS orderNumber, email, full_name AS fullName, phone,
                shipping_method AS shippingMethod, shipping_line1 AS shippingLine1,
                shipping_line2 AS shippingLine2, shipping_city AS shippingCity,
                shipping_state AS shippingState, shipping_postcode AS shippingPostcode,
                subtotal, shipping_fee AS shippingFee, total, currency, status,
                fulfillment_status AS fulfillmentStatus, refund_status AS refundStatus,
                refund_reason AS refundReason, refund_note AS refundNote,
                refunded_amount AS refundedAmount, carrier, tracking_number AS trackingNumber,
                tracking_url AS trackingUrl, paid_at AS paidAt, packed_at AS packedAt, shipped_at AS shippedAt,
                delivered_at AS deliveredAt, refund_requested_at AS refundRequestedAt,
                created_at AS createdAt, updated_at AS updatedAt,
                customer_id AS customerId
         FROM orders WHERE id = ? LIMIT 1`,
        [id],
      )
      const order = orders[0]
      if (!order) return res.status(404).json({ message: 'Order not found' })
      const owns =
        toNumber(order.customerId, 0) === req.customer.id ||
        String(order.email).toLowerCase() === String(req.customer.email).toLowerCase()
      if (!owns) return res.status(403).json({ message: 'Not your order' })
      const [items] = await pool.query(
        `SELECT id, product_id AS productId, product_name AS productName, product_size AS productSize,
                unit_price AS unitPrice, quantity, line_total AS lineTotal
         FROM order_items WHERE order_id = ?`,
        [id],
      )
      const { customerId: _customerId, ...safeOrder } = order
      res.json({ order: safeOrder, items })
    } catch (error) {
      sendServerError(res, 'Failed to load order', error)
    }
  })

  app.post('/api/account/orders/:id/refund-request', requireCustomer, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    const reason = String(req.body?.reason ?? '').trim()
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    if (reason.length < 5) return res.status(400).json({ message: 'Please provide a short reason (5+ characters)' })
    try {
      const [rows] = await pool.query(
        `SELECT id, status, total, fulfillment_status AS fulfillmentStatus,
                refunded_amount AS refundedAmount, delivered_at AS deliveredAt,
                customer_id AS customerId, email
         FROM orders WHERE id = ? LIMIT 1`,
        [id],
      )
      const order = rows[0]
      if (!order) return res.status(404).json({ message: 'Order not found' })
      const owns =
        toNumber(order.customerId, 0) === req.customer.id ||
        String(order.email).toLowerCase() === String(req.customer.email).toLowerCase()
      if (!owns) return res.status(403).json({ message: 'Not your order' })
      const refundState = getStoreRefundRequestState(order)
      if (!refundState.allowed) {
        return res.status(400).json({ message: storeRefundRequestErrorMessage(refundState.code) })
      }
      await pool.query(
        `UPDATE orders SET status = 'refund_requested', refund_status = 'requested',
         refund_reason = ?, refund_requested_at = NOW() WHERE id = ?`,
        [reason.slice(0, 1000), id],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to request refund', error)
    }
  })

  app.get('/api/account/stays', requireCustomer, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT sb.id, sb.booking_number AS bookingNumber, sb.check_in AS checkIn, sb.check_out AS checkOut,
                sb.total, sb.status, sb.refund_status AS refundStatus, sb.refund_reason AS refundReason,
                sb.refund_note AS refundNote, sb.refunded_amount AS refundedAmount, p.name AS propertyName
         FROM stay_bookings sb
         JOIN properties p ON p.id = sb.property_id
         WHERE sb.customer_id = ? OR sb.email = ?
         ORDER BY sb.id DESC LIMIT 100`,
        [req.customer.id, req.customer.email],
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load stays', error)
    }
  })

  app.post('/api/account/stays/:id/refund-request', requireCustomer, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    const reason = String(req.body?.reason ?? '').trim()
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    if (reason.length < 5) return res.status(400).json({ message: 'Please provide a short reason (5+ characters)' })
    try {
      const [rows] = await pool.query(
        `SELECT id, status, customer_id AS customerId, email FROM stay_bookings WHERE id = ? LIMIT 1`,
        [id],
      )
      const booking = rows[0]
      if (!booking) return res.status(404).json({ message: 'Stay booking not found' })
      const owns =
        toNumber(booking.customerId, 0) === req.customer.id ||
        String(booking.email).toLowerCase() === String(req.customer.email).toLowerCase()
      if (!owns) return res.status(403).json({ message: 'Not your booking' })
      if (booking.status !== 'confirmed') {
        return res.status(400).json({ message: 'Only confirmed stays can request a refund' })
      }
      await pool.query(
        `UPDATE stay_bookings SET status = 'refund_requested', refund_status = 'requested',
         refund_reason = ?, refund_requested_at = NOW() WHERE id = ?`,
        [reason.slice(0, 1000), id],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to request stay refund', error)
    }
  })

  app.post('/api/account/setup-intent', requireCustomer, async (req, res) => {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ message: 'Stripe not configured' })
    try {
      let customerId = req.customer.stripeCustomerId
      if (!customerId) {
        const c = await stripe.customers.create({
          email: req.customer.email,
          name: req.customer.fullName,
          metadata: { localCustomerId: String(req.customer.id) },
        })
        customerId = c.id
        await pool.query('UPDATE customers SET stripe_customer_id = ? WHERE id = ?', [customerId, req.customer.id])
      }
      const si = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      })
      res.json({ clientSecret: si.client_secret, customerId })
    } catch (error) {
      sendServerError(res, 'Failed to create setup intent', error)
    }
  })

  app.get('/api/account/payment-methods', requireCustomer, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, stripe_payment_method_id AS stripePaymentMethodId, brand, last4, exp_month AS expMonth, exp_year AS expYear
         FROM stripe_payment_methods WHERE customer_id = ? ORDER BY id DESC`,
        [req.customer.id],
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load payment methods', error)
    }
  })

  app.post('/api/account/payment-methods', requireCustomer, async (req, res) => {
    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ message: 'Stripe not configured' })
    try {
      const pmId = String(req.body?.paymentMethodId ?? '')
      if (!pmId) return res.status(400).json({ message: 'paymentMethodId required' })
      let customerId = req.customer.stripeCustomerId
      if (!customerId) {
        const c = await stripe.customers.create({
          email: req.customer.email,
          name: req.customer.fullName,
          metadata: { localCustomerId: String(req.customer.id) },
        })
        customerId = c.id
        await pool.query('UPDATE customers SET stripe_customer_id = ? WHERE id = ?', [customerId, req.customer.id])
      }
      const pm = await stripe.paymentMethods.retrieve(pmId)
      if (!pm.customer) {
        await stripe.paymentMethods.attach(pmId, { customer: customerId })
      }
      await pool.query(
        `INSERT INTO stripe_payment_methods (customer_id, stripe_payment_method_id, brand, last4, exp_month, exp_year)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE brand=VALUES(brand), last4=VALUES(last4)`,
        [
          req.customer.id,
          pmId,
          pm.card?.brand ?? '',
          pm.card?.last4 ?? '',
          pm.card?.exp_month ?? null,
          pm.card?.exp_year ?? null,
        ],
      )
      res.status(201).json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to save payment method', error)
    }
  })

  app.delete('/api/account/payment-methods/:id', requireCustomer, async (req, res) => {
    const stripe = getStripe()
    try {
      const id = toNumber(req.params.id, 0)
      const [rows] = await pool.query(
        `SELECT stripe_payment_method_id AS pm FROM stripe_payment_methods WHERE id = ? AND customer_id = ? LIMIT 1`,
        [id, req.customer.id],
      )
      if (!rows[0]) return res.status(404).json({ message: 'Not found' })
      if (stripe) {
        try {
          await stripe.paymentMethods.detach(rows[0].pm)
        } catch {
          /* ignore */
        }
      }
      await pool.query('DELETE FROM stripe_payment_methods WHERE id = ? LIMIT 1', [id])
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to remove payment method', error)
    }
  })

  // Export for tests / manual sync
  return { syncAllIcalFeeds, expireTableHolds, expirePendingPayments, fulfillStoreOrder }
}
