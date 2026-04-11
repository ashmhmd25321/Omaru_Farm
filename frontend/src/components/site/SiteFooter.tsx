import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Clock3, Mail, MapPin, MessageCircle } from 'lucide-react'
import { mainNavItems } from '@/constants/siteNav'
import { staticUrl } from '@/utils/staticUrl'

export function SiteFooter() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  return (
    <footer className="border-t border-parchment bg-sand">
      <div className="mx-auto max-w-[92vw] px-5 py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">

          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={staticUrl('/images/farm/omaru-logo.png')}
                alt="Omaru Farm logo"
                className="h-12 w-12"
              />
              <span className="font-heading text-2xl text-charcoal">
                Omaru <span className="text-gold">Farm</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone">
              A premium farm-to-table destination on Phillip Island — seasonal produce, breathtaking views, thoughtful hospitality, and quiet luxury rooted in the land.
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-widest text-gold">
              "Omaru" — A Beautiful View
            </p>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-bark">Explore</p>
            <ul className="mt-5 space-y-3">
              {mainNavItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-stone transition hover:text-gold"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Visit */}
          <div className="lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-bark">Visit Us</p>
            <address className="mt-5 space-y-4 not-italic">
              <p className="flex gap-2.5 text-sm leading-relaxed text-stone">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <span>
                  776 Ventnor Road<br />
                  Ventnor, Phillip Island<br />
                  VIC 3922
                </span>
              </p>
              <div className="flex gap-2.5 text-sm text-stone">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium text-bark">Café</p>
                  <p>Thu – Fri: 10am–2pm, 5–8pm</p>
                  <p>Sat – Sun: 10am–8pm</p>
                  <p className="mt-2 font-medium text-bark">Farm Store</p>
                  <p>Mon – Sun: 9am–5pm</p>
                </div>
              </div>
            </address>
          </div>

          {/* Connect */}
          <div className="lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-bark">Connect</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="mailto:hello@omarufarm.com.au"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-parchment bg-white text-gold transition hover:border-gold/50 hover:shadow-sm"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/61000000000"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-parchment bg-white text-gold transition hover:border-gold/50 hover:shadow-sm"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-parchment bg-white text-gold transition hover:border-gold/50 hover:shadow-sm"
                aria-label="Instagram"
              >
                <AtSign className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-bark">Legal</p>
            <ul className="mt-4 space-y-2 text-sm text-stone">
              <li>
                <Link to="/terms" className="transition hover:text-gold">Terms of use</Link>
              </li>
              <li>
                <Link to="/privacy" className="transition hover:text-gold">Privacy policy</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-parchment bg-parchment/40">
        <div className="mx-auto flex max-w-[92vw] flex-col gap-2 px-5 py-4 text-xs text-stone md:flex-row md:items-center md:justify-between">
          <p>© {currentYear} Omaru Farm. All rights reserved.</p>
          <p className="font-medium uppercase tracking-widest text-gold">Phillip Island, Victoria</p>
        </div>
      </div>
    </footer>
  )
}
