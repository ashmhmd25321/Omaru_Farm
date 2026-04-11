import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { BedDouble, CheckCircle2, ChevronRight, MapPin, Users, Waves } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { staticUrl } from '@/utils/staticUrl'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay } }),
}

const ON_FARM_CABINS = [
  {
    id: 'cabin-1',
    name: 'The Paddock Cabin',
    type: 'On-Farm · Self-Contained',
    tagline: 'Wake to the sound of the farm',
    description: 'Nestled at the edge of the paddock, this beautifully appointed self-contained cabin offers sweeping views across the rolling green hills to the distant ocean. Enjoy breakfast on your private deck while the farm comes alive around you.',
    features: ['Self-contained kitchen', 'Private deck with paddock views', 'Quality bedding & linen', 'Bathroom with premium amenities', 'Walk to the café & farm store', 'Pet-friendly outdoors'],
    image: staticUrl('/images/farm/IMG_9130.jpg'),
    guests: '2–4',
    badge: 'Most Popular',
  },
  {
    id: 'cabin-2',
    name: 'The Grove Cabin',
    type: 'On-Farm · Self-Contained',
    tagline: 'Surrounded by olive trees',
    description: 'Tucked among Omaru\'s own olive grove, this warm and private cabin offers a quiet sanctuary with a quintessential farm outlook. Close enough to feel part of the farm, peaceful enough to truly switch off.',
    features: ['Fully self-contained', 'Kitchenette & dining area', 'Cosy fireplace', 'Ensuite bathroom', 'Outdoor seating area', 'Direct access to farm grounds'],
    image: staticUrl('/images/farm/2025-01-12-8.jpg'),
    guests: '2',
    badge: 'New',
  },
]

const HOLIDAY_HOMES = [
  {
    id: 'home-1',
    name: 'Ventnor Retreat',
    type: 'Holiday Home · Off-Farm',
    tagline: 'Your private island base',
    description: 'A beautifully furnished holiday home just minutes from Omaru Farm. Perfect for families or groups wanting the freedom of a full home with easy access to the farm, the café, and all Phillip Island has to offer.',
    features: ['3 bedrooms, sleeps up to 6', 'Full kitchen & laundry', 'Spacious living areas', 'Private garden', 'Minutes from Omaru Farm', 'Close to beaches and attractions'],
    image: staticUrl('/images/farm/IMG_3924.jpg'),
    guests: '4–6',
    badge: null,
  },
  {
    id: 'home-2',
    name: 'Island Cottage',
    type: 'Holiday Home · Off-Farm',
    tagline: 'Phillip Island charm',
    description: 'A charming cottage-style holiday home with warm interiors and a relaxed island atmosphere. Close to Cowes and the major attractions, with easy access to Omaru Farm for dining and farm experiences.',
    features: ['2 bedrooms, sleeps up to 4', 'Modern kitchen', 'Comfortable lounge', 'Outdoor entertaining area', '10 minutes to Cowes', 'Easy access to Penguin Parade'],
    image: staticUrl('/images/farm/20210602_130149.jpg'),
    guests: '2–4',
    badge: null,
  },
]

export function StayPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [property, setProperty] = useState('The Paddock Cabin')
  const [guests, setGuests] = useState('2')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <>
      <Helmet>
        <title>Stay at Omaru Farm | Self-Contained Cabins & Holiday Homes · Phillip Island</title>
        <meta name="description" content="Stay at Omaru Farm on Phillip Island. Two self-contained on-farm cabins with breathtaking views, plus two holiday homes. Perfect base for the Penguin Parade and all island attractions." />
      </Helmet>

      <main>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <img
            src={staticUrl('/images/farm/2025-01-12-8.jpg')}
            alt="Peaceful farm accommodation at Omaru Farm, Phillip Island"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/75 via-charcoal/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />

          <div className="relative mx-auto grid min-h-[75vh] max-w-[92vw] items-center gap-10 px-5 py-16 md:grid-cols-12">
            <motion.div className="md:col-span-7" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-gold/90">Stay at Omaru Farm · Phillip Island</p>
              <h1 className="font-heading text-5xl leading-tight text-white md:text-7xl">
                Wake Up to the<br />
                <span className="italic text-gold">Beautiful View</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85">
                Stay on the farm in one of our self-contained cabins and fall asleep to paddock views and farm sounds.
                Or choose one of our nearby holiday homes — the perfect island base.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[
                  { icon: <BedDouble className="h-3.5 w-3.5" />, label: '2 On-Farm Cabins' },
                  { icon: <BedDouble className="h-3.5 w-3.5" />, label: '2 Holiday Homes' },
                  { icon: <Waves className="h-3.5 w-3.5" />, label: 'Ocean Views' },
                  { icon: <MapPin className="h-3.5 w-3.5" />, label: '5 min to Penguin Parade' },
                ].map((b) => (
                  <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur-sm">
                    <span className="text-gold">{b.icon}</span>
                    {b.label}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="bg-gold text-white hover:bg-gold-deep">
                  <a href="#book">Book Your Stay</a>
                </Button>
                <Button variant="outline" asChild className="border-white/50 text-white hover:bg-white/10">
                  <a href="#stays">View Accommodation</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── ON-FARM CABINS ───────────────────────────────────── */}
        <section id="stays" className="bg-cream py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} custom={0} variants={fadeUp}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">On-Farm Stays</p>
              <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Self-Contained Farm Cabins</h2>
              <p className="mt-3 max-w-2xl text-base text-stone">
                Both cabins are fully self-contained and set within the farm grounds — wake up to paddock views,
                wander to the café for lunch, and fall asleep to the sounds of the countryside.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {ON_FARM_CABINS.map((cabin, idx) => (
                <motion.div
                  key={cabin.id}
                  className="overflow-hidden rounded-2xl border border-parchment bg-white shadow-sm"
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} custom={idx * 0.08} variants={fadeUp}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={cabin.image}
                      alt={cabin.name}
                      className="h-64 w-full object-cover transition duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    {cabin.badge && (
                      <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-medium text-white">
                        {cabin.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">{cabin.type}</p>
                    <h3 className="mt-2 font-heading text-2xl text-charcoal">{cabin.name}</h3>
                    <p className="mt-1 text-sm italic text-stone">{cabin.tagline}</p>
                    <p className="mt-4 text-sm leading-relaxed text-stone">{cabin.description}</p>
                    <ul className="mt-5 space-y-2">
                      {cabin.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-bark">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex items-center justify-between border-t border-parchment pt-5">
                      <span className="flex items-center gap-2 text-sm text-stone">
                        <Users className="h-4 w-4 text-gold" />
                        {cabin.guests} guests
                      </span>
                      <Button asChild className="bg-gold px-3 py-1.5 text-xs text-white hover:bg-gold-deep">
                        <a href="#book">Enquire Now</a>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOLIDAY HOMES ────────────────────────────────────── */}
        <section className="bg-sand py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} custom={0} variants={fadeUp}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Off-Farm Stays</p>
              <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Holiday Homes</h2>
              <p className="mt-3 max-w-2xl text-base text-stone">
                Our two holiday homes are located nearby on Phillip Island — perfect for families or groups who want
                the freedom and space of a full home, while staying close to Omaru Farm and all island attractions.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {HOLIDAY_HOMES.map((home, idx) => (
                <motion.div
                  key={home.id}
                  className="overflow-hidden rounded-2xl border border-parchment bg-white shadow-sm"
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} custom={idx * 0.08} variants={fadeUp}
                >
                  <div className="overflow-hidden">
                    <img
                      src={home.image}
                      alt={home.name}
                      className="h-56 w-full object-cover transition duration-500 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 md:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">{home.type}</p>
                    <h3 className="mt-2 font-heading text-2xl text-charcoal">{home.name}</h3>
                    <p className="mt-1 text-sm italic text-stone">{home.tagline}</p>
                    <p className="mt-4 text-sm leading-relaxed text-stone">{home.description}</p>
                    <ul className="mt-5 space-y-2">
                      {home.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-bark">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex items-center justify-between border-t border-parchment pt-5">
                      <span className="flex items-center gap-2 text-sm text-stone">
                        <Users className="h-4 w-4 text-gold" />
                        {home.guests} guests
                      </span>
                      <Button asChild className="bg-gold px-3 py-1.5 text-xs text-white hover:bg-gold-deep">
                        <a href="#book">Enquire Now</a>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EXPERIENCE SECTION ───────────────────────────────── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <img
            src={staticUrl('/images/farm/AEA8C771269A966E816D1F714AD4BE2D.JPG')}
            alt="Breathtaking views from Omaru Farm accommodation"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-charcoal/60" />
          <div className="relative mx-auto max-w-[92vw] px-5 text-white">
            <motion.div className="text-center" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} custom={0} variants={fadeUp}>
              <h2 className="font-heading text-4xl md:text-5xl">The Omaru Stay Experience</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-white/85">
                More than just a place to sleep. Staying at Omaru means waking to farm sounds, dining on food grown steps from your door,
                and exploring Phillip Island with the best base on the island.
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { icon: '🌅', label: 'Sunrise Paddock Views', desc: 'Wake up to breathtaking vistas every morning' },
                  { icon: '🐾', label: 'Farm Animal Encounters', desc: 'Meet ponies, lambs, goats, and wallabies at dusk' },
                  { icon: '🍽️', label: 'Farm-to-Table Dining', desc: 'Lunch and dinner in the café, minutes from your cabin' },
                  { icon: '🐧', label: '5 min to Penguin Parade', desc: 'The world-famous penguin colony is on your doorstep' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm text-center">
                    <span className="text-3xl">{item.icon}</span>
                    <p className="mt-3 font-medium text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-white/75">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── BOOKING FORM ─────────────────────────────────────── */}
        <section id="book" className="bg-cream py-20 md:py-24">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="mx-auto max-w-2xl rounded-2xl border border-parchment bg-white p-6 shadow-sm md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Book Your Stay</p>
              <h2 className="mt-2 font-heading text-3xl text-charcoal">Accommodation Enquiry</h2>
              <p className="mt-2 text-sm text-stone">
                Fill in your details and we'll be in touch with availability and pricing within 24 hours.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-2xl border border-sage/30 bg-fern/30 p-8 text-center">
                  <p className="font-heading text-2xl text-charcoal">Enquiry Received!</p>
                  <p className="mt-2 text-sm text-stone">Thank you — we'll be in touch within 24 hours with availability and pricing.</p>
                </div>
              ) : (
                <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-widest text-stone">Property</label>
                    <select
                      value={property}
                      onChange={(e) => setProperty(e.target.value)}
                      className="field mt-2"
                    >
                      <optgroup label="On-Farm Cabins">
                        <option>The Paddock Cabin</option>
                        <option>The Grove Cabin</option>
                      </optgroup>
                      <optgroup label="Holiday Homes">
                        <option>Ventnor Retreat</option>
                        <option>Island Cottage</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-widest text-stone">Full Name</label>
                      <input className="field mt-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-widest text-stone">Email</label>
                      <input className="field mt-2" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-widest text-stone">Check-In Date</label>
                      <input className="field mt-2" type="date" required />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-widest text-stone">Check-Out Date</label>
                      <input className="field mt-2" type="date" required />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-widest text-stone">Number of Guests</label>
                    <select value={guests} onChange={(e) => setGuests(e.target.value)} className="field mt-2">
                      {['1', '2', '3', '4', '5', '6'].map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-widest text-stone">Special Requests</label>
                    <textarea className="field mt-2 resize-none" rows={4} placeholder="Dietary requirements, pet-friendly, accessibility, early check-in, celebrations…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <Button type="submit" className="w-full bg-gold text-white hover:bg-gold-deep">
                    Send Enquiry
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-center text-xs text-stone">
                    <MapPin className="mr-1 inline h-3 w-3 text-gold" />
                    776 Ventnor Road, Ventnor, Phillip Island VIC 3922
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
