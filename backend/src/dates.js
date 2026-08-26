/** Shared date helpers for café/booking APIs (farm timezone: Australia/Melbourne). */

export const FARM_TIMEZONE = process.env.FARM_TIMEZONE ?? 'Australia/Melbourne'

/**
 * Normalize MySQL DATE / Date / ISO string to YYYY-MM-DD.
 * mysql2 returns DATE columns as JS Date at local midnight — use local calendar parts
 * so IST/AU hosts do not shift the day when reading UTC components.
 */
export function toDateOnly(value) {
  if (value == null || value === '') return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const raw = String(value).trim()
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return ''
}

/** Today's calendar date in the farm timezone as YYYY-MM-DD. */
export function todayInTimeZone(timeZone = FARM_TIMEZONE) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function isValidISODate(value) {
  const d = toDateOnly(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const [y, m, day] = d.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, day))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === day
  )
}

/** True when dateOnly is strictly before today's date in the farm timezone. */
export function isPastDate(dateOnly, timeZone = FARM_TIMEZONE) {
  const d = toDateOnly(dateOnly)
  if (!isValidISODate(d)) return true
  return d < todayInTimeZone(timeZone)
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

/** Digits-only phone check; allows leading +, expects 8–15 digits. */
export function isValidPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}
