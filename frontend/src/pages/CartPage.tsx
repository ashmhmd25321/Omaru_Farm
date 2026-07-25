import { Link } from 'react-router-dom'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/CartContext'
import { productImageUrl } from '@/utils/productImage'

export function CartPage() {
  const { lines, subtotal, setQuantity, removeItem } = useCart()

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
            <div className="flex flex-col items-end gap-3 border-t border-parchment pt-6">
              <p className="text-lg text-charcoal">
                Subtotal: <span className="font-semibold text-gold">${subtotal.toFixed(2)}</span>
              </p>
              <p className="text-xs text-stone">Shipping calculated at checkout from your postcode.</p>
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
