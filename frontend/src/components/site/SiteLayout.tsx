import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { ScrollToTop } from '@/components/site/ScrollToTop'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

export function SiteLayout() {
  const [whatsappUrl, setWhatsappUrl] = useState('https://wa.me/61000000000')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/content/site-settings`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        if (value.whatsappUrl) setWhatsappUrl(String(value.whatsappUrl))
      })
      .catch(() => {
        // keep fallback
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <ScrollToTop />
      <SiteHeader />
      <Outlet />
      <SiteFooter />

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-green-200 bg-white px-4 py-3 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
        aria-label="Chat on WhatsApp"
      >
        <span className="hidden text-xs font-medium text-bark sm:inline">Need help?</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
          <MessageCircle className="h-5 w-5" />
        </span>
      </a>
    </div>
  )
}

