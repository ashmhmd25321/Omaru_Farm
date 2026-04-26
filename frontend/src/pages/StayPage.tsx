import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BedDouble,
  Bird,
  CalendarDays,
  ChevronDown,
  Leaf,
  MapPin,
  PawPrint,
  Sunrise,
  UtensilsCrossed,
  Users,
  Waves,
} from 'lucide-react'
import { useState } from 'react'
import { staticUrl } from '@/utils/staticUrl'

const GOLD_GRADIENT = 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)'

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const STAYS = [
  {
    id: 'glass-pavilion',
    name: 'The Glass Pavilion',
    type: 'On-Farm · Self-Contained',
    badge: 'Most Popular',
    tagline: 'Wake to the sound of the farm.',
    description:
      'Established in 1952, a quintessential open-farm pavilion. Designed for those who seek to enjoy life in the open paddock without compromising on comfort. A pure farm experience with the finest produce on your doorstep.',
    amenities: [
      { Icon: BedDouble, label: 'King bed + sofa bed' },
      { Icon: Waves, label: 'Private deck, ocean views' },
      { Icon: UtensilsCrossed, label: 'Self-contained kitchen' },
    ],
    guests: '2–4',
    image: staticUrl('/images/farm/IMG_9130.jpg'),
    imagePosition: 'left' as const,
  },
  {
    id: 'stone-cottage',
    name: 'Heritage Stone Cottage',
    type: 'On-Farm · Heritage Stay',
    badge: null,
    tagline: 'Surrounded by olive trees and open skies.',
    description:
      'Nestled among ancient olive groves, the Heritage Stone Cottage is a sanctuary of slow living. The stone walls carry warmth from the land while the views from the veranda stretch across the Phillip Island farmscape.',
    amenities: [
      { Icon: BedDouble, label: 'Queen & twin rooms' },
      { Icon: Leaf, label: 'Olive grove outlook' },
      { Icon: PawPrint, label: 'Dog-friendly outdoors' },
    ],
    guests: '2–4',
    image: staticUrl('/images/farm/2025-01-12-8.jpg'),
    imagePosition: 'right' as const,
  },
  {
    id: 'ventnor-retreat',
    name: 'Ventnor Retreat',
    type: 'Holiday Home · Off-Farm',
    badge: null,
    tagline: 'Your private Phillip Island base.',
    description:
      'A beautifully furnished holiday home minutes from Omaru Farm. Perfect for families wanting the freedom of a full home — with easy access to the farm, the café, and every Phillip Island experience.',
    amenities: [
      { Icon: Users, label: 'Sleeps up to 6 guests' },
      { Icon: MapPin, label: 'Minutes from Omaru Farm' },
      { Icon: Bird, label: '5 min to Penguin Parade' },
    ],
    guests: '4–6',
    image: staticUrl('/images/farm/IMG_3924.jpg'),
    imagePosition: 'left' as const,
  },
  {
    id: 'island-cottage',
    name: 'Island Cottage',
    type: 'Holiday Home · Off-Farm',
    badge: null,
    tagline: 'Phillip Island charm, close to everything.',
    description:
      'A charming cottage with warm interiors and a relaxed island feel. Close to Cowes and major attractions, with easy access to Omaru Farm for dining and farm experiences.',
    amenities: [
      { Icon: BedDouble, label: '2 bedrooms, sleeps 4' },
      { Icon: MapPin, label: '10 minutes to Cowes' },
      { Icon: Bird, label: 'Easy Penguin Parade access' },
    ],
    guests: '2–4',
    image: staticUrl('/images/farm/20210602_130149.jpg'),
    imagePosition: 'right' as const,
  },
]

const EXPERIENCES = [
  { Icon: Sunrise,         label: 'Taste the Life',      desc: 'Savour breakfast on your private deck as mist lifts from the paddocks at dawn.' },
  { Icon: UtensilsCrossed, label: 'Wildlife Chef',        desc: 'Dine on produce grown steps from your door — picked fresh, served with care.' },
]

export function StayPage() {
  const pad2 = (n: number) => `${n}`.padStart(2, '0')
  const toISODate = (d: Date) => {
    const y = d.getFullYear(); const m = pad2(d.getMonth() + 1); const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
  }

  const [checkIn, setCheckIn]   = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return toISODate(d) })
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 10); return toISODate(d) })
  const [cabin, setCabin]       = useState('The Glass Pavilion')
  const [guests, setGuests]     = useState('2 Guests')
  const [submitted, setSubmitted] = useState(false)

  return (
    <>
      <Helmet>
        <title>Stay at Omaru Farm | Self-Contained Cabins & Holiday Homes · Phillip Island</title>
        <meta
          name="description"
          content="Stay at Omaru Farm on Phillip Island. Self-contained cabins with breathtaking views, plus holiday homes. Perfect base for the Penguin Parade and all island attractions."
        />
      </Helmet>

      <main>

        {/* ══════════════════════════════════════════
            HERO — full-viewport image, bottom-left text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[80vh] items-end overflow-hidden">
          <img
            src={staticUrl('/images/farm/image-farm/7CD1DA41BA7E970B38EA4E75B43CD7CD.JPG')}
            alt="Farm accommodation at Omaru, Phillip Island"
            className="absolute inset-0 h-full w-full object-cover [filter:saturate(1.14)_contrast(1.1)_brightness(0.9)]"
            loading="eager"
            fetchPriority="high"
          />
          {/* Cinematic layering: improves contrast and keeps headline readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-estate/82 via-estate/36 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-estate/24 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.34)_72%,rgba(0,0,0,0.5)_100%)]" />
          <div className="absolute inset-0 opacity-[0.14] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_1px,transparent_1px,transparent_3px)]" />

          <div className="relative z-10 mx-auto w-full max-w-[92vw] px-5 pb-20 md:pb-28">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl"
            >
              <p className="mb-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-gold/80">
                Welcome to Omaru
              </p>
              <h1 className="hero-headline font-heading text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl md:text-[3.5rem] lg:text-[4rem]">
                A Sanctuary<br />
                of <span className="italic text-gold">Silence</span>
              </h1>
              <p className="mt-5 font-body text-base leading-[1.78] text-white/72 md:text-lg">
                Self-contained cabins and holiday homes nestled within Omaru Farm — breathtaking views, farm sounds, and total privacy just 5 minutes from the Penguin Parade.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#stays"
                  className="inline-flex h-11 items-center rounded-sm px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-105"
                  style={{ background: GOLD_GRADIENT }}
                >
                  Explore Retreats
                </a>
                <a
                  href="#book"
                  className="inline-flex h-11 items-center rounded-sm border border-white/25 bg-transparent px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white/85 transition hover:border-white/45 hover:bg-white/8"
                >
                  Check Availability
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            THE STAYS — white, alternating editorial rows
        ══════════════════════════════════════════ */}
        <section id="stays" className="bg-white py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            {/* Section heading */}
            <motion.div
              className="mb-14"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                The Stays
              </h2>
              <p className="mt-4 max-w-xl font-body text-base leading-[1.75] text-stone">
                Each property at Omaru has been crafted to make you feel embedded in the land while allowing all the comforts that let you truly unwind on Phillip Island.
              </p>
            </motion.div>

            {/* Alternating rows */}
            <div className="space-y-20 md:space-y-28">
              {STAYS.map((stay, idx) => {
                const isLeft = stay.imagePosition === 'left'
                return (
                  <motion.div
                    key={stay.id}
                    className={`grid items-center gap-10 md:grid-cols-[5fr_6fr] md:gap-14 lg:gap-20 ${isLeft ? '' : 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1'}`}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    custom={idx * 0.05}
                    variants={fadeUp}
                  >
                    {/* Image */}
                    <div className="group relative overflow-hidden rounded-sm">
                      {stay.badge && (
                        <span
                          className="absolute left-4 top-4 z-10 rounded-sm px-3 py-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white"
                          style={{ background: GOLD_GRADIENT }}
                        >
                          {stay.badge}
                        </span>
                      )}
                      <img
                        src={stay.image}
                        alt={stay.name}
                        className="h-72 w-full object-cover transition duration-700 group-hover:scale-[1.03] md:h-[380px]"
                        loading="lazy"
                      />
                    </div>

                    {/* Content */}
                    <div>
                      <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
                        {stay.type}
                      </p>
                      <h3 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.02em] text-charcoal md:text-4xl">
                        {stay.name}
                      </h3>
                      <p className="mt-1.5 font-body text-sm italic text-stone">{stay.tagline}</p>
                      <p className="mt-5 font-body text-base leading-[1.78] text-stone">{stay.description}</p>

                      {/* Amenity icons */}
                      <div className="mt-6 flex flex-wrap gap-5">
                        {stay.amenities.map(({ Icon, label }) => (
                          <span key={label} className="inline-flex items-center gap-2 font-body text-sm text-bark">
                            <Icon className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
                            {label}
                          </span>
                        ))}
                      </div>

                      {/* Enquire link */}
                      <a
                        href="#book"
                        className="mt-7 inline-flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                      >
                        Enquire to Book Details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            THE EXPERIENCE — dark estate, editorial grid
        ══════════════════════════════════════════ */}
        <section className="bg-estate py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            {/* Heading */}
            <motion.div
              className="mb-14 text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={0}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold/70">
                More Than a Place to Sleep
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-white md:text-5xl">
                The Experience
              </h2>
              <p className="mx-auto mt-4 max-w-lg font-body text-base leading-[1.75] text-white/50">
                Slow mornings, farm encounters, and paddock views that reset the soul.
              </p>
            </motion.div>

            {/* Asymmetric experience grid */}
            <div className="grid gap-4 md:grid-cols-[3fr_2fr]">

              {/* Left: large dark image card — Cosmic Silence */}
              <motion.div
                className="group relative min-h-[440px] overflow-hidden rounded-sm"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                custom={0.06}
                variants={fadeUp}
              >
                <img
                  src={staticUrl('/images/farm/AEA8C771269A966E816D1F714AD4BE2D.JPG')}
                  alt="Stargazing and silence at Omaru Farm, Phillip Island"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-estate/90 via-estate/50 to-estate/20" />
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                  <span className="inline-flex items-center gap-2 font-body text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-gold">
                    <Sunrise className="h-3.5 w-3.5" aria-hidden />
                    Far from the City
                  </span>
                  <h3 className="mt-2 font-heading text-3xl font-semibold text-white">
                    Cosmic Silence
                  </h3>
                  <p className="mt-3 max-w-xs font-body text-sm leading-relaxed text-white/65">
                    Experience absolute darkness and absolute quiet. Our farm sits away from all light pollution — the night sky at Omaru is extraordinary.
                  </p>
                </div>
              </motion.div>

              {/* Right column */}
              <motion.div
                className="flex flex-col gap-4"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                custom={0.16}
                variants={fadeUp}
              >
                {/* Heritage estate card */}
                <div
                  className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-sm p-7"
                  style={{ background: 'linear-gradient(150deg, #1a1208 0%, #2c1f0a 60%, #1a1208 100%)' }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(197,160,89,0.14) 0%, transparent 55%)' }}
                  />
                  <div className="relative">
                    <p className="font-body text-[0.6rem] font-semibold uppercase tracking-[0.36em] text-gold/55">
                      Farm Heritage
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-semibold tracking-[0.06em] text-white/90">
                      Omaru Farm
                    </h3>
                    <p className="mt-0.5 font-body text-[0.6rem] uppercase tracking-[0.24em] text-gold/40">Est. 1954 · Phillip Island</p>
                  </div>
                  <div className="relative mt-4">
                    <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.25), transparent)' }} />
                    <p className="mt-4 font-heading text-lg italic font-normal text-white/70">
                      "Where the land speaks and silence is the luxury."
                    </p>
                  </div>
                </div>

                {/* Two small experience icon cards */}
                <div className="grid grid-cols-2 gap-4">
                  {EXPERIENCES.map(({ Icon, label, desc }) => (
                    <div key={label} className="rounded-sm bg-white/[0.05] p-6 backdrop-blur-sm">
                      <div
                        className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm"
                        style={{ background: GOLD_GRADIENT }}
                      >
                        <Icon className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
                      </div>
                      <p className="font-heading text-base font-semibold text-white">{label}</p>
                      <p className="mt-1.5 font-body text-xs leading-relaxed text-white/48">{desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Feature strip */}
            <motion.div
              className="mt-14 flex flex-wrap items-center justify-center gap-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={0.3}
              variants={fadeUp}
            >
              {[
                { Icon: Bird,   text: '5 min to Penguin Parade' },
                { Icon: Waves,  text: 'Ocean views from the paddock' },
                { Icon: PawPrint, text: 'Farm animals on-site' },
                { Icon: MapPin,  text: '776 Ventnor Road, Phillip Island' },
              ].map(({ Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-2 font-body text-xs text-white/38">
                  <Icon className="h-3.5 w-3.5 text-gold/55" aria-hidden />
                  {text}
                </span>
              ))}
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            BOOK YOUR RETREAT — surface-low, clean form
        ══════════════════════════════════════════ */}
        <section id="book" className="bg-surface-low py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            <motion.div
              className="mx-auto max-w-2xl"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              {/* Heading */}
              <div className="mb-12 text-center">
                <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                  Book Your Retreat
                </h2>
                <p className="mx-auto mt-4 max-w-sm font-body text-base leading-[1.75] text-stone">
                  Complete the form below to check availability. We'll get back to you promptly to confirm your arrival.
                </p>
              </div>

              {submitted ? (
                <div className="rounded-sm bg-white py-14 text-center shadow-[0_8px_40px_rgba(26,18,8,0.06)]">
                  <div
                    className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <CalendarDays className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <p className="font-heading text-2xl font-semibold text-charcoal">Enquiry Received!</p>
                  <p className="mx-auto mt-2 max-w-xs font-body text-sm text-stone">
                    Thank you — we'll be in touch within 24 hours with availability and pricing.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-6 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                  >
                    Make Another Enquiry
                  </button>
                </div>
              ) : (
                <form
                  className="space-y-6 rounded-sm bg-white p-8 shadow-[0_8px_40px_rgba(26,18,8,0.06)] md:p-10"
                  onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
                >
                  {/* Row 1: Check-in + Check-out */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Check-in
                      </span>
                      <div className="relative mt-2">
                        <input
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          required
                          className="field w-full pr-8"
                          aria-label="Check-in date"
                        />
                        <CalendarDays className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                      </div>
                    </label>
                    <label className="block">
                      <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Check-out
                      </span>
                      <div className="relative mt-2">
                        <input
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          required
                          className="field w-full pr-8"
                          aria-label="Check-out date"
                        />
                        <CalendarDays className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                      </div>
                    </label>
                  </div>

                  {/* Row 2: Cabin */}
                  <label className="block">
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Cabin
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={cabin}
                        onChange={(e) => setCabin(e.target.value)}
                        className="field w-full appearance-none pr-8"
                        aria-label="Select cabin"
                      >
                        <optgroup label="On-Farm Cabins">
                          <option>The Glass Pavilion</option>
                          <option>Heritage Stone Cottage</option>
                        </optgroup>
                        <optgroup label="Holiday Homes">
                          <option>Ventnor Retreat</option>
                          <option>Island Cottage</option>
                        </optgroup>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                    </div>
                  </label>

                  {/* Row 3: Guests */}
                  <label className="block">
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Guests
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="field w-full appearance-none pr-8"
                        aria-label="Number of guests"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={`${n} ${n === 1 ? 'Guest' : 'Guests'}`}>
                            {n} {n === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                      <Users className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                    </div>
                  </label>

                  {/* Submit */}
                  <div className="pt-2 text-center">
                    <button
                      type="submit"
                      className="inline-flex h-12 w-full items-center justify-center rounded-sm font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-105"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      Check Availability
                    </button>
                    <p className="mt-4 font-body text-xs text-stone/55">
                      776 Ventnor Road, Ventnor, Phillip Island VIC 3922
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </section>

      </main>
    </>
  )
}
