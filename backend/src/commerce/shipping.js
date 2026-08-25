/**
 * Dynamic shipping quote from shipping_rules rows, with optional AusPost PAC live rates.
 *
 * Zone match: comma-separated postcode prefixes, or "*" for catch-all.
 * A postcode like 3922 matches prefix "39" then "3" (first match by sort_order).
 *
 * Chargeable weight = max(actual kg, volumetric kg).
 * Volumetric kg = volume_cm3 / VOLUMETRIC_DIVISOR (default 5000, IATA-style).
 * If volume is 0, only actual weight is used.
 *
 * When AUSPOST_PAC_API_KEY is set, delivery quotes prefer AusPost Parcel Post
 * (AUS_PARCEL_REGULAR). Matrix rules remain as fallback if AusPost fails.
 */

import { auspostConfigured, quoteAusPostDomesticParcel } from './auspost.js'

export const VOLUMETRIC_DIVISOR = Number(process.env.SHIPPING_VOLUMETRIC_DIVISOR ?? 5000)

/** Placeholder AU matrix until Omaru supplies their final rates. Prefix match is startsWith. */
export const DEFAULT_SHIPPING_MATRIX = [
  { name: 'Phillip Island / Bass Coast', postcodePrefixes: '39', baseFee: 10, perKgFee: 2.0, freeOver: 120, sortOrder: 5 },
  { name: 'Metro Melbourne', postcodePrefixes: '30,31,32,33,37,38', baseFee: 12, perKgFee: 2.5, freeOver: 150, sortOrder: 10 },
  { name: 'Regional VIC', postcodePrefixes: '34,35,36', baseFee: 16, perKgFee: 3.0, freeOver: 180, sortOrder: 20 },
  { name: 'NSW / ACT', postcodePrefixes: '2,26', baseFee: 18, perKgFee: 3.5, freeOver: 200, sortOrder: 30 },
  { name: 'QLD', postcodePrefixes: '4', baseFee: 20, perKgFee: 3.75, freeOver: 200, sortOrder: 40 },
  { name: 'SA', postcodePrefixes: '5', baseFee: 20, perKgFee: 3.75, freeOver: 200, sortOrder: 50 },
  { name: 'TAS', postcodePrefixes: '7', baseFee: 22, perKgFee: 4.0, freeOver: 220, sortOrder: 60 },
  { name: 'WA', postcodePrefixes: '6', baseFee: 28, perKgFee: 5.0, freeOver: 250, sortOrder: 70 },
  { name: 'NT', postcodePrefixes: '08,09', baseFee: 30, perKgFee: 5.5, freeOver: 280, sortOrder: 80 },
  { name: 'Rest of AU (default)', postcodePrefixes: '*', baseFee: 32, perKgFee: 6.0, freeOver: 300, sortOrder: 100 },
]

const PLACEHOLDER_RULE_NAMES = new Set(['Metro VIC', 'Regional VIC / Phillip Island', 'Interstate AU (default)'])

export function chargeableGrams({ weightGrams = 0, volumeCm3 = 0, divisor = VOLUMETRIC_DIVISOR } = {}) {
  const actual = Math.max(0, Number(weightGrams) || 0)
  const volume = Math.max(0, Number(volumeCm3) || 0)
  if (volume <= 0) return actual
  const volumetricGrams = (volume / Math.max(1, Number(divisor) || 5000)) * 1000
  return Math.max(actual, volumetricGrams)
}

export function matchShippingRule(rules, postcode) {
  const pc = String(postcode ?? '').replace(/\s+/g, '').trim()
  if (!pc) return null
  const active = (rules ?? [])
    .filter((r) => r.is_active === 1 || r.is_active === true || r.isActive === true)
    .sort((a, b) => Number(a.sort_order ?? a.sortOrder ?? 100) - Number(b.sort_order ?? b.sortOrder ?? 100))

  let fallback = null
  for (const rule of active) {
    const prefixes = String(rule.postcode_prefixes ?? rule.postcodePrefixes ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (prefixes.includes('*')) {
      fallback = rule
      continue
    }
    if (pc && prefixes.some((prefix) => pc.startsWith(prefix))) return rule
  }
  return fallback
}

function auspostFreeShippingThreshold() {
  const envFree = process.env.SHIPPING_FREE_OVER
  if (envFree != null && String(envFree).trim() !== '') {
    const n = Number(envFree)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

export function computeShippingQuote({
  rules,
  postcode,
  subtotal,
  totalWeightGrams,
  totalVolumeCm3 = 0,
  method = 'delivery',
}) {
  if (method === 'pickup') {
    return {
      method: 'pickup',
      fee: 0,
      ruleName: 'Farm pickup',
      provider: 'pickup',
      breakdown: {
        baseFee: 0,
        perKgFee: 0,
        weightFee: 0,
        weightKg: 0,
        volumetricKg: 0,
        chargeableKg: 0,
        freeShippingApplied: false,
      },
    }
  }

  const actualGrams = Math.max(0, Number(totalWeightGrams ?? 0))
  const volume = Math.max(0, Number(totalVolumeCm3 ?? 0))
  const chargeable = chargeableGrams({ weightGrams: actualGrams, volumeCm3: volume })
  const weightKg = actualGrams / 1000
  const volumetricKg = volume > 0 ? volume / VOLUMETRIC_DIVISOR : 0
  const chargeableKg = chargeable / 1000

  const rule = matchShippingRule(rules, postcode)
  if (!rule) {
    return {
      method: 'delivery',
      fee: 0,
      ruleName: 'No matching rule',
      provider: 'matrix',
      breakdown: {
        baseFee: 0,
        perKgFee: 0,
        weightFee: 0,
        weightKg: +weightKg.toFixed(3),
        volumetricKg: +volumetricKg.toFixed(3),
        chargeableKg: +chargeableKg.toFixed(3),
        freeShippingApplied: false,
        error: 'NO_RULE',
      },
    }
  }

  const baseFee = Number(rule.base_fee ?? rule.baseFee ?? 0)
  const perKg = Number(rule.per_kg_fee ?? rule.perKgFee ?? 0)
  const freeOver = rule.free_over ?? rule.freeOver
  const weightFee = +(chargeableKg * perKg).toFixed(2)
  let fee = +(baseFee + weightFee).toFixed(2)
  let freeShippingApplied = false
  if (freeOver != null && Number(freeOver) > 0 && Number(subtotal) >= Number(freeOver)) {
    fee = 0
    freeShippingApplied = true
  }

  return {
    method: 'delivery',
    fee,
    ruleName: String(rule.name ?? 'Shipping'),
    ruleId: rule.id,
    provider: 'matrix',
    breakdown: {
      baseFee,
      perKgFee: perKg,
      weightFee,
      freeShippingApplied,
      freeOver: freeOver != null ? Number(freeOver) : null,
      weightKg: +weightKg.toFixed(3),
      volumetricKg: +volumetricKg.toFixed(3),
      chargeableKg: +chargeableKg.toFixed(3),
    },
  }
}

/**
 * Prefer AusPost PAC live rates when configured; fall back to local matrix on failure.
 */
export async function resolveShippingQuote({
  rules,
  postcode,
  subtotal,
  totalWeightGrams,
  totalVolumeCm3 = 0,
  method = 'delivery',
}) {
  if (method === 'pickup') {
    return computeShippingQuote({
      rules,
      postcode,
      subtotal,
      totalWeightGrams,
      totalVolumeCm3,
      method,
    })
  }

  const actualGrams = Math.max(0, Number(totalWeightGrams ?? 0))
  const volume = Math.max(0, Number(totalVolumeCm3 ?? 0))
  const chargeable = chargeableGrams({ weightGrams: actualGrams, volumeCm3: volume })
  const weightKg = actualGrams / 1000
  const volumetricKg = volume > 0 ? volume / VOLUMETRIC_DIVISOR : 0
  const chargeableKg = chargeable / 1000
  // Matrix thresholds are placeholder/fallback data and must not silently
  // override live carrier pricing. Set SHIPPING_FREE_OVER explicitly if wanted.
  const freeOver = auspostFreeShippingThreshold()

  const useAuspost = auspostConfigured() && process.env.AUSPOST_ENABLED !== 'false'
  if (useAuspost) {
    try {
      const pac = await quoteAusPostDomesticParcel({
        toPostcode: postcode,
        weightKg: chargeableKg,
        volumeCm3: volume,
      })
      let fee = pac.fee
      let freeShippingApplied = false
      if (freeOver != null && Number(subtotal) >= Number(freeOver)) {
        fee = 0
        freeShippingApplied = true
      }
      return {
        method: 'delivery',
        fee,
        ruleName: `Australia Post ${pac.serviceName}`,
        provider: 'auspost',
        serviceCode: pac.serviceCode,
        breakdown: {
          baseFee: pac.fee,
          perKgFee: 0,
          weightFee: 0,
          freeShippingApplied,
          freeOver,
          weightKg: +weightKg.toFixed(3),
          volumetricKg: +volumetricKg.toFixed(3),
          chargeableKg: +chargeableKg.toFixed(3),
          auspostServiceCode: pac.serviceCode,
          auspostServiceName: pac.serviceName,
          packageLengthCm: pac.dimensions.length,
          packageWidthCm: pac.dimensions.width,
          packageHeightCm: pac.dimensions.height,
          fromPostcode: pac.fromPostcode,
          options: pac.options,
        },
      }
    } catch (error) {
      // Invalid postcodes, overweight parcels, and address errors must never
      // silently become a matrix quote.
      if (Number(error?.status) === 400) throw error
      const fallback = process.env.AUSPOST_FALLBACK_TO_MATRIX === 'true'
      if (!fallback) throw error
      console.warn('[shipping] AusPost PAC failed, using matrix fallback:', error.message)
    }
  }

  return computeShippingQuote({
    rules,
    postcode,
    subtotal,
    totalWeightGrams,
    totalVolumeCm3,
    method,
  })
}

export async function seedShippingMatrix(pool) {
  const [countRows] = await pool.query('SELECT COUNT(*) AS c FROM shipping_rules')
  const count = Number(countRows[0]?.c || 0)
  const [rows] = count > 0 ? await pool.query('SELECT name FROM shipping_rules') : [[]]
  const names = (rows ?? []).map((r) => String(r.name))
  const onlyPlaceholders = count > 0 && names.length > 0 && names.every((n) => PLACEHOLDER_RULE_NAMES.has(n))

  if (count === 0 || onlyPlaceholders) {
    if (onlyPlaceholders) await pool.query('DELETE FROM shipping_rules')
    for (const rule of DEFAULT_SHIPPING_MATRIX) {
      await pool.query(
        `INSERT INTO shipping_rules (name, postcode_prefixes, base_fee, per_kg_fee, free_over, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [rule.name, rule.postcodePrefixes, rule.baseFee, rule.perKgFee, rule.freeOver, rule.sortOrder],
      )
    }
  }
}
