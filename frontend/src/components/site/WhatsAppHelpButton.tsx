import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { WhatsAppHelpForm } from '@/components/site/WhatsAppHelpForm'

const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
  '/cafe': 'Café',
  '/stay': 'Stay',
  '/store': 'Store',
  '/contact': 'Contact',
  '/book': 'Book',
}

export function WhatsAppHelpButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pageLabel = PAGE_LABELS[location.pathname] ?? location.pathname

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-green-200 bg-white px-4 py-3 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
        aria-label="Need help? Chat on WhatsApp"
      >
        <span className="hidden text-xs font-medium text-bark sm:inline">Need help?</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
          <MessageCircle className="h-5 w-5" aria-hidden />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-charcoal/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-help-title"
            className="w-full max-w-md rounded-sm border border-parchment/80 bg-white p-6 shadow-[0_24px_64px_rgba(26,18,8,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-gold">
                  WhatsApp
                </p>
                <h2 id="whatsapp-help-title" className="mt-1 font-heading text-xl font-semibold text-charcoal">
                  Need help?
                </h2>
                <p className="mt-2 font-body text-sm leading-relaxed text-stone">
                  Add your details and we&apos;ll open WhatsApp with a ready-to-send message for our team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-sm p-1 text-stone transition hover:bg-surface hover:text-charcoal"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6">
              <WhatsAppHelpForm
                pageLabel={pageLabel}
                idPrefix="wa-float"
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
