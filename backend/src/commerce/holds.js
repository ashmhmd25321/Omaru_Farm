import { pool } from '../db.js'
import { getStripe } from './stripe.js'

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const PENDING_HOLD_MS = Math.max(
  5 * 60 * 1000,
  Number(process.env.PENDING_PAYMENT_TTL_MS ?? 30 * 60 * 1000) || 30 * 60 * 1000,
)

export function pendingExpiresAtDate() {
  return new Date(Date.now() + PENDING_HOLD_MS)
}

export async function restoreOrderStock(conn, orderId) {
  const [items] = await conn.query(
    'SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ?',
    [orderId],
  )
  for (const item of items) {
    await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [
      item.quantity,
      item.productId,
    ])
  }
}

export async function cancelPendingOrderById(orderId, { cancelStripe = true } = {}) {
  const conn = await pool.getConnection()
  let piId = null
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query(
      `SELECT id, status, stock_reserved AS stockReserved, stripe_payment_intent_id AS pi
       FROM orders WHERE id = ? FOR UPDATE`,
      [orderId],
    )
    const order = rows[0]
    if (!order || order.status !== 'pending_payment') {
      await conn.rollback()
      return false
    }
    piId = order.pi
    if (order.stockReserved) {
      await restoreOrderStock(conn, orderId)
    }
    await conn.query(
      `UPDATE orders SET status = 'cancelled', stock_reserved = 0, fulfillment_status = 'cancelled' WHERE id = ?`,
      [orderId],
    )
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
  if (cancelStripe && piId) {
    const stripe = getStripe()
    if (stripe) {
      try {
        await stripe.paymentIntents.cancel(piId)
      } catch {
        /* already cancelled or succeeded */
      }
    }
  }
  return true
}

export async function cancelPendingStayById(bookingId, { cancelStripe = true } = {}) {
  const [rows] = await pool.query(
    `SELECT id, status, stripe_payment_intent_id AS pi FROM stay_bookings WHERE id = ? LIMIT 1`,
    [bookingId],
  )
  const booking = rows[0]
  if (!booking || booking.status !== 'pending_payment') return false
  await pool.query(`UPDATE stay_bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'`, [
    bookingId,
  ])
  if (cancelStripe && booking.pi) {
    const stripe = getStripe()
    if (stripe) {
      try {
        await stripe.paymentIntents.cancel(booking.pi)
      } catch {
        /* ignore */
      }
    }
  }
  return true
}

export async function expirePendingPayments() {
  const [orders] = await pool.query(
    `SELECT id FROM orders
     WHERE status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at < NOW()`,
  )
  for (const row of orders) {
    try {
      await cancelPendingOrderById(row.id)
    } catch (e) {
      console.warn('expire order', row.id, e.message)
    }
  }

  const [stays] = await pool.query(
    `SELECT id FROM stay_bookings
     WHERE status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at < NOW()`,
  )
  for (const row of stays) {
    try {
      await cancelPendingStayById(row.id)
    } catch (e) {
      console.warn('expire stay', row.id, e.message)
    }
  }
}

export async function cancelByPaymentIntent(piId) {
  if (!piId) return
  const [orders] = await pool.query(
    `SELECT id FROM orders WHERE stripe_payment_intent_id = ? AND status = 'pending_payment' LIMIT 1`,
    [piId],
  )
  if (orders[0]) {
    await cancelPendingOrderById(orders[0].id, { cancelStripe: false })
    return
  }
  const [stays] = await pool.query(
    `SELECT id FROM stay_bookings WHERE stripe_payment_intent_id = ? AND status = 'pending_payment' LIMIT 1`,
    [piId],
  )
  if (stays[0]) {
    await cancelPendingStayById(stays[0].id, { cancelStripe: false })
  }
}

export async function releaseStayAvailabilityBlock(bookingId) {
  await pool.query(
    `DELETE FROM availability_blocks WHERE source = 'booking' AND external_uid = ? LIMIT 1`,
    [`stay-${bookingId}`],
  )
}

export { toNumber }
