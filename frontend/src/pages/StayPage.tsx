import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, Gem, Leaf, MapPin, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { staticUrl } from '@/utils/staticUrl'

export function StayPage() {
  return (
    <>
      <Helmet>
        <title>Stay | Omaru Farm</title>
        <meta name="description" content="Explore Omaru Farm accommodation options and booking requests." />
      </Helmet>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold/20">
          <img
            src="/images/farm/2025-01-12-8.jpg"
            alt="A peaceful retreat stay at Omaru Farm"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

          <div className="relative mx-auto grid min-h-[72vh] max-w-[92vw] items-end gap-10 px-5 pb-14 pt-12 md:grid-cols-12 md:items-center">
            <motion.div
              className="md:col-span-7"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.32em] text-gold/80">Stay at Omaru</p>
              <h1 className="mt-4 font-heading text-6xl leading-[0.9] text-[#f5efe2] md:text-7xl">
                A Sanctuary
                <br />
                of <span className="italic">Silence</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
                Slow mornings, warm light, and nights that feel truly still. Choose a retreat designed to reconnect you with the land.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/55">
                {[
                  { icon: <MapPin className="h-4 w-4 text-gold/90" />, text: 'Omaru Farm, coastal countryside' },
                  { icon: <Leaf className="h-4 w-4 text-gold/90" />, text: 'Farm-to-table breakfast included' },
                  { icon: <Sparkles className="h-4 w-4 text-gold/90" />, text: 'Premium, earthy comfort' },
                ].map((b) => (
                  <span
                    key={b.text}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-black/30 px-3 py-1"
                  >
                    {b.icon}
                    {b.text}
                  </span>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="px-6 py-2.5">
                  <a href="#book">Book Your Retreat</a>
                </Button>
                <Button variant="outline" asChild className="px-6 py-2.5">
                  <a href="#stays">Explore The Stays</a>
                </Button>
              </div>
            </motion.div>

            <div className="hidden md:col-span-5 md:block" />
          </div>
        </section>

        {/* The Stays */}
        <section id="stays" className="bg-[#0b0b0b] py-18 md:py-22">
          <div className="mx-auto max-w-[92vw] px-5 py-20">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70">The Stays</p>
              <h2 className="mt-3 font-heading text-4xl text-[#f5efe2] md:text-5xl">Designed to slow time.</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
                Select a stay that matches your mood—sunlit glass, heritage stone, or a tucked-away cabin. Each is curated with quiet luxury.
              </p>
            </div>

            <div className="mt-10 space-y-12">
              {[
                {
                  badge: 'Arrival',
                  title: 'The Garden Walkway',
                  desc:
                    'A calm, open-air arrival—flower-lined paths, fresh coastal air, and a retreat that begins the moment you step onto the grounds.',
                  image: staticUrl('/images/farm/IMG_9130.jpg'),
                  meta: [
                    { icon: <MapPin className="h-4 w-4" />, label: 'On-site café' },
                    { icon: <Leaf className="h-4 w-4" />, label: 'Seasonal planters' },
                    { icon: <Sparkles className="h-4 w-4" />, label: 'Coastal light' },
                  ],
                  align: 'left' as const,
                },
                {
                  badge: 'Morning',
                  title: 'Breakfast & Barista Corner',
                  desc:
                    'Unhurried mornings with barista coffee, farm milk, and a simple breakfast station—set beside wide windows and soft light.',
                  image: staticUrl('/images/farm/IMG_0622.jpg'),
                  meta: [
                    { icon: <Gem className="h-4 w-4" />, label: 'Barista coffee' },
                    { icon: <Leaf className="h-4 w-4" />, label: 'Farm milk & pantry' },
                    { icon: <Users className="h-4 w-4" />, label: 'Easy, self-serve' },
                  ],
                  align: 'right' as const,
                },
              ].map((stay, idx) => {
                const isRight = stay.align === 'right'
                return (
                  <motion.article
                    key={stay.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className="grid items-center gap-8 md:grid-cols-12"
                  >
                    <div className={['md:col-span-7', isRight ? 'md:order-2' : ''].join(' ')}>
                      <div className="relative overflow-hidden rounded-2xl border border-gold/15 bg-black/30 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
                        <img
                          src={stay.image}
                          alt={stay.title}
                          className="h-[320px] w-full object-cover transition duration-700 hover:scale-[1.03] md:h-[360px]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-black/40 px-3 py-1 text-xs text-white/75 backdrop-blur">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                          {stay.badge}
                        </div>
                      </div>
                    </div>

                    <div className={['md:col-span-5', isRight ? 'md:order-1' : ''].join(' ')}>
                      <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Stay</p>
                      <h3 className="mt-3 font-heading text-3xl text-[#f5efe2] md:text-4xl">{stay.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-base">{stay.desc}</p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {stay.meta.map((m) => (
                          <span
                            key={m.label}
                            className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                          >
                            <span className="text-gold/85">{m.icon}</span>
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>

        {/* The Experience */}
        <section id="experience" className="border-y border-gold/20 bg-[#151515] py-20">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70">The Experience</p>
              <h2 className="mt-3 font-heading text-4xl text-[#f5efe2] md:text-5xl">Small moments, lasting calm.</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-12">
              <div className="md:col-span-6">
                <div className="relative overflow-hidden rounded-2xl border border-gold/15 bg-black/30">
                  <img
                    src={staticUrl('/images/farm/IMG_4141.jpg')}
                    alt="A quiet moment at Omaru Farm"
                    className="aspect-[4/5] w-full object-cover object-center opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-gold/75">Featured</p>
                    <p className="mt-2 font-heading text-2xl text-[#f5efe2]">Cosmic Silence</p>
                    <p className="mt-2 text-sm text-white/65">Stargazing nights, gentle breezes, and the sound of the sea in the distance.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:col-span-6 md:grid-cols-2">
                {[
                  {
                    title: 'Farm-to-Table',
                    desc: 'Seasonal breakfast, garden produce, and pantry treats.',
                    icon: <Leaf className="h-5 w-5" />,
                    image: staticUrl('/images/farm/IMG_4256.jpg'),
                  },
                  {
                    title: 'Slow Walks',
                    desc: 'Quiet tracks across fields and coastal views.',
                    icon: <MapPin className="h-5 w-5" />,
                    image: staticUrl('/images/farm/IMG_4638.jpg'),
                  },
                  {
                    title: 'Tea Ritual',
                    desc: 'Afternoon tea moments, warm and unhurried.',
                    icon: <Sparkles className="h-5 w-5" />,
                    image: staticUrl('/images/farm/IMG_4547.jpg'),
                  },
                  {
                    title: 'Local Discoveries',
                    desc: 'Curated recommendations beyond the farm gate.',
                    icon: <Gem className="h-5 w-5" />,
                    image: staticUrl('/images/farm/IMG_7307.jpg'),
                  },
                ].map((x) => (
                  <div
                    key={x.title}
                    className="group relative min-h-[260px] overflow-hidden rounded-2xl border border-gold/15 bg-black/30"
                  >
                    <img
                      src={x.image}
                      alt={x.title}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-85 transition duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-gold/10" />

                    <div className="relative flex h-full flex-col justify-between p-6">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/15 bg-black/30 text-gold/85 backdrop-blur">
                        {x.icon}
                      </div>

                      <div>
                        <p className="font-heading text-2xl text-[#f5efe2]">{x.title}</p>
                        <p className="mt-2 text-sm text-white/70">{x.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Book Your Retreat */}
        <section id="book" className="bg-[#0b0b0b] py-20">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gold/20 bg-white/[0.03] p-6 md:p-10">
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70 text-center">Book Your Retreat</p>
              <h2 className="mt-3 text-center font-heading text-4xl text-[#f5efe2] md:text-5xl">Book Your Retreat</h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/70 md:text-base">
                Share your preferred dates and a few details. We’ll confirm availability and reply by email.
              </p>

              <form className="mt-8 grid gap-4 md:grid-cols-12" onSubmit={(e) => e.preventDefault()}>
                <div className="md:col-span-6">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Arrival</p>
                  <div className="relative mt-2">
                    <input className="field bg-black/20 pr-10" type="date" aria-label="Arrival date" />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
                  </div>
                </div>
                <div className="md:col-span-6">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Departure</p>
                  <div className="relative mt-2">
                    <input className="field bg-black/20 pr-10" type="date" aria-label="Departure date" />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
                  </div>
                </div>

                <div className="md:col-span-6">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Full name</p>
                  <input className="field mt-2 bg-black/20" placeholder="Your name" />
                </div>
                <div className="md:col-span-6">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Email</p>
                  <input className="field mt-2 bg-black/20" placeholder="you@example.com" type="email" />
                </div>

                <div className="md:col-span-12">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Notes (optional)</p>
                  <textarea className="field mt-2 min-h-[110px] resize-none bg-black/20" placeholder="Stay preference, guest count, special requests…" />
                </div>

                <div className="md:col-span-12">
                  <Button type="submit" className="w-full">
                    Send Request
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="mt-3 text-center text-xs text-white/45">
                    We’ll respond by email. For urgent requests, contact us directly.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

