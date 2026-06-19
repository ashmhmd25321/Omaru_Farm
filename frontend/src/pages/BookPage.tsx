import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  Send,
  UtensilsCrossed,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WhatsAppContactNote } from '@/components/site/WhatsAppContactNote'
import { apiUrl } from '@/utils/api'
import { staticUrl } from '@/utils/staticUrl'
import {
  DEFAULT_WHATSAPP_NUMBER,
  formatWhatsAppDisplay,
  openWhatsAppBookingRequest,
  parseWhatsAppNumber,
} from '@/utils/whatsapp'

const GOLD_GRADIENT = 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)'

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const BOOKING_TYPES = [
  { value: 'cafe', label: 'Café table', icon: UtensilsCrossed },
  { value: 'stay', label: 'Farm stay', icon: BedDouble },
  { value: 'group', label: 'Group or event', icon: CalendarDays },
] as const

const STEPS = [
  {
    title: 'Share your details',
    body: 'Tell us your preferred date, party size, and anything we should know.',
  },
  {
    title: 'Confirm on WhatsApp',
    body: 'We save your request and open WhatsApp with a ready-to-send message.',
  },
  {
    title: 'We reply personally',
    body: 'Our team confirms availability and helps you plan your visit.',
  },
] as const

export function BookPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingType, setBookingType] = useState<(typeof BOOKING_TYPES)[number]['value']>('cafe')
  const [details, setDetails] = useState('')
  const [website, setWebsite] = useState('')
  const [businessNumber, setBusinessNumber] = useState(DEFAULT_WHATSAPP_NUMBER)
  const [submitState, setSubmitState] = useState<{ loading: boolean; message: string; error: string }>({
    loading: false,
    message: '',
    error: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/content/site-settings'), { signal: controller.signal })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        if (value.whatsappUrl) {
          setBusinessNumber(parseWhatsAppNumber(String(value.whatsappUrl)))
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setBookingDate('')
    setBookingType('cafe')
    setDetails('')
    setWebsite('')
    setSubmitState({ loading: false, message: '', error: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitState({ loading: true, message: '', error: '' })

    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      setSubmitState({
        loading: false,
        message: '',
        error: 'Please enter your phone number so we can confirm your booking on WhatsApp.',
      })
      return
    }

    const typeLabel = BOOKING_TYPES.find((t) => t.value === bookingType)?.label ?? 'Booking'
    const detailText = details.trim()
    const composedDetails = detailText
      ? `${typeLabel}: ${detailText}`
      : typeLabel

    try {
      const res = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          bookingDate,
          message: `Phone: ${trimmedPhone}\nType: ${typeLabel}${detailText ? `\n\n${detailText}` : ''}`,
          source: 'book-page',
          website,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message ?? 'Could not submit booking request')
      }

      openWhatsAppBookingRequest({
        businessNumber,
        name: fullName,
        phone: trimmedPhone,
        email,
        bookingDate,
        details: composedDetails,
      })

      setSubmitState({
        loading: false,
        message: 'Booking saved. WhatsApp is opening — tap Send to confirm with our team.',
        error: '',
      })
      setFullName('')
      setEmail('')
      setPhone('')
      setBookingDate('')
      setBookingType('cafe')
      setDetails('')
      setWebsite('')
    } catch (err) {
      setSubmitState({
        loading: false,
        message: '',
        error: err instanceof Error ? err.message : 'Could not submit booking request',
      })
    }
  }

  const detailPlaceholder =
    bookingType === 'cafe'
      ? 'E.g. table for 4, lunch on Saturday, any dietary needs…'
      : bookingType === 'stay'
        ? 'E.g. Rose Cottage, 2 nights, arrival Friday…'
        : 'Tell us about your group, event, or special request…'

  const whatsappDisplay = formatWhatsAppDisplay(businessNumber)

  return (
    <>
      <Helmet>
        <title>Book Now | Omaru Farm</title>
        <meta name="description" content="Book a cafe table or submit an accommodation request at Omaru Farm." />
        <link rel="canonical" href="https://omarufarms.com.au/book" />
        <meta property="og:title" content="Book Omaru Farm | Café & Accommodation Requests" />
        <meta property="og:description" content="Submit a café table or accommodation booking request for Omaru Farm on Phillip Island." />
        <meta property="og:url" content="https://omarufarms.com.au/book" />
        <meta property="og:image" content="/images/farm/image-farm/IMG_0674.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Book Omaru Farm | Café & Accommodation Requests" />
        <meta name="twitter:description" content="Submit a café table or accommodation booking request for Omaru Farm on Phillip Island." />
        <meta name="twitter:image" content="/images/farm/image-farm/IMG_0674.jpg" />
      </Helmet>

      <main className="bg-surface">
        <section className="bg-surface py-12 md:py-16">
          <div className="mx-auto max-w-[92vw] px-5 xl:max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.38em] text-gold-deep">
                Plan your visit
              </p>
              <h1 className="mt-3 font-heading text-4xl font-semibold text-gold md:text-5xl">Book Now</h1>
              <p className="mt-3 max-w-2xl font-body text-base leading-relaxed text-stone md:text-lg">
                Reserve a café table or request a farm stay. We&apos;ll save your details and open WhatsApp so you can
                confirm in one tap.
              </p>
            </motion.div>
          </div>

          <div className="mx-auto mt-10 grid max-w-[92vw] gap-10 px-5 lg:grid-cols-[1fr_1.12fr] lg:gap-14 xl:max-w-6xl">
            {/* Left — context & reassurance */}
            <div className="flex flex-col gap-5">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                custom={0}
                variants={fadeUp}
              >
                <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
                  What you can book
                </p>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-charcoal md:text-[1.75rem]">
                  Café, stays &amp; gatherings
                </h2>
                <p className="mt-3 max-w-md font-body text-sm leading-relaxed text-stone">
                  From a relaxed lunch on the terrace to a multi-night farm stay — tell us what you have in mind and
                  we&apos;ll take it from there.
                </p>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <motion.article
                  className="group overflow-hidden rounded-xl border border-estate/8 bg-white/90 shadow-[0_8px_40px_rgba(26,18,8,0.06)] backdrop-blur-sm"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.25 }}
                  custom={0.06}
                  variants={fadeUp}
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={staticUrl('/images/farm/image-farm/IMG_0644.jpg')}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 to-transparent" />
                    <div
                      className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-lg shadow-sm"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      <UtensilsCrossed className="h-4 w-4 text-white" aria-hidden />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-base font-semibold text-charcoal">Café table</h3>
                    <p className="mt-1.5 font-body text-xs leading-relaxed text-stone">
                      Thu–Fri lunch &amp; dinner · Sat–Sun all day
                    </p>
                    <Link
                      to="/cafe"
                      className="mt-3 inline-flex items-center gap-1 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                    >
                      View menu <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </motion.article>

                <motion.article
                  className="group overflow-hidden rounded-xl border border-estate/8 bg-white/90 shadow-[0_8px_40px_rgba(26,18,8,0.06)] backdrop-blur-sm"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.25 }}
                  custom={0.1}
                  variants={fadeUp}
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={staticUrl('/images/farm/image-farm/Gemini_Generated_Image_f9njj4f9njj4f9nj.png')}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 to-transparent" />
                    <div
                      className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-lg shadow-sm"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      <BedDouble className="h-4 w-4 text-white" aria-hidden />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-base font-semibold text-charcoal">Farm stay</h3>
                    <p className="mt-1.5 font-body text-xs leading-relaxed text-stone">
                      Rose &amp; Jasmine cottages · sleeps up to 10
                    </p>
                    <Link
                      to="/stay"
                      className="mt-3 inline-flex items-center gap-1 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                    >
                      Explore stays <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </motion.article>
              </div>

              <motion.article
                className="rounded-xl border border-estate/8 bg-white/90 p-6 shadow-[0_8px_40px_rgba(26,18,8,0.06)] backdrop-blur-sm md:p-7"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.25 }}
                custom={0.14}
                variants={fadeUp}
              >
                <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold">
                  How it works
                </p>
                <ol className="mt-5 space-y-5">
                  {STEPS.map((step, idx) => (
                    <li key={step.title} className="flex gap-4">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-body text-xs font-bold text-white shadow-sm"
                        style={{ background: GOLD_GRADIENT }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-heading text-sm font-semibold text-charcoal">{step.title}</p>
                        <p className="mt-1 font-body text-xs leading-relaxed text-stone">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </motion.article>

              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.25 }}
                custom={0.18}
                variants={fadeUp}
              >
                <WhatsAppContactNote businessNumber={businessNumber} pageLabel="Book" />
              </motion.div>
            </div>

            {/* Right — form */}
            <motion.div
              className="rounded-xl border border-estate/10 bg-white p-7 shadow-[0_16px_56px_rgba(26,18,8,0.08)] md:p-9 lg:sticky lg:top-24 lg:self-start"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0.04}
              variants={fadeUp}
            >
              {submitState.message ? (
                <div className="flex flex-col items-center justify-center py-10 text-center md:py-14">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl shadow-md"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <CheckCircle2 className="h-7 w-7 text-white" aria-hidden />
                  </div>
                  <p className="font-heading text-2xl font-semibold text-charcoal">Request saved</p>
                  <p className="mx-auto mt-3 max-w-sm font-body text-sm leading-relaxed text-stone">
                    {submitState.message}
                  </p>
                  <p className="mx-auto mt-4 max-w-sm font-body text-xs leading-relaxed text-stone">
                    Didn&apos;t open? Message us on WhatsApp at{' '}
                    <span className="font-semibold text-[#128C7E]">{whatsappDisplay}</span>
                  </p>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-6 font-body text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep transition hover:text-gold"
                  >
                    Send another request
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-7 border-b border-parchment/50 pb-6">
                    <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-gold">
                      Booking request
                    </p>
                    <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal md:text-2xl">
                      Tell us about your visit
                    </h2>
                  </div>

                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <fieldset>
                      <legend className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                        I&apos;d like to book
                      </legend>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {BOOKING_TYPES.map(({ value, label, icon: Icon }) => {
                          const selected = bookingType === value
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setBookingType(value)}
                              className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition ${
                                selected
                                  ? 'border-gold/50 bg-gold/8 shadow-[0_4px_20px_rgba(197,160,89,0.15)]'
                                  : 'border-parchment/60 bg-surface-low/40 hover:border-gold/30 hover:bg-white'
                              }`}
                              aria-pressed={selected}
                            >
                              <Icon
                                className={`h-4 w-4 ${selected ? 'text-gold-deep' : 'text-stone'}`}
                                aria-hidden
                              />
                              <span
                                className={`font-body text-[0.62rem] font-semibold leading-tight tracking-wide ${
                                  selected ? 'text-charcoal' : 'text-stone'
                                }`}
                              >
                                {label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <label className="block">
                        <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                          Full name
                        </span>
                        <input
                          className="field mt-2 w-full"
                          placeholder="E.g. James Alexander"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          autoComplete="name"
                        />
                      </label>
                      <label className="block">
                        <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                          Email
                        </span>
                        <input
                          className="field mt-2 w-full"
                          placeholder="james@example.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </label>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <label className="block">
                        <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                          Phone number
                        </span>
                        <input
                          className="field mt-2 w-full"
                          placeholder="+61 400 000 000"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          autoComplete="tel"
                        />
                      </label>
                      <label className="block">
                        <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                          Preferred date
                        </span>
                        <input
                          className="field mt-2 w-full"
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <input
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      aria-hidden="true"
                    />

                    <label className="block">
                      <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-stone">
                        Request details
                      </span>
                      <textarea
                        className="field mt-2 min-h-28 w-full resize-y"
                        placeholder={detailPlaceholder}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                      />
                    </label>

                    <div className="rounded-lg border border-sage/20 bg-fern/30 px-4 py-3">
                      <p className="flex items-start gap-2 font-body text-xs leading-relaxed text-bark">
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden />
                        <span>
                          After you submit, WhatsApp opens with your details pre-filled — just tap Send and we&apos;ll
                          reply shortly. Or message us anytime at{' '}
                          <span className="font-semibold text-[#128C7E]">{whatsappDisplay}</span>.
                        </span>
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="h-12 w-full gap-2 text-sm font-semibold tracking-wide"
                      disabled={submitState.loading}
                    >
                      {submitState.loading ? (
                        'Submitting…'
                      ) : (
                        <>
                          <Send className="h-4 w-4" aria-hidden />
                          Submit &amp; open WhatsApp
                        </>
                      )}
                    </Button>

                    {submitState.error ? (
                      <p className="text-center text-sm text-red-600">{submitState.error}</p>
                    ) : null}
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </section>
      </main>
    </>
  )
}
