import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '@/utils/whatsapp'

type WhatsAppContactNoteProps = {
  businessNumber: string
  pageLabel?: string
  className?: string
}

const DEFAULT_GREETING = 'Hello Omaru Farm, I have a booking enquiry from your website.'

export function WhatsAppContactNote({
  businessNumber,
  pageLabel = 'Book',
  className = '',
}: WhatsAppContactNoteProps) {
  const displayNumber = formatWhatsAppDisplay(businessNumber)
  const chatUrl = buildWhatsAppUrl(
    businessNumber,
    `${DEFAULT_GREETING}${pageLabel ? `\n\n(Page: ${pageLabel})` : ''}`,
  )

  return (
    <article
      className={`rounded-xl border border-[#25D366]/25 bg-gradient-to-br from-[#25D366]/8 via-white to-white p-6 shadow-[0_8px_32px_rgba(37,211,102,0.08)] md:p-7 ${className}`}
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] shadow-sm">
          <MessageCircle className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#128C7E]">
            Message us directly
          </p>
          <h3 className="mt-1.5 font-heading text-base font-semibold text-charcoal">
            Prefer WhatsApp? We&apos;re here to help
          </h3>
          <p className="mt-2 font-body text-xs leading-relaxed text-stone">
            You can also reach our team anytime on WhatsApp — no form needed. Save our number or tap below to start a
            chat.
          </p>
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#25D366]/30 bg-white px-4 py-3 font-body text-sm transition hover:border-[#25D366]/50 hover:bg-[#25D366]/5"
          >
            <span className="font-semibold tracking-wide text-[#128C7E]">{displayNumber}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone">Open chat →</span>
          </a>
          <p className="mt-3 font-body text-[0.68rem] leading-relaxed text-stone/90">
            Typical reply within business hours. Include your name, preferred date, and party size so we can assist
            faster.
          </p>
        </div>
      </div>
    </article>
  )
}
