import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Beef,
  Bird,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Footprints,
  Leaf,
  MapPin,
  Mountain,
  PawPrint,
  Rabbit,
  Squirrel,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { featuredProducts } from '@/data/content'
import { productImageUrl } from '@/utils/productImage'
import { staticUrl } from '@/utils/staticUrl'

type Product = {
  id?: number
  name: string
  size: string
  price: string
  image: string
  featured?: boolean
}

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const GOLD_GRADIENT = 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)'

export function HomePage() {
  const [, setProducts] = useState<Product[]>(featuredProducts.slice(0, 4))
  const [currentSlide, setCurrentSlide] = useState(0)
  const [residentGalleryIndex, setResidentGalleryIndex] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const heroImages = useMemo(
    () => [
      staticUrl('/images/farm/AEA8C771269A966E816D1F714AD4BE2D.JPG'),
      staticUrl('/images/farm/IMG_3924.jpg'),
      staticUrl('/images/farm/20210606_172356.jpg'),
      staticUrl('/images/farm/20210602_130149.jpg'),
    ],
    [],
  )

  const animals = useMemo(
    (): { name: string; Icon: LucideIcon }[] => [
      { name: 'Ponies', Icon: Footprints },
      { name: 'Cows & Calves', Icon: Beef },
      { name: 'Sheep & Lambs', Icon: Mountain },
      { name: 'Goats', Icon: Rabbit },
      { name: 'Chooks', Icon: Bird },
      { name: 'Cats & Dogs', Icon: PawPrint },
      { name: 'Wallabies', Icon: Squirrel },
    ],
    [],
  )

  const residentGallery = useMemo(
    () => [
      {
        src: staticUrl('/images/farm/image-farm/IMG_8196.jpg'),
        alt: 'Children feeding friendly goats at Omaru Farm',
        label: 'Goat Feeding',
      },
      {
        src: staticUrl('/images/farm/image-farm/IMG_4976.JPG'),
        alt: 'Free-range chickens at Omaru Farm',
        label: 'Chook Parade',
      },
      {
        src: staticUrl('/images/farm/image-farm/IMG_7318.jpg'),
        alt: 'Ponies wandering the paddocks at Omaru Farm',
        label: 'Paddock Friends',
      },
      {
        src: staticUrl('/images/farm/image-farm/IMG_4724.jpg'),
        alt: 'Family farm moments with animals at Omaru',
        label: 'Farm Encounters',
      },
      {
        src: staticUrl('/images/farm/image-farm/IMG_4737.jpg'),
        alt: 'Farm animals roaming across the Omaru grounds',
        label: 'Morning Rounds',
      },
      {
        src: staticUrl('/images/farm/image-farm/IMG_4757.jpg'),
        alt: 'Guests enjoying close-up farm life at Omaru',
        label: 'Close to Nature',
      },
    ],
    [],
  )

  const visibleResidentPhotos = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => residentGallery[(residentGalleryIndex + i) % residentGallery.length]!)
  }, [residentGallery, residentGalleryIndex])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/products`, { signal: controller.signal })
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        const mapped = rows.map((item: Record<string, unknown>) => ({
          id: Number(item.id ?? 0),
          name: String(item.name ?? ''),
          size: String(item.size ?? ''),
          price: `$${Number(item.price).toFixed(2)}`,
          image: String(item.image ?? ''),
          featured: Boolean(item.featured),
        }))
        const featuredOnly = mapped.filter((x) => x.featured)
        setProducts(featuredOnly.length > 0 ? featuredOnly.slice(0, 4) : mapped.slice(0, 4))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentSlide((p) => (p + 1) % heroImages.length), 6000)
    return () => window.clearInterval(timer)
  }, [heroImages.length])

  return (
    <>
      <Helmet>
        <title>Omaru Farm | Farm-to-Table Dining, Stays & Store on Phillip Island</title>
        <meta
          name="description"
          content="Omaru means 'a beautiful view' — farm-to-table dining, cabin stays, and a premium farm store on Phillip Island, just 5 minutes from the Penguin Parade."
        />
      </Helmet>

      <main>

        {/* ══════════════════════════════════════════
            HERO — full-viewport slideshow, centered
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-svh items-center justify-center overflow-hidden">

          {/* Slideshow */}
          {heroImages.map((img, idx) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-[1500ms] ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={idx !== currentSlide}
            >
              <img
                src={img}
                alt="Omaru Farm, Phillip Island"
                className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[8000ms] ease-out ${idx === currentSlide ? 'scale-[1.05]' : 'scale-100'}`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                fetchPriority={idx === 0 ? 'high' : 'auto'}
              />
            </div>
          ))}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/28 to-black/52" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/12 via-transparent to-black/8" />

          {/* Content — centered */}
          <div className="relative z-10 flex flex-col items-center px-6 pb-36 pt-20 text-center">
            <motion.span
              className="mb-6 inline-flex items-center gap-2 rounded-sm border border-white/18 bg-black/28 px-4 py-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-gold backdrop-blur-md"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Phillip Island, Victoria
            </motion.span>

            <motion.h1
              className="hero-headline max-w-4xl font-heading text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl md:text-[5rem] lg:text-[6rem]"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              Omaru - A Beautiful View
            </motion.h1>

            <motion.p
              className="mt-6 max-w-lg font-body text-base leading-[1.78] text-white/88 md:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.38 }}
            >
              Farm-to-table dining, self-contained cabin stays, and an artisan farm store — just 5 minutes from the Penguin Parade.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.52 }}
            >
              <Link
                to="/cafe"
                className="inline-flex h-11 items-center gap-2 rounded-sm border border-white/30 bg-white/10 px-7 font-body text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/18"
              >
                Explore Farm
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/book"
                className="inline-flex h-11 items-center rounded-sm px-7 font-body text-sm font-semibold tracking-wide text-white shadow-[0_8px_28px_rgba(119,90,25,0.45)] transition hover:brightness-[1.05]"
                style={{ background: GOLD_GRADIENT }}
              >
                Book Now
              </Link>
            </motion.div>
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-[4.25rem] left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroImages.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-[3px] rounded-sm transition-all duration-300 ${
                  idx === currentSlide ? 'w-10 bg-gold' : 'w-3 bg-white/40 hover:bg-white/65'
                }`}
              />
            ))}
          </div>

          {/* Bottom info bar — dark glass so the hero image stays visible (no white fade) */}
          <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/45 backdrop-blur-md">
            <div className="mx-auto flex max-w-[92vw] flex-wrap items-center justify-between gap-3 px-5 py-3 font-body text-xs text-white/85">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
                776 Ventnor Road, Ventnor, Phillip Island VIC 3922
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-gold" />
                Café: Thu–Fri 10am–2pm & 5–8pm · Sat–Sun 10am–8pm
              </span>
              <span className="flex items-center gap-1.5">
                <Leaf className="h-3.5 w-3.5 shrink-0 text-gold" />
                Farm Store: Mon–Sun 9am–5pm
              </span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            THE MEANING OF OMARU
            Left: text + stats  |  Right: dark editorial card
        ══════════════════════════════════════════ */}
        <section className="bg-surface py-24 md:py-32">
          <div className="mx-auto grid max-w-[92vw] gap-14 px-5 md:grid-cols-2 md:gap-16 lg:gap-24">

            {/* Left column */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
                Welcome to Omaru
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                The Meaning<br />of Omaru
              </h2>
              <p className="mt-6 font-body text-base leading-[1.78] text-stone">
                The name <em>"Omaru"</em> comes from the Māori language and means{' '}
                <strong className="font-semibold text-bark">a beautiful view</strong>. Nestled in the rolling green hills of Phillip Island,
                our farm earns that name every single day — with sweeping ocean outlooks, endless open skies,
                and a landscape that restores the soul.
              </p>
              <p className="mt-4 font-body text-base leading-[1.78] text-stone">
                Whether you're here for a long farm lunch, a sunset dinner, or a weekend stay in one of our self-contained cabins — the view will stay with you long after you leave.
              </p>

              {/* Stats */}
              <div className="mt-10 flex gap-14">
                <div>
                  <p className="font-heading text-5xl font-semibold leading-none text-charcoal md:text-6xl">
                    70<span className="text-gold">+</span>
                  </p>
                  <p className="mt-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone">
                    Years of Farming
                  </p>
                </div>
                <div>
                  <p className="font-heading text-5xl font-semibold leading-none text-charcoal md:text-6xl">
                    360<span className="text-gold">°</span>
                  </p>
                  <p className="mt-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone">
                    Panoramic Views
                  </p>
                </div>
              </div>

              <Link
                to="/about"
                className="mt-9 inline-flex items-center gap-2 font-body text-sm font-semibold text-gold-deep transition hover:text-gold"
              >
                Discover our story <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </motion.div>

            {/* Right: dark editorial card */}
            <motion.div
              className="flex items-stretch"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0.15}
              variants={fadeUp}
            >
              <div
                className="relative flex w-full flex-col justify-between overflow-hidden rounded-sm p-10 md:p-12"
                style={{ background: 'linear-gradient(150deg, #1a1208 0%, #2c1f0a 55%, #1a1208 100%)' }}
              >
                {/* Ambient glow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 72% 22%, rgba(197,160,89,0.12) 0%, transparent 55%)',
                  }}
                />

                {/* Top: seal / badge */}
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-sm border border-gold/25 bg-gold/10">
                    <img
                      src={staticUrl('/images/farm/omaru-logo.png')}
                      alt="Omaru Farm"
                      className="h-12 w-12 opacity-85"
                    />
                  </div>
                  <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.38em] text-gold/65">
                    The Estate
                  </p>
                  <p className="mt-2 font-heading text-2xl font-semibold tracking-[0.08em] text-white/95">
                    Omaru Farm
                  </p>
                  <p className="mt-0.5 font-body text-[0.62rem] font-medium uppercase tracking-[0.28em] text-gold/50">
                    Phillip Island, Victoria
                  </p>
                </div>

                {/* Ornamental divider */}
                <div className="relative my-9 flex items-center gap-3">
                  <div
                    className="h-px flex-1"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.28), transparent)' }}
                  />
                  <div className="h-1.5 w-1.5 rotate-45 bg-gold/45" />
                  <div
                    className="h-px flex-1"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.28), transparent)' }}
                  />
                </div>

                {/* Quote */}
                <div className="relative text-center">
                  <p className="font-heading text-xl font-normal italic leading-[1.65] text-white/82">
                    "A sanctuary for the senses, where farm-to-table dining meets the quiet joy of nature."
                  </p>
                  <p className="mt-5 font-body text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold/50">
                    Est. 1954 · Phillip Island
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            FROM GROVE TO PLATE
            Editorial asymmetric grid (match reference)
        ══════════════════════════════════════════ */}
        <section className="bg-white py-24 md:py-32">
          <div className="mx-auto max-w-[95vw] px-4 md:px-5">

            {/* Centered header */}
            <motion.div
              className="text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-gold">
                Sustainable Living
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                From Grove to Plate
              </h2>
            </motion.div>

            {/* Grid */}
            <div className="mt-14 grid gap-4 lg:grid-cols-[2fr_1fr]">

              {/* Left: large feature image */}
              <motion.div
                className="group relative min-h-[420px] overflow-hidden rounded-2xl"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                custom={0.08}
                variants={fadeUp}
              >
                <img
                  src={staticUrl('/images/farm/image-farm/IMG_4637.jpg')}
                  alt="Garden harvest at Omaru Farm"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-estate/80 via-estate/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                  <h3 className="font-heading text-4xl font-semibold text-white md:text-5xl">Garden Harvest</h3>
                  <p className="mt-3 max-w-lg font-body text-base leading-relaxed text-white/84">
                    Our kitchen is fueled by the seasons. We harvest fresh heirloom tomatoes, aromatic herbs,
                    and garden greens daily to create our signature café dishes.
                  </p>
                </div>
              </motion.div>

              {/* Right: text card + image card */}
              <motion.div
                className="grid gap-4"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                custom={0.18}
                variants={fadeUp}
              >
                <div className="rounded-2xl bg-surface p-7 md:p-8">
                  <div
                    className="mb-5 flex h-10 w-10 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <Leaf className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <h3 className="font-heading text-3xl font-semibold leading-tight text-charcoal">Farm-Pressed Oil</h3>
                  <p className="mt-4 font-body text-base leading-relaxed text-stone">
                    Our olive grove produces a limited-run, cold-pressed oil with notes of wild grass and Phillip Island sea air.
                  </p>
                  <Link
                    to="/store"
                    className="mt-7 inline-flex items-center gap-1.5 font-body text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-gold-deep transition hover:text-gold"
                  >
                    Shop Collection <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>

                <div className="overflow-hidden rounded-2xl bg-surface">
                  <img
                    src={staticUrl('/images/farm/IMG_0622.jpg')}
                    alt="Fresh farm eggs at Omaru"
                    className="h-full min-h-[240px] w-full object-cover transition duration-700 hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MEET THE RESIDENTS
            Left: stacked photos  |  Right: text + list
        ══════════════════════════════════════════ */}
        <section className="bg-surface-low py-24 md:py-32">
          <div className="mx-auto grid max-w-[92vw] items-center gap-10 px-5 md:grid-cols-[2fr_3fr] md:gap-16 lg:gap-24">

            {/* Left: polaroid-style gallery */}
            <motion.div
              className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-5"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0}
              variants={fadeUp}
            >
              <div className="rotate-[-3deg] rounded-sm bg-white p-2 pb-6 shadow-[0_12px_32px_rgba(26,18,8,0.12)] transition hover:rotate-[-1deg]">
                <div className="overflow-hidden rounded-sm">
                  <img
                    src={visibleResidentPhotos[0].src}
                    alt={visibleResidentPhotos[0].alt}
                    className="h-44 w-full object-cover transition duration-500 hover:scale-[1.04] md:h-52"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 px-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-stone">
                  {visibleResidentPhotos[0].label}
                </p>
              </div>

              <div className="translate-y-4 rotate-[2deg] rounded-sm bg-white p-2 pb-6 shadow-[0_12px_32px_rgba(26,18,8,0.12)] transition hover:rotate-[0.5deg]">
                <div className="overflow-hidden rounded-sm">
                  <img
                    src={visibleResidentPhotos[1].src}
                    alt={visibleResidentPhotos[1].alt}
                    className="h-44 w-full object-cover transition duration-500 hover:scale-[1.04] md:h-52"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 px-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-stone">
                  {visibleResidentPhotos[1].label}
                </p>
              </div>

              <div className="col-span-2 -translate-y-1 rotate-[-1deg] rounded-sm bg-white p-2 pb-6 shadow-[0_12px_32px_rgba(26,18,8,0.12)] transition hover:rotate-0">
                <div className="overflow-hidden rounded-sm">
                  <img
                    src={visibleResidentPhotos[2].src}
                    alt={visibleResidentPhotos[2].alt}
                    className="h-48 w-full object-cover transition duration-500 hover:scale-[1.03] md:h-56"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 px-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-stone">
                  {visibleResidentPhotos[2].label}
                </p>
              </div>

              <div className="col-span-2 mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setResidentGalleryIndex((p) => (p - 1 + residentGallery.length) % residentGallery.length)
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-white text-bark shadow-[0_8px_24px_rgba(26,18,8,0.1)] transition hover:text-gold"
                  aria-label="Previous resident photos"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setResidentGalleryIndex((p) => (p + 1) % residentGallery.length)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-white text-bark shadow-[0_8px_24px_rgba(26,18,8,0.1)] transition hover:text-gold"
                  aria-label="Next resident photos"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </motion.div>

            {/* Right: content */}
            <motion.div
              className="relative self-start overflow-hidden rounded-sm bg-white p-6 shadow-[0_16px_44px_rgba(26,18,8,0.08)] md:p-7"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0.12}
              variants={fadeUp}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold/10 blur-2xl" />
              <span className="inline-flex items-center gap-2 rounded-sm bg-fern px-3 py-1.5 font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-sage">
                <Leaf className="h-3 w-3" aria-hidden />
                The Full Farm Experience
              </span>

              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-[3.35rem]">
                Meet the<br />Residents
              </h2>

              <p className="mt-4 font-body text-[0.98rem] leading-[1.72] text-stone">
                At Omaru, the farm is alive. Wander the grounds and you'll encounter ponies, lambs, dairy cows, curious goats,
                and our beloved chooks — the same ones that lay the eggs for your lunch.
              </p>
              <p className="mt-2.5 font-body text-sm leading-relaxed text-stone">
                As dusk falls, watch wild wallabies bound across the paddocks in one of Phillip Island's most magical sights.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-sm bg-surface-low px-4 py-2.5">
                  <p className="font-heading text-2xl font-semibold text-charcoal">
                    7<span className="text-gold">+</span>
                  </p>
                  <p className="font-body text-[0.63rem] font-semibold uppercase tracking-[0.16em] text-stone">
                    Animal Types
                  </p>
                </div>
                <div className="rounded-sm bg-surface-low px-4 py-2.5">
                  <p className="font-heading text-2xl font-semibold text-charcoal">
                    100<span className="text-gold">%</span>
                  </p>
                  <p className="font-body text-[0.63rem] font-semibold uppercase tracking-[0.16em] text-stone">
                    Free Range
                  </p>
                </div>
              </div>

              <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-1">
                {animals.map((a) => (
                  <li
                    key={a.name}
                    className="flex items-center gap-2.5 rounded-sm bg-surface px-3 py-1.5 font-body text-sm text-bark"
                  >
                    <a.Icon className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
                    {a.name}
                  </li>
                ))}
              </ul>

              <Link
                to="/stay"
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-sm px-5 font-body text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-[1.05]"
                style={{ background: GOLD_GRADIENT }}
              >
                View our farm life <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            BOOK NOW — final CTA
        ══════════════════════════════════════════ */}
        <section
          className="py-24 md:py-32"
          style={{ background: 'linear-gradient(135deg, #5c4410 0%, #775a19 50%, #8a6b22 100%)' }}
        >
          <div className="mx-auto max-w-[92vw] px-5 text-center">
            <motion.div
              className="mx-auto max-w-lg"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={0}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-white/60">
                Plan Your Visit
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-white md:text-5xl">
                Book Your Omaru<br />Experience
              </h2>
              <p className="mt-5 font-body text-base leading-[1.78] text-white/70">
                Reserve your table, book a farm stay, or plan a restorative day on Phillip Island with Omaru.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/book"
                  className="inline-flex h-11 items-center rounded-sm bg-white px-8 font-body text-sm font-semibold text-gold-deep transition hover:bg-white/92"
                >
                  Book Now
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex h-11 items-center rounded-sm border border-white/35 bg-white/10 px-8 font-body text-sm font-semibold text-white transition hover:border-white/55 hover:bg-white/16"
                >
                  Contact Us
                </Link>
              </div>
              <p className="mt-4 font-body text-xs text-white/42">
                Café bookings · Farm stays · Group visits
              </p>
            </motion.div>
          </div>
        </section>

      </main>

      {/* ── Product quick-view modal ─────────────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-estate/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-sm bg-white shadow-[0_40px_90px_rgba(26,18,8,0.4)]"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-10 rounded-sm bg-white/85 p-1.5 text-stone backdrop-blur-sm hover:text-charcoal"
              aria-label="Close"
            >
              <CircleX className="h-5 w-5" />
            </button>
            <img
              src={productImageUrl(selectedProduct.image)}
              alt={selectedProduct.name}
              className="h-72 w-full object-cover"
            />
            <div className="p-7">
              <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-gold">
                Farm Product
              </span>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-charcoal">{selectedProduct.name}</h3>
              {selectedProduct.size && (
                <p className="mt-1 font-body text-sm text-stone">{selectedProduct.size}</p>
              )}
              <p className="mt-3 font-body text-xl font-semibold text-gold-deep">{selectedProduct.price}</p>
              <Link
                to="/store"
                className="mt-6 flex h-11 items-center justify-center rounded-sm px-7 font-body text-sm font-semibold text-white transition hover:brightness-[1.05]"
                style={{ background: GOLD_GRADIENT }}
                onClick={() => setSelectedProduct(null)}
              >
                View in Store
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
