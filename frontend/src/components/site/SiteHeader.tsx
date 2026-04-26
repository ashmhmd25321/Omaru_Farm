import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mainNavItems } from '@/constants/siteNav'
import { staticUrl } from '@/utils/staticUrl'

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <header
      className={[
        'sticky top-0 z-30 border-b transition-shadow duration-300',
        scrolled
          ? 'border-parchment bg-white/95 shadow-sm backdrop-blur'
          : 'border-parchment/40 bg-white/82 backdrop-blur',
      ].join(' ')}
    >
      <nav className="mx-auto flex w-full max-w-[92vw] items-center justify-between px-5 py-3.5">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={staticUrl('/images/farm/omaru-logo.png')}
            alt="Omaru Farm logo"
            className="h-10 w-10"
          />
          <span className="font-heading text-[1.375rem] leading-tight text-charcoal md:text-2xl">
            Omaru <span className="text-gold">Farm</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-base font-body md:flex lg:gap-10 lg:text-[1.0625rem]">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'relative whitespace-nowrap font-semibold tracking-[0.03em] transition-colors',
                  "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-gold after:content-[''] after:transition-opacity after:duration-200",
                  isActive
                    ? 'text-gold after:opacity-100'
                    : 'text-bark after:opacity-0 hover:text-gold hover:after:opacity-40',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/book"
            className="hidden h-10 items-center rounded-sm px-6 font-body text-sm font-semibold tracking-wide text-white shadow-[0_4px_16px_rgba(119,90,25,0.3)] transition hover:brightness-105 md:inline-flex"
            style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}
          >
            Book Now
          </Link>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-parchment bg-sand text-bark transition hover:border-gold/50 hover:text-gold md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden">
          <button
            aria-label="Close menu overlay"
            className="fixed inset-0 z-20 bg-charcoal/20"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-30 border-t border-parchment bg-white shadow-lg">
            <div className="mx-auto max-w-[92vw] px-5 py-4">
              <div className="grid gap-1">
                {mainNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-xl px-4 py-3.5 text-base font-semibold tracking-wide transition',
                        isActive
                          ? 'bg-gold/10 text-gold'
                          : 'text-bark hover:bg-sand hover:text-gold',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="mt-4">
                <Button
                  asChild
                  className="w-full bg-gold text-white hover:bg-gold-deep"
                  onClick={() => setMobileOpen(false)}
                >
                  <Link to="/book">Book Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
