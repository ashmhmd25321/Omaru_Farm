import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type CartLine = {
  productId: number
  name: string
  size: string
  price: number
  image: string
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  subtotal: number
  addItem: (item: Omit<CartLine, 'quantity'>, qty?: number) => void
  setQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clear: () => void
}

const STORAGE_KEY = 'omaru_cart_v1'
const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartLine[]
    return Array.isArray(parsed) ? parsed.filter((l) => l.productId && l.quantity > 0) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => loadCart())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue['addItem'] = (item, qty = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === item.productId)
        if (existing) {
          return prev.map((l) =>
            l.productId === item.productId ? { ...l, quantity: l.quantity + qty } : l,
          )
        }
        return [...prev, { ...item, quantity: qty }]
      })
    }
    const setQuantity = (productId: number, quantity: number) => {
      setLines((prev) =>
        prev
          .map((l) => (l.productId === productId ? { ...l, quantity } : l))
          .filter((l) => l.quantity > 0),
      )
    }
    const removeItem = (productId: number) => {
      setLines((prev) => prev.filter((l) => l.productId !== productId))
    }
    const clear = () => setLines([])
    const count = lines.reduce((n, l) => n + l.quantity, 0)
    const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0)
    return { lines, count, subtotal, addItem, setQuantity, removeItem, clear }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
