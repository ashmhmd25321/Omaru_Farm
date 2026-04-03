import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { CircleX, Leaf, PackageSearch, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { productCatalog } from '@/data/productCatalog'

const productImagePool = [
  '20260311_130334.jpg',
  '20260311_130456.jpg',
  '20260311_130712.jpg',
  '20260311_130805.jpg',
  '20260311_130831.jpg',
  '20260311_130909.jpg',
  '20260311_130929.jpg',
  '20260311_130944.jpg',
  '20260311_130957.jpg',
  '20260311_131012.jpg',
  '20260311_131023.jpg',
  '20260311_131037.jpg',
  '20260311_131115.jpg',
  '20260311_131121.jpg',
  '20260311_131126.jpg',
  '20260311_131151.jpg',
  '20260311_131257.jpg',
  '20260311_131331.jpg',
  '20260311_131358.jpg',
  '20260311_131523.jpg',
  '20260311_131542.jpg',
  '20260311_131619.jpg',
  '20260311_131655.jpg',
  '20260311_131702.jpg',
  '20260311_131721.jpg',
  '20260311_131758.jpg',
  '20260311_131810.jpg',
  '20260311_131846.jpg',
  '20260311_131852.jpg',
  '20260311_131913.jpg',
  '20260311_131920.jpg',
  '20260311_131930.jpg',
  '20260311_131936.jpg',
  '20260311_132043.jpg',
  '20260311_132107.jpg',
  '20260311_132126.jpg',
]

export function StorePage() {
  const categories = useMemo(() => ['All', ...Array.from(new Set(productCatalog.map((p) => p.category)))], [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high'>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<(typeof productCatalog)[number] | null>(null)
  const pageSize = 12

  const filteredProducts = useMemo(() => {
    const byFilter = productCatalog.filter((product) => {
      const searchTarget = `${product.name} ${product.size}`.toLowerCase()
      const queryMatch = searchTarget.includes(query.toLowerCase())
      const categoryMatch = category === 'All' || product.category === category
      return queryMatch && categoryMatch
    })

    if (sortBy === 'price-low') return [...byFilter].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') return [...byFilter].sort((a, b) => b.price - a.price)
    return [...byFilter].sort((a, b) => a.name.localeCompare(b.name))
  }, [category, query, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredProducts],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [query, category, sortBy])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return (
    <>
      <Helmet>
        <title>Store | Omaru Farm</title>
        <meta name="description" content="Browse Omaru Farm Store products by category, search, and price." />
      </Helmet>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold/20">
          <img
            src="/images/products/20260311_130334.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
          <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#63492a]/25 blur-3xl" />

          <div className="relative mx-auto grid min-h-[58vh] max-w-[92vw] items-center gap-8 px-5 py-14 md:min-h-[52vh] md:grid-cols-12 md:py-16">
            <motion.div
              className="md:col-span-8 lg:col-span-7"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="text-xs uppercase tracking-[0.32em] text-gold/85">Omaru Farm Store</p>
              <h1 className="mt-4 font-heading text-5xl leading-[0.95] text-[#f5efe2] md:text-6xl lg:text-7xl">
                The Farm
                <br />
                <span className="italic text-gold/95">Pantry</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/78 md:text-lg">
                Small-batch oils, honeys, preserves, and pantry staples — curated from the land and ready for your table. Browse the full 2026
                collection below.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/60">
                {[
                  { icon: <ShoppingBag className="h-4 w-4 text-gold/90" />, text: '2026 collection' },
                  { icon: <Leaf className="h-4 w-4 text-gold/90" />, text: 'Farm-inspired quality' },
                  { icon: <Truck className="h-4 w-4 text-gold/90" />, text: 'Pickup & delivery info on request' },
                ].map((b) => (
                  <span
                    key={b.text}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-black/35 px-3 py-1.5 backdrop-blur-sm"
                  >
                    {b.icon}
                    {b.text}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="px-6 py-2.5">
                  <a href="#store-browse">Browse products</a>
                </Button>
                <Button variant="outline" asChild className="px-6 py-2.5">
                  <a href="/contact">Enquire</a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="hidden md:col-span-4 lg:col-span-5 md:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              <div className="relative ml-auto max-w-sm rounded-2xl border border-gold/20 bg-black/40 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gold/75">This season</p>
                    <p className="mt-1 font-heading text-2xl text-[#f5efe2]">Taste the harvest</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">
                      Filter by category, search by name, or sort by price — tap any product for full details.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {['20260311_130456.jpg', '20260311_130712.jpg', '20260311_130805.jpg'].map((src) => (
                    <div key={src} className="overflow-hidden rounded-xl border border-gold/15">
                      <img
                        src={`/images/products/${src}`}
                        alt=""
                        aria-hidden="true"
                        className="aspect-square w-full object-cover opacity-90 transition duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div id="store-browse" className="mx-auto max-w-[86vw] scroll-mt-24 px-5 py-12 md:py-14">
          <p className="font-heading text-2xl text-[#f5efe2] md:text-3xl">Shop the collection</p>
          <p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">
            Browse the complete 2026 range by category, name, and price.
          </p>

          <section className="mt-8 grid gap-4 rounded-xl border border-gold/25 bg-black/35 p-4 md:grid-cols-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="field" placeholder="Search products..." />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'price-low' | 'price-high')}
            className="field"
          >
            <option value="name" className="bg-black">Sort: Name A-Z</option>
            <option value="price-low" className="bg-black">Sort: Price Low-High</option>
            <option value="price-high" className="bg-black">Sort: Price High-Low</option>
          </select>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/60">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    category === item
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-white/30 text-white/80 hover:border-gold/60 hover:text-gold'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          </section>

          <p className="mt-5 text-sm text-white/65">Showing {filteredProducts.length} products</p>

          <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedProducts.map((product, index) => (
            <motion.div
              key={`${product.name}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: (index % 12) * 0.03 }}
            >
              <Card
                className="h-full cursor-pointer transition hover:-translate-y-1 hover:border-gold/50"
                onClick={() => setSelectedProduct(product)}
              >
                <CardHeader>
                  <div className="group/image relative overflow-hidden rounded-md">
                    <img
                      src={`/images/products/${productImagePool[index % productImagePool.length]}`}
                      alt={product.name}
                      className="h-44 w-full object-cover transition duration-700 group-hover/image:scale-110"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition group-hover/image:opacity-100" />
                  </div>
                  <CardTitle>{product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/70">{product.category}</p>
                  <p className="text-sm text-white/70">{product.size}</p>
                  <p className="mt-2 text-lg font-semibold text-gold">${product.price.toFixed(2)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </section>

          <section className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/20 bg-black/30 p-3">
          <p className="text-sm text-white/70">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
                const pageNumber = idx + 1
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`h-8 w-8 rounded-full text-xs transition ${
                      pageNumber === currentPage
                        ? 'bg-gold text-black'
                        : 'border border-white/30 text-white/75 hover:border-gold hover:text-gold'
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              })}
            </div>
            <Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
          </section>
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
              aria-label="Close details popup"
            >
              <CircleX className="h-5 w-5" />
            </button>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-gold/30 bg-black/40 p-2">
                <img
                  src={`/images/products/${productImagePool[(filteredProducts.indexOf(selectedProduct) + productImagePool.length) % productImagePool.length]}`}
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
                <p className="mt-2 text-white/75">{selectedProduct.category}</p>
                <div className="mt-4 space-y-2 text-sm text-white/80">
                  <p><span className="text-white/60">Pack Size:</span> {selectedProduct.size}</p>
                  <p><span className="text-white/60">Price:</span> ${selectedProduct.price.toFixed(2)}</p>
                  <p>
                    <span className="text-white/60">Description:</span> Handcrafted with farm-inspired quality, rich natural flavor, and premium ingredients suitable for everyday gourmet cooking.
                  </p>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button onClick={() => setSelectedProduct(null)}>Close</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

