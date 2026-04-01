import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Leaf, Sparkles, UserRound, Wheat } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function AboutPage() {
  const imagePool = useMemo(
    () => [
      { src: '/images/farm/image-farm/7CD1DA41BA7E970B38EA4E75B43CD7CD.JPG', alt: 'Aerial view of Omaru Farm market gardens', label: 'Market Gardens', caption: 'Our solar-powered growing hub viewed from above' },
      { src: '/images/farm/image-farm/DC543FC904F0A78254E08248B5D588EC.JPG', alt: 'Aerial view of Omaru Farm outdoor dining and grounds', label: 'Farm Grounds', caption: 'Sweeping grounds with outdoor picnic seating' },
      { src: '/images/farm/image-farm/IMG_4637.jpg', alt: 'Fresh produce box and artisan pantry inside the farm store', label: 'Farm Store', caption: 'Seasonal produce and artisan pantry goods, ready to take home' },
      { src: '/images/farm/image-farm/IMG_4672.JPG', alt: 'Guests celebrating at sunset on the Omaru Farm lawn', label: 'Sunset Gathering', caption: 'Friends and family gathered at golden hour on the lawn' },
      { src: '/images/farm/image-farm/IMG_4682.jpg', alt: 'Group dining together inside Café Omaru at night', label: 'Café Dinner', caption: 'A warm evening feast shared around the table' },
      { src: '/images/farm/image-farm/IMG_4724.jpg', alt: 'Guests enjoying lunch inside Café Omaru', label: 'Café Lunch', caption: 'Good food, good company — a typical afternoon at Café Omaru' },
      { src: '/images/farm/image-farm/IMG_4737.jpg', alt: 'Two people holding sunflowers in the Omaru Farm garden', label: 'Garden Life', caption: 'Sunflower season in full bloom at our kitchen garden' },
      { src: '/images/farm/image-farm/IMG_4757.jpg', alt: 'Café Omaru entrance with a horse rider in the foreground', label: 'Café Entrance', caption: 'Guests arrive by foot — or by horse — at Café Omaru' },
      { src: '/images/farm/image-farm/IMG_4976.JPG', alt: 'Farmer feeding a large flock of free-range chickens', label: 'Free Range', caption: 'Morning feed for our free-range flock' },
      { src: '/images/farm/image-farm/IMG_6051.jpg', alt: 'Café Omaru bar with wine bottles and glasses', label: 'The Bar', caption: 'A curated selection of local wines and spirits' },
      { src: '/images/farm/image-farm/IMG_7318.jpg', alt: 'Café Omaru interior dining room set for service', label: 'Café Interior', caption: 'Warm lighting and welcoming tables, ready for guests' },
      { src: '/images/farm/image-farm/IMG_7807.jpg', alt: 'Three-tier afternoon tea stand with cakes and pastries', label: 'Afternoon Tea', caption: 'House-made treats on our signature afternoon tea stand' },
      { src: '/images/farm/image-farm/IMG_8196.jpg', alt: 'Children feeding baby goats on Omaru Farm', label: 'Farm Animals', caption: 'Little hands, big smiles — meeting the baby goats' },
    ],
    [],
  )

  const transforms = useMemo(
    () => [
      { rot: -7, x: -34, y: 26 },
      { rot: 6, x: 28, y: 10 },
      { rot: -2, x: 0, y: -18 },
    ],
    [],
  )
  const fanTransforms = useMemo(
    () => [
      { rot: -10, x: -56, y: 46 },
      { rot: 10, x: 52, y: 26 },
      { rot: 0, x: 0, y: -32 },
    ],
    [],
  )

  const [stackStart, setStackStart] = useState(0)
  const [fanOpen, setFanOpen] = useState(false)
  const [rosieOpen, setRosieOpen] = useState(false)
  const stack = useMemo(() => {
    const n = imagePool.length
    return [0, 1, 2].map((k) => imagePool[(stackStart + k) % n])
  }, [imagePool, stackStart])
  const [topCard, setTopCard] = useState(2)
  const selectedIndex = useMemo(() => (stackStart + topCard) % imagePool.length, [imagePool.length, stackStart, topCard])

  return (
    <>
      <Helmet>
        <title>About | Omaru Farm</title>
        <meta name="description" content="Learn about Omaru Farm’s story, values, and sustainable approach." />
      </Helmet>

      <main className="bg-[#0b0b0b]">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold/15">
          <div className="absolute inset-0">
            <img
              src="/images/farm/IMG_0623.jpg"
              alt=""
              className="h-full w-full object-cover opacity-55"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#0b0b0b]" />
          </div>

          <div className="relative mx-auto max-w-[92vw] px-5 py-20 md:py-28">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-xs uppercase tracking-[0.28em] text-gold/75"
            >
              About Omaru
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-4 max-w-3xl font-heading text-5xl leading-[0.98] text-[#f5efe2] md:text-6xl"
            >
              Nurturing the land for a century.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base"
            >
              Omaru Farm is a premium yet earthy destination — where seasonal produce, thoughtful hospitality, and small-batch pantry goods come
              together in a calm, luxurious farm-to-table experience.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/store">
                <Button>Explore Store</Button>
              </Link>
              <Link to="/book">
                <Button variant="outline">Book Now</Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Legacy feature */}
        <section className="border-b border-gold/10 bg-[#0b0b0b]">
          <div className="mx-auto grid max-w-[92vw] gap-8 px-5 py-16 md:grid-cols-12 md:items-center md:py-20">
            <motion.div
              className="md:col-span-5"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.5 }}
            >
              <div className="overflow-hidden rounded-2xl border border-gold/15 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
                <div className="aspect-[4/3]">
                  <img
                    src="/images/farm/IMG_6144.jpg"
                    alt="Omaru Farm legacy"
                    className="h-full w-full object-cover opacity-95"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.26em] text-gold/70">Omaru Farm</p>
                  <p className="mt-1 font-heading text-2xl text-[#f5efe2]">Our Legacy</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-7 md:pl-4"
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-heading text-4xl leading-[1] text-[#f5efe2] md:text-5xl">Our Legacy</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
                Built on patient craft and deep respect for the land, Omaru has grown into a place where guests can taste the seasons, meet the
                makers, and take home pantry essentials made with intention.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#pillars"
                  className="text-sm font-semibold text-white/80 underline decoration-white/20 underline-offset-4 hover:text-gold hover:decoration-gold/50"
                >
                  See our pillars
                </a>
                <span className="text-white/25">•</span>
                <Link
                  to="/contact"
                  className="text-sm font-semibold text-white/80 underline decoration-white/20 underline-offset-4 hover:text-gold hover:decoration-gold/50"
                >
                  Talk to us
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pillars + Living earth (merged) */}
        <section id="pillars" className="border-t border-gold/10 bg-[#0b0b0b]">
          <div className="mx-auto max-w-[92vw] px-5 py-16 md:py-20">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gold/15" />
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Our Foundations</p>
              <div className="h-px flex-1 bg-gold/15" />
            </div>

            <div className="mt-6 grid gap-6 md:min-h-[860px] md:grid-cols-2 md:gap-5">
              <motion.div
                className="grid h-full gap-5 md:grid-rows-[auto_1fr]"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45 }}
              >
                <div className="rounded-[28px] border border-gold/15 bg-[#111113] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.48)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-gold/70">Living Earth</p>
                  <h2 className="mt-3 font-heading text-4xl leading-[0.96] text-[#f5efe2] md:text-5xl">The Living Earth of Omaru</h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
                    Our work is guided by sustainability, quality, and heritage. Every harvest, meal, and product is shaped by patience, restraint,
                    and a quiet respect for the land.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {['Seasonal harvests', 'Small-batch craft', 'Natural ingredients'].map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-gold/15 bg-black/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/65"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid h-full gap-4 rounded-[28px] border border-gold/15 bg-[#111113] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.48)] md:grid-rows-3">
                  {[
                    {
                      title: 'Sustainability',
                      icon: Leaf,
                      body: 'Minimising waste, respecting seasons, and choosing what feels honest and natural.',
                    },
                    {
                      title: 'Quality',
                      icon: Sparkles,
                      body: 'Premium ingredients, thoughtful craft, and a standard felt in every detail.',
                    },
                    {
                      title: 'Heritage',
                      icon: Wheat,
                      body: 'A story carried forward through consistency, care, and a deep connection to place.',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.45, delay: i * 0.05 }}
                      className="flex h-full items-start gap-4 rounded-2xl border border-gold/12 bg-black/25 p-5"
                    >
                      <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-gold/15 bg-black/35 text-gold">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-heading text-2xl text-[#f5efe2]">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/68">{item.body}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              >
                <div className="relative h-full min-h-[520px] overflow-visible rounded-[28px] border border-gold/15 bg-black/10 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] md:min-h-[740px]">
                  <div className="absolute left-6 top-6 rounded-full border border-gold/20 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold/80 backdrop-blur">
                    Moments from Omaru
                  </div>

                  <div className="relative mx-auto mt-14 h-[440px] w-full max-w-[560px] md:mt-16 md:h-[600px]">
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -z-10"
                      initial={false}
                      animate={{ x: [0, 10, -10, 0], y: [0, -8, 8, 0] }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(205,163,73,0.22),transparent_60%)] blur-2xl md:h-[680px] md:w-[680px]" />
                      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)] blur-3xl md:h-[680px] md:w-[680px]" />
                    </motion.div>

                    {stack.map((img, idx) => {
                      const isTop = idx === topCard
                      const z = isTop ? 20 : 10 + idx
                      const t = (fanOpen ? fanTransforms : transforms)[idx]
                      return (
                      <motion.button
                        key={img.src}
                        type="button"
                        aria-label={`Photo card: ${img.label}`}
                        onClick={() => setTopCard(idx)}
                        initial={false}
                        animate={{
                          x: t.x,
                          y: t.y + (isTop ? -6 : 0),
                          rotate: t.rot,
                          scale: isTop ? 1.015 : 0.985,
                        }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                        whileHover={{ y: t.y - 14, rotate: 0, scale: 1.02 }}
                        whileTap={{ y: t.y - 18, rotate: 0, scale: 1.03 }}
                        drag={isTop ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                          const dx = info.offset.x
                          if (dx > 90) {
                            setStackStart((s) => (s - 1 + imagePool.length) % imagePool.length)
                            setTopCard(2)
                          } else if (dx < -90) {
                            setStackStart((s) => (s + 1) % imagePool.length)
                            setTopCard(2)
                          }
                        }}
                        className="absolute left-1/2 top-1/2 w-[96%] -translate-x-1/2 -translate-y-1/2 text-left"
                        style={{ zIndex: z }}
                      >
                        <div
                          className={[
                            'relative overflow-hidden rounded-[26px] border bg-[#0f0f10] shadow-[0_30px_90px_rgba(0,0,0,0.65)]',
                            isTop ? 'border-gold/30' : 'border-gold/22',
                          ].join(' ')}
                        >
                          {/* pin */}
                          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
                            <div className="h-3.5 w-3.5 rounded-full bg-gold shadow-[0_10px_24px_rgba(205,163,73,0.45)]" />
                            <div className="mx-auto -mt-1 h-3 w-px bg-gold/70" />
                          </div>

                          <div className="bg-[#f5efe2] p-3">
                            <div className="overflow-hidden rounded-[18px] border border-black/10 bg-black/5">
                              <img
                                src={img.src}
                                alt={img.alt}
                                className="h-64 w-full object-cover md:h-80"
                                loading="lazy"
                              />
                            </div>
                            <div className="px-1 pb-1 pt-3">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-black/55">Omaru • {img.label}</p>
                              <p className="mt-1 font-heading text-xl text-black/85">{img.caption}</p>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )})}
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/55">Gallery</p>
                        <p className="text-xs text-white/45">
                          <span className="text-gold/85">{selectedIndex + 1}</span> / {imagePool.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFanOpen((v) => !v)}
                          className="rounded-full border border-gold/20 bg-black/25 px-3 py-1.5 text-xs text-white/75 transition hover:border-gold/40 hover:text-gold"
                        >
                          {fanOpen ? 'Collapse' : 'Fan out'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStackStart((s) => (s - 1 + imagePool.length) % imagePool.length)
                            setTopCard(2)
                          }}
                          className="rounded-full border border-gold/20 bg-black/25 px-3 py-1.5 text-xs text-white/75 transition hover:border-gold/40 hover:text-gold"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStackStart((s) => (s + 1) % imagePool.length)
                            setTopCard(2)
                          }}
                          className="rounded-full border border-gold/20 bg-black/25 px-3 py-1.5 text-xs text-white/75 transition hover:border-gold/40 hover:text-gold"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-gold/15 bg-black/25">
                      <div
                        className="h-full bg-gold/80"
                        style={{ width: `${((selectedIndex + 1) / imagePool.length) * 100}%` }}
                      />
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {imagePool.map((p, i) => {
                        const active = i === stackStart
                        return (
                          <button
                            key={p.src}
                            type="button"
                            onClick={() => {
                              setStackStart(i)
                              setTopCard(2)
                            }}
                            className={`relative h-12 w-16 flex-none overflow-hidden rounded-xl border transition ${
                              active ? 'border-gold/60' : 'border-gold/15 hover:border-gold/35'
                            }`}
                            aria-label={`Show ${p.label}`}
                          >
                            <img src={p.src} alt={p.alt} className="h-full w-full object-cover opacity-90" loading="lazy" />
                            {active && <div className="absolute inset-0 ring-1 ring-gold/35" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <p className="mt-4 text-center text-xs text-white/55">
                    Hover or tap a card to lift it.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Artisans */}
        <section className="border-t border-gold/10 bg-[#0b0b0b] pt-16 pb-16 md:pt-20 md:pb-20">
          <div className="mx-auto max-w-[92vw] px-5">
            <h2 className="font-heading text-4xl text-[#f5efe2] md:text-5xl">Meet the Artisan</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              There’s one heart behind the entire Omaru Farm experience — guiding the land, the hospitality, and every detail with care.
            </p>

            <div className="mt-10">
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55 }}
                className="relative overflow-hidden rounded-2xl border border-gold/15 bg-[#141416]/70 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(205,163,73,0.10),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(99,73,42,0.16),transparent_60%)]" />

                <div className="relative grid gap-6 p-6 md:grid-cols-12 md:items-center md:gap-10 md:p-10">
                  <button
                    type="button"
                    onClick={() => setRosieOpen(true)}
                    className="group relative overflow-hidden rounded-2xl border border-gold/15 bg-black/30 shadow-[0_22px_70px_rgba(0,0,0,0.55)] md:col-span-5"
                    aria-label="Open Rosie Maurer photo"
                  >
                    <img
                      src="/images/farm/rosie-maurer.jpg"
                      alt="Rosie Maurer at Omaru Farm"
                      className="h-[320px] w-full object-cover [filter:contrast(1.08)_saturate(1.06)_brightness(1.02)] transition duration-700 group-hover:scale-[1.04] md:h-[420px]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-black/45 px-3 py-1 text-xs text-white/80 backdrop-blur">
                      <span className="grid h-5 w-5 place-items-center rounded-full border border-gold/20 bg-black/25 text-gold/85">
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      Founder
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.28em] text-white/70">Tap to enlarge</p>
                      <span className="rounded-full border border-gold/20 bg-black/35 px-3 py-1 text-xs text-gold/90">
                        View photo
                      </span>
                    </div>
                  </button>

                  <div className="md:col-span-7">
                    <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Omaru Farm</p>
                    <h3 className="mt-3 font-heading text-4xl text-[#f5efe2] md:text-5xl">Rosie Maurer</h3>
                    <p className="mt-2 text-sm text-white/65 md:text-base">Founder &amp; Host</p>

                    <p className="mt-5 text-sm leading-relaxed text-white/70 md:text-base">
                      From the farm gates to the table, Rosie shapes the Omaru experience end-to-end — growing, welcoming, and crafting the
                      calm premium feel guests remember.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/65">
                      {[
                        { icon: <Leaf className="h-4 w-4 text-gold/85" />, text: 'Farm-to-table focus' },
                        { icon: <Wheat className="h-4 w-4 text-gold/85" />, text: 'Seasonal produce' },
                        { icon: <Sparkles className="h-4 w-4 text-gold/85" />, text: 'Quiet premium hospitality' },
                      ].map((b) => (
                        <span key={b.text} className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-white/[0.03] px-3 py-1.5">
                          {b.icon}
                          {b.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </section>

        {/* Rosie lightbox */}
        {rosieOpen && (
          <div
            className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Rosie Maurer photo"
            onClick={() => setRosieOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gold/25 bg-[#0b0b0b]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-gold/15 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#f5efe2]">Rosie Maurer</p>
                  <p className="text-xs text-white/55">Founder &amp; Host</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRosieOpen(false)}
                  className="rounded-full border border-gold/20 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.06]"
                >
                  Close
                </button>
              </div>
              <div className="relative">
                <img
                  src="/images/farm/rosie-maurer.jpg"
                  alt="Rosie Maurer at Omaru Farm"
                  className="max-h-[78vh] w-full object-contain bg-black [filter:contrast(1.08)_saturate(1.06)_brightness(1.02)]"
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/15" />
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </>
  )
}

