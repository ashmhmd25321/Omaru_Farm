import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { apiUrl } from '@/utils/api'
import {
  DEFAULT_WHATSAPP_NUMBER,
  DEFAULT_WHATSAPP_SECONDARY_NUMBER,
  buildWhatsAppHelpUrl,
  formatWhatsAppDisplay,
  parseWhatsAppNumber,
} from '@/utils/whatsapp'

type WhatsAppHelpFormProps = {
  pageLabel: string
  idPrefix?: string
  messagePlaceholder?: string
  initialName?: string
  initialPhone?: string
  initialMessage?: string
  onSuccess?: () => void
}

export function WhatsAppHelpForm({
  pageLabel,
  idPrefix = 'wa-help',
  messagePlaceholder = 'Café booking, farm stay, directions…',
  initialName = '',
  initialPhone = '',
  initialMessage = '',
  onSuccess,
}: WhatsAppHelpFormProps) {
  const [businessNumber, setBusinessNumber] = useState(DEFAULT_WHATSAPP_NUMBER)
  const [secondaryNumber, setSecondaryNumber] = useState(DEFAULT_WHATSAPP_SECONDARY_NUMBER)
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [message, setMessage] = useState(initialMessage)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  useEffect(() => {
    setPhone(initialPhone)
  }, [initialPhone])

  useEffect(() => {
    setMessage(initialMessage)
  }, [initialMessage])

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/content/site-settings'), { signal: controller.signal })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        if (value.whatsappUrl) {
          setBusinessNumber(parseWhatsAppNumber(String(value.whatsappUrl)))
        }
        if (value.whatsappSecondaryUrl) {
          setSecondaryNumber(parseWhatsAppNumber(String(value.whatsappSecondaryUrl)))
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const openChat = (number: string) => {
    setError('')

    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      setError('Please enter your phone number so we can reply.')
      return
    }

    const url = buildWhatsAppHelpUrl({
      businessNumber: number,
      name,
      phone: trimmedPhone,
      message,
      pageLabel,
    })

    window.open(url, '_blank', 'noopener,noreferrer')
    onSuccess?.()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    openChat(businessNumber)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-1.5 block font-body text-xs font-semibold text-bark">
          Your name
        </label>
        <input
          id={`${idPrefix}-name`}
          className="field rounded-sm border border-parchment/80 bg-white px-3 py-2.5"
          placeholder="e.g. Ash"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className="mb-1.5 block font-body text-xs font-semibold text-bark">
          Your phone number <span className="text-gold-deep">*</span>
        </label>
        <input
          id={`${idPrefix}-phone`}
          className="field rounded-sm border border-parchment/80 bg-white px-3 py-2.5"
          placeholder="e.g. +61 476 302 477"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-message`} className="mb-1.5 block font-body text-xs font-semibold text-bark">
          How can we help?
        </label>
        <textarea
          id={`${idPrefix}-message`}
          className="field min-h-24 rounded-sm border border-parchment/80 bg-white px-3 py-2.5"
          placeholder={messagePlaceholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-green-500 font-body text-sm font-semibold text-white transition hover:bg-green-600"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Continue on WhatsApp
      </button>

      {secondaryNumber && secondaryNumber !== businessNumber ? (
        <button
          type="button"
          onClick={() => openChat(secondaryNumber)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-green-500/40 bg-white font-body text-sm font-semibold text-green-700 transition hover:bg-green-50"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Or message Rosie directly ({formatWhatsAppDisplay(secondaryNumber)})
        </button>
      ) : null}
    </form>
  )
}
