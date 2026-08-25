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
    }
  }
}

function PayForm({ orderTotal, onPaid }: { orderTotal: number; onPaid: () => void }) {
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
      confirmParams: { return_url: `${window.location.origin}/account?paid=1` },
    })
    setBusy(false)
    if (result.error) {
      setError(result.error.message ?? 'Payment failed')
      return
    }
    onPaid()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={!stripe || busy} className="w-full">
        {busy ? 'Processing…' : `Pay $${orderTotal.toFixed(2)} AUD`}
      </Button>
    </form>
  )
}

export function CheckoutPage() {
  const { lines, clear } = useCart()
  const { user } = useCustomerAuth()
  const navigate = useNavigate()
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [clientSecret, setClientSecret] = useState('')
  const [orderTotal, setOrderTotal] = useState(0)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
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
    }
  }, [user])

  useEffect(() => {
    fetch(apiUrl('/api/commerce/config'))
      .then((r) => r.json())
      .then((cfg: { publishableKey?: string }) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
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
          {!clientSecret ? (
            <form onSubmit={startPayment} className="mt-6 space-y-3">
              <input className="field" placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
            <div className="mt-6">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PayForm
                  orderTotal={orderTotal}
                  onPaid={() => {
                    clear()
                    navigate('/account?paid=1')
                  }}
                />
              </Elements>
            </div>
          ) : null}
        </div>
        <aside className="rounded-lg border border-parchment bg-white p-6 h-fit">
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
