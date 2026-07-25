import { useEffect, useState, type FormEvent } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/button'
import { useCustomerAuth } from '@/context/CustomerAuthContext'
import { apiUrl } from '@/utils/api'

type OrderRow = { id: number; orderNumber: string; total: number; status: string; fulfillmentStatus: string; createdAt: string }
type StayRow = { id: number; bookingNumber: string; propertyName: string; checkIn: string; checkOut: string; total: number; status: string }
type CardRow = { id: number; brand: string; last4: string; expMonth: number; expYear: number }

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

export function AccountPage() {
  const { user, loading, login, register, logout } = useCustomerAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [stays, setStays] = useState<StayRow[]>([])
  const [cards, setCards] = useState<CardRow[]>([])
  const [setupSecret, setSetupSecret] = useState('')
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const paid = new URLSearchParams(window.location.search).get('paid')

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
    if (user) void loadAccount()
  }, [user])

  useEffect(() => {
    fetch(apiUrl('/api/commerce/config'))
      .then((r) => r.json())
      .then((cfg: { publishableKey?: string }) => {
        if (cfg.publishableKey) setStripePromise(loadStripe(cfg.publishableKey))
      })
      .catch(() => undefined)
  }, [])

  const onAuth = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register({ email, password, fullName })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
    }
  }

  const startSaveCard = async () => {
    const res = await fetch(apiUrl('/api/account/setup-intent'), { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.message ?? 'Could not start card save')
      return
    }
    setSetupSecret(data.clientSecret)
  }

  if (loading) {
    return <main className="flex min-h-[50vh] items-center justify-center text-stone">Loading…</main>
  }

  if (!user) {
    return (
      <>
        <Seo title="Account | Omaru Farm" description="Sign in to your Omaru Farm account." path="/account" />
        <main className="mx-auto max-w-md px-5 py-16">
          <h1 className="font-heading text-4xl text-charcoal">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
          <form onSubmit={onAuth} className="mt-6 space-y-3">
            {mode === 'register' ? (
              <input className="field" placeholder="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            ) : null}
            <input className="field" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" type="password" placeholder="Password (8+ chars)" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full">{mode === 'login' ? 'Sign in' : 'Register'}</Button>
          </form>
          <button type="button" className="mt-4 text-sm text-gold" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
          </button>
        </main>
      </>
    )
  }

  return (
    <>
      <Seo title="My account | Omaru Farm" description="Orders, stays, and saved cards." path="/account" />
      <main className="mx-auto max-w-4xl space-y-10 px-5 py-12 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-4xl text-charcoal">Hello, {user.fullName}</h1>
            <p className="text-sm text-stone">{user.email}</p>
            {paid ? <p className="mt-2 text-sm text-emerald-700">Payment received — thank you.</p> : null}
          </div>
          <Button variant="outline" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>

        <section>
          <h2 className="font-heading text-2xl text-charcoal">Store orders</h2>
          {orders.length === 0 ? (
            <p className="mt-2 text-sm text-stone">No orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="rounded-lg border border-parchment bg-white px-4 py-3 text-sm">
                  <span className="font-semibold">{o.orderNumber}</span> — ${Number(o.total).toFixed(2)} — {o.status} / {o.fulfillmentStatus}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-heading text-2xl text-charcoal">Stay bookings</h2>
          {stays.length === 0 ? (
            <p className="mt-2 text-sm text-stone">No stay bookings yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stays.map((s) => (
                <li key={s.id} className="rounded-lg border border-parchment bg-white px-4 py-3 text-sm">
                  <span className="font-semibold">{s.bookingNumber}</span> — {s.propertyName} ({String(s.checkIn).slice(0, 10)} → {String(s.checkOut).slice(0, 10)}) — ${Number(s.total).toFixed(2)} — {s.status}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-heading text-2xl text-charcoal">Saved cards</h2>
          <ul className="mt-3 space-y-2">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-parchment bg-white px-4 py-3 text-sm">
                <span>
                  {c.brand} •••• {c.last4} ({c.expMonth}/{c.expYear})
                </span>
                <Button
                  variant="outline"
                  type="button"
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
            <Button className="mt-3" type="button" variant="outline" onClick={() => void startSaveCard()}>
              Add a card
            </Button>
          ) : stripePromise ? (
            <div className="mt-4 rounded-lg border border-parchment bg-white p-4">
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
      </main>
    </>
  )
}
