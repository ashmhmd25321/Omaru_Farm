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
          : 'border-parchment/60 bg-white/90 backdrop-blur',
      ].join(' ')}
    >
      <nav className="mx-auto flex w-full max-w-[92vw] items-center justify-between px-5 py-3.5">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={staticUrl('/images/farm/omaru-logo.png')}
            alt="Omaru Farm logo"
            className="h-10 w-10"
          />
          <span className="font-heading text-xl text-charcoal">
            Omaru <span className="text-gold">Farm</span>
          </span>
        </Link>

        <div className="hidden gap-7 text-sm md:flex">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'font-medium transition-colors hover:text-gold',
                  isActive ? 'text-gold' : 'text-bark',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden bg-gold text-white hover:bg-gold-deep md:inline-flex"
          >
            <Link to="/book">Book Now</Link>
          </Button>

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
                        'rounded-xl px-4 py-3 text-sm font-medium transition',
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
