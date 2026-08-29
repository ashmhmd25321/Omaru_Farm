export const STORE_REFUND_RETURN_WINDOW_DAYS = 14

export function normalizeFulfillmentStatus(status) {
  const value = String(status ?? '').trim().toLowerCase()
  if (!value || value === 'unfulfilled') return 'pending'
  return value
}

export function remainingRefundableAmount(total, refundedAmount) {
  const totalN = Number(total)
  const refundedN = Number(refundedAmount ?? 0)
  if (!Number.isFinite(totalN)) return 0
  return Math.max(0, totalN - (Number.isFinite(refundedN) ? refundedN : 0))
}

export function getStoreRefundRequestState(order) {
  const status = String(order?.status ?? '')
  const fulfillment = normalizeFulfillmentStatus(order?.fulfillmentStatus ?? order?.fulfillment_status)
  const remaining = remainingRefundableAmount(order?.total, order?.refundedAmount ?? order?.refunded_amount)

  if (status === 'refund_requested') {
    return { allowed: false, code: 'refund_requested' }
  }
  if (status === 'refunded' || remaining <= 0.001) {
    return { allowed: false, code: 'refunded' }
  }
  if (status === 'cancelled' || status === 'pending_payment') {
    return { allowed: false, code: 'ineligible' }
  }
  if (!['paid', 'partially_refunded'].includes(status)) {
    return { allowed: false, code: 'ineligible' }
  }

  if (fulfillment === 'shipped') {
    return { allowed: false, code: 'contact_return' }
  }

  if (fulfillment === 'delivered') {
    const deliveredAt = order?.deliveredAt ?? order?.delivered_at
    if (deliveredAt) {
      const delivered = new Date(deliveredAt)
      if (!Number.isNaN(delivered.getTime())) {
        const windowEnd = new Date(delivered)
        windowEnd.setDate(windowEnd.getDate() + STORE_REFUND_RETURN_WINDOW_DAYS)
        if (new Date() > windowEnd) {
          return { allowed: false, code: 'return_window_closed' }
        }
      }
    }
    return { allowed: false, code: 'contact_return' }
  }

  if (!['pending', 'packed'].includes(fulfillment)) {
    return { allowed: false, code: 'ineligible' }
  }

  return { allowed: true, code: 'allowed' }
}

export function storeRefundRequestErrorMessage(code) {
  switch (code) {
    case 'contact_return':
      return 'This order has shipped. Please contact us to arrange a return.'
    case 'return_window_closed':
      return 'The 14-day return window for this order has closed.'
    case 'refund_requested':
      return 'A refund request is already pending for this order.'
    case 'refunded':
      return 'This order has already been fully refunded.'
    default:
      return 'This order is not eligible for an online refund request.'
  }
}
