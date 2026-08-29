import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/CartContext'
import { useCustomerAuth } from '@/context/CustomerAuthContext'
import { apiUrl } from '@/utils/api'

type Quote = {
  subtotal: number
  total: number
  shipping: {
    fee: number
    ruleName: string
    method: string
    provider?: string
    serviceCode?: string
    breakdown?: {
      baseFee?: number
      perKgFee?: number
      weightFee?: number
      weightKg?: number
      volumetricKg?: number
      chargeableKg?: number
      freeShippingApplied?: boolean
      freeOver?: number | null
      packageLengthCm?: number
      packageWidthCm?: number
      packageHeightCm?: number
      provisionalData?: boolean
    }
  }
}

type SavedCard = {
  id: number
  stripePaymentMethodId: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

async function confirmOrderPaid(orderId: number, paymentIntentId: string) {
  const res = await fetch(apiUrl('/api/checkout/confirm-payment-intent'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, paymentIntentId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message ?? 'Could not confirm payment status')
}

function NewCardPayForm({
  orderTotal,
  orderId,
  orderNumber,
  onPaid,
}: {
  orderTotal: number
  orderId: number
  orderNumber: string
  onPaid: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setError('')
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/account?paid=1&order=${encodeURIComponent(orderNumber)}` },
    })
    if (result.error) {
      setBusy(false)
      setError(result.error.message ?? 'Payment failed')
      return
    }
    try {
      const piId = typeof result.paymentIntent?.id === 'string' ? result.paymentIntent.id : ''
      if (piId) await confirmOrderPaid(orderId, piId)
      onPaid()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm payment status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={!stripe || busy} className="w-full">
        {busy ? 'Processing…' : `Pay $${orderTotal.toFixed(2)} AUD`}
      </Button>
      <p className="text-center text-xs text-stone">
        Secured by Stripe. Your bank may ask for a one-time code (3D Secure) when required.
      </p>
    </form>
  )
}

function SavedCardPayForm({
  stripePromise,
  clientSecret,
  paymentMethodId,
  cardLabel,
  orderTotal,
  orderId,
  onPaid,
}: {
  stripePromise: Promise<Stripe | null>
  clientSecret: string
  paymentMethodId: string
  cardLabel: string
  orderTotal: number
  orderId: number
  onPaid: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe is not ready')
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId,
      })
      if (result.error) throw new Error(result.error.message ?? 'Payment failed')
      const piId = result.paymentIntent?.id
      if (piId) await confirmOrderPaid(orderId, piId)
      onPaid()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-charcoal">
        Paying with <span className="font-semibold capitalize">{cardLabel}</span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Processing…' : `Pay $${orderTotal.toFixed(2)} AUD`}
      </Button>
      <p className="text-center text-xs text-stone">
        Secured by Stripe. Your bank may ask for a one-time code (3D Secure) when required.
      </p>
    </form>
  )
}

export function CheckoutPage() {
  const { lines, clear } = useCart()
  const { user } = useCustomerAuth()
  const navigate = useNavigate()
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [checkoutEnabled, setCheckoutEnabled] = useState(true)
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState(0)
  const [orderNumber, setOrderNumber] = useState('')
  const [orderTotal, setOrderTotal] = useState(0)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [payWith, setPayWith] = useState<'new' | number>('new')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'VIC',
    postcode: '',
    shippingMethod: 'delivery' as 'delivery' | 'pickup',
  })

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        fullName: user.fullName || f.fullName,
        email: user.email || f.email,
        phone: user.phone || f.phone,
        line1: user.deliveryLine1 || f.line1,
        line2: user.deliveryLine2 || f.line2,
        city: user.deliveryCity || f.city,
        state: user.deliveryState || f.state,
        postcode: user.deliveryPostcode || f.postcode,
      }))
      fetch(apiUrl('/api/account/payment-methods'), { credentials: 'include' })
        .then((r) => r.json())
        .then((rows) => {
          const list = Array.isArray(rows) ? (rows as SavedCard[]) : []
          setSavedCards(list)
          if (list[0]?.id) setPayWith(list[0].id)
        })
        .catch(() => setSavedCards([]))
    } else {
      setSavedCards([])
      setPayWith('new')
    }
  }, [user])

  useEffect(() => {
    fetch(apiUrl('/api/commerce/config'))
      .then((r) => r.json())
      .then((cfg: { publishableKey?: string; checkoutEnabled?: boolean }) => {
        setCheckoutEnabled(cfg.checkoutEnabled !== false)
        if (cfg.publishableKey) setStripePromise(loadStripe(cfg.publishableKey))
      })
      .catch(() => undefined)
  }, [])

  const itemsPayload = useMemo(
    () => lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    [lines],
  )

  useEffect(() => {
    if (lines.length === 0) return
    if (form.shippingMethod === 'delivery' && !/^\d{4}$/.test(form.postcode.replace(/\s/g, ''))) {
      setQuote(null)
      setQuoteError('')
      return
    }
    const controller = new AbortController()
    fetch(apiUrl('/api/cart/quote'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        items: itemsPayload,
        postcode: form.postcode,
        shippingMethod: form.shippingMethod,
      }),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.message ?? 'Quote failed')
        setQuoteError('')
        setQuote(data)
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setQuote(null)
        setQuoteError(e instanceof Error ? e.message : 'Quote failed')
      })
    return () => controller.abort()
  }, [itemsPayload, form.postcode, form.shippingMethod, lines.length])

  const startPayment = async (e: FormEvent) => {
    e.preventDefault()
    if (lines.length === 0) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/checkout/create-payment-intent'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          ...form,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Checkout failed')
      setClientSecret(data.clientSecret)
      setOrderTotal(Number(data.total))
      setOrderId(Number(data.orderId ?? 0))
      setOrderNumber(String(data.orderNumber ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  const selectedCard = savedCards.find((c) => c.id === payWith)
  const onPaid = () => {
    clear()
    navigate(`/account?paid=1${orderNumber ? `&order=${encodeURIComponent(orderNumber)}` : ''}`)
  }

  if (lines.length === 0 && !clientSecret) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-stone">Nothing to check out.</p>
        <Link to="/store" className="mt-4 inline-block text-gold">
          Back to store
        </Link>
      </main>
    )
  }

  return (
    <>
      <Seo title="Checkout | Omaru Farm" description="Secure checkout for Omaru Farm store orders." path="/checkout" />
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-12 md:grid-cols-2 md:py-16">
        <div>
          <h1 className="font-heading text-4xl text-charcoal">Checkout</h1>
          {!checkoutEnabled ? (
            <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Online checkout is temporarily unavailable. Please try again later or contact Omaru Farm.
            </p>
          ) : null}
          {!clientSecret && checkoutEnabled ? (
            <form onSubmit={startPayment} className="mt-6 space-y-3">
              <input className="field" placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input
                className="field"
                type="tel"
                placeholder={form.shippingMethod === 'delivery' ? 'Phone (required for delivery)' : 'Phone'}
                required={form.shippingMethod === 'delivery'}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={form.shippingMethod === 'delivery'} onChange={() => setForm({ ...form, shippingMethod: 'delivery' })} />
                  Delivery
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={form.shippingMethod === 'pickup'} onChange={() => setForm({ ...form, shippingMethod: 'pickup' })} />
                  Farm pickup
                </label>
              </div>
              {form.shippingMethod === 'delivery' ? (
                <>
                  <input className="field" placeholder="Address line 1" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
                  <input className="field" placeholder="Address line 2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <input className="field" placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <select className="field" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                      {['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'].map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <input
                      className="field"
                      placeholder="Postcode"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      required
                      value={form.postcode}
                      onChange={(e) => setForm({ ...form, postcode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    />
                    <p className="col-span-3 text-xs text-stone">
                      Shipping zone is chosen from your postcode. Live Australia Post Parcel Post rates are used when configured (from 3922).
                    </p>
                  </div>
                </>
              ) : null}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button
                type="submit"
                disabled={
                  busy ||
                  !stripePromise ||
                  (form.shippingMethod === 'delivery' && (!quote || Boolean(quoteError)))
                }
                className="w-full"
              >
                {busy ? 'Preparing payment…' : 'Continue to payment'}
              </Button>
              {!stripePromise ? (
                <p className="text-xs text-stone">Stripe publishable key not configured yet. Add STRIPE_PUBLISHABLE_KEY to continue.</p>
              ) : null}
            </form>
          ) : stripePromise ? (
            <div className="mt-6 space-y-4">
              {savedCards.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bark">Payment method</p>
                  <div className="space-y-2">
                    {savedCards.map((card) => (
                      <label
                        key={card.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                          payWith === card.id ? 'border-gold bg-gold/5' : 'border-parchment bg-white hover:border-gold/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payWith"
                          checked={payWith === card.id}
                          onChange={() => setPayWith(card.id)}
                        />
                        <span className="font-semibold capitalize text-charcoal">{card.brand}</span>
                        <span className="text-stone">•••• {card.last4}</span>
                        <span className="ml-auto text-xs text-stone">
                          {card.expMonth}/{card.expYear}
                        </span>
                      </label>
                    ))}
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                        payWith === 'new' ? 'border-gold bg-gold/5' : 'border-parchment bg-white hover:border-gold/40'
                      }`}
                    >
                      <input type="radio" name="payWith" checked={payWith === 'new'} onChange={() => setPayWith('new')} />
                      <span className="font-semibold text-charcoal">Use a new card</span>
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedCard ? (
                <SavedCardPayForm
                  stripePromise={stripePromise}
                  clientSecret={clientSecret}
                  paymentMethodId={selectedCard.stripePaymentMethodId}
                  cardLabel={`${selectedCard.brand} •••• ${selectedCard.last4}`}
                  orderTotal={orderTotal}
                  orderId={orderId}
                  onPaid={onPaid}
                />
              ) : (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <NewCardPayForm
                    orderTotal={orderTotal}
                    orderId={orderId}
                    orderNumber={orderNumber}
                    onPaid={onPaid}
                  />
                </Elements>
              )}
            </div>
          ) : null}
        </div>
        <aside className="h-fit rounded-lg border border-parchment bg-white p-6">
          <h2 className="font-heading text-2xl text-charcoal">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm text-stone">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span>
                  {l.name} × {l.quantity}
                </span>
                <span>${(l.price * l.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {quoteError && form.shippingMethod === 'delivery' && form.postcode ? (
            <p className="mt-4 text-sm text-red-600">{quoteError}</p>
          ) : null}
          {quote ? (
            <div className="mt-4 space-y-1 border-t border-parchment pt-4 text-sm">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span>${quote.subtotal.toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Shipping ({quote.shipping.ruleName})</span>
                <span>${quote.shipping.fee.toFixed(2)}</span>
              </p>
              {quote.shipping.method === 'delivery' && quote.shipping.breakdown ? (
                <>
                  <p className="text-xs text-stone">
                    {quote.shipping.breakdown.freeShippingApplied
                      ? `Free over $${Number(quote.shipping.breakdown.freeOver ?? 0).toFixed(0)}`
                      : [
                          `Actual ${Number(quote.shipping.breakdown.weightKg ?? 0).toFixed(2)} kg`,
                          Number(quote.shipping.breakdown.volumetricKg ?? 0) > 0
                            ? `volumetric ${Number(quote.shipping.breakdown.volumetricKg).toFixed(2)} kg`
                            : null,
                          `chargeable ${Number(quote.shipping.breakdown.chargeableKg ?? 0).toFixed(2)} kg`,
                          quote.shipping.provider === 'auspost'
                            ? `AusPost live rate · package ${Number(quote.shipping.breakdown.packageLengthCm ?? 0)}×${Number(quote.shipping.breakdown.packageWidthCm ?? 0)}×${Number(quote.shipping.breakdown.packageHeightCm ?? 0)} cm`
                            : `base $${Number(quote.shipping.breakdown.baseFee ?? 0).toFixed(2)} + $${Number(quote.shipping.breakdown.perKgFee ?? 0).toFixed(2)}/kg`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                  </p>
                  {quote.shipping.breakdown.provisionalData ? (
                    <p className="text-xs font-semibold text-amber-700">
                      Testing estimate — product pack measurements are provisional.
                    </p>
                  ) : null}
                </>
              ) : null}
              <p className="flex justify-between font-semibold text-charcoal">
                <span>Total</span>
                <span>${quote.total.toFixed(2)}</span>
              </p>
            </div>
          ) : null}
        </aside>
      </main>
    </>
  )
}
