import { useEffect, useState, type FormEvent } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { apiUrl } from '@/utils/api'

type Property = {
  id: number
  name: string
  nightlyRate: number
  minNights: number
  maxGuests: number
  cleaningFee: number
}

function StayPayForm({
  total,
  bookingId,
  bookingNumber,
  onPaid,
}: {
  total: number
  bookingId: number
  bookingNumber: string
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
      confirmParams: {
        return_url: `${window.location.origin}/account?paid=1&stay=${encodeURIComponent(bookingNumber)}`,
      },
    })
    if (result.error) {
      setBusy(false)
      setError(result.error.message ?? 'Payment failed')
      return
    }
    try {
      const piId = typeof result.paymentIntent?.id === 'string' ? result.paymentIntent.id : ''
      if (piId) {
        const res = await fetch(apiUrl('/api/stays/confirm-payment-intent'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, paymentIntentId: piId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message ?? 'Could not confirm payment status')
      }
      onPaid()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not confirm payment status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={busy || !stripe} className="w-full">
        {busy ? 'Processing…' : `Pay $${total.toFixed(2)} AUD`}
      </Button>
    </form>
  )
}

export function StayBookingPanel() {
  const [properties, setProperties] = useState<Property[]>([])
  const [propertyId, setPropertyId] = useState<number | ''>('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [quote, setQuote] = useState<{ total: number; nights: number; nightlyRate: number; cleaningFee: number } | null>(null)
  const [clientSecret, setClientSecret] = useState('')
  const [bookingId, setBookingId] = useState(0)
  const [bookingNumber, setBookingNumber] = useState('')
  const [payTotal, setPayTotal] = useState(0)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [checkoutEnabled, setCheckoutEnabled] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [blocks, setBlocks] = useState<{ startDate: string; endDate: string; source: string }[]>([])

  useEffect(() => {
    fetch(apiUrl('/api/properties'))
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          setProperties(rows)
          if (rows[0]) setPropertyId(rows[0].id)
        }
      })
      .catch(() => undefined)
    fetch(apiUrl('/api/commerce/config'))
      .then((r) => r.json())
      .then((cfg: { publishableKey?: string; checkoutEnabled?: boolean }) => {
        setCheckoutEnabled(cfg.checkoutEnabled !== false)
        if (cfg.publishableKey) setStripePromise(loadStripe(cfg.publishableKey))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!propertyId) return
    fetch(apiUrl(`/api/properties/${propertyId}/availability`))
      .then((r) => r.json())
      .then((data) => setBlocks(Array.isArray(data.blocks) ? data.blocks : []))
      .catch(() => setBlocks([]))
  }, [propertyId])

  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut) {
      setQuote(null)
      return
    }
    fetch(apiUrl('/api/stays/quote'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, checkIn, checkOut, guests: Number(guests) }),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.message ?? 'Unavailable')
        setQuote(data)
        setError('')
      })
      .catch((e) => {
        setQuote(null)
        setError(e instanceof Error ? e.message : 'Quote failed')
      })
  }, [propertyId, checkIn, checkOut, guests])

  const checkout = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const res = await fetch(apiUrl('/api/stays/checkout'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, checkIn, checkOut, guests: Number(guests), fullName, email, phone }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.message ?? 'Checkout failed')
      return
    }
    setClientSecret(data.clientSecret)
    setPayTotal(Number(data.total))
    setBookingId(Number(data.bookingId ?? 0))
    setBookingNumber(String(data.bookingNumber ?? ''))
  }

  return (
    <section className="border-t border-parchment bg-surface px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold/75">Book direct</p>
        <h2 className="mt-3 font-heading text-4xl text-charcoal">Reserve an on-farm stay</h2>
        <p className="mt-3 text-sm text-stone">
          Live availability respects Airbnb / Booking.com calendars and manual block-outs. Secure payment via Stripe.
        </p>
        {!checkoutEnabled ? (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Online stay checkout is temporarily unavailable. Please contact Omaru Farm to book.
          </p>
        ) : null}

        {!clientSecret && checkoutEnabled ? (
          <form onSubmit={checkout} className="mt-8 grid gap-3 sm:grid-cols-2">
            <select
              className="field sm:col-span-2"
              value={propertyId}
              onChange={(e) => setPropertyId(Number(e.target.value))}
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — from ${Number(p.nightlyRate).toFixed(0)}/night
                </option>
              ))}
            </select>
            <input className="field" type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            <input className="field" type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            <input className="field" type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} />
            <input className="field" placeholder="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input className="field" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {quote ? (
              <p className="sm:col-span-2 text-sm text-charcoal">
                {quote.nights} nights × ${quote.nightlyRate.toFixed(2)} + ${quote.cleaningFee.toFixed(2)} cleaning ={' '}
                <strong>${quote.total.toFixed(2)}</strong>
              </p>
            ) : null}
            {blocks.length > 0 ? (
              <p className="sm:col-span-2 text-xs text-stone">
                Blocked windows loaded: {blocks.slice(0, 4).map((b) => `${String(b.startDate).slice(0, 10)}→${String(b.endDate).slice(0, 10)} (${b.source})`).join('; ')}
                {blocks.length > 4 ? '…' : ''}
              </p>
            ) : null}
            {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="sm:col-span-2" disabled={!quote || !stripePromise}>
              Continue to payment
            </Button>
            {!stripePromise ? (
              <p className="sm:col-span-2 text-xs text-stone">Stripe key missing — set STRIPE_PUBLISHABLE_KEY to enable payment.</p>
            ) : null}
          </form>
        ) : stripePromise ? (
          <div className="mt-8 rounded-lg border border-parchment bg-white p-5">
            {message ? <p className="mb-3 text-emerald-700">{message}</p> : null}
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StayPayForm
                total={payTotal}
                onPaid={() => {
                  setMessage('Stay booked — confirmation will appear in your account.')
                  setClientSecret('')
                }}
                bookingId={bookingId}
                bookingNumber={bookingNumber}
              />
            </Elements>
          </div>
        ) : null}
      </div>
    </section>
  )
}
