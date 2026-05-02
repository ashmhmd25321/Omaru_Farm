import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BedDouble, ChevronLeft, ChevronRight, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
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

export function AboutPage() {
  const [aboutContent, setAboutContent] = useState({
    legacyTitle: 'Our Legacy',
    legacyDescription:
      'Built on patient craft and deep respect for the land, Omaru has grown into a place where guests can taste the seasons, meet the makers, and take home pantry essentials made with intention.',
    foundationTitle: 'Artisanal Stewardship',
    foundationDescription:
      'Our work is guided by sustainability, quality, and heritage. Every harvest, meal, and product is shaped by patience, restraint, and a quiet respect for the land.',
  })
  const [sanctuarySlide, setSanctuarySlide] = useState(0)
  const [pauseSanctuarySlider, setPauseSanctuarySlider] = useState(false)

  const sanctuarySlides = [
    {
      src: staticUrl('/images/farm/image-farm/IMG_4672.JPG'),
      alt: 'Golden evening gathering at Omaru Farm',
      label: 'Golden Hour Gatherings',
    },
    {
      src: staticUrl('/images/farm/image-farm/IMG_4682.jpg'),
      alt: 'Night dinner gathering at Omaru',
      label: 'Evening Table',
    },
    {
      src: staticUrl('/images/farm/image-farm/IMG_6051.jpg'),
      alt: 'Wine and bar collection at Omaru',
      label: 'Curated Local Wines',
    },
    {
      src: staticUrl('/images/farm/image-farm/DC543FC904F0A78254E08248B5D588EC.JPG'),
      alt: 'Aerial view of Omaru Farm grounds',
      label: 'The Omaru Estate',
    },
    {
      src: staticUrl('/images/farm/image-farm/IMG_4976.JPG'),
      alt: 'Feeding chickens at Omaru Farm',
      label: 'Farm Morning Rituals',
    },
    {
      src: staticUrl('/images/farm/image-farm/IMG_7807.jpg'),
      alt: 'Afternoon tea selection at Omaru',
      label: 'Afternoon Tea on the Deck',
    },
  ]

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/content/about`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        setAboutContent((prev) => ({
          legacyTitle: String(value.legacyTitle ?? prev.legacyTitle),
          legacyDescription: String(value.legacyDescription ?? prev.legacyDescription),
          foundationTitle: String(value.foundationTitle ?? prev.foundationTitle),
          foundationDescription: String(value.foundationDescription ?? prev.foundationDescription),
        }))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (pauseSanctuarySlider) return
    const timer = window.setInterval(
      () => setSanctuarySlide((p) => (p + 1) % sanctuarySlides.length),
      4500,
    )
    return () => window.clearInterval(timer)
  }, [pauseSanctuarySlider, sanctuarySlides.length])

  return (
    <>
      <Helmet>
        <title>About | Omaru Farm</title>
        <meta
          name="description"
          content="Discover the story of Omaru Farm — a premium farm-to-table destination rooted in sustainability, heritage, and breathtaking views on Phillip Island."
        />
      </Helmet>

      <main>

        {/* ══════════════════════════════════════════
            HERO — centered editorial text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[82vh] items-center justify-center overflow-hidden bg-surface">
          <img
            src={staticUrl('/images/farm/20211027_195611.jpg')}
            alt="Rolling countryside at Omaru Farm, Phillip Island"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          {/* Layered overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/8 via-transparent to-black/6" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.16)_38%,transparent_72%)]" />

          <div className="relative z-10 mx-auto w-full max-w-[92vw] px-5 text-center">
            <motion.p
              className="mb-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-gold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Est. 2024
            </motion.p>
            <motion.h1
              className="hero-headline mx-auto max-w-3xl font-heading text-[2.7rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl md:text-[4.6rem]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              The Spirit of Omaru
            </motion.h1>
            <motion.p
              className="mx-auto mt-5 max-w-2xl font-body text-base leading-[1.75] text-white/92 md:text-[1.45rem]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.35 }}
            >
              In the ancient tongue, Omaru signifies "Place of Shelter". We have cultivated this land to be a sanctuary for the modern agrarian soul.
            </motion.p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ROOTS IN THE SOIL
            Left: image  |  Right: story text
        ══════════════════════════════════════════ */}
        <section className="bg-white py-24 md:py-32">
          <div className="mx-auto grid max-w-[92vw] items-center gap-12 px-5 md:grid-cols-[2fr_3fr] md:gap-20 lg:gap-28">

            {/* Left: image */}
            <motion.div
              className="group relative overflow-hidden rounded-sm"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <img
                src={staticUrl('/images/farm/20210910_180301.jpg')}
                alt="Sunrise over free-range hens at Omaru Farm"
                className="h-72 w-full object-cover transition duration-700 group-hover:scale-[1.03] md:h-[410px]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-estate/55 via-estate/10 to-transparent" />
              <div className="absolute left-4 top-4 rounded-sm bg-white/88 px-3 py-1.5 font-body text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gold-deep backdrop-blur-sm">
                First Light
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white/82">
                  Sunrise Feed Rounds
                </p>
              </div>
            </motion.div>

            {/* Right: text */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0.12}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
                At First Light
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                Where Morning Begins<br />in the Paddocks
              </h2>
              <p className="mt-6 font-body text-base leading-[1.78] text-stone">
                Before the cafe opens, the farm is already awake. The flock gathers at sunrise, the horizon turns amber, and the first rhythm of the day begins quietly by hand.
              </p>
              <p className="mt-4 font-body text-base leading-[1.78] text-stone">
                Omaru grew from one paddock into a living place of care - where soil, season, and people move together. Every meal and every guest experience starts here, in this morning light.
              </p>
              <p className="mt-5 font-body text-base leading-[1.78] text-stone">
                {aboutContent.legacyDescription}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm bg-surface-low px-4 py-3">
                  <p className="font-heading text-2xl font-semibold text-charcoal">
                    5:30<span className="text-gold">am</span>
                  </p>
                  <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-stone">
                    Morning Feed Rounds
                  </p>
                </div>
                <div className="rounded-sm bg-surface-low px-4 py-3">
                  <p className="font-heading text-2xl font-semibold text-charcoal">
                    100<span className="text-gold">%</span>
                  </p>
                  <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-stone">
                    Free-Range Flock
                  </p>
                </div>
              </div>
              <Link
                to="/contact"
                className="mt-8 inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-[0.15em] text-gold-deep transition hover:text-gold"
              >
                Step Into Our Story <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            FARM LIFE GALLERY
        ══════════════════════════════════════════ */}
        <section className="bg-surface py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div
              className="mb-12 text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              custom={0}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
                Life at Omaru
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                Farm Moments Gallery
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-[1.75] text-stone">
                A living journal of sunsets, harvests, animals, and the quiet details that shape daily life on the farm.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {[
                {
                  src: '/images/farm/20211017_191630.jpg',
                  alt: 'Golden sunset over Omaru Farm gates',
                  caption: 'Evening Glow',
                  tile: 'lg:col-span-4',
                  image: 'h-[320px]',
                },
                {
                  src: '/images/farm/20210522_100834.jpg',
                  alt: 'Young leafy greens in hydroponic channels',
                  caption: 'New Growth',
                  tile: 'lg:col-span-3',
                  image: 'h-[320px]',
                },
                {
                  src: '/images/farm/20210907_144206.jpg',
                  alt: 'Basket of fresh farm eggs collected at Omaru',
                  caption: 'Fresh Collection',
                  tile: 'lg:col-span-3',
                  image: 'h-[320px]',
                },
                {
                  src: '/images/farm/IMG_4256.jpg',
                  alt: 'Basil and herbs growing in Omaru greenhouse',
                  caption: 'Herb House',
                  tile: 'lg:col-span-2',
                  image: 'h-[320px]',
                },
                {
                  src: '/images/farm/IMG_4547.jpg',
                  alt: 'Farm-made treat and floral still life at Omaru',
                  caption: 'Handmade Details',
                  tile: 'lg:col-span-5',
                  image: 'h-[340px]',
                },
                {
                  src: '/images/farm/IMG_6144.jpg',
                  alt: 'Twilight clouds above Omaru Farm seating area',
                  caption: 'Twilight Calm',
                  tile: 'lg:col-span-3',
                  image: 'h-[340px]',
                },
                {
                  src: '/images/farm/IMG_7307.jpg',
                  alt: 'Interior dining space at Cafe Omaru',
                  caption: 'Cafe Interior',
                  tile: 'lg:col-span-4',
                  image: 'h-[340px]',
                },
                {
                  src: '/images/farm/IMG_9130.jpg',
                  alt: 'Cafe Omaru exterior with flowers and walkway',
                  caption: 'Welcome Walk',
                  tile: 'lg:col-span-8',
                  image: 'h-[300px]',
                },
                {
                  src: '/images/farm/PXL_20210512_061750528.PORTRAIT.jpg',
                  alt: 'Close portrait of sheep at Omaru Farm',
                  caption: 'Resident Portrait',
                  tile: 'lg:col-span-4',
                  image: 'h-[300px]',
                },
              ].map((img, idx) => (
                <motion.figure
                  key={img.src}
                  className={`group self-start overflow-hidden rounded-sm bg-white shadow-[0_10px_30px_rgba(26,18,8,0.08)] ${img.tile}`}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.12 }}
                  custom={idx * 0.05}
                  variants={fadeUp}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={staticUrl(img.src)}
                      alt={img.alt}
                      className={`${img.image} w-full object-cover transition duration-700 group-hover:scale-[1.04]`}
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-estate/55 via-transparent to-transparent opacity-90" />
                    <figcaption className="absolute inset-x-0 bottom-0 px-4 py-3 font-body text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white">
                      {img.caption}
                    </figcaption>
                  </div>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            A SANCTUARY FOR THE SENSES
            Light editorial section — text left, dual images right
        ══════════════════════════════════════════ */}
        <section className="bg-white py-24 md:py-32">
          <div className="mx-auto grid max-w-[94vw] items-center gap-12 px-5 md:grid-cols-[1.05fr_1.35fr] md:gap-12 lg:gap-16">

            {/* Left: text block */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <span className="inline-flex items-center gap-2 font-body text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-stone">
                <span className="inline-block h-5 w-[2px] bg-gold/70" aria-hidden />
                The Experience
              </span>

              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                A Sanctuary for the Senses
              </h2>

              <p className="mt-5 font-body text-[1.05rem] leading-[1.7] text-stone">
                Whether it's the aroma of fresh roasted coffee in our stone cafe, the tactile grain of our farmhouse floors, or the golden hour glow over the paddocks, Omaru is designed to be felt as much as seen.
              </p>
              <p className="mt-3 font-body text-[1.05rem] leading-[1.7] text-stone">
                {aboutContent.foundationDescription}
              </p>

              {/* Feature card */}
              <div className="mt-8 rounded-xl bg-surface p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_rgba(26,18,8,0.08)]">
                    <BedDouble className="h-5 w-5 text-gold-deep" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-heading text-[2rem] font-semibold leading-none text-charcoal">
                      Restorative Stay
                    </h3>
                    <p className="mt-2 font-body text-base leading-relaxed text-stone">
                      Our cabins are built with sustainably sourced timber, designed to frame the horizon.
                    </p>
                  </div>
                </div>
                <Link
                  to="/stay"
                  className="mt-5 inline-flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                >
                  Explore stays <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </motion.div>

            {/* Right: animated image slider */}
            <motion.div
              className="relative"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0.14}
              variants={fadeUp}
            >
              <div
                className="group relative overflow-hidden rounded-2xl shadow-[0_14px_34px_rgba(26,18,8,0.12)]"
                onMouseEnter={() => setPauseSanctuarySlider(true)}
                onMouseLeave={() => setPauseSanctuarySlider(false)}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={sanctuarySlides[sanctuarySlide]!.src}
                    src={sanctuarySlides[sanctuarySlide]!.src}
                    alt={sanctuarySlides[sanctuarySlide]!.alt}
                    className="h-[360px] w-full object-cover md:h-[460px]"
                    loading="lazy"
                    initial={{ opacity: 0, scale: 1.08, x: 24 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 1.04, x: -18 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </AnimatePresence>

                {/* Overlay + caption */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-estate/62 via-estate/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 py-4">
                  <p className="font-body text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/92">
                    {sanctuarySlides[sanctuarySlide]!.label}
                  </p>
                  <span className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/65">
                    {String(sanctuarySlide + 1).padStart(2, '0')} / {String(sanctuarySlides.length).padStart(2, '0')}
                  </span>
                </div>

                {/* Controls */}
                <button
                  type="button"
                  onClick={() =>
                    setSanctuarySlide((p) => (p - 1 + sanctuarySlides.length) % sanctuarySlides.length)
                  }
                  className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-sm bg-white/85 text-charcoal backdrop-blur-sm transition hover:bg-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSanctuarySlide((p) => (p + 1) % sanctuarySlides.length)}
                  className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-sm bg-white/85 text-charcoal backdrop-blur-sm transition hover:bg-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {sanctuarySlides.map((_, i) => (
                  <button
                    key={`sanctuary-dot-${i}`}
                    type="button"
                    onClick={() => setSanctuarySlide(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === sanctuarySlide ? 'w-8 bg-gold' : 'w-3 bg-stone/35 hover:bg-stone/55'
                    }`}
                    aria-label={`Show sanctuary image ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            RECONNECT WITH THE LAND — warm CTA
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-sand py-24 md:py-32">
          {/* Subtle texture watermark */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("${staticUrl('/images/farm/20210602_130149.jpg')}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-sand/92" />

          <div className="relative mx-auto max-w-[92vw] px-5 text-center">
            <motion.div
              className="mx-auto max-w-lg"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={0}
              variants={fadeUp}
            >
              {/* Decorative tree icon */}
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-sm bg-gold/15">
                <Sun className="h-7 w-7 text-gold-deep" aria-hidden />
              </div>

              <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                Reconnect with<br />the Land
              </h2>
              <p className="mx-auto mt-5 font-body text-base leading-[1.78] text-stone">
                We invite you to experience the living beauty of Omaru. Join us for a meal, a stay, or simply a moment — let the farm do the rest.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/stay"
                  className="inline-flex h-11 items-center rounded-sm px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_28px_rgba(119,90,25,0.3)] transition hover:brightness-105"
                  style={{ background: GOLD_GRADIENT }}
                >
                  Plan Your Visit
                </Link>
                <Link
                  to="/cafe"
                  className="inline-flex h-11 items-center rounded-sm border border-gold/30 bg-transparent px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-gold-deep transition hover:border-gold/55 hover:bg-gold/6"
                >
                  See the Café Menu
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
    </>
  )
}
