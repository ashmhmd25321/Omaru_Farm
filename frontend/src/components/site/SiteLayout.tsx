import { Outlet } from 'react-router-dom'
import { ScrollToTop } from '@/components/site/ScrollToTop'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { WhatsAppHelpButton } from '@/components/site/WhatsAppHelpButton'

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-white text-charcoal">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-sm bg-white px-4 py-2 text-sm font-semibold text-charcoal shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <div id="main-content">
        <Outlet />
      </div>
      <SiteFooter />

      <WhatsAppHelpButton />
    </div>
  )
}

