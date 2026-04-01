import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowDown, BedDouble, CircleX, Leaf, PackageSearch, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { featuredProducts } from '@/data/content'

type Product = {
  id?: number
  name: string
  size: string
  price: string
  image: string
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>(featuredProducts.slice(0, 6))
  const [activeSection, setActiveSection] = useState('home')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showScrollCue, setShowScrollCue] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [reviewLimit, setReviewLimit] = useState(6)

  const reviews = useMemo(
    () => [
      { name: 'Emily R.', location: 'Adelaide, SA', date: 'Mar 2026', rating: 5, comment: 'Beautiful location, elegant atmosphere, and one of the best farm store selections we have visited.' },
      { name: 'Daniel S.', location: 'Port Lincoln, SA', date: 'Feb 2026', rating: 5, comment: 'The cafe food felt fresh and thoughtful. You can really taste the local ingredients.' },
      { name: 'Priya K.', location: 'Melbourne, VIC', date: 'Jan 2026', rating: 5, comment: 'A premium countryside experience with warm hospitality and excellent products.' },
      { name: 'Ava M.', location: 'Whyalla, SA', date: 'Mar 2026', rating: 5, comment: 'Calm atmosphere, beautiful plating, and genuinely seasonal flavours. We will be back.' },
      { name: 'Noah T.', location: 'Sydney, NSW', date: 'Dec 2025', rating: 5, comment: 'Quiet, comfortable, and beautifully maintained. Perfect for a reset weekend.' },
      { name: 'Sophia L.', location: 'Perth, WA', date: 'Feb 2026', rating: 5, comment: 'The oils and seasonings are exceptional. Premium quality and great gifting options.' },
      { name: 'James H.', location: 'Hobart, TAS', date: 'Jan 2026', rating: 5, comment: 'Great coffee and warm service. Loved the farm-to-table concept and the setting.' },
      { name: 'Mia C.', location: 'Brisbane, QLD', date: 'Dec 2025', rating: 5, comment: 'Packed with unique flavours. The pickles and chutneys were our favourites.' },
      { name: 'Ethan P.', location: 'Canberra, ACT', date: 'Nov 2025', rating: 5, comment: 'Beautiful views and a peaceful vibe. The perfect countryside escape.' },
    ],
    [],
  )

  const visibleReviews = useMemo(() => {
    return reviews.slice(0, reviewLimit)
  }, [reviewLimit, reviews])

  const sliderImages = useMemo(
    () => [
      '/images/farm/AEA8C771269A966E816D1F714AD4BE2D.JPG',
      '/images/farm/IMG_3924.jpg',
      '/images/farm/20210606_172356.jpg',
      '/images/farm/20210602_130149.jpg',
    ],
    [],
  )

  const sections = useMemo(
    () => [
      { id: 'home', label: 'Home' },
      { id: 'story', label: 'Story' },
      { id: 'store', label: 'Store' },
      { id: 'cafe', label: 'Cafe' },
      { id: 'stay', label: 'Stay' },
      { id: 'contact', label: 'Contact' },
    ],
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/products`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        setProducts(
          rows.slice(0, 6).map((item: Record<string, unknown>) => ({
            id: Number(item.id ?? 0),
            name: String(item.name ?? ''),
            size: String(item.size ?? ''),
            price: `$${Number(item.price).toFixed(2)}`,
            image: String(item.image ?? ''),
          })),
        )
      })
      .catch(() => {
        // keep local fallback
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [sliderImages.length])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { threshold: 0.45 },
    )

    sections.forEach((section) => {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  useEffect(() => {
    const onScroll = () => setShowScrollCue(window.scrollY < 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Helmet>
        <title>Omaru Farm | Store, Cafe and Accommodation</title>
        <meta
          name="description"
          content="Discover Omaru Farm's premium store products, cafe dining, and accommodation in a natural farm-to-table setting."
        />
      </Helmet>

      <main className="snap-y snap-mandatory">
        <section
          id="home"
          className="snap-start relative flex min-h-[92vh] items-center overflow-hidden border-b border-gold/20"
        >
          {sliderImages.map((img, idx) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                idx === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={idx !== currentSlide}
            >
              <img
                src={img}
                alt="Natural farm landscape at Omaru Farm"
                className={`absolute inset-0 h-full w-full object-cover object-center transition-transform duration-[6000ms] ${
                  idx === currentSlide ? 'scale-[1.06]' : 'scale-[1.01]'
                }`}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              {/* Cinematic overlays for readability */}
              <div className="absolute inset-0 bg-black/35" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            </div>
          ))}
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/40 bg-black/45 px-3 py-1.5">
            {sliderImages.map((_, idx) => (
              <button
                key={`slide-${idx}`}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? 'w-8 bg-gold shadow-[0_0_18px_rgba(205,163,73,0.45)]'
                    : 'w-2 bg-white/45 hover:bg-white/70'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>

          <div className="relative mx-auto grid max-w-[92vw] gap-10 px-5 py-20 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">
                <Leaf className="h-3.5 w-3.5" />
                Natural. Premium. Local.
              </p>
              <h1 className="font-heading text-4xl leading-tight md:text-6xl">
                Omaru Farm Store, Cafe and Accommodation
              </h1>
              <p className="mt-4 max-w-xl text-white/80">
                Experience a luxurious farm-to-table destination where fresh produce, artisan flavors, and countryside comfort come together.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <a href="#store">Explore Featured</a>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">Plan Your Visit</Link>
                </Button>
              </div>
            </motion.div>
          </div>

          {showScrollCue && (
            <motion.a
              href="#store"
              className="absolute bottom-7 left-8 z-20 inline-flex items-center gap-2 text-xs tracking-[0.2em] text-gold/90 md:left-12"
              animate={{ y: [0, 5, 0], opacity: [0.75, 1, 0.75] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8 }}
            >
              Scroll
              <ArrowDown className="h-3.5 w-3.5" />
            </motion.a>
          )}
        </section>

        <section id="story" className="snap-start flex min-h-[92vh] items-center border-b border-gold/15 bg-[#0f0f10] py-24">
          <div className="mx-auto grid w-full max-w-[92vw] items-center gap-10 px-5 md:grid-cols-12">
            <motion.div
              className="md:col-span-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative mx-auto max-w-xl md:mx-0">
                <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black/30 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
                  <img
                    src="/images/farm/20211017_191630.jpg"
                    alt="Omaru Farm story"
                    className="h-[560px] w-full object-cover opacity-95 transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-5 right-6 h-28 w-36 rounded-2xl bg-gold/10 blur-[0.5px]" />
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Est. 1924</p>
              <h2 className="mt-4 font-heading text-4xl text-[#f5efe2] md:text-5xl">The Omaru Story</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
                Founded on a philosophy of radical simplicity and deep respect for the land, Omaru has spent generations cultivating not just crops,
                but a way of life. Every harvest is a dialogue between tradition and innovation.
              </p>

              <Link
                to="/about"
                className="mt-7 inline-flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-gold/80 transition hover:text-gold"
              >
                Our Provenance <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
          </div>
        </section>

        <section
          id="store"
          className="snap-start mx-auto flex min-h-[88vh] max-w-[86vw] flex-col justify-center px-5 py-16"
        >
          <h2 className="font-heading text-3xl text-gold md:text-4xl">Featured Farm Store Products</h2>
          <p className="mt-2 text-white/75">Curated from your 2026 catalog, crafted for rich flavor and quality.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <Card
                  className="h-full cursor-pointer transition hover:-translate-y-1 hover:border-gold/50"
                  onClick={() => setSelectedProduct(product)}
                >
                  <CardHeader>
                    <div className="group/image relative overflow-hidden rounded-md">
                      <img
                        src={`/images/products/${product.image}`}
                        alt={product.name}
                        className="h-44 w-full rounded-md object-cover transition duration-700 group-hover/image:scale-110 group-hover/image:rotate-[1deg]"
                        loading={index > 3 ? 'lazy' : 'eager'}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition duration-500 group-hover/image:opacity-100" />
                    </div>
                    <CardTitle>{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/70">{product.size}</p>
                    <p className="mt-2 text-lg font-semibold text-gold">{product.price}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="mt-8">
            <Button asChild>
              <Link to="/store">Explore Store</Link>
            </Button>
          </div>
        </section>

        <section
          id="cafe"
          className="snap-start border-y border-gold/20 bg-[#0b0b0b] py-16 text-white"
        >
          <div className="mx-auto w-full max-w-[92vw] px-5">
            <div className="grid items-end gap-8 md:grid-cols-12">
              <div className="md:col-span-7">
                <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Gastronomy</p>
                <h2 className="mt-3 font-heading text-5xl leading-[0.95] text-[#f5efe2] md:text-6xl">
                  Farm to Table
                </h2>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
                  The Omaru Cafe translates the day’s harvest into a sensory journey. We celebrate the
                  ephemeral beauty of seasonal ingredients through refined, honest cooking.
                </p>
              </div>

              <div className="md:col-span-5 md:flex md:justify-end">
                <Link
                  to="/cafe"
                  className="inline-flex items-center gap-3 border-b border-gold/35 pb-1 text-xs uppercase tracking-[0.24em] text-gold/75 transition hover:border-gold hover:text-gold"
                >
                  View Menu
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-12">
              <motion.article
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="md:col-span-4"
              >
                <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black/25 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <img
                    src="/images/farm/20210522_100834.jpg"
                    alt="The Heirloom Plate"
                    className="aspect-square w-full object-cover transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-5 font-heading text-2xl text-[#f5efe2]">The Heirloom Plate</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Sourced entirely from our seasonal garden, featuring heritage ingredients and cold-pressed oils.
                </p>
              </motion.article>

              <motion.article
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="md:col-span-4"
              >
                <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black/25 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <img
                    src="/images/farm/IMG_7268.jpg"
                    alt="Sanctuary of Taste"
                    className="aspect-[4/5] w-full object-cover transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-5 font-heading text-2xl text-[#f5efe2]">Sanctuary of Taste</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  A calm architectural space designed to dissolve the boundary between diner and landscape.
                </p>
              </motion.article>

              <motion.article
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="md:col-span-4"
              >
                <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black/25 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <img
                    src="/images/farm/20210910_180301.jpg"
                    alt="Morning Ritual"
                    className="aspect-square w-full object-cover transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-5 font-heading text-2xl text-[#f5efe2]">Morning Ritual</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Small-batch roasts paired with fresh cream and a menu that follows the seasons.
                </p>
              </motion.article>
            </div>
          </div>
        </section>

        <section id="stay" className="snap-start mx-auto flex min-h-[88vh] max-w-[92vw] flex-col justify-center px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-heading text-3xl text-gold md:text-4xl">What Guests Say</h2>
              <p className="mt-2 text-sm text-white/65">
                <span className="text-gold">5.0</span> average • <span className="text-white/80">{reviews.length}</span> reviews
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {visibleReviews.map((review, index) => (
              <motion.div
                key={`${review.name}-${review.date}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: (index % 6) * 0.04 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full border border-gold/25 bg-gold/10 text-sm font-semibold text-gold">
                          {review.name
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <CardTitle className="text-[#f5efe2]">{review.name}</CardTitle>
                          <p className="text-xs text-white/55">{review.location} • {review.date}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-gold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-gold' : ''}`} />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/75">{review.comment}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {reviewLimit < reviews.length && (
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={() => setReviewLimit((n) => n + 6)}
              >
                Load more
              </Button>
            </div>
          )}
        </section>

        <section
          id="contact"
          className="snap-start flex min-h-[88vh] items-center border-t border-gold/20 bg-[#0b0b0b] py-16 md:py-24"
        >
          <div className="mx-auto grid w-full max-w-[92vw] items-center gap-10 px-5 md:grid-cols-12">
            <motion.div
              className="md:col-span-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
            >
              <div className="rounded-2xl border border-gold/15 bg-[#141416]/85 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur sm:p-9">
                <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Stay with us</p>
                <h2 className="mt-4 font-heading text-5xl leading-[0.95] text-[#f5efe2] md:text-6xl">
                  Luxury Retreats
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
                  Surrender to the rhythm of the seasons. Our guest stays offer quiet elegance and absolute stillness,
                  nestled among the natural beauty of Omaru.
                </p>

                <div className="mt-8 space-y-4 text-sm text-white/75">
                  <div className="flex items-center gap-3">
                    <BedDouble className="h-5 w-5 text-gold" />
                    <span>Bespoke interior comfort</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-gold" />
                    <span>In-stay wellness rituals</span>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap gap-3">
                  <Button asChild className="px-7 py-2.5">
                    <Link to="/stay">Book Your Stay</Link>
                  </Button>
                  <Button variant="outline" asChild className="px-7 py-2.5">
                    <Link to="/contact">Contact</Link>
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.05 }}
            >
              <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-black/30 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
                <img
                  src="/images/farm/20211027_195611.jpg"
                  alt="Omaru Farm accommodation"
                  className="h-[360px] w-full object-cover opacity-95 md:h-[420px]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-black/25" />
              </div>
            </motion.div>
          </div>
        </section>

        <div className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:flex">
          <div className="relative flex flex-col items-center gap-3">
            <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
              <svg
                width="60"
                height={Math.max(1, sections.length - 1) * 36 + 10}
                viewBox={`0 0 60 ${Math.max(1, sections.length - 1) * 36 + 10}`}
                className="opacity-70"
                aria-hidden="true"
              >
                <path
                  d={`M50 5 Q 6 ${(Math.max(1, sections.length - 1) * 36 + 10) / 2} 50 ${
                    Math.max(1, sections.length - 1) * 36 + 5
                  }`}
                  fill="none"
                  stroke="rgba(205,163,73,0.22)"
                  strokeWidth="1.25"
                />
              </svg>
            </div>
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative flex h-6 w-6 items-center justify-center"
                style={{
                  transform: `translateX(${
                    -Math.sin((index / Math.max(1, sections.length - 1)) * Math.PI) * 14
                  }px)`,
                }}
                aria-label={`Go to ${section.label}`}
              >
                <span
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    activeSection === section.id
                      ? 'bg-gold shadow-[0_0_14px_rgba(205,163,73,0.65)]'
                      : 'bg-white/35 group-hover:bg-gold/70'
                  }`}
                />
                <span className="pointer-events-none absolute right-11 rounded-md border border-gold/35 bg-black/85 px-2 py-1 text-[10px] text-gold opacity-0 transition group-hover:opacity-100">
                  {section.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative w-full max-w-2xl rounded-2xl border border-gold/35 bg-[#0d0d0d] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-3 top-3 text-white/70 transition hover:text-gold"
              aria-label="Close product details popup"
            >
              <CircleX className="h-5 w-5" />
            </button>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-gold/30 bg-black/40 p-2">
                <img
                  src={`/images/products/${selectedProduct.image}`}
                  alt={selectedProduct.name}
                  className="max-h-[420px] w-full rounded-md object-contain"
                />
              </div>
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-2.5 py-1 text-[11px] text-gold">
                  <PackageSearch className="h-3.5 w-3.5" />
                  Product Details
                </p>
                <h3 className="mt-3 font-heading text-3xl text-gold">{selectedProduct.name}</h3>
                <div className="mt-4 space-y-2 text-sm text-white/80">
                  <p><span className="text-white/60">Pack Size:</span> {selectedProduct.size}</p>
                  <p><span className="text-white/60">Price:</span> {selectedProduct.price}</p>
                  <p>
                    <span className="text-white/60">Description:</span> Crafted with premium ingredients and farm-inspired flavour — perfect for gifting or elevating everyday cooking.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild onClick={() => setSelectedProduct(null)}>
                    <Link to="/store">Explore more</Link>
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

