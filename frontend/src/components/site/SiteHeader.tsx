import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ShoppingBag, UserRound, LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mainNavItems } from '@/constants/siteNav'
import { useCart } from '@/context/CartContext'
import { useCustomerAuth } from '@/context/CustomerAuthContext'
import { staticUrl } from '@/utils/staticUrl'

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cartBump, setCartBump] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const { count } = useCart()
  const { user, loading, logout } = useCustomerAuth()

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

  useEffect(() => {
    if (!accountOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen])

  useEffect(() => {
    const onAdd = () => {
      setCartBump(true)
      window.setTimeout(() => setCartBump(false), 500)
    }
    window.addEventListener('omaru:cart:add', onAdd as EventListener)
    return () => window.removeEventListener('omaru:cart:add', onAdd as EventListener)
  }, [])

  const accountIconClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border border-parchment text-bark transition hover:border-gold/50 hover:text-gold'

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
          <div className="relative hidden md:block" ref={accountRef}>
            {!loading && user ? (
              <>
                <button
                  type="button"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((open) => !open)}
                  className={[
                    accountIconClass,
                    accountOpen ? 'border-gold/60 text-gold' : '',
                  ].join(' ')}
                >
                  <UserRound className="h-4 w-4" />
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-[12rem] overflow-hidden rounded-lg border border-parchment bg-white py-1 shadow-[0_12px_32px_rgba(26,18,8,0.12)]"
                  >
                    <p className="truncate border-b border-parchment/70 px-4 py-2.5 text-xs text-stone">
                      {user.fullName || user.email}
                    </p>
                    <Link
                      to="/account"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-bark transition hover:bg-sand hover:text-gold"
                    >
                      My account
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false)
                        void logout()
                      }}
                      className="flex w-full items-center gap-2 border-t border-parchment/70 px-4 py-2.5 text-left text-sm font-semibold text-bark transition hover:bg-sand hover:text-gold"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <Link to="/account" aria-label="Sign in" className={accountIconClass}>
                <UserRound className="h-4 w-4" />
              </Link>
            )}
          </div>

          <Link
            to="/account"
            aria-label={user ? 'My account' : 'Sign in'}
            className={`${accountIconClass} md:hidden`}
          >
            <UserRound className="h-4 w-4" />
          </Link>

          <Link
            to="/cart"
            aria-label={`Cart${count ? `, ${count} items` : ''}`}
            className={[
              'relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-parchment text-bark transition hover:border-gold/50 hover:text-gold',
              cartBump ? 'scale-[1.06] border-gold shadow-[0_0_0_3px_rgba(205,163,73,0.18)]' : '',
            ].join(' ')}
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>
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

              <div className="mt-4 border-t border-parchment pt-4">
                <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">Account</p>
                {!loading && user ? (
                  <div className="grid gap-1">
                    <p className="px-4 pb-1 text-sm text-stone">{user.fullName || user.email}</p>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-4 py-3.5 text-base font-semibold tracking-wide text-bark transition hover:bg-sand hover:text-gold"
                    >
                      My account
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false)
                        void logout()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-4 py-3.5 text-left text-base font-semibold tracking-wide text-bark transition hover:bg-sand hover:text-gold"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-4 py-3.5 text-base font-semibold tracking-wide text-bark transition hover:bg-sand hover:text-gold"
                  >
                    Sign in
                  </Link>
                )}
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
