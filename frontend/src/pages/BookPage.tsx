import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BookPage() {
  return (
    <>
      <Helmet>
        <title>Book Now | Omaru Farm</title>
        <meta name="description" content="Book a cafe table or submit an accommodation request at Omaru Farm." />
      </Helmet>

      <main className="mx-auto max-w-[92vw] px-5 py-12">
        <h1 className="font-heading text-4xl text-gold md:text-5xl">Book Now</h1>
        <p className="mt-3 max-w-3xl text-white/75">
          Submit your preferred date and details. We’ll follow up to confirm your booking request.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3">
                <input className="field" placeholder="Full name" />
                <input className="field" placeholder="Email" type="email" />
                <input className="field" type="date" />
                <textarea className="field min-h-24" placeholder="Cafe table / accommodation request details" />
                <Button type="button" className="w-full">Submit Request</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Direct Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/80">
              <p>Prefer messaging? Use WhatsApp for instant chat.</p>
              <Button variant="outline" asChild className="w-full">
                <a href="https://wa.me/61000000000" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
              </Button>
              <p className="text-sm text-white/60">Website: https://omarufarms.com.au</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

