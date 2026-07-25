import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { computeShippingQuote } from './shipping.js'
import { getStripe, stripeConfigured, getPublishableKey, getCurrency, toStripeAmount } from './stripe.js'
import { fetchAndParseIcal } from './ical.js'

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
  for (const item of items ?? []) {
    const productId = toNumber(item.productId ?? item.id, 0)
    const qty = Math.max(0, Math.floor(toNumber(item.quantity, 0)))
    if (!productId || qty < 1) continue
    const [rows] = await pool.query(
      `SELECT id, name, size, price, weight_grams AS weightGrams, stock_qty AS stockQty, shippable
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
    const weight = toNumber(product.weightGrams, 500) * qty
    subtotal += lineTotal
    totalWeightGrams += weight
    lines.push({
      productId: product.id,
      name: product.name,
      size: product.size,
      unitPrice: unit,
      quantity: qty,
      weightGrams: toNumber(product.weightGrams, 500),
      lineTotal,
      shippable: Boolean(product.shippable),
    })
  }
  return { lines, subtotal: +subtotal.toFixed(2), totalWeightGrams }
}

export function registerCommerceRoutes(app, {
  requireAdmin,
  sendServerError,
  parseCookies,
  cookieSecure,
}) {
  const CUSTOMER_COOKIE = process.env.CUSTOMER_COOKIE_NAME ?? 'omaru_customer_session'
  const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET ?? process.env.ADMIN_JWT_SECRET ?? 'dev_customer_jwt'
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
      const [rows] = await pool.query(
        'SELECT id, email, full_name AS fullName, phone, delivery_line1 AS deliveryLine1, delivery_line2 AS deliveryLine2, delivery_city AS deliveryCity, delivery_state AS deliveryState, delivery_postcode AS deliveryPostcode, stripe_customer_id AS stripeCustomerId FROM customers WHERE id = ? LIMIT 1',
        [payload.sub],
      )
      if (!rows[0]) return res.status(401).json({ message: 'Invalid session' })
      req.customer = rows[0]
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
    })
  })

  // ── Cart quote ──────────────────────────────────────────
  app.post('/api/cart/quote', async (req, res) => {
    try {
      const method = String(req.body?.shippingMethod ?? 'delivery')
      const postcode = String(req.body?.postcode ?? '')
      const { lines, subtotal, totalWeightGrams } = await quoteCartLines(req.body?.items ?? [])
      if (lines.length === 0) return res.status(400).json({ message: 'Cart is empty' })
      const needsShipping = lines.some((l) => l.shippable)
      const rules = await loadShippingRules()
      const shipping = needsShipping
        ? computeShippingQuote({
            rules,
            postcode,
            subtotal,
            totalWeightGrams,
            method,
          })
        : {
            method: 'pickup',
            fee: 0,
            ruleName: 'Digital / non-shippable',
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
      const body = req.body ?? {}
      const method = String(body.shippingMethod ?? 'delivery')
      const email = String(body.email ?? req.customer?.email ?? '').trim()
      const fullName = String(body.fullName ?? req.customer?.fullName ?? '').trim()
      if (!email || !fullName) return res.status(400).json({ message: 'Name and email are required' })

      const { lines, subtotal, totalWeightGrams } = await quoteCartLines(body.items ?? [])
      if (lines.length === 0) return res.status(400).json({ message: 'Cart is empty' })

      const rules = await loadShippingRules()
      const shipping = computeShippingQuote({
        rules,
        postcode: body.postcode,
        subtotal,
        totalWeightGrams,
        method,
      })
      const total = +(subtotal + shipping.fee).toFixed(2)
      const number = orderNumber()

      const conn = await pool.getConnection()
      let orderId
      try {
        await conn.beginTransaction()
        // Re-check stock under lock
        for (const line of lines) {
          const [stockRows] = await conn.query('SELECT stock_qty AS stockQty, name FROM products WHERE id = ? FOR UPDATE', [
            line.productId,
          ])
          if (!stockRows[0] || toNumber(stockRows[0].stockQty, 0) < line.quantity) {
            throw Object.assign(new Error(`Insufficient stock for ${stockRows[0]?.name ?? line.name}`), { status: 409 })
          }
        }

        const [result] = await conn.query(
          `INSERT INTO orders (
            order_number, customer_id, email, full_name, phone, shipping_method,
            shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postcode,
            subtotal, shipping_fee, total, currency, status, fulfillment_status, shipping_breakdown_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'unfulfilled', ?)`,
          [
            number,
            req.customer?.id ?? null,
            email,
            fullName,
            String(body.phone ?? ''),
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

      const pi = await stripe.paymentIntents.create({
        amount: toStripeAmount(total),
        currency: getCurrency(),
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        metadata: { orderId: String(orderId), orderNumber: number, type: 'store_order' },
        customer: req.customer?.stripeCustomerId || undefined,
      })

      await pool.query('UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?', [pi.id, orderId])

      res.status(201).json({
        orderId,
        orderNumber: number,
        clientSecret: pi.client_secret,
        total,
        currency: getCurrency(),
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message })
      sendServerError(res, 'Failed to start checkout', error)
    }
  })

  // Stripe webhook — caller must mount with express.raw
  app.post('/api/stripe/webhook', async (req, res) => {
    const stripe = getStripe()
    if (!stripe) return res.status(503).send('Stripe not configured')
    const sig = req.headers['stripe-signature']
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    let event
    try {
      if (secret) {
        event = stripe.webhooks.constructEvent(req.body, sig, secret)
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
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object
        const type = pi.metadata?.type
        if (type === 'store_order') {
          await fulfillStoreOrder(pi)
        } else if (type === 'stay_booking') {
          await fulfillStayBooking(pi)
        }
      }
      res.json({ received: true })
    } catch (error) {
      console.error('Webhook handler error', error)
      res.status(500).json({ message: 'Webhook handler failed' })
    }
  })

  async function fulfillStoreOrder(pi) {
    const [orders] = await pool.query(
      `SELECT id, status FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1`,
      [pi.id],
    )
    const order = orders[0]
    if (!order || order.status === 'paid') return
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [items] = await conn.query('SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ?', [
        order.id,
      ])
      for (const item of items) {
        const [upd] = await conn.query(
          'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?',
          [item.quantity, item.productId, item.quantity],
        )
        if (upd.affectedRows === 0) {
          throw new Error(`Stock race for product ${item.productId}`)
        }
      }
      await conn.query(`UPDATE orders SET status = 'paid' WHERE id = ?`, [order.id])
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }

  async function fulfillStayBooking(pi) {
    const [rows] = await pool.query(
      `SELECT id, property_id AS propertyId, check_in AS checkIn, check_out AS checkOut, status
       FROM stay_bookings WHERE stripe_payment_intent_id = ? LIMIT 1`,
      [pi.id],
    )
    const booking = rows[0]
    if (!booking || booking.status === 'confirmed') return
    await pool.query(`UPDATE stay_bookings SET status = 'confirmed' WHERE id = ?`, [booking.id])
    await pool.query(
      `INSERT INTO availability_blocks (property_id, start_date, end_date, source, external_uid, note)
       VALUES (?, ?, ?, 'booking', ?, 'Confirmed stay booking')
       ON DUPLICATE KEY UPDATE note = VALUES(note)`,
      [booking.propertyId, booking.checkIn, booking.checkOut, `stay-${booking.id}`],
    )
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
                fulfillment_status AS fulfillmentStatus, shipping_breakdown_json AS shippingBreakdownJson, created_at AS createdAt
         FROM orders ORDER BY id DESC LIMIT 500`,
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
    try {
      await pool.query(`UPDATE orders SET fulfillment_status = ?, status = COALESCE(?, status) WHERE id = ?`, [
        String(req.body?.fulfillmentStatus ?? 'unfulfilled'),
        req.body?.status ? String(req.body.status) : null,
        id,
      ])
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to update order', error)
    }
  })

  app.get('/api/admin/sales-summary', requireAdmin, async (_req, res) => {
    try {
      const [orderStats] = await pool.query(
        `SELECT COUNT(*) AS orderCount, COALESCE(SUM(total),0) AS revenue
         FROM orders WHERE status = 'paid'`,
      )
      const [stayStats] = await pool.query(
        `SELECT COUNT(*) AS stayCount, COALESCE(SUM(total),0) AS stayRevenue
         FROM stay_bookings WHERE status = 'confirmed'`,
      )
      res.json({
        storeOrders: toNumber(orderStats[0]?.orderCount, 0),
        storeRevenue: toNumber(orderStats[0]?.revenue, 0),
        stayBookings: toNumber(stayStats[0]?.stayCount, 0),
        stayRevenue: toNumber(stayStats[0]?.stayRevenue, 0),
        onlineRevenue: toNumber(orderStats[0]?.revenue, 0) + toNumber(stayStats[0]?.stayRevenue, 0),
      })
    } catch (error) {
      sendServerError(res, 'Failed to load sales summary', error)
    }
  })

  // ── Table holds ─────────────────────────────────────────
  async function expireTableHolds() {
    await pool.query(
      `UPDATE table_holds SET status = 'expired' WHERE status = 'held' AND expires_at < NOW()`,
    )
  }

  app.post('/api/table-holds', async (req, res) => {
    try {
      await expireTableHolds()
      const body = req.body ?? {}
      const fullName = String(body.fullName ?? '').trim()
      const email = String(body.email ?? '').trim()
      const partyDate = String(body.partyDate ?? body.date ?? '')
      const slot = String(body.slot ?? 'lunch')
      const covers = Math.max(1, Math.floor(toNumber(body.covers ?? body.guestCount, 2)))
      if (!fullName || !email || !partyDate) {
        return res.status(400).json({ message: 'Name, email, and date are required' })
      }
      const number = holdNumber()
      const [result] = await pool.query(
        `INSERT INTO table_holds (hold_number, full_name, email, phone, party_date, slot, covers, notes, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'held', DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [number, fullName, email, String(body.phone ?? ''), partyDate, slot, covers, String(body.notes ?? '')],
      )
      res.status(201).json({ id: result.insertId, holdNumber: number, expiresInHours: 24 })
    } catch (error) {
      sendServerError(res, 'Failed to create table hold', error)
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
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load table holds', error)
    }
  })

  app.put('/api/admin/table-holds/:id', requireAdmin, async (req, res) => {
    const id = toNumber(req.params.id, 0)
    try {
      await pool.query(`UPDATE table_holds SET status = ? WHERE id = ?`, [String(req.body?.status ?? 'held'), id])
      res.json({ ok: true })
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
      res.json({ blocks })
    } catch (error) {
      sendServerError(res, 'Failed to load availability', error)
    }
  })

  app.post('/api/stays/quote', async (req, res) => {
    try {
      const propertyId = toNumber(req.body?.propertyId, 0)
      const checkIn = String(req.body?.checkIn ?? '')
      const checkOut = String(req.body?.checkOut ?? '')
      const guests = Math.max(1, Math.floor(toNumber(req.body?.guests, 1)))
      const [props] = await pool.query(
        `SELECT id, nightly_rate AS nightlyRate, min_nights AS minNights, max_guests AS maxGuests, cleaning_fee AS cleaningFee, name
         FROM properties WHERE id = ? AND is_active = 1 LIMIT 1`,
        [propertyId],
      )
      const property = props[0]
      if (!property) return res.status(404).json({ message: 'Property not found' })
      const nights = nightsBetween(checkIn, checkOut)
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

  async function isStayAvailable(propertyId, checkIn, checkOut) {
    const [blocks] = await pool.query(
      `SELECT start_date AS startDate, end_date AS endDate FROM availability_blocks WHERE property_id = ?`,
      [propertyId],
    )
    for (const b of blocks) {
      if (datesOverlap(checkIn, checkOut, String(b.startDate).slice(0, 10), String(b.endDate).slice(0, 10))) {
        return false
      }
    }
    const [bookings] = await pool.query(
      `SELECT check_in AS checkIn, check_out AS checkOut FROM stay_bookings
       WHERE property_id = ? AND status IN ('pending_payment','confirmed')`,
      [propertyId],
    )
    for (const b of bookings) {
      if (datesOverlap(checkIn, checkOut, String(b.checkIn).slice(0, 10), String(b.checkOut).slice(0, 10))) {
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
      const body = req.body ?? {}
      const propertyId = toNumber(body.propertyId, 0)
      const checkIn = String(body.checkIn ?? '')
      const checkOut = String(body.checkOut ?? '')
      const guests = Math.max(1, Math.floor(toNumber(body.guests, 1)))
      const email = String(body.email ?? req.customer?.email ?? '').trim()
      const fullName = String(body.fullName ?? req.customer?.fullName ?? '').trim()
      if (!email || !fullName) return res.status(400).json({ message: 'Name and email required' })

      const [props] = await pool.query(
        `SELECT * FROM properties WHERE id = ? AND is_active = 1 LIMIT 1`,
        [propertyId],
      )
      const property = props[0]
      if (!property) return res.status(404).json({ message: 'Property not found' })
      const nights = nightsBetween(checkIn, checkOut)
      if (nights < property.min_nights) return res.status(400).json({ message: 'Below minimum nights' })
      if (!(await isStayAvailable(propertyId, checkIn, checkOut))) {
        return res.status(409).json({ message: 'Dates unavailable' })
      }
      const nightly = toNumber(property.nightly_rate, 0)
      const cleaning = toNumber(property.cleaning_fee, 0)
      const total = +(nights * nightly + cleaning).toFixed(2)
      const number = stayNumber()

      const [result] = await pool.query(
        `INSERT INTO stay_bookings (
          booking_number, property_id, customer_id, email, full_name, phone,
          check_in, check_out, guests, nights, nightly_rate, cleaning_fee, total, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment')`,
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
        ],
      )

      const pi = await stripe.paymentIntents.create({
        amount: toStripeAmount(total),
        currency: getCurrency(),
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        metadata: { stayBookingId: String(result.insertId), bookingNumber: number, type: 'stay_booking' },
      })
      await pool.query('UPDATE stay_bookings SET stripe_payment_intent_id = ? WHERE id = ?', [pi.id, result.insertId])

      res.status(201).json({
        bookingId: result.insertId,
        bookingNumber: number,
        clientSecret: pi.client_secret,
        total,
        currency: getCurrency(),
      })
    } catch (error) {
      sendServerError(res, 'Failed to start stay checkout', error)
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
                p.name AS propertyName
         FROM stay_bookings sb
         JOIN properties p ON p.id = sb.property_id
         ORDER BY sb.id DESC LIMIT 500`,
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load stay bookings', error)
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
    syncAllIcalFeeds().catch((e) => console.warn('ical sync', e.message))
  }, 30 * 60 * 1000)

  // ── Customer auth & dashboard ───────────────────────────
  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const password = String(req.body?.password ?? '')
      const fullName = String(req.body?.fullName ?? '').trim()
      if (!email || password.length < 8 || !fullName) {
        return res.status(400).json({ message: 'Name, email, and password (8+ chars) required' })
      }
      const hash = await bcrypt.hash(password, 12)
      const [result] = await pool.query(
        `INSERT INTO customers (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)`,
        [email, hash, fullName, String(req.body?.phone ?? '')],
      )
      const token = jwt.sign({ sub: result.insertId, email }, CUSTOMER_JWT_SECRET, { expiresIn: '30d' })
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions())
      res.status(201).json({ id: result.insertId, email, fullName })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already registered' })
      sendServerError(res, 'Registration failed', error)
    }
  })

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const password = String(req.body?.password ?? '')
      const [rows] = await pool.query(
        `SELECT id, email, full_name AS fullName, password_hash AS passwordHash FROM customers WHERE email = ? LIMIT 1`,
        [email],
      )
      const user = rows[0]
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }
      const token = jwt.sign({ sub: user.id, email: user.email }, CUSTOMER_JWT_SECRET, { expiresIn: '30d' })
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions())
      res.json({ id: user.id, email: user.email, fullName: user.fullName })
    } catch (error) {
      sendServerError(res, 'Login failed', error)
    }
  })

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(CUSTOMER_COOKIE, { ...customerCookieOptions(), maxAge: undefined })
    res.json({ ok: true })
  })

  app.get('/api/auth/me', requireCustomer, (req, res) => {
    res.json({ user: req.customer })
  })

  app.put('/api/auth/me', requireCustomer, async (req, res) => {
    try {
      await pool.query(
        `UPDATE customers SET full_name=?, phone=?, delivery_line1=?, delivery_line2=?, delivery_city=?, delivery_state=?, delivery_postcode=?
         WHERE id=?`,
        [
          String(req.body?.fullName ?? req.customer.fullName),
          String(req.body?.phone ?? ''),
          String(req.body?.deliveryLine1 ?? ''),
          String(req.body?.deliveryLine2 ?? ''),
          String(req.body?.deliveryCity ?? ''),
          String(req.body?.deliveryState ?? ''),
          String(req.body?.deliveryPostcode ?? ''),
          req.customer.id,
        ],
      )
      res.json({ ok: true })
    } catch (error) {
      sendServerError(res, 'Failed to update profile', error)
    }
  })

  app.get('/api/account/orders', requireCustomer, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, order_number AS orderNumber, total, status, fulfillment_status AS fulfillmentStatus, created_at AS createdAt
         FROM orders WHERE customer_id = ? OR email = ? ORDER BY id DESC LIMIT 100`,
        [req.customer.id, req.customer.email],
      )
      res.json(rows)
    } catch (error) {
      sendServerError(res, 'Failed to load orders', error)
    }
  })

  app.get('/api/account/stays', requireCustomer, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT sb.id, sb.booking_number AS bookingNumber, sb.check_in AS checkIn, sb.check_out AS checkOut,
                sb.total, sb.status, p.name AS propertyName
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
      const pm = await stripe.paymentMethods.retrieve(pmId)
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
  return { syncAllIcalFeeds, expireTableHolds, fulfillStoreOrder }
}
