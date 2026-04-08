import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Mail, MapPin, MessageCircle } from 'lucide-react'
import { mainNavItems } from '@/constants/siteNav'
import { staticUrl } from '@/utils/staticUrl'

export function SiteFooter() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const [siteSettings, setSiteSettings] = useState({
    brandName: 'Omaru Farm',
    missionText:
      'A premium farm-to-table destination — seasonal produce, thoughtful hospitality, and quiet luxury rooted in the land.',
    footerTagline: 'Grown with intention',
    supportEmail: 'hello@omarufarm.com.au',
    whatsappUrl: 'https://wa.me/61000000000',
    instagramUrl: 'https://instagram.com',
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/content/site-settings`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        setSiteSettings((prev) => ({
          brandName: String(value.brandName ?? prev.brandName),
          missionText: String(value.missionText ?? prev.missionText),
          footerTagline: String(value.footerTagline ?? prev.footerTagline),
          supportEmail: String(value.supportEmail ?? prev.supportEmail),
          whatsappUrl: String(value.whatsappUrl ?? prev.whatsappUrl),
          instagramUrl: String(value.instagramUrl ?? prev.instagramUrl),
        }))
      })
      .catch(() => {
        // keep fallback
      })
    return () => controller.abort()
  }, [])

  return (
    <footer className="relative border-t border-gold/25 bg-[#0a0a0a]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(205,163,73,0.06),transparent)]" />

      <div className="relative mx-auto max-w-[92vw] px-5 py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={staticUrl('/images/farm/omaru-logo.png')}
                alt="Omaru Farm logo"
                className="h-13 w-13 drop-shadow-[0_0_8px_rgba(205,163,73,0.30)]"
              />
              <span className="font-heading text-2xl text-gold">{siteSettings.brandName}</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              {siteSettings.missionText}
            </p>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold/70">Explore</p>
            <ul className="mt-5 space-y-3">
              {mainNavItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-white/70 transition hover:text-gold"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Visit */}
          <div className="lg:col-span-3">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold/70">Visit</p>
            <address className="mt-5 not-italic">
              <p className="flex gap-2 text-sm leading-relaxed text-white/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold/80" aria-hidden="true" />
                <span>
                  482 Heritage Road
                  <br />
                  Willow Valley, NSW 2577
                </span>
              </p>
              <p className="mt-4 text-sm text-white/55">Café &amp; store hours vary by season — contact us before you travel.</p>
              <Link
                to="/contact"
                className="mt-4 inline-block text-sm font-medium text-gold transition hover:text-gold/85"
              >
                Get directions →
              </Link>
            </address>
          </div>

          {/* Connect & legal */}
          <div className="lg:col-span-3">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold/70">Connect</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`mailto:${siteSettings.supportEmail}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/20 bg-white/[0.04] text-gold transition hover:border-gold/45 hover:bg-white/[0.07]"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href={siteSettings.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/20 bg-white/[0.04] text-gold transition hover:border-gold/45 hover:bg-white/[0.07]"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={siteSettings.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/20 bg-white/[0.04] text-gold transition hover:border-gold/45 hover:bg-white/[0.07]"
                aria-label="Instagram"
              >
                <AtSign className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-10 text-[11px] uppercase tracking-[0.28em] text-gold/70">Legal</p>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li>
                <Link to="/terms" className="transition hover:text-gold">
                  Terms of use
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="transition hover:text-gold">
                  Privacy policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="relative border-t border-gold/10 bg-black/50">
        <div className="mx-auto flex max-w-[92vw] flex-col gap-3 px-5 py-5 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© {currentYear} {siteSettings.brandName}. All rights reserved.</p>
          <p className="uppercase tracking-[0.22em] text-gold/55">{siteSettings.footerTagline}</p>
        </div>
      </div>
    </footer>
  )
}
