import { describe, expect, it } from 'vitest'
import { buildWhatsAppBookingMessage, formatWhatsAppDisplay } from './whatsapp'

describe('whatsapp helpers', () => {
  it('formats the Omaru business number for display', () => {
    expect(formatWhatsAppDisplay('61476302477')).toBe('+61 4 7630 2477')
  })

  it('builds booking messages without the generic help prompt', () => {
    const message = buildWhatsAppBookingMessage({
      name: 'Jane Visitor',
      phone: '+61 476 302 477',
      email: 'jane@example.com',
      bookingDate: '2026-06-26',
      details: 'Cafe table for 4.',
    })

    expect(message).toContain('New booking request from your website.')
    expect(message).toContain('*Name:* Jane Visitor')
    expect(message).toContain('*Preferred date:* 2026-06-26')
    expect(message).toContain('Cafe table for 4.')
    expect(message).not.toContain('*How can we help?*')
  })
})
