import { staticUrl } from './staticUrl'

const FALLBACK_PRODUCT_IMAGE = staticUrl('/images/products/20260311_130334.jpg')

/**
 * Resolves product `image` from the CMS: legacy filenames live under `/images/products/`,
 * admin uploads use `uploads/<file>` (served from `/images/uploads/`).
 */
export function productImageUrl(image: string | undefined | null): string {
  const raw = String(image ?? '').trim()
  if (!raw) return FALLBACK_PRODUCT_IMAGE
  if (/^https?:\/\//i.test(raw)) return raw
  const s = raw.replace(/^\/+/, '')
  if (s.startsWith('images/uploads/')) return staticUrl(`/${s}`)
  if (s.startsWith('uploads/')) return staticUrl(`/images/${s}`)
  if (s.startsWith('images/products/')) return staticUrl(`/${s}`)
  return staticUrl(`/images/products/${s}`)
}
