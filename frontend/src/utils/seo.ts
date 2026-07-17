export const SITE_URL = 'https://omarufarms.com.au'
export const SITE_NAME = 'Omaru Farm'
export const DEFAULT_OG_IMAGE = '/images/farm/IMG_3924.jpg'

/** Convert relative asset paths to absolute URLs for crawlers/social previews. */
export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_URL
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE_URL}${path}`
}

export type SeoProps = {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

export function buildCanonical(path: string): string {
  if (!path || path === '/') return `${SITE_URL}/`
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
