import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { CircleX, PackageSearch } from 'lucide-react'
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

      <main className="mx-auto max-w-[86vw] px-5 py-10">
        <h1 className="font-heading text-4xl text-gold md:text-5xl">Farm Store</h1>
        <p className="mt-2 text-white/75">Browse the complete 2026 collection by category, name, and price.</p>

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

