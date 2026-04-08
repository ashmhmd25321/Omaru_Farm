const base = import.meta.env.BASE_URL ?? '/'

/**
 * Resolves a public-folder path to the correct URL, honoring Vite's configured
 * base path.  Works at module-level and inside components.
 *
 * E.g. with base "/Omaru_Farm/":
 *   staticUrl('/images/foo.jpg')  →  '/Omaru_Farm/images/foo.jpg'
 */
export function staticUrl(path: string): string {
  const stripped = path.replace(/^\/+/, '')
  const b = base.endsWith('/') ? base : `${base}/`
  return `${b}${stripped}`
}
