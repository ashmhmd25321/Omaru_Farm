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
const postcodeCache = new Map()
const POSTCODE_CACHE_MS = 24 * 60 * 60 * 1000

export function auspostConfigured() {
  return Boolean(String(process.env.AUSPOST_PAC_API_KEY ?? '').trim())
}

export function packageDimensionsCm(volumeCm3 = 0) {
  const volume = Math.max(0, Number(volumeCm3) || 0)
  let length = DEFAULT_LENGTH_CM
  let width = DEFAULT_WIDTH_CM
  let height = DEFAULT_HEIGHT_CM
  const baseVol = length * width * height
  if (volume > 0) {
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

function normalizeLocalities(payload) {
  const raw = payload?.localities?.locality
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .map((row) => ({
      postcode: String(row.postcode ?? '').trim(),
      state: String(row.state ?? '').trim().toUpperCase(),
      locality: String(row.location ?? row.locality ?? '').trim().toUpperCase(),
    }))
    .filter((row) => /^\d{4}$/.test(row.postcode) && row.state && row.locality)
}

function normalizeState(value) {
  const state = String(value ?? '').trim().toUpperCase()
  const aliases = {
    'NEW SOUTH WALES': 'NSW',
    VICTORIA: 'VIC',
    QUEENSLAND: 'QLD',
    'SOUTH AUSTRALIA': 'SA',
    'WESTERN AUSTRALIA': 'WA',
    TASMANIA: 'TAS',
    'NORTHERN TERRITORY': 'NT',
    'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  }
  return aliases[state] ?? state
}

export async function lookupAustralianPostcode(postcode) {
  const pc = String(postcode ?? '').replace(/\s+/g, '').trim()
  if (!/^\d{4}$/.test(pc)) {
    throw Object.assign(new Error('Enter a valid 4-digit Australian postcode'), { status: 400 })
  }

  const cached = postcodeCache.get(pc)
  if (cached && Date.now() - cached.savedAt < POSTCODE_CACHE_MS) return cached.localities

  const qs = new URLSearchParams({ q: pc })
  const payload = await pacGet(`/postcode/search.json?${qs}`)
  const localities = normalizeLocalities(payload).filter((row) => row.postcode === pc)
  if (localities.length === 0) {
    throw Object.assign(new Error('Enter a valid Australian delivery postcode'), { status: 400 })
  }
  postcodeCache.set(pc, { savedAt: Date.now(), localities })
  return localities
}

export async function validateAustralianDestination({ postcode, city, state } = {}) {
  const localities = await lookupAustralianPostcode(postcode)
  const expectedState = normalizeState(state)
  if (expectedState && !localities.some((row) => row.state === expectedState)) {
    const actual = [...new Set(localities.map((row) => row.state))].join(' / ')
    throw Object.assign(
      new Error(`Postcode ${String(postcode).trim()} is in ${actual}, not ${expectedState}`),
      { status: 400 },
    )
  }

  const expectedCity = String(city ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
  if (expectedCity && !localities.some((row) => row.locality === expectedCity)) {
    const examples = localities.slice(0, 4).map((row) => row.locality).join(', ')
    throw Object.assign(
      new Error(`Suburb does not match postcode ${String(postcode).trim()}. Expected: ${examples}`),
      { status: 400 },
    )
  }
  return localities
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

function calculatePrice(payload) {
  const candidates = [
    payload?.postage_result?.total_cost,
    payload?.postage_result?.cost,
    payload?.postage_result?.price,
    payload?.total_cost,
    payload?.price,
  ]
  for (const value of candidates) {
    const price = Number(value)
    if (Number.isFinite(price) && price >= 0) return price
  }
  return null
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

  const requestedWeight = Number(weightKg)
  if (!Number.isFinite(requestedWeight) || requestedWeight <= 0) {
    throw Object.assign(new Error('Shipping weight must be greater than 0 kg'), { status: 400 })
  }
  if (requestedWeight > 22) {
    throw Object.assign(new Error('This order exceeds Australia Post’s 22 kg parcel limit'), { status: 400 })
  }
  const weight = Math.max(0.05, requestedWeight)
  const dims = packageDimensionsCm(volumeCm3)
  const cubicVolume = dims.length * dims.width * dims.height
  if (dims.length > 105 || cubicVolume > 250000) {
    throw Object.assign(new Error('This order exceeds Australia Post’s parcel-size limits'), { status: 400 })
  }

  await lookupAustralianPostcode(dest)

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

  const calculateQs = new URLSearchParams(qs)
  calculateQs.set('service_code', chosen.code)
  const calculatePayload = await pacGet(`/postage/parcel/domestic/calculate.json?${calculateQs}`)
  const calculatedPrice = calculatePrice(calculatePayload)
  const fee = calculatedPrice ?? chosen.price

  return {
    fee: +Number(fee).toFixed(2),
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
