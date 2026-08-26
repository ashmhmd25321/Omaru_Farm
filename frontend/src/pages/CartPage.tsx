import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/CartContext'
import { apiUrl } from '@/utils/api'
import { productImageUrl } from '@/utils/productImage'

type Quote = {
  subtotal: number
  total: number
  shipping: {
    fee: number
    ruleName: string
    method: string
    provider?: string
    breakdown?: {
      baseFee?: number
      perKgFee?: number
      weightFee?: number
      weightKg?: number
      volumetricKg?: number
      chargeableKg?: number
      freeShippingApplied?: boolean
      freeOver?: number | null
      packageLengthCm?: number
      packageWidthCm?: number
      packageHeightCm?: number
      provisionalData?: boolean
    }
  }
}

export function CartPage() {
  const { lines, subtotal, setQuantity, removeItem } = useCart()
  const [postcode, setPostcode] = useState('')
  const [method, setMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')

  const itemsPayload = useMemo(
    () => lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    [lines],
  )

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null)
      setQuoteError('')
      return
    }
    if (method === 'delivery' && !/^\d{4}$/.test(postcode.replace(/\s/g, ''))) {
      setQuote(null)
      setQuoteError('')
      return
    }
    const controller = new AbortController()
    fetch(apiUrl('/api/cart/quote'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        items: itemsPayload,
        postcode,
        shippingMethod: method,
      }),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.message ?? 'Quote failed')
        setQuoteError('')
        setQuote(data)
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setQuote(null)
        setQuoteError(e instanceof Error ? e.message : 'Quote failed')
      })
    return () => controller.abort()
  }, [itemsPayload, postcode, method, lines.length])

  const breakdown = quote?.shipping.breakdown

  return (
    <>
      <Seo title="Cart | Omaru Farm Store" description="Your Omaru Farm shopping cart." path="/cart" />
      <main className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <h1 className="font-heading text-4xl text-charcoal">Your cart</h1>
        {lines.length === 0 ? (
          <div className="mt-8 rounded-lg border border-parchment bg-white p-8 text-center">
            <p className="text-stone">Your cart is empty.</p>
            <Link to="/store" className="mt-4 inline-block text-sm font-semibold text-gold hover:underline">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {lines.map((line) => (
              <div
                key={line.productId}
                className="flex flex-col gap-4 rounded-lg border border-parchment bg-white p-4 sm:flex-row sm:items-center"
              >
                <img
                  src={productImageUrl(line.image)}
                  alt=""
                  className="h-24 w-24 rounded-md object-cover"
                />
                <div className="flex-1">
                  <p className="font-heading text-xl text-charcoal">{line.name}</p>
                  <p className="text-sm text-stone">{line.size}</p>
                  <p className="mt-1 font-semibold text-gold">${line.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    className="field w-20"
                    value={line.quantity}
                    onChange={(e) => setQuantity(line.productId, Math.max(1, Number(e.target.value) || 1))}
                  />
                  <Button variant="outline" type="button" onClick={() => removeItem(line.productId)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-col items-stretch gap-4 border-t border-parchment pt-6 sm:items-end">
              <p className="text-lg text-charcoal">
                Subtotal: <span className="font-semibold text-gold">${subtotal.toFixed(2)}</span>
              </p>
              <div className="w-full max-w-md space-y-3 rounded-lg border border-parchment bg-white p-4">
                <p className="text-sm font-semibold text-charcoal">Estimate shipping</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={method === 'delivery'}
                      onChange={() => setMethod('delivery')}
                    />
                    Delivery
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={method === 'pickup'}
                      onChange={() => setMethod('pickup')}
                    />
                    Farm pickup
                  </label>
                </div>
                {method === 'delivery' ? (
                  <input
                    className="field"
                    placeholder="Postcode (e.g. 3922, 3000, 2010)"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                ) : null}
                {quoteError ? <p className="text-sm text-red-600">{quoteError}</p> : null}
                {quote ? (
                  <div className="space-y-1 text-sm text-stone">
                    <p className="flex justify-between text-charcoal">
                      <span>Shipping ({quote.shipping.ruleName})</span>
                      <span>${quote.shipping.fee.toFixed(2)}</span>
                    </p>
                    {method === 'delivery' && breakdown ? (
                      <>
                        <p className="text-xs">
                          {breakdown.freeShippingApplied
                            ? `Free shipping over $${Number(breakdown.freeOver ?? 0).toFixed(0)}`
                            : quote.shipping.provider === 'auspost'
                              ? `AusPost live rate · chargeable ${Number(breakdown.chargeableKg ?? 0).toFixed(2)} kg · package ${Number(breakdown.packageLengthCm ?? 0)}×${Number(breakdown.packageWidthCm ?? 0)}×${Number(breakdown.packageHeightCm ?? 0)} cm`
                              : `Chargeable ${Number(breakdown.chargeableKg ?? 0).toFixed(2)} kg · base $${Number(breakdown.baseFee ?? 0).toFixed(2)} + $${Number(breakdown.perKgFee ?? 0).toFixed(2)}/kg`}
                        </p>
                        {breakdown.provisionalData ? (
                          <p className="text-xs font-semibold text-amber-700">
                            Testing estimate — product pack measurements are provisional.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    <p className="flex justify-between font-semibold text-charcoal">
                      <span>Estimated total</span>
                      <span>${quote.total.toFixed(2)}</span>
                    </p>
                  </div>
                ) : method === 'delivery' ? (
                  <p className="text-xs text-stone">Enter a postcode to see the zone and fee for this mixed cart.</p>
                ) : null}
              </div>
              <Link
                to="/checkout"
                className="inline-flex h-11 items-center rounded-sm px-6 text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}
              >
                Proceed to checkout
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
