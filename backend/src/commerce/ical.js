/**
 * Minimal iCal VEVENT date parser (DATE or DATE-TIME).
 * Returns { start: 'YYYY-MM-DD', endExclusive: 'YYYY-MM-DD' } or null.
 */
function parseIcalDate(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return null
  // DATE: 20260725
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }
  // DATE-TIME: 20260725T150000Z
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function parseIcalEvents(icalText) {
  const text = String(icalText ?? '').replace(/\r\n /g, '').replace(/\r\n/g, '\n')
  const blocks = text.split('BEGIN:VEVENT')
  const events = []
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0] ?? ''
    const uidMatch = block.match(/^UID:(.+)$/m)
    const uid = uidMatch ? uidMatch[1].trim() : `anon-${i}`
    const dtStartLine = block.match(/^DTSTART[^:]*:(.+)$/m)
    const dtEndLine = block.match(/^DTEND[^:]*:(.+)$/m)
    const start = parseIcalDate(dtStartLine?.[1])
    let end = parseIcalDate(dtEndLine?.[1])
    if (!start) continue
    // iCal DTEND for all-day is exclusive; if missing, block one night
    if (!end) end = addDays(start, 1)
    events.push({
      uid,
      startDate: start,
      endDate: end,
      summary: (block.match(/^SUMMARY:(.+)$/m)?.[1] ?? '').trim(),
    })
  }
  return events
}

export async function fetchAndParseIcal(url) {
  if (!url) return []
  const res = await fetch(String(url), {
    headers: { Accept: 'text/calendar, text/plain, */*' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`iCal fetch failed (${res.status})`)
  const text = await res.text()
  return parseIcalEvents(text)
}
