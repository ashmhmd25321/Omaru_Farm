export const STORE_REFUND_RETURN_WINDOW_DAYS = 14

type RefundPolicyOrder = {
  status?: string | null
  fulfillmentStatus?: string | null
  total?: number | null
  refundedAmount?: number | null
  deliveredAt?: string | null
}

export type StoreRefundRequestCode =
  | 'allowed'
  | 'refund_requested'
  | 'refunded'
  | 'contact_return'
  | 'return_window_closed'
  | 'ineligible'

export function normalizeFulfillmentStatus(status: string | null | undefined) {
  const value = String(status ?? '').trim().toLowerCase()
  if (!value || value === 'unfulfilled') return 'pending'
  return value
}

export function remainingRefundableAmount(total: number | null | undefined, refundedAmount: number | null | undefined) {
  const totalN = Number(total)
  const refundedN = Number(refundedAmount ?? 0)
  if (!Number.isFinite(totalN)) return 0
  return Math.max(0, totalN - (Number.isFinite(refundedN) ? refundedN : 0))
}

export function getStoreRefundRequestState(order: RefundPolicyOrder) {
  const status = String(order.status ?? '')
  const fulfillment = normalizeFulfillmentStatus(order.fulfillmentStatus)
  const remaining = remainingRefundableAmount(order.total, order.refundedAmount)

  if (status === 'refund_requested') {
    return { allowed: false as const, code: 'refund_requested' as const }
  }
  if (status === 'refunded' || remaining <= 0.001) {
    return { allowed: false as const, code: 'refunded' as const }
  }
  if (status === 'cancelled' || status === 'pending_payment') {
    return { allowed: false as const, code: 'ineligible' as const }
  }
  if (!['paid', 'partially_refunded'].includes(status)) {
    return { allowed: false as const, code: 'ineligible' as const }
  }

  if (fulfillment === 'shipped') {
    return { allowed: false as const, code: 'contact_return' as const }
  }

  if (fulfillment === 'delivered') {
    if (order.deliveredAt) {
      const delivered = new Date(order.deliveredAt)
      if (!Number.isNaN(delivered.getTime())) {
        const windowEnd = new Date(delivered)
        windowEnd.setDate(windowEnd.getDate() + STORE_REFUND_RETURN_WINDOW_DAYS)
        if (new Date() > windowEnd) {
          return { allowed: false as const, code: 'return_window_closed' as const }
        }
      }
    }
    return { allowed: false as const, code: 'contact_return' as const }
  }

  if (!['pending', 'packed'].includes(fulfillment)) {
    return { allowed: false as const, code: 'ineligible' as const }
  }

  return { allowed: true as const, code: 'allowed' as const }
}
