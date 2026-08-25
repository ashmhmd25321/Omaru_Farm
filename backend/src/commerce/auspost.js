/**
 * Australia Post Postage Assessment Calculator (PAC) — domestic parcel rates.
 * Docs: https://developers.auspost.com.au/apis/pac
 *
 * Auth header: AUTH-KEY
 * Production base: https://digitalapi.auspost.com.au
 */

const PAC_BASE = String(process.env.AUSPOST_PAC_BASE_URL ?? 'https://digitalapi.auspost.com.au').replace(/\/$/, '')
const ORIGIN_POSTCODE = String(process.env.AUSPOST_ORIGIN_POSTCODE ?? '3922').replace(/\s+/g, '')
const PREFERRED_SERVICE = String(process.env.AUSPOST_PREFERRED_SERVICE ?? 'AUS_PARCEL_REGULAR').trim()
const DEFAULT_LENGTH_CM = Math.max(5, Number(process.env.AUSPOST_DEFAULT_LENGTH_CM ?? 20) || 20)
const DEFAULT_WIDTH_CM = Math.max(5, Number(process.env.AUSPOST_DEFAULT_WIDTH_CM ?? 15) || 15)
const DEFAULT_HEIGHT_CM = Math.max(5, Number(process.env.AUSPOST_DEFAULT_HEIGHT_CM ?? 10) || 10)
const REQUEST_TIMEOUT_MS = Math.max(2000, Number(process.env.AUSPOST_TIMEOUT_MS ?? 8000) || 8000)

export function auspostConfigured() {
  return Boolean(String(process.env.AUSPOST_PAC_API_KEY ?? '').trim())
}

export function packageDimensionsCm(volumeCm3 = 0) {
  const volume = Math.max(0, Number(volumeCm3) || 0)
  let length = DEFAULT_LENGTH_CM
  let width = DEFAULT_WIDTH_CM
  let height = DEFAULT_HEIGHT_CM
  const baseVol = length * width * height
  if (volume > baseVol) {
    const scale = Math.cbrt(volume / baseVol)
    length = Math.max(5, Math.ceil(length * scale))
    width = Math.max(5, Math.ceil(width * scale))
    height = Math.max(5, Math.ceil(height * scale))
  }
  // AusPost expects length >= width >= height
  const sorted = [length, width, height].sort((a, b) => b - a)
  return { length: sorted[0], width: sorted[1], height: sorted[2] }
}

function normalizeServices(payload) {
  const raw = payload?.services?.service
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .map((s) => ({
      code: String(s.code ?? '').trim(),
      name: String(s.name ?? s.code ?? 'Australia Post').trim(),
      price: Number(s.price),
    }))
    .filter((s) => s.code && Number.isFinite(s.price) && s.price >= 0)
}

/** Prefer Parcel Post (regular); otherwise cheapest non-express; otherwise cheapest. */
export function pickRecommendedService(services) {
  const list = Array.isArray(services) ? services : []
  if (list.length === 0) return null
  const byCode = list.find((s) => s.code === PREFERRED_SERVICE)
  if (byCode) return byCode
  const parcelPost = list.find((s) => /parcel\s*post/i.test(s.name) && !/express/i.test(s.name))
  if (parcelPost) return parcelPost
  const nonExpress = list
    .filter((s) => !/express/i.test(s.name) && !/express/i.test(s.code))
    .sort((a, b) => a.price - b.price)
  if (nonExpress[0]) return nonExpress[0]
  return [...list].sort((a, b) => a.price - b.price)[0]
}

async function pacGet(pathWithQuery) {
  const key = String(process.env.AUSPOST_PAC_API_KEY ?? '').trim()
  if (!key) throw Object.assign(new Error('AusPost PAC API key is not configured'), { status: 503 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${PAC_BASE}${pathWithQuery}`, {
      method: 'GET',
      headers: {
        AUTH_KEY: key,
        'AUTH-KEY': key,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    if (!res.ok) {
      const msg =
        data?.error?.errorMessage ||
        data?.error?.message ||
        data?.message ||
        `AusPost PAC request failed (${res.status})`
      throw Object.assign(new Error(msg), { status: 502, auspostStatus: res.status })
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Quote domestic parcel postage from farm origin to destination postcode.
 * @returns {{ fee: number, serviceCode: string, serviceName: string, options: object[] }}
 */
export async function quoteAusPostDomesticParcel({
  toPostcode,
  weightKg,
  volumeCm3 = 0,
} = {}) {
  const dest = String(toPostcode ?? '').replace(/\s+/g, '').trim()
  if (!/^\d{4}$/.test(dest)) {
    throw Object.assign(new Error('Enter a valid 4-digit Australian postcode'), { status: 400 })
  }

  const weight = Math.max(0.05, Math.min(22, Number(weightKg) || 0.05))
  const dims = packageDimensionsCm(volumeCm3)
  const qs = new URLSearchParams({
    from_postcode: ORIGIN_POSTCODE,
    to_postcode: dest,
    length: String(dims.length),
    width: String(dims.width),
    height: String(dims.height),
    weight: String(+weight.toFixed(3)),
  })

  const payload = await pacGet(`/postage/parcel/domestic/service.json?${qs}`)
  const services = normalizeServices(payload)
  const chosen = pickRecommendedService(services)
  if (!chosen) {
    throw Object.assign(new Error('No Australia Post parcel services available for this postcode'), {
      status: 400,
    })
  }

  return {
    fee: +Number(chosen.price).toFixed(2),
    serviceCode: chosen.code,
    serviceName: chosen.name,
    options: services.map((s) => ({
      code: s.code,
      name: s.name,
      fee: +Number(s.price).toFixed(2),
    })),
    dimensions: dims,
    weightKg: +weight.toFixed(3),
    fromPostcode: ORIGIN_POSTCODE,
    toPostcode: dest,
  }
}
