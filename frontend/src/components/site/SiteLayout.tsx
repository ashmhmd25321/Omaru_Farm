import { Outlet } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-obsidian text-white">
      <SiteHeader />
      <Outlet />
      <SiteFooter />

      <a
        href="https://wa.me/61000000000"
        target="_blank"
        rel="noreferrer"
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-green-400/40 bg-[#111]/95 px-4 py-3 shadow-[0_10px_40px_rgba(34,197,94,0.25)] transition hover:-translate-y-1 hover:border-green-300/80"
        aria-label="Chat on WhatsApp"
      >
        <span className="hidden text-xs font-medium text-white/85 sm:inline">Need help?</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="pointer-events-none absolute -top-9 right-1/2 translate-x-1/2 rounded-md border border-gold/30 bg-black/90 px-2 py-1 text-[10px] text-gold opacity-0 transition group-hover:opacity-100">
          WhatsApp Us
        </span>
      </a>
    </div>
  )
}

