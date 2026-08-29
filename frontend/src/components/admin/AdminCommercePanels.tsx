import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiUrl } from '@/utils/api'

async function adminFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init?.headers)
        ? Object.fromEntries(init.headers)
        : { ...((init?.headers as Record<string, string> | undefined) ?? {}) }),
  }
  if (token && token !== 'cookie-session') {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message ?? `Request failed (${res.status})`)
  return data as T
}

type Order = {
  id: number
  orderNumber: string
  email: string
  fullName: string
  phone: string
  total: number
  status: string
  fulfillmentStatus: string
  shippingPostcode: string
  refundStatus?: string | null
  refundReason?: string | null
  refundNote?: string | null
  paidAt?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
}

function formatOrderDate(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Melbourne',
    timeZoneName: 'short',
  })
}

type OrderItem = {
  id: number
  productId: number
  productName: string
  productSize: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

function AdminOrderDetails({
  orderId,
  token,
  onClose,
  onUpdated,
}: {
  orderId: number
  token: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [operations, setOperations] = useState({
    fulfillmentStatus: 'pending',
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
    adminNote: '',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminFetch<{ order: Record<string, unknown>; items: OrderItem[] }>(`/api/admin/orders/${orderId}`, token)
      .then((data) => {
        if (cancelled) return
        setRaw(data.order)
        setItems(Array.isArray(data.items) ? data.items : [])
        setOperations({
          fulfillmentStatus:
            String(data.order.fulfillment_status ?? 'pending') === 'unfulfilled'
              ? 'pending'
              : String(data.order.fulfillment_status ?? 'pending'),
          carrier: String(data.order.carrier ?? ''),
          trackingNumber: String(data.order.tracking_number ?? ''),
          trackingUrl: String(data.order.tracking_url ?? ''),
          adminNote: String(data.order.admin_note ?? ''),
        })
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load order')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, token])

  const shipTo = raw
    ? [
        raw.shipping_line1,
        raw.shipping_line2,
        raw.shipping_city,
        raw.shipping_state,
        raw.shipping_postcode,
      ]
        .map((p) => String(p ?? '').trim())
        .filter(Boolean)
        .join(', ')
    : ''

  const saveOperations = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await adminFetch(`/api/admin/orders/${orderId}`, token, {
        method: 'PUT',
        body: JSON.stringify(operations),
      })
      setRaw((current) =>
        current
          ? {
              ...current,
              fulfillment_status: operations.fulfillmentStatus,
              carrier: operations.carrier,
              tracking_number: operations.trackingNumber,
              tracking_url: operations.trackingUrl,
              admin_note: operations.adminNote,
            }
          : current,
      )
      setMessage('Order management details saved')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-parchment bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Order details</p>
            <h3 className="mt-1 font-heading text-2xl text-charcoal">
              {String(raw?.order_number ?? (loading ? 'Loading…' : 'Order'))}
            </h3>
          </div>
          <button type="button" className="rounded-sm px-2 py-1 text-sm text-stone hover:text-charcoal" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-stone">Loading…</p> : null}
        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

        {raw && !loading ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-1 text-sm text-stone">
              <p>
                <span className="text-charcoal">Ordered:</span> {formatOrderDate(raw.created_at)}
              </p>
              {raw.paid_at ? (
                <p>
                  <span className="text-charcoal">Paid:</span> {formatOrderDate(raw.paid_at)}
                </p>
              ) : null}
              {raw.packed_at ? (
                <p>
                  <span className="text-charcoal">Packed:</span> {formatOrderDate(raw.packed_at)}
                </p>
              ) : null}
              {raw.shipped_at ? (
                <p>
                  <span className="text-charcoal">Shipped:</span> {formatOrderDate(raw.shipped_at)}
                </p>
              ) : null}
              {raw.delivered_at ? (
                <p>
                  <span className="text-charcoal">Delivered:</span> {formatOrderDate(raw.delivered_at)}
                </p>
              ) : null}
              <p>
                <span className="text-charcoal">Customer:</span> {String(raw.full_name ?? '')} · {String(raw.email ?? '')}
              </p>
              {raw.phone ? (
                <p>
                  <span className="text-charcoal">Phone:</span> {String(raw.phone)}
                </p>
              ) : null}
              <p>
                <span className="text-charcoal">Status:</span> {String(raw.status ?? '')} /{' '}
                {String(raw.fulfillment_status) === 'unfulfilled' ? 'pending' : String(raw.fulfillment_status ?? 'pending')}
              </p>
              {shipTo ? (
                <p>
                  <span className="text-charcoal">Ship to:</span> {shipTo}
                </p>
              ) : null}
              <p>
                <span className="text-charcoal">Method:</span> {String(raw.shipping_method ?? '—')}
              </p>
              {raw.stripe_payment_intent_id ? (
                <p className="break-all text-xs">
                  <span className="text-charcoal">Payment reference:</span> {String(raw.stripe_payment_intent_id)}
                </p>
              ) : null}
            </div>

            <ul className="divide-y divide-parchment/70 border-y border-parchment/70">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-charcoal">{item.productName}</p>
                    <p className="text-stone">
                      {item.productSize ? `${item.productSize} · ` : ''}
                      Qty {item.quantity} · ${Number(item.unitPrice).toFixed(2)} each
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-charcoal">${Number(item.lineTotal).toFixed(2)}</p>
                </li>
              ))}
              {items.length === 0 ? <li className="py-3 text-sm text-stone">No line items.</li> : null}
            </ul>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-stone">
                <span>Subtotal</span>
                <span>${Number(raw.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone">
                <span>Shipping</span>
                <span>${Number(raw.shipping_fee ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-charcoal">
                <span>Total</span>
                <span>${Number(raw.total ?? 0).toFixed(2)} AUD</span>
              </div>
            </div>

            <div className="space-y-3 border-t border-parchment/70 pt-4">
              <div>
                <h4 className="font-semibold text-charcoal">Fulfillment &amp; delivery</h4>
                <p className="mt-1 text-xs text-stone">
                  Add tracking before marking the order shipped. Customers can see these details in their account.
                </p>
              </div>
              <label className="block text-xs font-semibold text-bark">
                Fulfillment status
                <select
                  className="field mt-1"
                  value={operations.fulfillmentStatus}
                  onChange={(e) => setOperations((value) => ({ ...value, fulfillmentStatus: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-bark">
                  Carrier
                  <input
                    className="field mt-1"
                    placeholder="Australia Post"
                    value={operations.carrier}
                    onChange={(e) => setOperations((value) => ({ ...value, carrier: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-semibold text-bark">
                  Tracking number
                  <input
                    className="field mt-1"
                    placeholder="Tracking number"
                    value={operations.trackingNumber}
                    onChange={(e) => setOperations((value) => ({ ...value, trackingNumber: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-bark">
                Tracking link
                <input
                  className="field mt-1"
                  type="url"
                  placeholder="https://..."
                  value={operations.trackingUrl}
                  onChange={(e) => setOperations((value) => ({ ...value, trackingUrl: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-bark">
                Private staff note
                <textarea
                  className="field mt-1 min-h-20"
                  placeholder="Packing instructions, customer contact, or internal notes"
                  value={operations.adminNote}
                  onChange={(e) => setOperations((value) => ({ ...value, adminNote: e.target.value }))}
                />
              </label>
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              <Button type="button" disabled={saving} onClick={() => void saveOperations()}>
                {saving ? 'Saving…' : 'Save order details'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

type StayBooking = {
  id: number
  bookingNumber: string
  email: string
  fullName: string
  checkIn: string
  checkOut: string
  guests: number
  nights: number
  total: number
  status: string
  propertyName: string
  refundStatus?: string | null
  refundReason?: string | null
  refundNote?: string | null
}

type ShippingRule = {
  id: number
  name: string
  postcodePrefixes: string
  baseFee: number
  perKgFee: number
  freeOver: number | null
  sortOrder: number
  isActive: boolean
}

type Property = {
  id: number
  name: string
  nightlyRate: number
  minNights: number
  maxGuests: number
  cleaningFee: number
  icalAirbnbUrl: string | null
  icalBookingUrl: string | null
  isActive: boolean
}

type TableHold = {
  id: number
  holdNumber: string
  fullName: string
  email: string
  phone: string
  partyDate: string
  slot: string
  covers: number
  notes: string
  status: string
  expiresAt: string
  createdAt?: string
}

type CafeCapacity = {
  lunchCovers: number
  dinnerCovers: number
  maxPartySize: number
  openDays: number[]
}

type Sales = {
  storeOrders: number
  storeRevenue: number
  storeGrossRevenue: number
  storeRefunds: number
  stayBookings: number
  stayRevenue: number
  onlineRevenue: number
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

const HOLD_STATUSES = ['pending', 'confirmed', 'seated', 'cancelled', 'declined', 'expired'] as const

function holdStatusClass(status: string) {
  if (status === 'confirmed' || status === 'seated') return 'text-emerald-700'
  if (status === 'pending') return 'text-amber-800'
  if (status === 'declined' || status === 'cancelled' || status === 'expired') return 'text-stone'
  return 'text-charcoal'
}

export function AdminCommercePanels({ section, token }: { section: 'orders' | 'shipping' | 'stays' | 'tables' | 'sales'; token: string }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [stayBookings, setStayBookings] = useState<StayBooking[]>([])
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [holds, setHolds] = useState<TableHold[]>([])
  const [cafeCapacity, setCafeCapacity] = useState<CafeCapacity>({
    lunchCovers: 40,
    dinnerCovers: 30,
    maxPartySize: 10,
    openDays: [4, 5, 6, 0],
  })
  const [editingHoldId, setEditingHoldId] = useState<number | null>(null)
  const [holdDraft, setHoldDraft] = useState({
    fullName: '',
    email: '',
    phone: '',
    partyDate: '',
    slot: 'lunch',
    covers: '2',
    notes: '',
    status: 'pending',
  })
  const [sales, setSales] = useState<Sales | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [orderQuery, setOrderQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [newRule, setNewRule] = useState({
    name: '',
    postcodePrefixes: '*',
    baseFee: '15',
    perKgFee: '3',
    freeOver: '200',
    sortOrder: '100',
  })
  const [blockForm, setBlockForm] = useState({ propertyId: '', startDate: '', endDate: '', note: '' })

  const load = useCallback(async () => {
    setError('')
    try {
      if (section === 'orders') setOrders(await adminFetch('/api/admin/orders', token))
      if (section === 'shipping') setRules(await adminFetch('/api/admin/shipping-rules', token))
      if (section === 'stays') {
        const [props, bookings] = await Promise.all([
          adminFetch<Property[]>('/api/admin/properties', token),
          adminFetch<StayBooking[]>('/api/admin/stay-bookings', token),
        ])
        setProperties(props)
        setStayBookings(bookings)
      }
      if (section === 'tables') {
        const [holdRows, capacity] = await Promise.all([
          adminFetch<TableHold[]>('/api/admin/table-holds', token),
          adminFetch<CafeCapacity>('/api/admin/cafe-capacity', token),
        ])
        setHolds(holdRows)
        setCafeCapacity(capacity)
      }
      if (section === 'sales') setSales(await adminFetch('/api/admin/sales-summary', token))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    }
  }, [section, token])

  useEffect(() => {
    void load()
  }, [load])

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase()
    return orders.filter((order) => {
      const fulfillment =
        order.fulfillmentStatus === 'unfulfilled' ? 'pending' : String(order.fulfillmentStatus || 'pending')
      if (orderStatusFilter !== 'all' && fulfillment !== orderStatusFilter && order.status !== orderStatusFilter) {
        return false
      }
      if (!query) return true
      return [order.orderNumber, order.fullName, order.email, order.phone, order.shippingPostcode]
        .map((value) => String(value ?? '').toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [orderQuery, orderStatusFilter, orders])

  const updateHoldStatus = async (holdId: number, status: string) => {
    setError('')
    setMessage('')
    try {
      const result = await adminFetch<{ ok: boolean; hold?: TableHold }>(`/api/admin/table-holds/${holdId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      if (result.hold) {
        setHolds((rows) => rows.map((row) => (row.id === holdId ? { ...row, ...result.hold! } : row)))
      } else {
        setHolds((rows) => rows.map((row) => (row.id === holdId ? { ...row, status } : row)))
      }
      setMessage(`Status updated to ${status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
      await load()
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      {section === 'sales' && sales ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ['Store orders', sales.storeOrders],
            ['Store gross', `$${Number(sales.storeGrossRevenue).toFixed(2)}`],
            ['Store refunds', `$${Number(sales.storeRefunds).toFixed(2)}`],
            ['Store net', `$${Number(sales.storeRevenue).toFixed(2)}`],
            ['Stay bookings', sales.stayBookings],
            ['Online total', `$${Number(sales.onlineRevenue).toFixed(2)}`],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-gold">{value}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {section === 'orders' ? (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 pb-2 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                className="field"
                type="search"
                placeholder="Search order, customer, email or postcode"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
              />
              <select
                className="field"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="partially_refunded">Partially refunded</option>
                <option value="refund_requested">Refund requested</option>
                <option value="refunded">Refunded</option>
                <option value="pending">Pending fulfillment</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {orders.length === 0 ? <p className="text-sm text-stone">No orders yet.</p> : null}
            {orders.length > 0 && filteredOrders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-parchment p-4 text-sm text-stone">
                No orders match this search or filter.
              </p>
            ) : null}
            {filteredOrders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-parchment px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-stone">
                    {o.fullName} · {o.email} · ${Number(o.total).toFixed(2)} · {o.status} /{' '}
                    {o.fulfillmentStatus === 'unfulfilled' ? 'pending' : o.fulfillmentStatus}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone">
                    Ordered {formatOrderDate(o.createdAt)}
                    {o.paidAt ? ` · Paid ${formatOrderDate(o.paidAt)}` : ''}
                  </p>
                  {o.refundReason ? <p className="text-xs text-amber-800">Refund reason: {o.refundReason}</p> : null}
                  {o.refundNote ? <p className="text-xs text-stone">{o.refundNote}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedOrderId(o.id)}>
                    Order details
                  </Button>
                  {o.status === 'refund_requested' ? (
                    <>
                      <Button
                        type="button"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Refund the remaining amount for ${o.orderNumber}? This sends money through Stripe and cannot be undone.`,
                          )
                          if (!confirmed) return
                          await adminFetch(`/api/admin/orders/${o.id}/refund`, token, {
                            method: 'POST',
                            body: JSON.stringify({ note: 'Admin approved refund' }),
                          })
                          setMessage(`Refunded ${o.orderNumber}`)
                          await load()
                        }}
                      >
                        Refund
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await adminFetch(`/api/admin/orders/${o.id}/refund-reject`, token, {
                            method: 'POST',
                            body: JSON.stringify({ note: 'Refund request declined' }),
                          })
                          setMessage(`Rejected refund for ${o.orderNumber}`)
                          await load()
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <select
                    className="field w-auto"
                    value={o.fulfillmentStatus === 'unfulfilled' ? 'pending' : o.fulfillmentStatus}
                    onChange={async (e) => {
                      await adminFetch(`/api/admin/orders/${o.id}`, token, {
                        method: 'PUT',
                        body: JSON.stringify({ fulfillmentStatus: e.target.value }),
                      })
                      setMessage('Order updated')
                      await load()
                    }}
                  >
                    <option value="pending">pending</option>
                    <option value="packed">packed</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {selectedOrderId != null ? (
        <AdminOrderDetails
          orderId={selectedOrderId}
          token={token}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={() => void load()}
        />
      ) : null}

      {section === 'shipping' ? (
        <>
          <p className="text-sm text-stone">
            Live Australia Post rates are used at checkout when <code className="text-charcoal">AUSPOST_PAC_API_KEY</code> is set
            (origin 3922, preferred Parcel Post). These matrix rules are used only when AusPost is disabled or fallback is explicitly
            enabled. AusPost failures are blocked by default so customers are never charged placeholder rates. Configure
            <code className="text-charcoal"> SHIPPING_FREE_OVER</code> separately if free AusPost delivery is approved.
          </p>
          <Card>
            <CardHeader>
              <CardTitle>Add shipping rule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <input className="field" placeholder="Name" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
              <input className="field" placeholder="Postcode prefixes (comma or *)" value={newRule.postcodePrefixes} onChange={(e) => setNewRule({ ...newRule, postcodePrefixes: e.target.value })} />
              <input className="field" placeholder="Base fee" value={newRule.baseFee} onChange={(e) => setNewRule({ ...newRule, baseFee: e.target.value })} />
              <input className="field" placeholder="Per kg fee" value={newRule.perKgFee} onChange={(e) => setNewRule({ ...newRule, perKgFee: e.target.value })} />
              <input className="field" placeholder="Free over" value={newRule.freeOver} onChange={(e) => setNewRule({ ...newRule, freeOver: e.target.value })} />
              <Button
                type="button"
                onClick={async () => {
                  await adminFetch('/api/admin/shipping-rules', token, {
                    method: 'POST',
                    body: JSON.stringify({
                      name: newRule.name,
                      postcodePrefixes: newRule.postcodePrefixes,
                      baseFee: Number(newRule.baseFee),
                      perKgFee: Number(newRule.perKgFee),
                      freeOver: newRule.freeOver ? Number(newRule.freeOver) : null,
                      sortOrder: Number(newRule.sortOrder),
                    }),
                  })
                  setMessage('Rule added')
                  await load()
                }}
              >
                Save rule
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Shipping rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="rounded-lg border border-parchment px-3 py-2 text-sm">
                  <p className="font-semibold">
                    {r.name} {r.isActive ? '' : '(inactive)'}
                  </p>
                  <p className="text-stone">
                    prefixes: {r.postcodePrefixes} · base ${Number(r.baseFee).toFixed(2)} · /kg ${Number(r.perKgFee).toFixed(2)}
                    {r.freeOver != null ? ` · free over $${Number(r.freeOver).toFixed(2)}` : ''}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {section === 'stays' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Stay bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stayBookings.length === 0 ? <p className="text-sm text-stone">No stay bookings yet.</p> : null}
              {stayBookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-parchment px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold">
                      {b.bookingNumber} · {b.propertyName}
                    </p>
                    <p className="text-stone">
                      {b.fullName} · {String(b.checkIn).slice(0, 10)} → {String(b.checkOut).slice(0, 10)} · $
                      {Number(b.total).toFixed(2)} · {b.status}
                    </p>
                    {b.refundReason ? <p className="text-xs text-amber-800">Refund reason: {b.refundReason}</p> : null}
                    {b.refundNote ? <p className="text-xs text-stone">{b.refundNote}</p> : null}
                  </div>
                  {b.status === 'refund_requested' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/stay-bookings/${b.id}/refund`, token, {
                            method: 'POST',
                            body: JSON.stringify({ note: 'Admin approved stay refund' }),
                          })
                          setMessage(`Refunded ${b.bookingNumber}`)
                          await load()
                        }}
                      >
                        Refund
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await adminFetch(`/api/admin/stay-bookings/${b.id}/refund-reject`, token, {
                            method: 'POST',
                            body: JSON.stringify({ note: 'Refund request declined' }),
                          })
                          setMessage(`Rejected refund for ${b.bookingNumber}`)
                          await load()
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Properties</CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const result = await adminFetch<{ imported: number }>('/api/admin/ical-sync', token, { method: 'POST' })
                  setMessage(`iCal sync imported ${result.imported} blocks`)
                }}
              >
                Sync iCal now
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {properties.map((p) => (
                <div key={p.id} className="space-y-2 rounded-lg border border-parchment p-3">
                  <p className="font-heading text-lg">{p.name}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      className="field"
                      type="number"
                      defaultValue={p.nightlyRate}
                      onBlur={async (e) => {
                        await adminFetch(`/api/admin/properties/${p.id}`, token, {
                          method: 'PUT',
                          body: JSON.stringify({ ...p, nightlyRate: Number(e.target.value) }),
                        })
                        setMessage('Property saved')
                      }}
                    />
                    <input
                      className="field"
                      placeholder="Airbnb iCal URL"
                      defaultValue={p.icalAirbnbUrl ?? ''}
                      onBlur={async (e) => {
                        await adminFetch(`/api/admin/properties/${p.id}`, token, {
                          method: 'PUT',
                          body: JSON.stringify({ ...p, icalAirbnbUrl: e.target.value }),
                        })
                      }}
                    />
                    <input
                      className="field"
                      placeholder="Booking.com iCal URL"
                      defaultValue={p.icalBookingUrl ?? ''}
                      onBlur={async (e) => {
                        await adminFetch(`/api/admin/properties/${p.id}`, token, {
                          method: 'PUT',
                          body: JSON.stringify({ ...p, icalBookingUrl: e.target.value }),
                        })
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manual date block-out</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <select
                className="field"
                value={blockForm.propertyId}
                onChange={(e) => setBlockForm({ ...blockForm, propertyId: e.target.value })}
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input className="field" placeholder="Note" value={blockForm.note} onChange={(e) => setBlockForm({ ...blockForm, note: e.target.value })} />
              <input className="field" type="date" value={blockForm.startDate} onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })} />
              <input className="field" type="date" value={blockForm.endDate} onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })} />
              <Button
                type="button"
                className="sm:col-span-2"
                onClick={async () => {
                  await adminFetch(`/api/admin/properties/${blockForm.propertyId}/blocks`, token, {
                    method: 'POST',
                    body: JSON.stringify(blockForm),
                  })
                  setMessage('Block created')
                }}
              >
                Block dates
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {section === 'tables' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Café capacity</CardTitle>
              <p className="mt-1 text-xs font-normal text-stone">
                Controls how many covers can be requested per lunch/dinner service. Pending + confirmed + seated count toward capacity.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="text-stone">Lunch covers</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={cafeCapacity.lunchCovers}
                  onChange={(e) => setCafeCapacity((c) => ({ ...c, lunchCovers: Number(e.target.value) || 1 }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone">Dinner covers</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={cafeCapacity.dinnerCovers}
                  onChange={(e) => setCafeCapacity((c) => ({ ...c, dinnerCovers: Number(e.target.value) || 1 }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone">Max party size</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={cafeCapacity.maxPartySize}
                  onChange={(e) => setCafeCapacity((c) => ({ ...c, maxPartySize: Number(e.target.value) || 1 }))}
                />
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="mb-2 text-sm text-stone">Open days</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const active = cafeCapacity.openDays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? 'border-gold bg-gold/10 text-charcoal'
                            : 'border-parchment bg-white text-stone'
                        }`}
                        onClick={() => {
                          setCafeCapacity((c) => ({
                            ...c,
                            openDays: active
                              ? c.openDays.filter((d) => d !== day.value)
                              : [...c.openDays, day.value].sort((a, b) => a - b),
                          }))
                        }}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      setMessage('')
                      const next = await adminFetch<CafeCapacity>('/api/admin/cafe-capacity', token, {
                        method: 'PUT',
                        body: JSON.stringify(cafeCapacity),
                      })
                      setCafeCapacity(next)
                      setMessage('Café capacity saved')
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to save capacity')
                    }
                  }}
                >
                  Save capacity
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Table holds</CardTitle>
              <p className="mt-1 text-xs font-normal text-stone">
                New requests start as <strong>pending</strong>. Confirm after WhatsApp/phone, or decline/cancel to free capacity.
                Use <strong>Edit</strong> to change date, time, guests, or guest details after speaking with the customer.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {holds.length === 0 ? (
                <p className="text-sm text-stone">No table holds yet.</p>
              ) : null}
              {holds.map((h) => {
                const party = String(h.partyDate).slice(0, 10)
                const expiresDay = String(h.expiresAt).slice(0, 10)
                const phone = String(h.phone ?? '').trim()
                const notes = String(h.notes ?? '').trim()
                const statusValue = HOLD_STATUSES.includes(h.status as (typeof HOLD_STATUSES)[number])
                  ? h.status
                  : 'pending'
                const isEditing = editingHoldId === h.id
                return (
                  <div
                    key={h.id}
                    className="rounded-lg border border-parchment px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-charcoal">
                          {h.holdNumber} — {h.fullName}{' '}
                          <span className={`text-xs font-semibold uppercase tracking-wide ${holdStatusClass(statusValue)}`}>
                            {statusValue}
                          </span>
                        </p>
                        <p className="text-stone">
                          Dining {party} · {h.slot} · {h.covers} covers
                          {statusValue === 'pending' ? ` · confirm by ${expiresDay}` : ''}
                        </p>
                        <p className="text-charcoal">
                          <span className="text-stone">Email:</span>{' '}
                          {h.email ? (
                            <a className="text-gold-deep underline-offset-2 hover:underline" href={`mailto:${h.email}`}>
                              {h.email}
                            </a>
                          ) : (
                            <span className="text-stone">—</span>
                          )}
                          {' · '}
                          <span className="text-stone">Phone:</span>{' '}
                          {phone ? (
                            <a
                              className="text-gold-deep underline-offset-2 hover:underline"
                              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                            >
                              {phone}
                            </a>
                          ) : (
                            <span className="text-stone">—</span>
                          )}
                        </p>
                        {notes ? <p className="text-stone">Notes: {notes}</p> : null}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              setEditingHoldId(isEditing ? null : h.id)
                              setHoldDraft({
                                fullName: h.fullName ?? '',
                                email: h.email ?? '',
                                phone: String(h.phone ?? ''),
                                partyDate: String(h.partyDate).slice(0, 10),
                                slot: h.slot === 'dinner' ? 'dinner' : 'lunch',
                                covers: String(h.covers ?? 2),
                                notes: String(h.notes ?? ''),
                                status: statusValue,
                              })
                            }}
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </Button>
                          {statusValue === 'pending' ? (
                            <>
                              <Button
                                type="button"
                                className="h-8 px-3 text-xs"
                                onClick={() => void updateHoldStatus(h.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 px-3 text-xs"
                                onClick={() => void updateHoldStatus(h.id, 'declined')}
                              >
                                Decline
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <select
                        className="field w-auto"
                        value={statusValue}
                        onChange={(e) => void updateHoldStatus(h.id, e.target.value)}
                      >
                        {HOLD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid gap-2 border-t border-parchment/70 pt-3 sm:grid-cols-2">
                        <label className="block text-xs text-stone">
                          Guest name
                          <input
                            className="field mt-1"
                            value={holdDraft.fullName}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, fullName: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Email
                          <input
                            className="field mt-1"
                            type="email"
                            value={holdDraft.email}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, email: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Phone
                          <input
                            className="field mt-1"
                            value={holdDraft.phone}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, phone: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Dining date
                          <input
                            className="field mt-1"
                            type="date"
                            value={holdDraft.partyDate}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, partyDate: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Service
                          <select
                            className="field mt-1"
                            value={holdDraft.slot}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, slot: e.target.value }))}
                          >
                            <option value="lunch">lunch</option>
                            <option value="dinner">dinner</option>
                          </select>
                        </label>
                        <label className="block text-xs text-stone">
                          Covers
                          <input
                            className="field mt-1"
                            type="number"
                            min={1}
                            value={holdDraft.covers}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, covers: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone sm:col-span-2">
                          Notes
                          <textarea
                            className="field mt-1 min-h-20"
                            value={holdDraft.notes}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, notes: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Status
                          <select
                            className="field mt-1"
                            value={holdDraft.status}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, status: e.target.value }))}
                          >
                            {HOLD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-end gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                setError('')
                                setMessage('')
                                await adminFetch(`/api/admin/table-holds/${h.id}`, token, {
                                  method: 'PUT',
                                  body: JSON.stringify({
                                    fullName: holdDraft.fullName,
                                    email: holdDraft.email,
                                    phone: holdDraft.phone,
                                    partyDate: holdDraft.partyDate,
                                    slot: holdDraft.slot,
                                    covers: Number(holdDraft.covers) || 1,
                                    notes: holdDraft.notes,
                                    status: holdDraft.status,
                                  }),
                                })
                                setMessage('Table hold updated')
                                setEditingHoldId(null)
                                await load()
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Failed to update hold')
                              }
                            }}
                          >
                            Save changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingHoldId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
