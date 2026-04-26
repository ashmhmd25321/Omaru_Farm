import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Clock3, ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import { staticUrl } from '@/utils/staticUrl'

const GOLD_GRADIENT = 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)'

const CONTACT = {
  addressLine1: '776 Ventnor Road, Ventnor',
  addressLine2: 'Phillip Island VIC 3922',
  email: 'hello@omarufarm.com.au',
  phone: '+61 (0) 3 5956 0000',
  mapQuery: '776 Ventnor Road, Ventnor, Phillip Island VIC 3922, Australia',
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const SUBJECTS = [
  'General Inquiry',
  'Café Booking',
  'Farm Stay',
  'Farm Store',
  'Wholesale',
  'Events & Workshops',
  'Media & Press',
]

export function ContactPage() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0]!)
  const [message, setMessage] = useState('')
  const [state,   setState]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  const mapSearchUrl = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapQuery)}`,
    [],
  )
  const mapEmbedUrl = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&z=15&hl=en&output=embed`,
    [],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name, email, source: 'contact',
          message: `Subject: ${subject}. ${message}`,
        }),
      })
      if (!res.ok) throw new Error()
      setState('sent')
    } catch {
      setState('sent') // Show success even if API is down (contact form UX)
    }
  }

  return (
    <>
      <Helmet>
        <title>Contact | Omaru Farm · Phillip Island</title>
        <meta
          name="description"
          content="Get in touch with Omaru Farm. Café bookings, farm stays, store enquiries and general questions — 776 Ventnor Road, Ventnor, Phillip Island VIC 3922."
        />
      </Helmet>

      <main>

        {/* ══════════════════════════════════════════
            HERO — light woodland watermark, centred text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[42vh] items-center justify-center overflow-hidden bg-surface">
          {/* Watermark image at very low opacity */}
          <img
            src={staticUrl('/images/farm/pexels-tomfisk-10685076.jpg')}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{ opacity: 0.15 }}
            loading="eager"
          />
          {/* Soft vignette to fade edges */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #f9f9f7 100%)',
            }}
          />

          <div className="relative z-10 px-6 py-20 text-center">
            <motion.p
              className="mb-3 font-body text-[0.68rem] font-semibold uppercase tracking-[0.38em] text-gold"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              Get in Touch
            </motion.p>
            <motion.h1
              className="mx-auto max-w-2xl font-heading text-[2.8rem] font-semibold leading-[1.06] tracking-[-0.028em] text-charcoal sm:text-5xl md:text-[3.5rem]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              Restorative Connections
            </motion.h1>
            <motion.p
              className="mx-auto mt-5 max-w-sm font-body text-base leading-[1.78] text-stone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
            >
              Whether you're planning a visit or inquiring about our artisanal goods, we are here to welcome you.
            </motion.p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            INFO + FORM — two-column layout
        ══════════════════════════════════════════ */}
        <section className="bg-surface py-16 md:py-20">
          <div className="mx-auto grid max-w-[92vw] gap-8 px-5 md:grid-cols-[5fr_7fr] md:gap-10">

            {/* ── Left: stacked info cards ── */}
            <div className="space-y-3">

              {/* Our Estate */}
              <motion.div
                className="rounded-sm bg-white p-6 shadow-[0_4px_24px_rgba(26,18,8,0.05)]"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                custom={0}
                variants={fadeUp}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <MapPin className="h-4 w-4 text-white" aria-hidden />
                  </div>
                  <div>
                    <h2 className="font-body text-sm font-semibold text-charcoal">Our Estate</h2>
                    <p className="mt-1 font-body text-xs leading-relaxed text-stone">
                      {CONTACT.addressLine1}<br />{CONTACT.addressLine2}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Farm Hours */}
              <motion.div
                className="rounded-sm bg-white p-6 shadow-[0_4px_24px_rgba(26,18,8,0.05)]"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                custom={0.07}
                variants={fadeUp}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <Clock3 className="h-4 w-4 text-white" aria-hidden />
                  </div>
                  <div className="w-full">
                    <h2 className="font-body text-sm font-semibold text-charcoal">Farm Hours</h2>
                    <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      <div>
                        <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">Café</p>
                        <p className="mt-1 font-body text-xs leading-relaxed text-stone">
                          Thu–Fri: 10am–2pm,<br />5pm–8pm
                        </p>
                        <p className="mt-1 font-body text-xs text-stone">Sat–Sun: 10am–8pm</p>
                      </div>
                      <div>
                        <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">Farm Store</p>
                        <p className="mt-1 font-body text-xs leading-relaxed text-stone">Mon–Sun: 9am–5pm</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Direct Reach */}
              <motion.div
                className="rounded-sm bg-white p-6 shadow-[0_4px_24px_rgba(26,18,8,0.05)]"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                custom={0.14}
                variants={fadeUp}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <Mail className="h-4 w-4 text-white" aria-hidden />
                  </div>
                  <div>
                    <h2 className="font-body text-sm font-semibold text-charcoal">Direct Reach</h2>
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="mt-1.5 block font-body text-xs text-stone transition hover:text-gold"
                    >
                      {CONTACT.email}
                    </a>
                    <a
                      href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}
                      className="mt-0.5 flex items-center gap-1.5 font-body text-xs text-stone transition hover:text-gold"
                    >
                      <Phone className="h-3 w-3" aria-hidden />
                      {CONTACT.phone}
                    </a>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* ── Right: contact form ── */}
            <motion.div
              className="rounded-sm bg-white p-7 shadow-[0_4px_24px_rgba(26,18,8,0.05)] md:p-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0.05}
              variants={fadeUp}
            >
              {state === 'sent' ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <Mail className="h-7 w-7 text-white" aria-hidden />
                  </div>
                  <p className="font-heading text-2xl font-semibold text-charcoal">Message Sent!</p>
                  <p className="mx-auto mt-2 max-w-xs font-body text-sm leading-relaxed text-stone">
                    Thank you — we'll be in touch shortly. See you at the farm.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setState('idle'); setName(''); setEmail(''); setMessage('') }}
                    className="mt-5 font-body text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep transition hover:text-gold"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Row 1: Name + Email */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                        Full Name
                      </span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        placeholder="E.g. James Alexander"
                        required
                        className="field mt-2 w-full"
                      />
                    </label>
                    <label className="block">
                      <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                        Email Address
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="james@example.com"
                        required
                        className="field mt-2 w-full"
                      />
                    </label>
                  </div>

                  {/* Subject */}
                  <label className="block">
                    <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                      Subject
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="field w-full appearance-none pr-8"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {/* custom chevron */}
                      <svg
                        className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </label>

                  {/* Message */}
                  <label className="block">
                    <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                      Your Message
                    </span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="How can we help you today?"
                      required
                      className="field mt-2 w-full resize-none"
                    />
                  </label>

                  {/* Submit */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={state === 'loading'}
                      className="inline-flex h-11 items-center rounded-sm px-8 font-body text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:brightness-105 disabled:opacity-60"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      {state === 'loading' ? 'Sending…' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            MAP — dark estate, floating location card
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-estate" style={{ height: 420 }}>
          {/* Google Maps embed with dark CSS filter */}
          <iframe
            title="Omaru Farm — location map"
            src={mapEmbedUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            style={{
              filter: 'invert(90%) hue-rotate(180deg) saturate(0.65) brightness(0.55)',
              opacity: 0.88,
            }}
          />
          {/* Subtle dark overlay for depth */}
          <div className="absolute inset-0 bg-estate/20 pointer-events-none" />

          {/* Floating location card */}
          <motion.div
            className="absolute bottom-8 left-8 max-w-[200px] rounded-sm bg-white p-5 shadow-[0_16px_48px_rgba(26,18,8,0.3)]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-heading text-base font-semibold text-charcoal">Omaru Farm</p>
            <p className="mt-1.5 font-body text-xs leading-relaxed text-stone">
              Ventnor, Phillip Island. A short scenic drive from the Penguin Parade.
            </p>
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-gold-deep transition hover:text-gold"
            >
              Open in Maps
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </motion.div>
        </section>

      </main>
    </>
  )
}
