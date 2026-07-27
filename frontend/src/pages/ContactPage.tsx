import { useEffect, useMemo, useState } from 'react'
import { Seo } from '@/components/site/Seo'
import { motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { staticUrl } from '@/utils/staticUrl'
import { apiUrl } from '@/utils/api'
import { buildWhatsAppUrl, formatWhatsAppDisplay, parseWhatsAppNumber } from '@/utils/whatsapp'

const OLIVE_BTN = '#6B5E0D'

type ContactDetails = {
  farmName: string
  addressLine1: string
  addressLine2: string
  email: string
  phone: string
  whatsapp: string
  whatsappSecondary: string
  mapQuery: string
  hoursCafe: string
  hoursStore: string
}

const FALLBACK_CONTACT: ContactDetails = {
  farmName: 'Omaru Farm',
  addressLine1: '776 Ventnor Road, Ventnor',
  addressLine2: 'Phillip Island VIC 3922',
  email: 'Omarufarmcafe@gmail.com',
  phone: '+61 476 302 477',
  whatsapp: 'https://wa.me/61476302477',
  whatsappSecondary: 'https://wa.me/61427558536',
  mapQuery: '776 Ventnor Road, Ventnor, Phillip Island VIC 3922, Australia',
  hoursCafe: 'Thu–Fri: 10am–2pm & 5–8pm · Sat–Sun: 10am–8pm',
  hoursStore: 'Mon–Sun: 9am–5pm',
}

/** Display lines for café column when using structured fallback copy */
const CAFE_HOURS_DISPLAY = ['Thu–Fri: 10am–2pm,', '5pm–8pm', 'Sat–Sun: 10am–8pm'] as const

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const SUBJECTS = [
  'General Enquiry',
  'Group Bookings',
  'Weddings',
  'Events or Functions',
  'Café Booking',
  'Farm Stay',
  'Farm Store',
  'Wholesale',
  'Media & Press',
]

export function ContactPage() {
  const [details, setDetails] = useState<ContactDetails>(FALLBACK_CONTACT)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0]!)
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/content/contact'), {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const row = data as Record<string, unknown>
        setDetails({
          farmName: String(row.farmName ?? FALLBACK_CONTACT.farmName),
          addressLine1: String(row.addressLine1 ?? FALLBACK_CONTACT.addressLine1),
          addressLine2: String(row.addressLine2 ?? FALLBACK_CONTACT.addressLine2),
          email: String(row.email ?? FALLBACK_CONTACT.email),
          phone: String(row.phone ?? FALLBACK_CONTACT.phone),
          whatsapp: String(row.whatsapp ?? FALLBACK_CONTACT.whatsapp),
          whatsappSecondary: String(row.whatsappSecondary ?? FALLBACK_CONTACT.whatsappSecondary),
          mapQuery: String(row.mapQuery ?? FALLBACK_CONTACT.mapQuery),
          hoursCafe: String(row.hoursCafe ?? FALLBACK_CONTACT.hoursCafe),
          hoursStore: String(row.hoursStore ?? FALLBACK_CONTACT.hoursStore),
        })
      })
      .catch((error) => {
        console.warn('Unable to load contact content', error)
      })
    return () => controller.abort()
  }, [])

  const mapSearchUrl = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.mapQuery)}`,
    [details.mapQuery],
  )
  const mapEmbedUrl = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(details.mapQuery)}&z=15&hl=en&output=embed`,
    [details.mapQuery],
  )
  const phoneHref = useMemo(() => `tel:${details.phone.replace(/[^\d+]/g, '')}`, [details.phone])
  const whatsappNumber = useMemo(() => parseWhatsAppNumber(details.whatsapp), [details.whatsapp])
  const whatsappSecondaryNumber = useMemo(
    () => parseWhatsAppNumber(details.whatsappSecondary),
    [details.whatsappSecondary],
  )
  const whatsappUrl = useMemo(
    () => buildWhatsAppUrl(whatsappNumber, 'Hello Omaru Farm, I have a question from your website.'),
    [whatsappNumber],
  )
  const whatsappSecondaryUrl = useMemo(
    () => buildWhatsAppUrl(whatsappSecondaryNumber, 'Hello Omaru Farm, I have a question from your website.'),
    [whatsappSecondaryNumber],
  )

  const cafeHoursIsStructured = details.hoursCafe === FALLBACK_CONTACT.hoursCafe

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    const bookingDate = new Date().toISOString().slice(0, 10)
    try {
      const res = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email,
          bookingDate,
          source: 'contact',
          message: `Subject: ${subject}. ${message}`,
          website,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Could not send message')
      setState('sent')
      setWebsite('')
    } catch {
      setState('error')
    }
  }

  return (
    <>
      <Seo
        title="Contact | Omaru Farm · Phillip Island"
        description="Get in touch with Omaru Farm for group bookings, weddings, events, functions, café bookings, farm stays and store enquiries."
        path="/contact"
        image="/images/farm/image-farm/Gemini_Generated_Image_253b1s253b1s253b.jpg"
      />

      <main className="bg-surface">
        {/* ══════════════════════════════════════════
            HERO — pastoral farm view, centered text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden bg-surface">
          <img
            src={staticUrl('/images/farm/image-farm/Gemini_Generated_Image_253b1s253b1s253b.jpg')}
            alt="Sheep grazing in Omaru Farm paddocks at golden hour, Phillip Island"
            className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-charcoal/12 to-charcoal/42" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/28 via-transparent to-white/6" />

          <div className="relative z-10 mx-auto max-w-[92vw] px-5 py-24 text-center md:py-28">
            <motion.p
              className="mb-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.38em] text-gold-deep drop-shadow-[0_1px_10px_rgba(255,255,255,0.85)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              Contact Omaru
            </motion.p>
            <motion.h1
              className="hero-headline mx-auto max-w-3xl font-heading text-[2.65rem] font-semibold leading-[1.05] tracking-[-0.028em] text-white drop-shadow-[0_2px_24px_rgba(22,14,4,0.45)] sm:text-5xl md:text-[3.75rem]"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              Get in touch
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-lg font-body text-base leading-[1.78] text-white/95 drop-shadow-[0_2px_16px_rgba(22,14,4,0.4)] md:text-lg"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, delay: 0.28 }}
            >
              For enquiries such as group bookings, weddings, events or functions, our team is here to welcome you.
            </motion.p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            INFO + FORM
        ══════════════════════════════════════════ */}
        <section className="border-t border-estate/6 bg-surface py-16 md:py-24">
          <div className="mx-auto grid max-w-[92vw] gap-10 px-5 lg:grid-cols-[1fr_1.15fr] lg:gap-14 xl:max-w-6xl">

            {/* Left: info cards */}
            <div className="flex flex-col gap-5">
              <motion.article
                className="rounded-xl border border-estate/8 bg-white/90 p-6 shadow-[0_8px_40px_rgba(26,18,8,0.06)] backdrop-blur-sm md:p-7"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                custom={0}
                variants={fadeUp}
              >
                <div className="flex gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}
                  >
                    <MapPin className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-charcoal">Our Estate</h2>
                    <p className="mt-2 font-body text-sm leading-relaxed text-stone">
                      {details.addressLine1}
                      <br />
                      {details.addressLine2}
                    </p>
                  </div>
                </div>
              </motion.article>

              <motion.article
                className="rounded-xl border border-estate/8 bg-white/90 p-6 shadow-[0_8px_40px_rgba(26,18,8,0.06)] backdrop-blur-sm md:p-7"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                custom={0.06}
                variants={fadeUp}
              >
                <div className="flex gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}
                  >
                    <Clock3 className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-lg font-semibold text-charcoal">Farm Hours</h2>
                    <div className="mt-4 grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold">
                          Café
                        </p>
                        {cafeHoursIsStructured ? (
                          <div className="mt-2 space-y-0.5 font-body text-sm leading-relaxed text-stone">
                            {CAFE_HOURS_DISPLAY.map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 font-body text-sm leading-relaxed text-stone">{details.hoursCafe}</p>
                        )}
                      </div>
                      <div>
                        <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold">
                          Farm Store
                        </p>
                        <p className="mt-2 font-body text-sm leading-relaxed text-stone">{details.hoursStore}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>

              <motion.article
                className="rounded-xl border border-estate/8 bg-white/90 p-6 shadow-[0_8px_40px_rgba(26,18,8,0.06)] backdrop-blur-sm md:p-7"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                custom={0.12}
                variants={fadeUp}
              >
                <div className="flex gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}
                  >
                    <Mail className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-charcoal">Direct Reach</h2>
                    <a
                      href={`mailto:${details.email}`}
                      className="mt-2 block font-body text-sm text-stone underline-offset-4 transition hover:text-gold-deep hover:underline"
                    >
                      {details.email}
                    </a>
                    <a
                      href={phoneHref}
                      className="mt-2 inline-flex items-center gap-2 font-body text-sm text-stone transition hover:text-gold-deep"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                      {details.phone}
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-2 font-body text-sm text-stone transition hover:text-gold-deep"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                      WhatsApp: {formatWhatsAppDisplay(whatsappNumber)}
                    </a>
                    {whatsappSecondaryNumber && whatsappSecondaryNumber !== whatsappNumber ? (
                      <a
                        href={whatsappSecondaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 font-body text-sm text-stone transition hover:text-gold-deep"
                      >
                        <MessageCircle className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                        WhatsApp (Rosie): {formatWhatsAppDisplay(whatsappSecondaryNumber)}
                      </a>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            </div>

            {/* Right: form */}
            <motion.div
              className="rounded-xl border border-estate/10 bg-white p-7 shadow-[0_16px_56px_rgba(26,18,8,0.08)] md:p-9"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0.04}
              variants={fadeUp}
            >
              {state === 'sent' ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl shadow-md"
                    style={{ backgroundColor: OLIVE_BTN }}
                  >
                    <Mail className="h-7 w-7 text-white" aria-hidden />
                  </div>
                  <p className="font-heading text-2xl font-semibold text-charcoal">Message Sent!</p>
                  <p className="mx-auto mt-3 max-w-sm font-body text-sm leading-relaxed text-stone">
                    Thank you — we&apos;ll be in touch shortly. See you at the farm.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setState('idle')
                      setName('')
                      setEmail('')
                      setSubject(SUBJECTS[0]!)
                      setMessage('')
                    }}
                    className="mt-6 font-body text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep transition hover:text-gold"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
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

                  <label className="block">
                    <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                      Subject
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="field w-full appearance-none rounded-md border border-parchment/40 bg-surface-low/50 px-3 py-2.5 pr-10 text-sm focus:border-gold"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone/45"
                        aria-hidden
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                      Your Message
                    </span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      placeholder="How can we help you today?"
                      required
                      className="field mt-2 min-h-[140px] w-full resize-none rounded-md border border-parchment/40 bg-surface-low/50 px-3 py-2.5 focus:border-gold"
                    />
                  </label>
                  <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" />

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={state === 'loading'}
                      className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#6B5E0D] px-8 font-body text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_8px_24px_rgba(107,94,13,0.35)] transition hover:bg-[#5a5210] disabled:opacity-60 sm:w-auto"
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
            MAP — default Google embed (readable); card floats on top
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-t border-estate/10 bg-surface">
          <div className="relative h-[min(52vh,520px)] min-h-[320px] w-full">
            <iframe
              title={`${details.farmName} — location map`}
              src={mapEmbedUrl}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            {/* Light edge fade only — keeps labels readable; no dark colour grading */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />

            <motion.div
              className="absolute bottom-8 left-6 z-10 max-w-[240px] rounded-xl border border-white/15 bg-white/93 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm md:left-10"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-heading text-lg font-semibold text-charcoal">{details.farmName}</p>
              <p className="mt-2 font-body text-sm leading-relaxed text-stone">
                Ventnor, Phillip Island. A short scenic drive from the Penguin Parade.
              </p>
              <a
                href={mapSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold-deep transition hover:text-gold"
              >
                Open in Maps
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  )
}
