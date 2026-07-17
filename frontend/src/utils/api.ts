/** Origin for API calls. Empty string = same-origin relative paths (production). */
const rawBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export const API_BASE = String(rawBase).replace(/\/+$/, '')

/**
 * Join API base + path without creating `/api/api/...`.
 * Paths should usually start with `/api/...`.
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // If base is "/api" (or ends with "/api") and path already includes "/api",
  // return the path as-is (or strip the duplicate prefix from base).
  if (API_BASE === '/api' && normalizedPath.startsWith('/api')) {
    return normalizedPath
  }
  if (API_BASE.endsWith('/api') && normalizedPath.startsWith('/api')) {
    return `${API_BASE.slice(0, -4)}${normalizedPath}`
  }

  return `${API_BASE}${normalizedPath}`
}
