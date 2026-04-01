import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact | Omaru Farm</title>
        <meta name="description" content="Contact Omaru Farm for inquiries, bookings, and visits." />
      </Helmet>

      <main className="mx-auto max-w-[92vw] px-5 py-12">
        <h1 className="font-heading text-4xl text-gold md:text-5xl">Contact</h1>
        <p className="mt-3 max-w-3xl text-white/75">
          Send an inquiry for cafe bookings, accommodation requests, or farm store questions.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Inquiry Form</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3">
                <input className="field" placeholder="Your name" />
                <input className="field" placeholder="Email" type="email" />
                <input className="field" type="date" />
                <textarea className="field min-h-24" placeholder="Tell us your request" />
                <Button type="button" className="w-full">Send Inquiry</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/80">
              <p>For quick questions, use WhatsApp chat.</p>
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

