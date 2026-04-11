import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BookPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [details, setDetails] = useState('')
  const [submitState, setSubmitState] = useState<{ loading: boolean; message: string; error: string }>({
    loading: false,
    message: '',
    error: '',
  })

  return (
    <>
      <Helmet>
        <title>Book Now | Omaru Farm</title>
        <meta name="description" content="Book a cafe table or submit an accommodation request at Omaru Farm." />
      </Helmet>

      <main className="mx-auto max-w-[92vw] px-5 py-12">
        <h1 className="font-heading text-4xl text-gold md:text-5xl">Book Now</h1>
        <p className="mt-3 max-w-3xl text-stone">
          Submit your preferred date and details. We’ll follow up to confirm your booking request.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSubmitState({ loading: true, message: '', error: '' })
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/bookings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fullName,
                        email,
                        bookingDate,
                        message: details,
                        source: 'book-page',
                      }),
                    })
                    if (!res.ok) {
                      const payload = await res.json().catch(() => null)
                      throw new Error(payload?.message ?? 'Could not submit booking request')
                    }
                    setSubmitState({ loading: false, message: 'Booking request submitted. We will contact you soon.', error: '' })
                    setFullName('')
                    setEmail('')
                    setBookingDate('')
                    setDetails('')
                  } catch (err) {
                    setSubmitState({
                      loading: false,
                      message: '',
                      error: err instanceof Error ? err.message : 'Could not submit booking request',
                    })
                  }
                }}
              >
                <input className="field" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <input className="field" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input className="field" type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required />
                <textarea className="field min-h-24" placeholder="Cafe table / accommodation request details" value={details} onChange={(e) => setDetails(e.target.value)} />
                <Button type="submit" className="w-full" disabled={submitState.loading}>
                  {submitState.loading ? 'Submitting...' : 'Submit Request'}
                </Button>
                {submitState.message ? <p className="text-sm text-emerald-300">{submitState.message}</p> : null}
                {submitState.error ? <p className="text-sm text-red-300">{submitState.error}</p> : null}
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Direct Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-bark">
              <p>Prefer messaging? Use WhatsApp for instant chat.</p>
              <Button variant="outline" asChild className="w-full">
                <a href="https://wa.me/61000000000" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
              </Button>
              <p className="text-sm text-stone">Website: https://omarufarms.com.au</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

