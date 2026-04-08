import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { AtSign, Clock3, Heart, Mail, MapPin, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { staticUrl } from '@/utils/staticUrl'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [inquiry, setInquiry] = useState('')
  const [contactDetails, setContactDetails] = useState({
    farmName: 'Omaru Farm',
    addressLine1: '482 Heritage Road',
    addressLine2: 'Willow Valley, NSW 2577',
    email: 'hello@omarufarm.com.au',
    whatsapp: 'https://wa.me/61000000000',
    instagram: 'https://instagram.com',
    mapQuery: '482 Heritage Road, Willow Valley NSW 2577, Australia',
    hoursCafe: 'Thu-Sun · 9:00 - 16:00',
    hoursStore: 'Daily · 10:00 - 17:00',
    hoursTours: 'By appointment',
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/content/contact`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        setContactDetails((prev) => ({
          farmName: String(value.farmName ?? prev.farmName),
          addressLine1: String(value.addressLine1 ?? prev.addressLine1),
          addressLine2: String(value.addressLine2 ?? prev.addressLine2),
          email: String(value.email ?? prev.email),
          whatsapp: String(value.whatsapp ?? prev.whatsapp),
          instagram: String(value.instagram ?? prev.instagram),
          mapQuery: String(value.mapQuery ?? prev.mapQuery),
          hoursCafe: String(value.hoursCafe ?? prev.hoursCafe),
          hoursStore: String(value.hoursStore ?? prev.hoursStore),
          hoursTours: String(value.hoursTours ?? prev.hoursTours),
        }))
      })
      .catch(() => {
        // keep local fallback
      })
    return () => controller.abort()
  }, [])

  const mapSearchUrl = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactDetails.mapQuery)}`,
    [contactDetails.mapQuery],
  )

  /** Embedded preview (no API key). Opens full Google Maps in a new tab from the button below. */
  const mapEmbedUrl = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(contactDetails.mapQuery)}&z=13&hl=en&output=embed`,
    [contactDetails.mapQuery],
  )

  return (
    <>
      <Helmet>
        <title>Contact | Omaru Farm</title>
        <meta name="description" content="Reach out to Omaru Farm — visits, cafe, store, and stays." />
      </Helmet>

      <main>
        {/* Hero */}
        <section className="border-b border-gold/20 bg-[#0b0b0b]">
          <div className="mx-auto grid max-w-[92vw] gap-10 px-5 py-14 md:grid-cols-2 md:items-center md:gap-14 md:py-20 lg:min-h-[62vh] lg:py-24">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs uppercase tracking-[0.32em] text-gold/75">Reach out</p>
              <h1 className="mt-4 font-heading text-5xl leading-[0.95] text-[#f5efe2] md:text-6xl lg:text-7xl">Connect with us</h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/72 md:text-lg">
                Whether you are planning a visit, reserving a table, or curious about our harvest and pantry, we would love to hear from you.
                Omaru is rooted in slow craft, open gates, and warm hospitality.
              </p>
              <div className="mt-8 h-px max-w-xs bg-gradient-to-r from-gold/60 to-transparent" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.06 }}
              className="relative"
            >
              <div className="overflow-hidden rounded-2xl border border-gold/20 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
                <img
                  src={staticUrl('/images/farm/IMG_0623.jpg')}
                  alt="Breakfast and hospitality at Omaru Farm"
                  className="aspect-[4/3] w-full object-cover object-center md:aspect-[5/4] lg:min-h-[320px]"
                  loading="eager"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
              </div>
              <div className="pointer-events-none absolute -bottom-4 -right-4 hidden h-24 w-24 rounded-full border border-gold/15 md:block" />
            </motion.div>
          </div>
        </section>

        {/* Form + details */}
        <section className="border-b border-gold/20 bg-[#121212] py-16 md:py-22">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
              <div>
                <h2 className="font-heading text-3xl text-[#f5efe2] md:text-4xl">Send a message</h2>
                <p className="mt-3 text-sm text-white/65 md:text-base">
                  Cafe bookings, store orders, stay requests, or a simple hello — we read every note.
                </p>

                <form
                  className="mt-10 space-y-8"
                  onSubmit={(e) => {
                    e.preventDefault()
                  }}
                >
                  <div>
                    <label htmlFor="contact-name" className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                      Full name
                    </label>
                    <input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      className="mt-2 w-full border-0 border-b border-gold/25 bg-transparent py-3 text-[#f5efe2] outline-none transition placeholder:text-white/35 focus:border-gold/70"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                      Email address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="mt-2 w-full border-0 border-b border-gold/25 bg-transparent py-3 text-[#f5efe2] outline-none transition placeholder:text-white/35 focus:border-gold/70"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-inquiry" className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                      Your inquiry
                    </label>
                    <textarea
                      id="contact-inquiry"
                      value={inquiry}
                      onChange={(e) => setInquiry(e.target.value)}
                      rows={4}
                      className="mt-2 w-full resize-none border-0 border-b border-gold/25 bg-transparent py-3 text-[#f5efe2] outline-none transition placeholder:text-white/35 focus:border-gold/70"
                      placeholder="Tell us how we can help…"
                    />
                  </div>
                  <Button type="submit" className="rounded-none px-8 py-6 text-xs uppercase tracking-[0.2em]">
                    Submit inquiry
                  </Button>
                </form>
              </div>

              <div className="space-y-10 lg:pt-2">
                <div>
                  <h3 className="text-xs uppercase tracking-[0.28em] text-gold/70">Visit the farm</h3>
                  <address className="mt-4 not-italic font-body text-lg leading-relaxed text-[#f5efe2] md:text-xl">
                    {contactDetails.farmName}
                    <br />
                    {contactDetails.addressLine1}
                    <br />
                    {contactDetails.addressLine2}
                  </address>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-gold/70">
                    <Clock3 className="h-4 w-4 text-gold/80" aria-hidden="true" />
                    Opening hours
                  </h3>
                  <ul className="mt-5 space-y-4 text-sm text-white/75">
                    <li className="flex justify-between gap-4 border-b border-gold/10 pb-3">
                      <span className="text-white/90">Café &amp; bakery</span>
                      <span className="shrink-0 text-white/60">{contactDetails.hoursCafe}</span>
                    </li>
                    <li className="flex justify-between gap-4 border-b border-gold/10 pb-3">
                      <span className="text-white/90">Farm store</span>
                      <span className="shrink-0 text-white/60">{contactDetails.hoursStore}</span>
                    </li>
                    <li className="flex justify-between gap-4 pb-1">
                      <span className="text-white/90">Garden tours</span>
                      <span className="shrink-0 text-white/60">{contactDetails.hoursTours}</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={mapSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 bg-white/[0.04] text-gold transition hover:border-gold/50 hover:bg-white/[0.07]"
                    aria-label="Location"
                  >
                    <MapPin className="h-4 w-4" />
                  </a>
                  <a
                    href={contactDetails.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 bg-white/[0.04] text-gold transition hover:border-gold/50 hover:bg-white/[0.07]"
                    aria-label="Instagram"
                  >
                    <AtSign className="h-4 w-4" />
                  </a>
                  <a
                    href={`mailto:${contactDetails.email}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 bg-white/[0.04] text-gold transition hover:border-gold/50 hover:bg-white/[0.07]"
                    aria-label="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                  <span
                    className="inline-flex h-11 w-11 cursor-default items-center justify-center rounded-full border border-gold/15 bg-white/[0.02] text-gold/50"
                    title="Save for later"
                  >
                    <Heart className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span
                    className="inline-flex h-11 w-11 cursor-default items-center justify-center rounded-full border border-gold/15 bg-white/[0.02] text-gold/50"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-[0.28em] text-gold/80">Find us</h3>
                  <div className="overflow-hidden rounded-2xl border-2 border-gold/40 bg-[#1a1814] shadow-[0_0_0_1px_rgba(205,163,73,0.12),0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-gold/25">
                    <div className="relative aspect-[16/10] min-h-[240px] w-full md:min-h-[320px] lg:min-h-[380px]">
                      <iframe
                        title="Omaru Farm — map preview"
                        src={mapEmbedUrl}
                        className="absolute inset-0 h-full w-full border-0 grayscale-[0.15] contrast-[1.05] [filter:brightness(1.08)]"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    </div>
                  </div>
                  <p className="text-xs text-white/55">
                    Interactive preview — use the button below for directions in Google Maps.
                  </p>
                  <Button asChild className="w-full text-xs uppercase tracking-[0.18em] sm:w-auto">
                    <a href={mapSearchUrl} target="_blank" rel="noreferrer">
                      Open in Google Maps
                    </a>
                  </Button>
                </div>

                <div className="rounded-xl border border-gold/15 bg-black/25 p-5">
                  <p className="text-sm text-white/70">Prefer a quick reply?</p>
                  <Button variant="outline" asChild className="mt-3 w-full sm:w-auto">
                    <a href={contactDetails.whatsapp} target="_blank" rel="noreferrer">
                      Chat on WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
