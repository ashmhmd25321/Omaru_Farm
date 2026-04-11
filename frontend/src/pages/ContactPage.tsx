import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { AtSign, Clock3, Mail, MapPin, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { staticUrl } from '@/utils/staticUrl'

const CONTACT = {
  addressLine1: '776 Ventnor Road',
  addressLine2: 'Ventnor, Phillip Island VIC 3922',
  email: 'hello@omarufarm.com.au',
  whatsapp: 'https://wa.me/61000000000',
  instagram: 'https://instagram.com/omarufarm',
  mapQuery: '776 Ventnor Road, Ventnor, Phillip Island VIC 3922, Australia',
}

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [inquiry, setInquiry] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mapSearchUrl = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapQuery)}`,
    [],
  )
  const mapEmbedUrl = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&z=14&hl=en&output=embed`,
    [],
  )

  return (
    <>
      <Helmet>
        <title>Contact | Omaru Farm · Phillip Island</title>
        <meta name="description" content="Find Omaru Farm at 776 Ventnor Road, Ventnor, Phillip Island VIC 3922. Café Thu–Sun, Farm Store daily. Book a table or plan your visit." />
      </Helmet>

      <main>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="bg-sand border-b border-parchment">
          <div className="mx-auto grid max-w-[92vw] gap-10 px-5 py-14 md:grid-cols-2 md:items-center md:py-20">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold">Get in Touch</p>
              <h1 className="mt-4 font-heading text-5xl leading-tight text-charcoal md:text-6xl">
                Visit Omaru Farm
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-stone">
                Whether you're planning a lunch, booking a dinner, reserving a cabin, or simply saying hello — we'd love to hear from you.
                Omaru is built on warm hospitality and open gates.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                  <div>
                    <p className="font-medium text-charcoal">776 Ventnor Road</p>
                    <p className="text-sm text-stone">Ventnor, Phillip Island VIC 3922</p>
                    <p className="mt-1 text-xs text-stone">5 min from Penguin Parade · 10 min to Cowes</p>
                  </div>
                </div>
                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 text-bark transition hover:text-gold">
                  <Mail className="h-5 w-5 text-gold" />
                  <span className="text-sm">{CONTACT.email}</span>
                </a>
                <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-bark transition hover:text-gold">
                  <MessageCircle className="h-5 w-5 text-gold" />
                  <span className="text-sm">Chat on WhatsApp</span>
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.06 }}>
              <div className="overflow-hidden rounded-2xl border border-parchment shadow-sm">
                <img
                  src={staticUrl('/images/farm/IMG_0623.jpg')}
                  alt="Welcoming atmosphere at Omaru Farm, Phillip Island"
                  className="aspect-[4/3] w-full object-cover object-center"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── HOURS + FORM ─────────────────────────────────────── */}
        <section className="bg-cream py-16 md:py-22">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">

              {/* Contact form */}
              <div>
                <h2 className="font-heading text-3xl text-charcoal md:text-4xl">Send a Message</h2>
                <p className="mt-3 text-sm text-stone">
                  Café bookings, accommodation enquiries, farm store questions, or a simple hello — we read every note.
                </p>

                {submitted ? (
                  <div className="mt-10 rounded-2xl border border-sage/30 bg-fern/30 p-8 text-center">
                    <p className="font-heading text-2xl text-charcoal">Thank you!</p>
                    <p className="mt-2 text-sm text-stone">We'll be in touch shortly. See you at the farm.</p>
                  </div>
                ) : (
                  <form
                    className="mt-8 space-y-6"
                    onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
                  >
                    <div>
                      <label htmlFor="contact-name" className="text-xs font-medium uppercase tracking-[0.22em] text-stone">
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        className="field mt-2"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="text-xs font-medium uppercase tracking-[0.22em] text-stone">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="field mt-2"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-inquiry" className="text-xs font-medium uppercase tracking-[0.22em] text-stone">
                        Your Enquiry
                      </label>
                      <textarea
                        id="contact-inquiry"
                        value={inquiry}
                        onChange={(e) => setInquiry(e.target.value)}
                        rows={5}
                        className="field mt-2 resize-none"
                        placeholder="Tell us how we can help — café booking, accommodation, farm store, or a general enquiry…"
                        required
                      />
                    </div>
                    <Button type="submit" className="bg-gold text-white hover:bg-gold-deep">
                      Send Message
                    </Button>
                  </form>
                )}
              </div>

              {/* Hours + map */}
              <div className="space-y-10">

                {/* Hours */}
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-bark">
                    <Clock3 className="h-4 w-4 text-gold" />
                    Opening Hours
                  </h3>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-parchment">
                    {[
                      { label: 'Café — Thursday & Friday', value: '10:00am – 2:00pm · 5:00pm – 8:00pm' },
                      { label: 'Café — Saturday & Sunday', value: '10:00am – 8:00pm (all day)' },
                      { label: 'Farm Store', value: 'Monday – Sunday, 9:00am – 5:00pm' },
                    ].map((row, i) => (
                      <div key={row.label} className={['flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm', i < 2 ? 'border-b border-parchment' : ''].join(' ')}>
                        <span className="font-medium text-charcoal">{row.label}</span>
                        <span className="text-stone">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-bark">Find Us</h3>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-parchment shadow-sm">
                    <div className="relative aspect-[16/10] min-h-[240px] w-full md:min-h-[300px]">
                      <iframe
                        title="Omaru Farm — location map"
                        src={mapEmbedUrl}
                        className="absolute inset-0 h-full w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-parchment bg-sand px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-charcoal">776 Ventnor Road</p>
                        <p className="text-xs text-stone">Ventnor, Phillip Island VIC 3922</p>
                      </div>
                      <Button asChild variant="outline" className="shrink-0 border-parchment text-bark hover:bg-white">
                        <a href={mapSearchUrl} target="_blank" rel="noreferrer">
                          Get Directions
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-bark">Connect</h3>
                  <div className="mt-4 flex gap-3">
                    {[
                      { href: mapSearchUrl, icon: <MapPin className="h-4 w-4" />, label: 'Directions' },
                      { href: `mailto:${CONTACT.email}`, icon: <Mail className="h-4 w-4" />, label: 'Email' },
                      { href: CONTACT.whatsapp, icon: <MessageCircle className="h-4 w-4" />, label: 'WhatsApp' },
                      { href: CONTACT.instagram, icon: <AtSign className="h-4 w-4" />, label: 'Instagram' },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-parchment bg-white text-gold shadow-sm transition hover:border-gold/40 hover:shadow-md"
                        aria-label={s.label}
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
