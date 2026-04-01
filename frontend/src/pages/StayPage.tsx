import { Helmet } from 'react-helmet-async'
import { BedDouble } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function StayPage() {
  return (
    <>
      <Helmet>
        <title>Stay | Omaru Farm</title>
        <meta name="description" content="Explore Omaru Farm accommodation options and booking requests." />
      </Helmet>

      <main className="mx-auto max-w-[92vw] px-5 py-12">
        <h1 className="font-heading text-4xl text-gold md:text-5xl">Stay</h1>
        <p className="mt-3 max-w-3xl text-white/75">
          Peaceful accommodation surrounded by nature. This page is ready for room listings, amenities, and availability.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { title: 'Rooms', text: 'Comfortable rooms with farm views and premium touches.' },
            { title: 'Suites', text: 'More space, elevated comfort, and a refined countryside feel.' },
            { title: 'Booking Requests', text: 'Submit your dates and preferences, and we’ll confirm availability.' },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <div className="flex items-center gap-2 text-gold">
                  <BedDouble className="h-5 w-5" />
                  <CardTitle>{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-white/75">{item.text}</CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  )
}

