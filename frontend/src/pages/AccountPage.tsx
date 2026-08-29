import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CreditCard, LogOut, Package, Tent, UserRound } from 'lucide-react'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/button'
import { useCustomerAuth, needsAccountVerification } from '@/context/CustomerAuthContext'
import { AccountVerificationPanel, CustomerAuthPanel } from '@/components/account/CustomerAuthPanel'
import { AccountProfilePanel } from '@/components/account/AccountProfilePanel'
import { apiUrl } from '@/utils/api'
import { getStoreRefundRequestState } from '@/utils/storeRefundPolicy'

type OrderRow = {
  id: number
  orderNumber: string
  total: number
  status: string
  fulfillmentStatus: string
  refundStatus?: string | null
  refundReason?: string | null
  refundNote?: string | null
  refundedAmount?: number | null
  refundRequestedAt?: string | null
  paidAt?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
}
type StayRow = {
  id: number
  bookingNumber: string
  propertyName: string
  checkIn: string
  checkOut: string
  total: number
  status: string
  refundStatus?: string | null
  refundNote?: string | null
}
type CardRow = { id: number; brand: string; last4: string; expMonth: number; expYear: number }

function formatFulfillment(status: string | null | undefined) {
  const value = String(status ?? '').trim().toLowerCase()
  if (!value || value === 'unfulfilled') return 'pending'
  return value
}

function formatMoney(amount: number) {
  return `$${Number(amount).toFixed(2)}`
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'amber' | 'stone' | 'red' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200',
    stone: 'bg-surface-low text-stone ring-parchment',
    red: 'bg-red-50 text-red-700 ring-red-200',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${tones[tone]}`}>
      {label}
    </span>
  )
}

function orderStatusTone(status: string): 'green' | 'amber' | 'stone' | 'red' {
  if (status === 'paid') return 'green'
  if (status === 'refund_requested' || status === 'partially_refunded' || status === 'pending_payment') return 'amber'
  if (status === 'refunded' || status === 'cancelled') return 'red'
  return 'stone'
}

function SaveCardForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setError('')
    const result = await stripe.confirmSetup({ elements, redirect: 'if_required' })
    if (result.error) {
      setBusy(false)
      setError(result.error.message ?? 'Could not save card')
      return
    }
    const pmId = typeof result.setupIntent?.payment_method === 'string'
      ? result.setupIntent.payment_method
      : result.setupIntent?.payment_method?.id
    if (pmId) {
      await fetch(apiUrl('/api/account/payment-methods'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId }),
      })
    }
    setBusy(false)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={busy || !stripe}>
        {busy ? 'Saving…' : 'Save card'}
      </Button>
    </form>
  )
}

function RefundRequestLink({
  kind,
  id,
  onDone,
}: {
  kind: 'orders' | 'stays'
  id: number
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(apiUrl(`/api/account/${kind}/${id}/refund-request`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.message ?? 'Could not submit request')
      return
    }
    setOpen(false)
    setReason('')
    onDone()
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm text-stone underline decoration-stone/40 underline-offset-4 transition hover:text-gold hover:decoration-gold"
        onClick={() => setOpen(true)}
      >
        Request a refund
      </button>
    )
  }

  return (
    <div className="w-full space-y-2">
      <textarea
        className="field min-h-[72px]"
        placeholder="Why do you need a refund?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void submit()}>
          {busy ? 'Sending…' : 'Submit request'}
        </Button>
        <button
          type="button"
          className="text-sm text-stone underline decoration-stone/40 underline-offset-4 hover:text-charcoal"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

type OrderDetail = {
  id: number
  orderNumber: string
  email: string
  fullName: string
  phone: string
  shippingMethod: string
  shippingLine1: string
  shippingLine2: string
  shippingCity: string
  shippingState: string
  shippingPostcode: string
  subtotal: number
  shippingFee: number
  total: number
  currency: string
  status: string
  fulfillmentStatus: string
  refundStatus?: string | null
  refundReason?: string | null
  refundNote?: string | null
  refundedAmount?: number | null
  refundRequestedAt?: string | null
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  paidAt?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  updatedAt?: string
  createdAt: string
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

function StoreRefundSection({
  order,
  onRefundDone,
}: {
  order: Pick<OrderDetail, 'id' | 'status' | 'fulfillmentStatus' | 'total' | 'refundedAmount' | 'deliveredAt'>
  onRefundDone: () => void
}) {
  const state = getStoreRefundRequestState(order)

  if (state.code === 'allowed') {
    return (
      <div className="border-t border-parchment/70 pt-4">
        <RefundRequestLink kind="orders" id={order.id} onDone={onRefundDone} />
      </div>
    )
  }

  if (state.code === 'refund_requested') {
    return (
      <p className="border-t border-parchment/70 pt-4 text-sm text-stone">
        Refund request submitted — we’ll review it shortly.
      </p>
    )
  }

  if (state.code === 'contact_return') {
    return (
      <p className="border-t border-parchment/70 pt-4 text-sm text-stone">
        This order has shipped. Please{' '}
        <Link to="/contact" className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
          contact us
        </Link>{' '}
        to arrange a return.
      </p>
    )
  }

  if (state.code === 'return_window_closed') {
    return (
      <p className="border-t border-parchment/70 pt-4 text-sm text-stone">
        The 14-day return window for this order has closed. Please{' '}
        <Link to="/contact" className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
          contact us
        </Link>{' '}
        if you need help.
      </p>
    )
  }

  return null
}

function OrderDetailsPanel({
  orderId,
  onClose,
  onRefundDone,
}: {
  orderId: number
  onClose: () => void
  onRefundDone: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(apiUrl(`/api/account/orders/${orderId}`), { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.message ?? 'Could not load order')
        if (cancelled) return
        setOrder(data.order as OrderDetail)
        setItems(Array.isArray(data.items) ? data.items : [])
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
  }, [orderId])

  const shipTo =
    order &&
    [order.shippingLine1, order.shippingLine2, order.shippingCity, order.shippingState, order.shippingPostcode]
      .map((p) => String(p ?? '').trim())
      .filter(Boolean)
      .join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-parchment bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Order details</p>
            <h3 className="mt-1 font-heading text-2xl text-charcoal">
              {order?.orderNumber ?? (loading ? 'Loading…' : 'Order')}
            </h3>
          </div>
          <button
            type="button"
            className="rounded-sm px-2 py-1 text-sm text-stone transition hover:text-charcoal"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-stone">Loading order…</p> : null}
        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

        {order && !loading ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-1 text-sm text-stone">
              <p>
                <span className="text-charcoal">Status:</span> {order.status} / {formatFulfillment(order.fulfillmentStatus)}
              </p>
              <p>
                <span className="text-charcoal">Placed:</span>{' '}
                {formatDate(order.createdAt)}
              </p>
              {order.paidAt ? (
                <p>
                  <span className="text-charcoal">Paid:</span> {formatDate(order.paidAt)}
                </p>
              ) : null}
              {order.packedAt ? (
                <p>
                  <span className="text-charcoal">Packed:</span> {formatDate(order.packedAt)}
                </p>
              ) : null}
              {order.shippedAt ? (
                <p>
                  <span className="text-charcoal">Shipped:</span> {formatDate(order.shippedAt)}
                </p>
              ) : null}
              {order.deliveredAt ? (
                <p>
                  <span className="text-charcoal">Delivered:</span> {formatDate(order.deliveredAt)}
                </p>
              ) : null}
              {order.shippingMethod ? (
                <p>
                  <span className="text-charcoal">Delivery method:</span>{' '}
                  {order.shippingMethod === 'pickup' ? 'Farm pickup' : 'Delivery'}
                </p>
              ) : null}
              <p>
                <span className="text-charcoal">Contact:</span> {order.fullName} · {order.email}
                {order.phone ? ` · ${order.phone}` : ''}
              </p>
              {shipTo ? (
                <p>
                  <span className="text-charcoal">Ship to:</span> {shipTo}
                </p>
              ) : null}
              {order.trackingNumber ? (
                <p>
                  <span className="text-charcoal">Tracking:</span>{' '}
                  {order.trackingUrl && /^https?:\/\//i.test(order.trackingUrl) ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-gold-deep underline underline-offset-2"
                    >
                      {order.carrier ? `${order.carrier} · ` : ''}
                      {order.trackingNumber}
                    </a>
                  ) : (
                    <>
                      {order.carrier ? `${order.carrier} · ` : ''}
                      {order.trackingNumber}
                    </>
                  )}
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
              {items.length === 0 ? <li className="py-3 text-sm text-stone">No line items found.</li> : null}
            </ul>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-stone">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone">
                <span>Shipping</span>
                <span>${Number(order.shippingFee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-charcoal">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)} AUD</span>
              </div>
            </div>

            {order.refundStatus || order.refundReason || order.refundNote || Number(order.refundedAmount ?? 0) > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm">
                <p className="font-semibold text-amber-950">Refund information</p>
                {order.refundStatus ? (
                  <p className="mt-1 text-amber-900">Status: {order.refundStatus.replaceAll('_', ' ')}</p>
                ) : null}
                {order.refundRequestedAt ? (
                  <p className="text-amber-900">Requested: {formatDate(order.refundRequestedAt)}</p>
                ) : null}
                {order.refundReason ? <p className="text-amber-900">Reason: {order.refundReason}</p> : null}
                {Number(order.refundedAmount ?? 0) > 0 ? (
                  <p className="text-amber-900">Refunded: ${Number(order.refundedAmount).toFixed(2)} AUD</p>
                ) : null}
                {order.refundNote ? <p className="text-amber-900">Update: {order.refundNote}</p> : null}
              </div>
            ) : null}

            <StoreRefundSection
              order={order}
              onRefundDone={() => {
                onRefundDone()
                onClose()
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AccountPage() {
  const { user, loading, logout, authConfig } = useCustomerAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [stays, setStays] = useState<StayRow[]>([])
  const [cards, setCards] = useState<CardRow[]>([])
  const [setupSecret, setSetupSecret] = useState('')
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [tab, setTab] = useState<'orders' | 'stays' | 'cards' | 'profile'>('orders')
  const params = new URLSearchParams(window.location.search)
  const paid = params.get('paid')
  const paidOrder = params.get('order')
  const paidStay = params.get('stay')

  const loadAccount = async () => {
    const [o, s, c] = await Promise.all([
      fetch(apiUrl('/api/account/orders'), { credentials: 'include' }).then((r) => r.json()),
      fetch(apiUrl('/api/account/stays'), { credentials: 'include' }).then((r) => r.json()),
      fetch(apiUrl('/api/account/payment-methods'), { credentials: 'include' }).then((r) => r.json()),
    ])
    setOrders(Array.isArray(o) ? o : [])
    setStays(Array.isArray(s) ? s : [])
    setCards(Array.isArray(c) ? c : [])
  }

  useEffect(() => {
    if (user && !needsAccountVerification(user, authConfig?.verificationEnabled)) void loadAccount()
  }, [user, authConfig?.verificationEnabled])

  useEffect(() => {
    fetch(apiUrl('/api/commerce/config'))
      .then((r) => r.json())
      .then((cfg: { publishableKey?: string }) => {
        if (cfg.publishableKey) setStripePromise(loadStripe(cfg.publishableKey))
      })
      .catch(() => undefined)
  }, [])

  const startSaveCard = async () => {
    const res = await fetch(apiUrl('/api/account/setup-intent'), { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.message ?? 'Could not start card save')
      return
    }
    setSetupSecret(data.clientSecret)
  }

  const paidBanner = paid ? (
    <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      Payment received{paidOrder ? ` for order ${paidOrder}` : paidStay ? ` for stay ${paidStay}` : ''}. Sign in (or create an account)
      using the same email you paid with to view it here.
    </p>
  ) : null

  if (loading) {
    return <main className="flex min-h-[50vh] items-center justify-center text-stone">Loading…</main>
  }

  if (!user) {
    return (
      <>
        <Seo title="Account | Omaru Farm" description="Sign in to your Omaru Farm account." path="/account" />
        <CustomerAuthPanel mode={mode} setMode={setMode} paidBanner={paidBanner} />
      </>
    )
  }

  if (needsAccountVerification(user, authConfig?.verificationEnabled)) {
    return (
      <>
        <Seo title="Verify account | Omaru Farm" description="Verify your email and mobile number." path="/account" />
        <AccountVerificationPanel user={user} />
      </>
    )
  }

  return (
    <>
      <Seo title="My account | Omaru Farm" description="Orders, stays, and saved cards." path="/account" />
      <main className="relative min-h-[70vh] overflow-hidden bg-gradient-to-b from-sand/50 via-white to-surface">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(197,160,89,0.16),_transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl space-y-8 px-5 py-12 md:py-16">
          {paid ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-sm">
              Payment received{paidOrder ? ` — order ${paidOrder}` : paidStay ? ` — stay ${paidStay}` : ''}. Thank you.
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-parchment/80 bg-white/90 p-6 shadow-[0_12px_40px_rgba(26,18,8,0.05)] backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Your account</p>
              <h1 className="mt-1 font-heading text-4xl text-charcoal md:text-5xl">Hello, {user.fullName}</h1>
              <p className="mt-1 text-sm text-stone">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone">
                <span className="rounded-full bg-surface-low px-3 py-1 ring-1 ring-parchment">
                  {orders.length} order{orders.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-full bg-surface-low px-3 py-1 ring-1 ring-parchment">
                  {stays.length} stay booking{stays.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-full bg-surface-low px-3 py-1 ring-1 ring-parchment">
                  {cards.length} saved card{cards.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/store">Continue shopping</Link>
              </Button>
              <Button variant="outline" onClick={() => void logout()} className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-parchment pb-1">
            {(
              [
                { id: 'orders' as const, label: 'Orders', icon: Package, count: orders.length },
                { id: 'stays' as const, label: 'Stays', icon: Tent, count: stays.length },
                { id: 'cards' as const, label: 'Payment methods', icon: CreditCard, count: cards.length },
                { id: 'profile' as const, label: 'Profile', icon: UserRound, count: 0 },
              ] as const
            ).map((item) => {
              const Icon = item.icon
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-charcoal shadow-[0_-1px_0_#fff] ring-1 ring-parchment ring-b-white'
                      : 'text-stone hover:text-charcoal'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.id !== 'profile' ? (
                    <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-gold/15 text-gold-deep' : 'bg-surface-low'}`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {tab === 'orders' ? (
            <section className="rounded-2xl border border-parchment/80 bg-white p-5 shadow-[0_8px_28px_rgba(26,18,8,0.04)] md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-heading text-2xl text-charcoal">Store orders</h2>
                  <p className="mt-1 text-sm text-stone">Track purchases, view items, and request a refund from order details.</p>
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-parchment bg-surface/60 px-6 py-12 text-center">
                  <Package className="mx-auto h-8 w-8 text-stone/50" />
                  <p className="mt-3 font-heading text-xl text-charcoal">No orders yet</p>
                  <p className="mt-1 text-sm text-stone">Your farm store purchases will appear here.</p>
                  <Button asChild className="mt-5">
                    <Link to="/store">Browse the store</Link>
                  </Button>
                </div>
              ) : (
                <ul className="mt-6 space-y-3">
                  {orders.map((o) => (
                    <li
                      key={o.id}
                      className="group rounded-xl border border-parchment bg-gradient-to-br from-white to-surface/40 px-4 py-4 transition hover:border-gold/35 hover:shadow-[0_8px_24px_rgba(26,18,8,0.06)] md:px-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold tracking-wide text-charcoal">{o.orderNumber}</p>
                            <StatusBadge label={o.status.replaceAll('_', ' ')} tone={orderStatusTone(o.status)} />
                            <StatusBadge label={formatFulfillment(o.fulfillmentStatus)} tone="amber" />
                          </div>
                          <p className="text-sm text-stone">
                            {o.createdAt ? `Placed ${formatDate(o.createdAt)}` : 'Store order'}
                            {o.refundNote ? ` · ${o.refundNote}` : ''}
                          </p>
                          <p className="font-heading text-2xl text-charcoal">{formatMoney(o.total)} AUD</p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => setSelectedOrderId(o.id)}>
                          Order details
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === 'stays' ? (
            <section className="rounded-2xl border border-parchment/80 bg-white p-5 shadow-[0_8px_28px_rgba(26,18,8,0.04)] md:p-6">
              <h2 className="font-heading text-2xl text-charcoal">Stay bookings</h2>
              <p className="mt-1 text-sm text-stone">Cabin and farm stay reservations linked to this account.</p>
              {stays.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-parchment bg-surface/60 px-6 py-12 text-center">
                  <Tent className="mx-auto h-8 w-8 text-stone/50" />
                  <p className="mt-3 font-heading text-xl text-charcoal">No stay bookings yet</p>
                  <Button asChild className="mt-5" variant="outline">
                    <Link to="/stay">Explore stays</Link>
                  </Button>
                </div>
              ) : (
                <ul className="mt-6 space-y-3">
                  {stays.map((s) => (
                    <li key={s.id} className="rounded-xl border border-parchment bg-gradient-to-br from-white to-surface/40 px-4 py-4 md:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-charcoal">{s.bookingNumber}</p>
                            <StatusBadge label={s.status.replaceAll('_', ' ')} tone={orderStatusTone(s.status)} />
                          </div>
                          <p className="mt-2 text-sm text-stone">
                            {s.propertyName} · {String(s.checkIn).slice(0, 10)} → {String(s.checkOut).slice(0, 10)}
                          </p>
                          <p className="mt-1 font-heading text-xl text-charcoal">{formatMoney(s.total)} AUD</p>
                          {s.refundNote ? <p className="mt-1 text-xs text-stone">{s.refundNote}</p> : null}
                        </div>
                      </div>
                      {s.status === 'confirmed' ? (
                        <div className="mt-4 border-t border-parchment/70 pt-3">
                          <RefundRequestLink kind="stays" id={s.id} onDone={() => void loadAccount()} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === 'cards' ? (
            <section className="rounded-2xl border border-parchment/80 bg-white p-5 shadow-[0_8px_28px_rgba(26,18,8,0.04)] md:p-6">
              <h2 className="font-heading text-2xl text-charcoal">Payment methods</h2>
              <p className="mt-1 text-sm text-stone">
                Saved cards can be reused at checkout — you won’t need to type the number again.
              </p>
              {cards.length === 0 && !setupSecret ? (
                <div className="mt-8 rounded-xl border border-dashed border-parchment bg-surface/60 px-6 py-12 text-center">
                  <CreditCard className="mx-auto h-8 w-8 text-stone/50" />
                  <p className="mt-3 font-heading text-xl text-charcoal">No cards saved</p>
                  <p className="mt-1 text-sm text-stone">Add a card for faster checkout next time.</p>
                </div>
              ) : null}
              <ul className="mt-6 space-y-3">
                {cards.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-parchment bg-gradient-to-r from-[#1e1a16] to-[#3d2f18] px-4 py-4 text-cream shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-14 items-center justify-center rounded-md bg-white/10 text-xs font-bold uppercase tracking-wider text-gold">
                        {c.brand || 'Card'}
                      </div>
                      <div>
                        <p className="font-semibold tracking-wide">•••• •••• •••• {c.last4}</p>
                        <p className="text-xs text-cream/70">
                          Expires {c.expMonth}/{c.expYear}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      className="border-cream/30 text-cream hover:bg-white/10"
                      onClick={async () => {
                        await fetch(apiUrl(`/api/account/payment-methods/${c.id}`), { method: 'DELETE', credentials: 'include' })
                        await loadAccount()
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              {!setupSecret ? (
                <Button className="mt-4" type="button" variant="outline" onClick={() => void startSaveCard()}>
                  Add a card
                </Button>
              ) : stripePromise ? (
                <div className="mt-4 rounded-xl border border-parchment bg-surface/40 p-4">
                  <Elements stripe={stripePromise} options={{ clientSecret: setupSecret }}>
                    <SaveCardForm
                      onSaved={async () => {
                        setSetupSecret('')
                        await loadAccount()
                      }}
                    />
                  </Elements>
                </div>
              ) : null}
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            </section>
          ) : null}

          {tab === 'profile' && user ? <AccountProfilePanel user={user} /> : null}
        </div>
      </main>

      {selectedOrderId != null ? (
        <OrderDetailsPanel
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onRefundDone={() => void loadAccount()}
        />
      ) : null}
    </>
  )
}
