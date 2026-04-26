import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CircleX, Clock3, MapPin, PackageSearch, Search, Truck, Wheat, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { productCatalog } from '@/data/productCatalog'
import { productImageUrl } from '@/utils/productImage'
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

/** product images pool for catalog items without an API image */
const FALLBACK_IMGS = [
  '/images/products/20260311_130334.jpg',
  '/images/products/20260311_130456.jpg',
  '/images/products/20260311_130712.jpg',
  '/images/products/20260311_130805.jpg',
  '/images/products/20260311_130831.jpg',
  '/images/products/20260311_130909.jpg',
  '/images/products/20260311_130929.jpg',
  '/images/products/20260311_130944.jpg',
  '/images/products/20260311_130957.jpg',
  '/images/products/20260311_131012.jpg',
  '/images/products/20260311_131023.jpg',
  '/images/products/20260311_131037.jpg',
  '/images/products/20260311_131115.jpg',
  '/images/products/20260311_131121.jpg',
  '/images/products/20260311_131126.jpg',
  '/images/products/20260311_131151.jpg',
  '/images/products/20260311_131257.jpg',
  '/images/products/20260311_131331.jpg',
  '/images/products/20260311_131358.jpg',
  '/images/products/20260311_131523.jpg',
  '/images/products/20260311_131542.jpg',
  '/images/products/20260311_131619.jpg',
  '/images/products/20260311_131655.jpg',
  '/images/products/20260311_131702.jpg',
  '/images/products/20260311_131721.jpg',
  '/images/products/20260311_131758.jpg',
  '/images/products/20260311_131810.jpg',
  '/images/products/20260311_131846.jpg',
  '/images/products/20260311_131852.jpg',
  '/images/products/20260311_131913.jpg',
  '/images/products/20260311_131920.jpg',
  '/images/products/20260311_131930.jpg',
  '/images/products/20260311_131936.jpg',
  '/images/products/20260311_132043.jpg',
  '/images/products/20260311_132107.jpg',
  '/images/products/20260311_132126.jpg',
]

function imgFor(apiImage: string, index: number): string {
  if (apiImage) return productImageUrl(apiImage)
  return staticUrl(FALLBACK_IMGS[index % FALLBACK_IMGS.length]!)
}

type PageToken = number | 'ellipsis'
type Product = {
  id?: number
  name: string
  size: string
  price: number
  image: string
  category: string
}

function paginationItems(total: number, current: number, siblingCount: number): PageToken[] {
  if (total <= 0) return []
  if (total === 1) return [1]
  const set = new Set<number>()
  set.add(1); set.add(total)
  for (let i = current - siblingCount; i <= current + siblingCount; i++) {
    if (i >= 1 && i <= total) set.add(i)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out: PageToken[] = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('ellipsis')
    out.push(p)
  }
  return out
}

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const productPreviewId = searchParams.get('product')

  const [products, setProducts] = useState<Product[]>(
    productCatalog.map((p) => ({ ...p, image: '' })),
  )
  const [managedCategoryNames, setManagedCategoryNames] = useState<string[]>([])

  const categories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    const ordered = managedCategoryNames.filter((c) => fromProducts.includes(c))
    const rest = fromProducts.filter((c) => !managedCategoryNames.includes(c)).sort((a, b) => a.localeCompare(b))
    return ['All', ...ordered, ...rest]
  }, [managedCategoryNames, products])

  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy,   setSortBy]   = useState<'name' | 'price-low' | 'price-high'>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [email, setEmail] = useState('')
  const [subState, setSubState] = useState<'idle' | 'sent'>('idle')
  const pageSize = 12

  /* ── API fetch: category order ── */
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/product-categories`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) return
        setManagedCategoryNames(
          rows.map((r) => String((r as { name?: string }).name ?? '').trim()).filter(Boolean),
        )
      })
      .catch(() => { /* keeps catalog-derived categories */ })
    return () => controller.abort()
  }, [])

  /* ── API fetch: products ── */
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/products`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        setProducts(
          rows.map((item) => {
            const row = item as Record<string, unknown>
            return {
              id: Number(row.id ?? 0),
              name: String(row.name ?? ''),
              size: String(row.size ?? ''),
              price: Number(row.price ?? 0),
              image: String(row.image ?? ''),
              category: String(row.category ?? 'Other'),
            }
          }),
        )
      })
      .catch(() => { /* keep local fallback */ })
    return () => controller.abort()
  }, [])

  /* ── Open product modal from URL param ── */
  useEffect(() => {
    const id = Number(productPreviewId || 0)
    if (!id || products.length === 0) return
    const found = products.find((x) => x.id === id)
    if (!found) return
    setSelectedProduct(found)
    window.setTimeout(() => document.getElementById('store-browse')?.scrollIntoView({ behavior: 'smooth' }), 120)
  }, [productPreviewId, products])

  /* ── Filtered + sorted products ── */
  const filteredProducts = useMemo(() => {
    const base = products.filter((p) => {
      const match = `${p.name} ${p.size}`.toLowerCase().includes(query.toLowerCase())
      const cat = category === 'All' || p.category === category
      return match && cat
    })
    if (sortBy === 'price-low') return [...base].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') return [...base].sort((a, b) => b.price - a.price)
    return [...base].sort((a, b) => a.name.localeCompare(b.name))
  }, [category, products, query, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredProducts],
  )

  useEffect(() => { setCurrentPage(1) }, [query, category, sortBy])
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [currentPage, totalPages])

  const [smUp, setSmUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setSmUp(mq.matches); sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const pageTokens = useMemo(
    () => paginationItems(totalPages, currentPage, smUp ? 2 : 1),
    [totalPages, currentPage, smUp],
  )

  const closeModal = () => {
    setSelectedProduct(null)
    if (searchParams.get('product')) {
      const next = new URLSearchParams(searchParams)
      next.delete('product'); setSearchParams(next, { replace: true })
    }
  }

  /* ── Featured grid: first 5 products ── */
  const [featLarge, featMed, small1, small2, small3] = products

  return (
    <>
      <Helmet>
        <title>Farm Store | Omaru — Pantry Essentials, Grown with Intent</title>
        <meta
          name="description"
          content="Cold-pressed olive oils, artisan honeys, seasonings, and pantry staples — harvested from Omaru Farm, Phillip Island. Shop the full 2026 collection."
        />
      </Helmet>

      <main>

        {/* ══════════════════════════════════════════
            HERO — warm pantry interior, centered text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
          <img
            src={staticUrl('/images/products/20260311_130334.jpg')}
            alt="Omaru Farm Store — artisanal pantry products on warm wooden shelves"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/60" />

          <div className="relative z-10 px-6 py-24 text-center">
            <motion.p
              className="mb-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-gold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Omaru Farm Store
            </motion.p>
            <motion.h1
              className="hero-headline mx-auto max-w-3xl font-heading text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl md:text-[3.5rem]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Pantry Essentials,<br />
              <span className="italic text-gold">Grown with Intent</span>
            </motion.h1>
            <motion.p
              className="mx-auto mt-5 max-w-md font-body text-base leading-[1.75] text-white/72"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              Small-batch oils, honeys, preserves and pantry staples — curated from the land and ready for your table.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.48 }}
              className="mt-8"
            >
              <a
                href="#store-browse"
                className="inline-flex h-11 items-center rounded-sm px-10 font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-105"
                style={{ background: GOLD_GRADIENT }}
              >
                Browse Collection
              </a>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            INFO STRIP
        ══════════════════════════════════════════ */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-[92vw] gap-6 px-5 py-8 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <div>
                <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-charcoal">
                  Trading Hours
                </p>
                <p className="mt-1 font-body text-xs text-stone">Mon–Sat 9:00 AM – 5:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <div>
                <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-charcoal">
                  Find Us
                </p>
                <p className="mt-1 font-body text-xs text-stone">
                  776 Ventnor Road, Ventnor, VIC 3922
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <div>
                <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-charcoal">
                  Local Delivery
                </p>
                <p className="mt-1 font-body text-xs text-stone">
                  Available across Phillip Island
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ARTISANAL COLLECTIONS — editorial grid
        ══════════════════════════════════════════ */}
        <section id="store-browse" className="bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] scroll-mt-24 px-5">

            {/* Section header + category filter tabs */}
            <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                custom={0}
                variants={fadeUp}
              >
                <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                  Artisanal Collections
                </h2>
                <p className="mt-2 max-w-sm font-body text-sm leading-[1.75] text-stone">
                  Every item has been a testament to the cycles of the seasons and our commitment to artisanal heritage quality.
                </p>
              </motion.div>

              {/* Category tabs */}
              <motion.div
                className="flex flex-wrap gap-2"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                custom={0.08}
                variants={fadeUp}
              >
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-sm px-4 py-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition ${
                      category === cat
                        ? 'text-white'
                        : 'bg-white text-stone hover:text-charcoal'
                    }`}
                    style={category === cat ? { background: GOLD_GRADIENT } : {}}
                  >
                    {cat === 'All' ? 'All Products' : cat}
                  </button>
                ))}
                {categories.length > 7 && (
                  <button
                    onClick={() => setCategory('All')}
                    className="rounded-sm bg-white px-4 py-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone transition hover:text-charcoal"
                  >
                    More
                  </button>
                )}
              </motion.div>
            </div>

            {/* ── Featured editorial grid (top 5 products) ── */}
            {category === 'All' && !query && (
              <div className="mb-12 space-y-4">
                {/* Row 1: large + medium */}
                <div className="grid gap-4 md:grid-cols-3">

                  {/* Large featured card */}
                  {featLarge && (
                    <motion.div
                      className="group relative cursor-pointer overflow-hidden rounded-sm md:col-span-2"
                      style={{ minHeight: 340 }}
                      onClick={() => setSelectedProduct(featLarge)}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.15 }}
                      custom={0}
                      variants={fadeUp}
                    >
                      <img
                        src={imgFor(featLarge.image, 0)}
                        alt={featLarge.name}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-estate/85 via-estate/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-7">
                        <p className="font-body text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-gold">
                          Estate-Grown
                        </p>
                        <h3 className="mt-2 max-w-xs font-heading text-2xl font-semibold leading-tight text-white">
                          {featLarge.name}
                        </h3>
                        <p className="mt-2 max-w-xs font-body text-xs leading-relaxed text-white/65">
                          Cold-pressed from our own Omaru grove. Single-origin, unfiltered and exceptionally fresh.
                        </p>
                        <div className="mt-4 flex items-center gap-4">
                          <span
                            className="rounded-sm px-3 py-1 font-body text-[0.65rem] font-semibold text-white"
                            style={{ background: GOLD_GRADIENT }}
                          >
                            ${featLarge.price.toFixed(2)}
                          </span>
                          <span className="inline-flex items-center gap-1 font-body text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/60 transition group-hover:text-gold">
                            View Details <ArrowRight className="h-3 w-3" aria-hidden />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Medium featured card */}
                  {featMed && (
                    <motion.div
                      className="group cursor-pointer overflow-hidden rounded-sm bg-white"
                      onClick={() => setSelectedProduct(featMed)}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.15 }}
                      custom={0.1}
                      variants={fadeUp}
                    >
                      <div className="overflow-hidden" style={{ height: 220 }}>
                        <img
                          src={imgFor(featMed.image, 1)}
                          alt={featMed.name}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-6">
                        <p className="font-body text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-gold">
                          {featMed.category}
                        </p>
                        <h3 className="mt-2 font-heading text-xl font-semibold leading-tight text-charcoal">
                          {featMed.name}
                        </h3>
                        <p className="mt-1.5 font-body text-xs leading-relaxed text-stone">
                          Raw, unfiltered richness reflecting the diverse flora of the Ventnor coastline.
                        </p>
                        <p className="mt-3 font-body text-sm font-semibold text-charcoal">
                          ${featMed.price.toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Row 2: three small cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[small1, small2, small3].map((p, i) =>
                    p ? (
                      <motion.div
                        key={p.name}
                        className="group cursor-pointer overflow-hidden rounded-sm bg-white"
                        onClick={() => setSelectedProduct(p)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.1 }}
                        custom={(i + 2) * 0.08}
                        variants={fadeUp}
                      >
                        <div className="overflow-hidden">
                          <img
                            src={imgFor(p.image, i + 2)}
                            alt={p.name}
                            className="h-40 w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-5">
                          <p className="font-body text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-gold">
                            {p.category}
                          </p>
                          <h3 className="mt-1.5 font-body text-sm font-semibold leading-snug text-charcoal">
                            {p.name}
                          </h3>
                          <p className="mt-1 font-body text-sm text-stone">${p.price.toFixed(2)}</p>
                        </div>
                      </motion.div>
                    ) : null,
                  )}
                </div>
              </div>
            )}

            {/* ── Search + Sort bar ── */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone/40" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products…"
                  className="h-10 w-full rounded-sm border-b border-stone/25 bg-white pl-9 pr-4 font-body text-sm text-charcoal placeholder-stone/40 outline-none focus:border-gold"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price-low' | 'price-high')}
                className="h-10 rounded-sm border-b border-stone/25 bg-white px-3 font-body text-sm text-stone outline-none focus:border-gold"
              >
                <option value="name">Name A–Z</option>
                <option value="price-low">Price Low–High</option>
                <option value="price-high">Price High–Low</option>
              </select>
            </div>

            {/* All category tabs (small) */}
            <div className="mb-6 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-sm px-3 py-1.5 font-body text-[0.65rem] font-semibold uppercase tracking-[0.16em] transition ${
                    category === cat
                      ? 'text-white'
                      : 'bg-white text-stone hover:text-charcoal'
                  }`}
                  style={category === cat ? { background: GOLD_GRADIENT } : {}}
                >
                  {cat === 'All' ? 'All Products' : cat}
                </button>
              ))}
            </div>

            <p className="mb-6 font-body text-xs text-stone">
              Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>

            {/* ── Full paginated grid ── */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedProducts.map((product, index) => (
                <motion.div
                  key={product.id ?? `${product.name}-${index}`}
                  className="group cursor-pointer overflow-hidden rounded-sm bg-white transition hover:-translate-y-0.5"
                  onClick={() => setSelectedProduct(product)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: (index % 12) * 0.03 }}
                >
                  <div className="overflow-hidden">
                    <img
                      src={imgFor(product.image, index)}
                      alt={product.name}
                      className="h-44 w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-body text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-gold">
                      {product.category}
                    </p>
                    <h3 className="mt-1.5 font-body text-sm font-semibold leading-snug text-charcoal">
                      {product.name}
                    </h3>
                    <p className="mt-0.5 font-body text-xs text-stone">{product.size}</p>
                    <p className="mt-2 font-heading text-lg font-semibold text-charcoal">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-sm border border-stone/20 bg-white px-4 py-2 font-body text-xs font-semibold uppercase tracking-[0.14em] text-stone transition hover:border-gold hover:text-gold disabled:opacity-30"
                >
                  Prev
                </button>
                {pageTokens.map((token, idx) =>
                  token === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-sm text-stone/40">…</span>
                  ) : (
                    <button
                      key={token}
                      onClick={() => setCurrentPage(token)}
                      aria-current={token === currentPage ? 'page' : undefined}
                      className="h-9 min-w-9 rounded-sm font-body text-xs font-semibold transition"
                      style={
                        token === currentPage
                          ? { background: GOLD_GRADIENT, color: '#fff' }
                          : { background: '#fff', color: '#7a7469', border: '1px solid rgba(0,0,0,0.1)' }
                      }
                    >
                      {token}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-sm border border-stone/20 bg-white px-4 py-2 font-body text-xs font-semibold uppercase tracking-[0.14em] text-stone transition hover:border-gold hover:text-gold disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PHILOSOPHY QUOTE
        ══════════════════════════════════════════ */}
        <section className="bg-surface-low py-24 md:py-32">
          <motion.div
            className="mx-auto max-w-2xl px-6 text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            custom={0}
            variants={fadeUp}
          >
            <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center">
              <Wheat className="h-8 w-8 text-gold" aria-hidden />
            </div>
            <blockquote className="font-heading text-2xl font-semibold italic leading-[1.45] tracking-[-0.01em] text-charcoal md:text-3xl">
              "We believe that the most beautiful things are those which are made slowly, with respect for the land and the hands that tend it."
            </blockquote>
            <p className="mt-6 font-body text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold">
              The Omaru Philosophy
            </p>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════
            STAY CONNECTED — newsletter
        ══════════════════════════════════════════ */}
        <section className="bg-white py-20 md:py-24">
          <motion.div
            className="mx-auto max-w-md px-6 text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            custom={0}
            variants={fadeUp}
          >
            <h2 className="font-heading text-3xl font-semibold tracking-[-0.02em] text-charcoal md:text-4xl">
              Stay Connected
            </h2>
            <p className="mx-auto mt-3 font-body text-sm leading-[1.75] text-stone">
              Join our mailing list to hear about new harvests, seasonal releases and upcoming store events.
            </p>

            {subState === 'sent' ? (
              <div className="mt-8 rounded-sm bg-surface py-8">
                <p className="font-heading text-xl font-semibold text-charcoal">You're on the list!</p>
                <p className="mt-1 font-body text-sm text-stone">We'll be in touch with the next harvest.</p>
              </div>
            ) : (
              <form
                className="mt-8 flex gap-0 overflow-hidden rounded-sm shadow-[0_4px_24px_rgba(26,18,8,0.07)]"
                onSubmit={(e) => { e.preventDefault(); if (email) setSubState('sent') }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 border-0 bg-white px-5 py-3.5 font-body text-sm text-charcoal placeholder-stone/45 outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 px-6 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105"
                  style={{ background: GOLD_GRADIENT }}
                >
                  Subscribe
                </button>
              </form>
            )}
          </motion.div>
        </section>

      </main>

      {/* ══════════════════════════════════════════
          PRODUCT QUICK-VIEW MODAL
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-estate/55 p-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl overflow-hidden rounded-sm bg-white shadow-[0_40px_90px_rgba(26,18,8,0.35)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 z-10 text-stone transition hover:text-charcoal"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid md:grid-cols-2">
                {/* Image panel */}
                <div className="flex items-center justify-center bg-surface p-6 md:min-h-72">
                  <img
                    src={imgFor(selectedProduct.image, products.indexOf(selectedProduct))}
                    alt={selectedProduct.name}
                    className="max-h-[320px] w-full rounded-sm object-contain"
                  />
                </div>

                {/* Details panel */}
                <div className="flex flex-col justify-center p-8">
                  <div className="inline-flex items-center gap-2">
                    <PackageSearch className="h-3.5 w-3.5 text-gold" aria-hidden />
                    <span className="font-body text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-gold">
                      Product Details
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-2xl font-semibold leading-tight text-charcoal">
                    {selectedProduct.name}
                  </h3>
                  <p className="mt-1 font-body text-xs uppercase tracking-[0.2em] text-stone">
                    {selectedProduct.category}
                  </p>
                  <div className="mt-5 space-y-2 font-body text-sm text-stone">
                    <p><span className="font-semibold text-charcoal">Pack Size:</span> {selectedProduct.size}</p>
                    <p>
                      <span className="font-semibold text-charcoal">Description:</span>{' '}
                      Handcrafted with farm-inspired quality, rich natural flavour and premium ingredients.
                    </p>
                  </div>
                  <div className="mt-6">
                    <p
                      className="inline-flex rounded-sm px-4 py-2 font-heading text-2xl font-semibold text-white"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      ${selectedProduct.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="mt-4 font-body text-xs font-semibold uppercase tracking-[0.18em] text-stone/50 transition hover:text-stone"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
