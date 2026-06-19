/** Test / default business WhatsApp (E.164 without +) */
export const DEFAULT_WHATSAPP_NUMBER = '61476302477'

export function parseWhatsAppNumber(url: string): string {
  const trimmed = url.trim()
  const waMatch = trimmed.match(/wa\.me\/(\d+)/i)
  if (waMatch?.[1]) return waMatch[1]
  const digits = trimmed.replace(/\D/g, '')
  return digits || DEFAULT_WHATSAPP_NUMBER
}

/** Human-readable display for wa.me / E.164 digits */
export function formatWhatsAppDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (!d) return ''

  if (d.startsWith('61') && d.length >= 11) {
    const local = d.slice(2)
    return `+61 ${local[0]} ${local.slice(1, 5)} ${local.slice(5)}`.trim()
  }

  if (d.startsWith('94') && d.length >= 11) {
    const local = d.slice(2)
    if (local.length === 9) {
      return `+94 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
    }
  }

  if (d.length >= 10) {
    return `+${d.slice(0, 2)} ${d.slice(2).replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`
  }

  return `+${d}`
}

export function buildWhatsAppHelpMessage(opts: {
  name: string
  phone: string
  message: string
  pageLabel?: string
  email?: string
  bookingDate?: string
}): string {
  const name = opts.name.trim() || 'Not provided'
  const phone = opts.phone.trim()
  const message = opts.message.trim() || 'General enquiry'

  const lines = [
    'Hello Omaru Farm,',
    '',
    "I'm reaching out from your website.",
    '',
    `*Name:* ${name}`,
    `*My number:* ${phone}`,
  ]

  if (opts.email?.trim()) {
    lines.push(`*Email:* ${opts.email.trim()}`)
  }

  if (opts.bookingDate?.trim()) {
    lines.push(`*Preferred date:* ${opts.bookingDate.trim()}`)
  }

  lines.push('', '*How can we help?*', message)

  if (opts.pageLabel) {
    lines.push('', `*Page:* ${opts.pageLabel}`)
  }

  lines.push('', '— Sent via omarufarms.com.au')
  return lines.join('\n')
}

export function buildWhatsAppSiteRequestMessage(opts: {
  pageLabel: string
  headline?: string
  name: string
  phone: string
  email: string
  details: string
}): string {
  const lines = [
    'Hello Omaru Farm,',
    '',
    opts.headline ?? 'New request from your website.',
    '',
    `*Name:* ${opts.name.trim() || 'Not provided'}`,
    `*My number:* ${opts.phone.trim()}`,
    `*Email:* ${opts.email.trim()}`,
    '',
    '*Request details:*',
    opts.details.trim() || 'No additional details provided.',
    '',
    `*Page:* ${opts.pageLabel}`,
    '',
    '— Sent via omarufarms.com.au',
  ]
  return lines.join('\n')
}

export function buildWhatsAppBookingMessage(opts: {
  name: string
  phone: string
  email: string
  bookingDate: string
  details: string
}): string {
  return buildWhatsAppSiteRequestMessage({
    pageLabel: 'Book',
    headline: 'New booking request from your website.',
    name: opts.name,
    phone: opts.phone,
    email: opts.email,
    details: [
      `*Preferred date:* ${opts.bookingDate.trim()}`,
      '',
      opts.details.trim() || 'No additional details provided.',
    ].join('\n'),
  })
}

export function buildWhatsAppUrl(number: string, text: string): string {
  const digits = number.replace(/\D/g, '') || DEFAULT_WHATSAPP_NUMBER
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function buildWhatsAppHelpUrl(opts: {
  businessNumber?: string
  name: string
  phone: string
  message: string
  pageLabel?: string
  email?: string
  bookingDate?: string
}): string {
  const number = opts.businessNumber
    ? parseWhatsAppNumber(opts.businessNumber)
    : DEFAULT_WHATSAPP_NUMBER
  const text = buildWhatsAppHelpMessage(opts)
  return buildWhatsAppUrl(number, text)
}

export function openWhatsAppBookingRequest(opts: {
  businessNumber?: string
  name: string
  phone: string
  email: string
  bookingDate: string
  details: string
}): void {
  openWhatsAppSiteRequest({
    businessNumber: opts.businessNumber,
    pageLabel: 'Book',
    headline: 'New booking request from your website.',
    name: opts.name,
    phone: opts.phone,
    email: opts.email,
    details: [
      `*Preferred date:* ${opts.bookingDate.trim()}`,
      '',
      opts.details.trim() || 'No additional details provided.',
    ].join('\n'),
  })
}

export function openWhatsAppSiteRequest(opts: {
  businessNumber?: string
  pageLabel: string
  headline?: string
  name: string
  phone: string
  email: string
  details: string
}): void {
  const text = buildWhatsAppSiteRequestMessage(opts)
  const number = opts.businessNumber
    ? parseWhatsAppNumber(opts.businessNumber)
    : DEFAULT_WHATSAPP_NUMBER
  window.open(buildWhatsAppUrl(number, text), '_blank', 'noopener,noreferrer')
}
