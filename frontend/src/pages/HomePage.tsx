import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Anchor,
  ArrowRight,
  Beef,
  BedDouble,
  Bird,
  Cherry,
  ChevronRight,
  CircleX,
  Clock3,
  Dog,
  Droplet,
  Egg,
  Fish,
  Footprints,
  Gauge,
  Leaf,
  MapPin,
  Mountain,
  PackageSearch,
  PawPrint,
  Rabbit,
  Salad,
  ShoppingBag,
  Sprout,
  Squirrel,
  Star,
  Sun,
  Waves,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
type Review = {
  name: string
  location: string
  date: string
  rating: number
  comment: string
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay } }),
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>(featuredProducts.slice(0, 6))
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [reviewLimit, setReviewLimit] = useState(6)

  const fallbackReviews = useMemo<Review[]>(
    () => [
      { name: 'Emily R.', location: 'Adelaide, SA', date: 'Mar 2026', rating: 5, comment: 'The views are absolutely breathtaking — we could not believe how beautiful Phillip Island is from the farm. The lunch was incredible.' },
      { name: 'Daniel S.', location: 'Melbourne, VIC', date: 'Feb 2026', rating: 5, comment: 'Farm-to-table done right. The olive oil, the eggs, the herbs — you can taste that everything is grown right here.' },
      { name: 'Priya K.', location: 'Sydney, NSW', date: 'Jan 2026', rating: 5, comment: 'A premium countryside experience. The animals roaming around made it magical for our kids.' },
      { name: 'Ava M.', location: 'Whyalla, SA', date: 'Mar 2026', rating: 5, comment: 'Gorgeous sunset dinner, local wine, and the most peaceful atmosphere. The rolling paddocks are stunning.' },
      { name: 'Noah T.', location: 'Brisbane, QLD', date: 'Dec 2025', rating: 5, comment: 'Perfect base for Phillip Island — so close to the Penguin Parade but worlds away from the crowds.' },
      { name: 'Sophia L.', location: 'Perth, WA', date: 'Feb 2026', rating: 5, comment: 'The cabin was beautiful and the views from the window were worth the whole trip.' },
      { name: 'James H.', location: 'Hobart, TAS', date: 'Jan 2026', rating: 5, comment: 'Brought our dog and the cafe welcomed him like family. Outstanding local produce.' },
      { name: 'Mia C.', location: 'Canberra, ACT', date: 'Dec 2025', rating: 5, comment: 'The store products are exceptional. The olive oil from their own groves is something else.' },
      { name: 'Ethan P.', location: 'Port Lincoln, SA', date: 'Nov 2025', rating: 5, comment: 'Wallabies in the paddock at dusk. Lambs saying hello at breakfast. Pure magic.' },
    ],
    [],
  )
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews)
  const visibleReviews = useMemo(() => reviews.slice(0, reviewLimit), [reviewLimit, reviews])

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
    (): { name: string; Icon: LucideIcon; desc: string }[] => [
      { name: 'Ponies', Icon: Footprints, desc: 'Our gentle ponies roam the paddocks and love a visit.' },
      { name: 'Cows & Calves', Icon: Beef, desc: 'Dairy cows and newborn calves are a daily highlight.' },
      { name: 'Sheep & Lambs', Icon: Mountain, desc: 'Fluffy white faces greet you at the fence.' },
      { name: 'Goats', Icon: Rabbit, desc: 'Cheeky and curious — always ready for a pat.' },
      { name: 'Chooks', Icon: Bird, desc: 'Our free-range hens lay the eggs used in the cafe kitchen.' },
      { name: 'Cats & Dogs', Icon: PawPrint, desc: 'Farm companions who will find you before you find them.' },
      { name: 'Wallabies', Icon: Squirrel, desc: 'Wild wallabies bound across the property at dusk.' },
    ],
    [],
  )

  const attractions = useMemo(
    (): { name: string; dist: string; Icon: LucideIcon; desc: string }[] => [
      { name: 'Penguin Parade', dist: '5 min', Icon: Bird, desc: 'Watch the world-famous fairy penguin colony at sunset.' },
      { name: 'Nobbies Boardwalk', dist: '8 min', Icon: Waves, desc: 'Dramatic coastal views and fur seal colonies.' },
      { name: 'Grand Prix Circuit', dist: '10 min', Icon: Gauge, desc: 'Iconic motorsport venue and visitor experience.' },
      { name: 'Swan Lake', dist: '10 min', Icon: Fish, desc: 'A tranquil nature reserve and birdwatching spot.' },
      { name: 'Kitty Miller Bay', dist: '12 min', Icon: Anchor, desc: 'Explore the historic Speke shipwreck and rockpools.' },
      { name: 'Cowes', dist: '10 min', Icon: ShoppingBag, desc: 'The heart of Phillip Island — shops, dining, and the beach.' },
    ],
    [],
  )

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
        setProducts(featuredOnly.length > 0 ? featuredOnly.slice(0, 6) : mapped.slice(0, 6))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/testimonials`, { signal: controller.signal })
      .then((r) => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        setReviews(rows.map((item) => {
          const row = item as Record<string, unknown>
          return { name: String(row.guestName ?? 'Guest'), location: String(row.location ?? ''), date: String(row.visitDate ?? ''), rating: Number(row.rating ?? 5), comment: String(row.comment ?? '') }
        }))
      })
      .catch(() => setReviews(fallbackReviews))
    return () => controller.abort()
  }, [fallbackReviews])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentSlide((p) => (p + 1) % heroImages.length), 5000)
    return () => window.clearInterval(timer)
  }, [heroImages.length])

  return (
    <>
      <Helmet>
        <title>Omaru Farm | Farm-to-Table Dining, Stays & Store on Phillip Island</title>
        <meta name="description" content="Omaru means 'a beautiful view' — experience breathtaking paddock and ocean vistas, farm-to-table lunch and dinner, self-contained cabin stays, and a premium farm store on Phillip Island, just 5 minutes from the Penguin Parade." />
      </Helmet>

      <main>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="relative flex min-h-[92vh] items-center overflow-hidden">
          {heroImages.map((img, idx) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-1200 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={idx !== currentSlide}
            >
              <img
                src={img}
                alt="Breathtaking paddock and ocean views at Omaru Farm, Phillip Island"
                className={`absolute inset-0 h-full w-full object-cover object-center transition-transform duration-[7000ms] ${idx === currentSlide ? 'scale-[1.05]' : 'scale-[1.01]'}`}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
            </div>
          ))}

          {/* Slide dots — above bottom info bar */}
          <div className="absolute bottom-[5.25rem] left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-[4.5rem]">
            {heroImages.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-gold' : 'w-2 bg-white/50 hover:bg-white/75'}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="relative z-10 mx-auto max-w-[92vw] px-5 pb-28 pt-20 md:pb-24 md:pt-24">
            <motion.div className="hero-panel" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
              <motion.p
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-gold-deep"
                custom={0} variants={fadeUp}
              >
                <MapPin className="h-3.5 w-3.5" />
                Phillip Island, Victoria
              </motion.p>
              <motion.h1
                className="max-w-3xl font-heading text-4xl leading-tight text-charcoal md:text-6xl"
                custom={0.1} variants={fadeUp}
              >
                Where Every View<br />
                <span className="italic text-gold">Tells a Story</span>
              </motion.h1>
              <motion.p
                className="mt-5 max-w-xl text-base leading-relaxed text-stone md:text-lg"
                custom={0.2} variants={fadeUp}
              >
                <em>"Omaru"</em> means <strong className="text-bark">a beautiful view</strong> — and from our paddocks you'll see exactly why.
                Farm-to-table dining, self-contained cabin stays, and a premium farm store, just 5 minutes from the Penguin Parade.
              </motion.p>
              <motion.div className="mt-8 flex flex-wrap gap-3" custom={0.3} variants={fadeUp}>
                <Button asChild className="bg-gold text-white hover:bg-gold-deep">
                  <Link to="/cafe">Dine With Us</Link>
                </Button>
                <Button asChild variant="outline" className="border-parchment text-bark hover:bg-zinc-50">
                  <Link to="/stay">Book a Stay</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom address bar */}
          <div className="absolute bottom-0 inset-x-0 z-10 border-t border-parchment bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
            <div className="mx-auto flex max-w-[92vw] flex-wrap items-center justify-between gap-4 px-5 py-3 text-xs text-stone">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gold" />776 Ventnor Road, Ventnor, Phillip Island VIC 3922</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-gold" />Café: Thu–Fri 10am–2pm & 5–8pm · Sat–Sun 10am–8pm</span>
              <span className="flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5 text-gold" />Farm Store: Mon–Sun 9am–5pm</span>
            </div>
          </div>
        </section>

        {/* ── "OMARU" MEANING ─────────────────────────────────── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} custom={0} variants={fadeUp}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Our Name, Our Promise</p>
                <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">
                  "Omaru" —<br /><span className="italic text-gold">A Beautiful View</span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-stone">
                  Nestled in the rolling green hills of Phillip Island, Omaru Farm earns its name every single day.
                  From our paddocks you can see sweeping ocean outlooks, endless skies, and the peaceful countryside
                  that has made us one of the island's most loved destinations.
                </p>
                <p className="mt-4 text-base leading-relaxed text-stone">
                  Whether you're here for a long lunch, a sunset dinner, or a weekend stay in one of our
                  self-contained cabins — the view will stay with you long after you leave.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild className="bg-gold text-white hover:bg-gold-deep">
                    <Link to="/about">Our Story</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-parchment text-bark hover:bg-zinc-50">
                    <Link to="/stay">View Stays</Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                className="grid grid-cols-2 gap-4"
                initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom={0.1} variants={fadeUp}
              >
                {[
                  { img: staticUrl('/images/farm/IMG_3924.jpg'), label: 'Paddock Views' },
                  { img: staticUrl('/images/farm/20210602_130149.jpg'), label: 'Rolling Hills' },
                  { img: staticUrl('/images/farm/AEA8C771269A966E816D1F714AD4BE2D.JPG'), label: 'Aerial Vista' },
                  { img: staticUrl('/images/farm/20210606_172356.jpg'), label: 'Farm Grounds' },
                ].map((item) => (
                  <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-parchment">
                    <img
                      src={item.img}
                      alt={item.label}
                      className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />
                    <p className="absolute bottom-2 left-3 text-xs font-medium text-white/90">{item.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── FARM-TO-TABLE STORY ──────────────────────────────── */}
        <section className="bg-zinc-50 py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="text-center" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} custom={0} variants={fadeUp}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Genuinely Farm to Table</p>
              <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">From Our Grove to Your Plate</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone">
                From grove to plate, Omaru Farm celebrates true farm-to-table dining with homegrown herbs, garden tomatoes,
                fresh eggs from our chooks, and olive oil pressed from our very own olive trees.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  { Icon: Droplet, title: 'Our Olive Groves', desc: 'Cold-pressed extra virgin olive oil grown and harvested on the farm — used in every dish.' },
                  { Icon: Egg, title: 'Farm-Fresh Eggs', desc: 'Our free-range chooks produce the eggs that go directly from paddock to your plate.' },
                  { Icon: Cherry, title: 'Garden Tomatoes', desc: 'Sun-ripened tomatoes grown in our kitchen garden, picked at their seasonal peak.' },
                  { Icon: Leaf, title: 'Fresh Herbs', desc: 'Rosemary, thyme, basil and more — harvested fresh from our garden each morning.' },
                  { Icon: Sprout, title: 'Seasonal Produce', desc: "The menu follows what's growing — always seasonal, always local, always honest." },
                ] as const
              ).map((item, idx) => (
                <motion.div
                  key={item.title}
                  className="rounded-2xl border border-parchment bg-white p-6 text-center shadow-sm"
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom={idx * 0.07} variants={fadeUp}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                    <item.Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl text-charcoal">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div className="mt-12 overflow-hidden rounded-2xl border border-parchment bg-white" initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.3} variants={fadeUp}>
              <div className="grid md:grid-cols-2">
                <img
                  src={staticUrl('/images/farm/20211017_191630.jpg')}
                  alt="Farm-to-table dining at Omaru"
                  className="h-64 w-full object-cover md:h-auto"
                  loading="lazy"
                />
                <div className="flex flex-col justify-center p-8 md:p-12">
                  <Salad className="h-8 w-8 text-gold" />
                  <h3 className="mt-4 font-heading text-3xl text-charcoal">Café Omaru</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone">
                    A premium farm-to-table lunch and sunset dining experience. Enjoy locally sourced lunches,
                    farm-fresh dinners, barista coffee, and a fully licensed bar featuring Phillip Island wines.
                  </p>
                  <div className="mt-5 space-y-1 text-sm text-stone">
                    <p><strong className="text-bark">Thu – Fri:</strong> 10am – 2pm &amp; 5pm – 8pm</p>
                    <p><strong className="text-bark">Sat – Sun:</strong> 10am – 8pm</p>
                  </div>
                  <Button asChild className="mt-6 self-start bg-gold text-white hover:bg-gold-deep">
                    <Link to="/cafe">View Menu</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── DOG FRIENDLY ─────────────────────────────────────── */}
        <section className="bg-white py-10">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div
              className="flex flex-wrap items-center gap-6 rounded-2xl border border-parchment bg-zinc-50 px-8 py-6"
              initial="hidden" whileInView="show" viewport={{ once: true }} custom={0} variants={fadeUp}
            >
              <Dog className="h-10 w-10 shrink-0 text-gold" />
              <div className="flex-1">
                <h3 className="font-heading text-2xl text-charcoal">Dog Friendly Café</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone">
                  Bring your furry friend along — Omaru Farm Café is dog friendly, so there's no need to leave your pet behind.
                  Your four-legged companion is welcome on the outdoor dining area.
                </p>
              </div>
              <Button asChild variant="outline" className="border-parchment text-bark hover:bg-white">
                <Link to="/cafe">Learn More</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ── FARM STORE ───────────────────────────────────────── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="flex flex-wrap items-end justify-between gap-4" initial="hidden" whileInView="show" viewport={{ once: true }} custom={0} variants={fadeUp}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Farm Store</p>
                <h2 className="mt-2 font-heading text-4xl text-charcoal md:text-5xl">Artisan Pantry Favourites</h2>
                <p className="mt-3 max-w-xl text-sm text-stone">Olive oils, seasonings, preserves and more — all made or sourced from the farm and beyond.</p>
              </div>
              <Link to="/store" className="flex items-center gap-2 text-sm font-medium text-gold transition hover:text-gold-deep">
                Browse Full Store <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {products.length === 0 ? (
              <div className="mt-14 flex flex-col items-center gap-4 py-16 text-center">
                <PackageSearch className="h-12 w-12 text-parchment" />
                <p className="text-stone">Products loading…</p>
              </div>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {products.slice(0, 6).map((product, idx) => (
                  <motion.button
                    key={product.id ?? product.name}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="group overflow-hidden rounded-2xl border border-parchment bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} custom={idx * 0.06} variants={fadeUp}
                  >
                    <div className="overflow-hidden">
                      <img
                        src={productImageUrl(product.image)}
                        alt={product.name}
                        className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading text-lg text-charcoal">{product.name}</h3>
                      {product.size && <p className="mt-1 text-xs text-stone">{product.size}</p>}
                      <p className="mt-2 font-semibold text-gold">{product.price}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <Button asChild variant="outline" className="border-parchment text-bark hover:bg-zinc-50">
                <Link to="/store">Shop All Products</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── FARM ANIMALS ─────────────────────────────────────── */}
        <section className="bg-zinc-50 py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="grid items-center gap-12 md:grid-cols-2" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              <motion.div custom={0} variants={fadeUp}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">The Full Farm Experience</p>
                <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Meet the Animals</h2>
                <p className="mt-4 text-base leading-relaxed text-stone">
                  At Omaru, the farm is alive. Wander the grounds and you'll meet ponies, lambs, dairy cows, curious goats,
                  and our beloved chooks — the same ones that lay the eggs for your lunch. As dusk falls, watch wild wallabies
                  bound across the paddocks in one of Phillip Island's most magical sights.
                </p>
                <p className="mt-3 text-sm text-stone">A favourite experience for families, children, international guests, and anyone who loves farm life.</p>
                <Button asChild className="mt-7 bg-gold text-white hover:bg-gold-deep">
                  <Link to="/stay">Plan Your Visit</Link>
                </Button>
              </motion.div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                {animals.map((animal, idx) => (
                  <motion.div
                    key={animal.name}
                    className="rounded-2xl border border-parchment bg-white p-5 text-center"
                    initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} custom={idx * 0.06} variants={fadeUp}
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center text-gold">
                      <animal.Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <p className="mt-2 font-medium text-charcoal text-sm">{animal.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone">{animal.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div className="mt-10 overflow-hidden rounded-2xl border border-parchment" initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.2} variants={fadeUp}>
              <div className="grid md:grid-cols-3">
                <img src={staticUrl('/images/farm/image-farm/IMG_8196.jpg')} alt="Children feeding baby goats at Omaru Farm" className="h-56 w-full object-cover md:h-auto" loading="lazy" />
                <img src={staticUrl('/images/farm/image-farm/IMG_4976.JPG')} alt="Free-range chickens at Omaru Farm" className="hidden h-56 w-full object-cover md:block md:h-auto" loading="lazy" />
                <img src={staticUrl('/images/farm/image-farm/IMG_4637.jpg')} alt="Farm produce at Omaru Farm store" className="hidden h-56 w-full object-cover md:block md:h-auto" loading="lazy" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── VIEWS FEATURE ────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <img
            src={staticUrl('/images/farm/20210602_130149.jpg')}
            alt="Breathtaking paddock and ocean views at Omaru Farm"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
          <div className="relative mx-auto max-w-[92vw] px-5 py-4 md:py-8">
            <motion.div className="hero-panel max-w-xl" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} custom={0} variants={fadeUp}>
              <Sun className="h-10 w-10 text-gold" aria-hidden="true" />
              <h2 className="mt-4 font-heading text-3xl text-charcoal md:text-5xl">Breathtaking Views, Every Direction</h2>
              <p className="mt-4 text-base leading-relaxed text-stone">
                Rolling green paddocks, distant ocean outlooks, sweeping sunset skies. At Omaru, the landscape is part of the experience.
                It's why guests drive hours to get here — and why they always come back.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { icon: <Waves className="h-5 w-5" />, label: 'Ocean Outlooks' },
                  { icon: <Leaf className="h-5 w-5" />, label: 'Rolling Paddocks' },
                  { icon: <Sun className="h-5 w-5" />, label: 'Sunset Dining' },
                  { icon: <MapPin className="h-5 w-5" />, label: 'Phillip Island' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm text-bark">
                    <span className="text-gold">{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── STAY ─────────────────────────────────────────────── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="grid items-center gap-12 md:grid-cols-2" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              <motion.div custom={0} variants={fadeUp}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Stay With Us</p>
                <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Luxury Farm Retreats</h2>
                <p className="mt-4 text-base leading-relaxed text-stone">
                  Wake up to paddock views from our self-contained cabins, nestled among the natural beauty of Omaru. Two on-farm cabins
                  and two holiday homes give you the choice of total immersion — or a private retreat nearby.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    { icon: <BedDouble className="h-5 w-5 text-gold" />, label: '2 Self-Contained On-Farm Cabins' },
                    { icon: <BedDouble className="h-5 w-5 text-gold" />, label: '2 Private Holiday Homes' },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-3 text-sm text-bark">
                      {f.icon}
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-8 bg-gold text-white hover:bg-gold-deep">
                  <Link to="/stay">Explore Accommodation</Link>
                </Button>
              </motion.div>

              <motion.div
                className="overflow-hidden rounded-2xl border border-parchment shadow-sm"
                custom={0.1} variants={fadeUp}
              >
                <img
                  src={staticUrl('/images/farm/IMG_9130.jpg')}
                  alt="Beautiful farm stay accommodation at Omaru Farm"
                  className="h-[400px] w-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── NEARBY ATTRACTIONS ───────────────────────────────── */}
        <section className="bg-zinc-50 py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="text-center" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} custom={0} variants={fadeUp}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">The Perfect Base</p>
              <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">At the Heart of Phillip Island</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone">
                Stay at Omaru and you're perfectly positioned to explore everything Phillip Island has to offer —
                then return to the calm of the farm.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
              {attractions.map((a, idx) => (
                <motion.div
                  key={a.name}
                  className="flex gap-4 rounded-2xl border border-parchment bg-white p-6"
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} custom={idx * 0.07} variants={fadeUp}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                    <a.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-charcoal">{a.name}</h3>
                      <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">{a.dist}</span>
                    </div>
                    <p className="mt-1 text-sm text-stone">{a.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-10 rounded-2xl border border-parchment bg-white p-6 md:p-10 text-center"
              initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.4} variants={fadeUp}
            >
              <MapPin className="mx-auto h-8 w-8 text-gold" />
              <h3 className="mt-3 font-heading text-2xl text-charcoal">776 Ventnor Road, Ventnor, Phillip Island VIC 3922</h3>
              <p className="mt-2 text-sm text-stone">Just 5 minutes from the Penguin Parade · 10 minutes to Cowes · Close to all major attractions</p>
              <Button asChild className="mt-6 bg-gold text-white hover:bg-gold-deep">
                <Link to="/contact">Get Directions</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ── REVIEWS ──────────────────────────────────────────── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="flex flex-wrap items-end justify-between gap-4" initial="hidden" whileInView="show" viewport={{ once: true }} custom={0} variants={fadeUp}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Guest Stories</p>
                <h2 className="mt-2 font-heading text-4xl text-charcoal">What Our Guests Say</h2>
                <p className="mt-2 text-sm text-stone">
                  <span className="text-gold font-semibold">5.0</span> average · {reviews.length} reviews
                </p>
              </div>
            </motion.div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {visibleReviews.map((review, idx) => (
                <motion.div
                  key={`${review.name}-${review.date}`}
                  className="rounded-2xl border border-parchment bg-white p-6 shadow-sm"
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} custom={(idx % 6) * 0.05} variants={fadeUp}
                >
                  <div className="flex items-center gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone">"{review.comment}"</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/10 text-sm font-semibold text-gold">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal">{review.name}</p>
                      {review.location && <p className="text-xs text-stone">{review.location}</p>}
                    </div>
                    {review.date && <span className="ml-auto text-xs text-stone">{review.date}</span>}
                  </div>
                </motion.div>
              ))}
            </div>

            {reviewLimit < reviews.length && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => setReviewLimit((p) => p + 3)} className="border-parchment text-bark hover:bg-zinc-50">
                  Show More Reviews
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <img
            src={staticUrl('/images/farm/20210606_172356.jpg')}
            alt="Omaru Farm at golden hour"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative mx-auto max-w-[92vw] px-5 py-6 text-center md:py-10">
            <motion.div className="hero-panel mx-auto max-w-2xl text-center" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} custom={0} variants={fadeUp}>
              <p className="text-sm uppercase tracking-[0.3em] text-gold-deep">Phillip Island's Destination Farm</p>
              <h2 className="mt-3 font-heading text-3xl text-charcoal md:text-5xl">Come for the View.<br />Stay for the Experience.</h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-stone">
                Book a table for lunch or dinner, reserve your cabin, or explore the farm store.
                Omaru is waiting to share its beautiful view with you.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button asChild className="bg-gold text-white hover:bg-gold-deep">
                  <Link to="/book">Book Now</Link>
                </Button>
                <Button asChild variant="outline" className="border-parchment text-bark hover:bg-zinc-50">
                  <Link to="/contact">
                    <ChevronRight className="mr-1 h-4 w-4" />
                    Get in Touch
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Product quick-view modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-parchment bg-white shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-1.5 text-stone backdrop-blur-sm hover:text-charcoal"
              aria-label="Close"
            >
              <CircleX className="h-5 w-5" />
            </button>
            <img
              src={productImageUrl(selectedProduct.image)}
              alt={selectedProduct.name}
              className="h-72 w-full object-cover"
            />
            <div className="p-6">
              <h3 className="font-heading text-2xl text-charcoal">{selectedProduct.name}</h3>
              {selectedProduct.size && <p className="mt-1 text-sm text-stone">{selectedProduct.size}</p>}
              <p className="mt-3 text-xl font-semibold text-gold">{selectedProduct.price}</p>
              <Button asChild className="mt-6 w-full bg-gold text-white hover:bg-gold-deep">
                <Link to="/store">View in Store</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
