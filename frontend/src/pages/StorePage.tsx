import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { CircleX, Leaf, PackageSearch, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { productCatalog } from '@/data/productCatalog'
import { productImageUrl } from '@/utils/productImage'
import { staticUrl } from '@/utils/staticUrl'

type PageToken = number | 'ellipsis'
type Product = {
  id?: number
  name: string
  size: string
  price: number
  image: string
  category: string
}

/** Compact page list with ellipses so long ranges stay usable on small screens. */
function paginationItems(total: number, current: number, siblingCount: number): PageToken[] {
  if (total <= 0) return []
  if (total === 1) return [1]

  const set = new Set<number>()
  set.add(1)
  set.add(total)
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
    productCatalog.map((p) => ({
      ...p,
      image: '',
    })),
  )
  const [managedCategoryNames, setManagedCategoryNames] = useState<string[]>([])

  const categories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    const ordered = managedCategoryNames.filter((c) => fromProducts.includes(c))
    const rest = fromProducts.filter((c) => !managedCategoryNames.includes(c)).sort((a, b) => a.localeCompare(b))
    return ['All', ...ordered, ...rest]
  }, [managedCategoryNames, products])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high'>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const pageSize = 12

  useEffect(() => {
    const controller = new AbortController()
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
    fetch(`${base}/api/product-categories`, { signal: controller.signal })
      .then((res) => res.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) return
        setManagedCategoryNames(
          rows
            .map((r) => String((r as { name?: string }).name ?? '').trim())
            .filter(Boolean),
        )
      })
      .catch(() => {
        // filters still work from product-derived categories
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/products`, { signal: controller.signal })
      .then((res) => res.json())
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
      .catch(() => {
        // keep local fallback catalog
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const id = Number(productPreviewId || 0)
    if (!id || products.length === 0) return
    const found = products.find((x) => x.id === id)
    if (!found) return
    setSelectedProduct(found)
    window.setTimeout(() => document.getElementById('store-browse')?.scrollIntoView({ behavior: 'smooth' }), 120)
  }, [productPreviewId, products])

  const filteredProducts = useMemo(() => {
    const byFilter = products.filter((product) => {
      const searchTarget = `${product.name} ${product.size}`.toLowerCase()
      const queryMatch = searchTarget.includes(query.toLowerCase())
      const categoryMatch = category === 'All' || product.category === category
      return queryMatch && categoryMatch
    })

    if (sortBy === 'price-low') return [...byFilter].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') return [...byFilter].sort((a, b) => b.price - a.price)
    return [...byFilter].sort((a, b) => a.name.localeCompare(b.name))
  }, [category, products, query, sortBy])

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

  const [smUp, setSmUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setSmUp(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const pageTokens = useMemo(
    () => paginationItems(totalPages, currentPage, smUp ? 2 : 1),
    [totalPages, currentPage, smUp],
  )

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
            src={staticUrl('/images/products/20260311_130334.jpg')}
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
                        src={staticUrl(`/images/products/${src}`)}
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
              key={product.id ?? `${product.name}-${index}`}
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
                      src={productImageUrl(product.image)}
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

          <section
            className="mt-8 rounded-xl border border-gold/20 bg-black/30 p-3 sm:p-4"
            aria-label="Product pagination"
          >
            <p className="text-center text-sm text-white/70 sm:text-left">
              Page {currentPage} of {totalPages}
            </p>

            <div className="mt-3 flex items-stretch gap-2 sm:mt-4 sm:items-center sm:gap-3">
              <Button
                variant="outline"
                className="min-h-11 shrink-0 px-3 sm:px-4"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <span className="sm:hidden">Prev</span>
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <div
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto overscroll-x-contain px-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="navigation"
                aria-label="Page numbers"
              >
                {pageTokens.map((token, idx) =>
                  token === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="inline-flex min-w-8 shrink-0 items-center justify-center pb-1 text-sm leading-none text-white/40 select-none"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setCurrentPage(token)}
                      aria-label={`Go to page ${token}`}
                      aria-current={token === currentPage ? 'page' : undefined}
                      className={`grid h-11 min-w-11 shrink-0 place-items-center rounded-full text-sm font-medium transition ${
                        token === currentPage
                          ? 'bg-gold text-black'
                          : 'border border-white/30 text-white/80 hover:border-gold hover:text-gold'
                      }`}
                    >
                      {token}
                    </button>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                className="min-h-11 shrink-0 px-3 sm:px-4"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
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
              onClick={() => {
                setSelectedProduct(null)
                if (searchParams.get('product')) {
                  const next = new URLSearchParams(searchParams)
                  next.delete('product')
                  setSearchParams(next, { replace: true })
                }
              }}
              className="absolute right-3 top-3 text-white/70 transition hover:text-gold"
              aria-label="Close details popup"
            >
              <CircleX className="h-5 w-5" />
            </button>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-gold/30 bg-black/40 p-2">
                <img
                  src={productImageUrl(selectedProduct.image)}
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
                  <Button
                    onClick={() => {
                      setSelectedProduct(null)
                      if (searchParams.get('product')) {
                        const next = new URLSearchParams(searchParams)
                        next.delete('product')
                        setSearchParams(next, { replace: true })
                      }
                    }}
                  >
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

