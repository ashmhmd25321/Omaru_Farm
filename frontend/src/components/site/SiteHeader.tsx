import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/cafe', label: 'Cafe' },
  { to: '/stay', label: 'Stay' },
  { to: '/store', label: 'Store' },
  { to: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-gold/25 bg-obsidian/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-[92vw] items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/images/farm/logo.webp"
            alt="Omaru Farm logo"
            className="h-10 w-10 rounded-full border border-gold/30 bg-white/5 p-1"
          />
          <p className="font-heading text-xl text-gold">Omaru Farm</p>
        </Link>

        <div className="hidden gap-6 text-sm text-white/85 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'inline-flex items-center gap-1.5 transition hover:text-gold',
                  isActive ? 'text-gold' : 'text-white/85',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden md:inline-flex">
            <Link to="/book">Book Now</Link>
          </Button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-black/25 text-gold transition hover:border-gold/60 hover:bg-black/35 md:hidden"
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
            className="fixed inset-0 z-20 bg-black/55"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-30 border-t border-gold/15 bg-[#0b0b0b]/95 backdrop-blur">
            <div className="mx-auto max-w-[92vw] px-5 py-4">
              <div className="grid gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-xl px-4 py-3 text-sm transition',
                        isActive
                          ? 'border border-gold/25 bg-gold/10 text-gold'
                          : 'border border-transparent text-white/85 hover:border-gold/20 hover:bg-white/5 hover:text-gold',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="mt-4">
                <Button asChild className="w-full" onClick={() => setMobileOpen(false)}>
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

