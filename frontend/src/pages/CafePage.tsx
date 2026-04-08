import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Image as ImageIcon, Minus, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { staticUrl } from '@/utils/staticUrl'

type MenuItem = {
  id?: number
  section: string
  itemName: string
  description: string
  price: number
  image: string
  sortOrder?: number
}

const fallbackMenuItems: MenuItem[] = [
  { section: 'Breakfast', itemName: 'Heritage Oats Porridge', description: 'House spiced oat porridge, seasonal fruit, honey drizzle', price: 16, image: '' },
  { section: 'Breakfast', itemName: 'Truffle Farm Eggs', description: 'Two eggs, greens, toast, cold-pressed oil', price: 18, image: '' },
  { section: 'Breakfast', itemName: 'Smashed Garden Greens', description: 'Avocado, herbs, lemon, seeds, sourdough', price: 17, image: '' },
  { section: 'Lunch', itemName: 'Roasted Root Medley', description: 'Seasonal roasted vegetables, feta, herb dressing', price: 22, image: '' },
  { section: 'Lunch', itemName: 'Omaru Lamb Ragu', description: 'Slow-cooked ragu, pasta, parmesan, garden herbs', price: 28, image: '' },
  { section: 'Lunch', itemName: 'Wild Mushroom Risotto', description: 'Creamy risotto, mushrooms, thyme oil', price: 26, image: '' },
  { section: 'Afternoon Tea', itemName: 'Devonshire Scones', description: 'Fresh cream, farm jam, seasonal berries', price: 14, image: '' },
  { section: 'Afternoon Tea', itemName: 'Lavender Lemon Tart', description: 'Bright citrus tart with lavender sugar', price: 12, image: '' },
  { section: 'Afternoon Tea', itemName: 'The Omaru Tea Set', description: 'Tea selection with small sweet bites', price: 19, image: '' },
]

export function CafePage() {
  const pad2 = (n: number) => `${n}`.padStart(2, '0')

  const toISODate = (d: Date) => {
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
  }

  const normalizeTime = (value: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const h = Number(match[1])
    const m = Number(match[2])
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    if (h < 0 || h > 23) return null
    if (m < 0 || m > 59) return null
    return `${pad2(h)}:${pad2(m)}`
  }

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toISODate(d)
  })
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const timeFromInputRef = useRef<HTMLInputElement | null>(null)
  const timeUntilInputRef = useRef<HTMLInputElement | null>(null)

  const openNativePicker = (el: HTMLInputElement | null) => {
    if (!el) return
    el.focus({ preventScroll: true })
    // Prefer showPicker where supported.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any
    if (typeof anyEl.showPicker === 'function') {
      anyEl.showPicker()
      return
    }
    // Fallback: click typically opens the native UI.
    el.click()
  }

  const periods = useMemo(() => ['Breakfast', 'Lunch', 'Tea'] as const, [])
  const [period, setPeriod] = useState<(typeof periods)[number]>('Lunch')

  const defaultsByPeriod = useMemo(
    () => ({
      Breakfast: { from: '09:00', until: '11:00' },
      Lunch: { from: '12:00', until: '14:00' },
      Tea: { from: '14:00', until: '16:00' },
    }),
    [],
  )

  const [timeFrom, setTimeFrom] = useState(() => defaultsByPeriod.Lunch.from)
  const [timeUntil, setTimeUntil] = useState(() => defaultsByPeriod.Lunch.until)
  const [guests, setGuests] = useState(2)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [reserveState, setReserveState] = useState<{ loading: boolean; message: string; error: string }>({
    loading: false,
    message: '',
    error: '',
  })
  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenuItems)

  const prettyDate = useMemo(() => {
    // selectedDate is ISO yyyy-mm-dd; convert safely to local date.
    const [y, m, d] = selectedDate.split('-').map((v) => Number(v))
    if (!y || !m || !d) return selectedDate
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' })
  }, [selectedDate])

  useEffect(() => {
    // Keep Until after From (simple same-day range).
    if (timeUntil <= timeFrom) {
      const [h, m] = timeFrom.split(':').map((v) => Number(v))
      const dt = new Date()
      dt.setHours(h || 0, m || 0, 0, 0)
      dt.setMinutes(dt.getMinutes() + 60)
      const nextH = pad2(dt.getHours())
      const nextM = pad2(dt.getMinutes())
      setTimeUntil(`${nextH}:${nextM}`)
    }
  }, [timeFrom, timeUntil])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/menu`, { signal: controller.signal })
      .then((res) => res.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        setMenuItems(
          rows.map((item) => {
            const row = item as Record<string, unknown>
            return {
              id: Number(row.id ?? 0),
              section: String(row.section ?? 'Menu'),
              itemName: String(row.itemName ?? ''),
              description: String(row.description ?? ''),
              price: Number(row.price ?? 0),
              image: String(row.image ?? ''),
              sortOrder: Number(row.sortOrder ?? 0),
            }
          }),
        )
      })
      .catch(() => {
        setMenuItems(fallbackMenuItems)
      })
    return () => controller.abort()
  }, [])

  const menuColumns = useMemo(() => {
    const sectionOrder = ['Breakfast', 'Lunch', 'Afternoon Tea']
    return sectionOrder.map((section, index) => ({
      key: section,
      title: `${String(index + 1).padStart(2, '0')}. ${section}`,
      items: menuItems.filter((x) => x.section === section).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
  }, [menuItems])

  return (
    <>
      <Helmet>
        <title>Cafe | Omaru Farm</title>
        <meta name="description" content="Explore Omaru Farm’s cafe experience and seasonal menu vibe." />
      </Helmet>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold/20">
          <img
            src={staticUrl('/images/farm/20211027_195611.jpg')}
            alt="Farm-to-table dining at Omaru Cafe"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

          <div className="relative mx-auto grid min-h-[72vh] max-w-[92vw] items-center gap-10 px-5 py-10 md:grid-cols-12">
            <motion.div
              className="md:col-span-7"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex max-w-2xl flex-col gap-5">
                <p className="text-xs uppercase tracking-[0.32em] text-gold/80">Omaru Cafe</p>
                <h1 className="font-heading text-6xl leading-[0.9] text-[#f5efe2] md:text-7xl">
                Farm-to-Table
                <br />
                Dining
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
                  Every ingredient tells a story of the farm. Experience the harvest of Omaru through a menu that moves with the rhythm of the seasons.
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button asChild className="px-6 py-2.5">
                    <a href="#menu">Explore The Menu</a>
                  </Button>
                  <Button variant="outline" asChild className="px-6 py-2.5">
                    <a href="#reserve">Reserve a Table</a>
                  </Button>
                </div>
              </div>
            </motion.div>

            <div className="hidden md:col-span-5 md:block" />
          </div>
        </section>

        {/* Ingredients */}
        <section className="relative -mt-12 overflow-x-clip border-b border-gold/20 bg-[#0b0b0b] py-12 sm:-mt-16 sm:py-14 md:-mt-20 md:py-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/0 to-[#0b0b0b]" />
          <div className="relative z-10 mx-auto grid max-w-[92vw] gap-10 px-4 sm:px-5 md:grid-cols-12 md:gap-12">
            <div className="min-w-0 md:col-span-7">
              {/* Mobile: aspect-ratio framing + overlap; md+: absolute collage (unchanged) */}
              <div className="relative mx-auto max-w-lg pb-2 pt-1 md:mx-0 md:h-[22rem] md:max-w-none md:pb-0 md:pt-0">
                <div className="relative z-10 mx-auto w-[min(100%,20rem)] overflow-hidden rounded-2xl border border-gold/20 bg-black/30 shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:w-[min(100%,22rem)] md:absolute md:left-0 md:top-0 md:mx-0 md:w-[58%] md:max-w-none">
                  <img
                    src={staticUrl('/images/farm/PXL_20210512_061750528.PORTRAIT.jpg')}
                    alt="Fresh produce and farm ingredients"
                    className="aspect-[3/4] w-full object-cover object-center transition duration-700 hover:scale-105 md:aspect-auto md:h-72 md:min-h-[18rem]"
                    loading="lazy"
                  />
                </div>
                <div className="relative z-20 -mt-10 ml-auto mr-0 w-[min(100%,19rem)] overflow-hidden rounded-2xl border border-gold/20 bg-black/30 shadow-[0_22px_70px_rgba(0,0,0,0.5)] sm:-mt-11 sm:w-[min(100%,21rem)] md:absolute md:right-0 md:top-16 md:mt-0 md:w-[62%] md:max-w-none">
                  <img
                    src={staticUrl('/images/farm/20210907_144206.jpg')}
                    alt="Fresh farm eggs"
                    className="aspect-[5/4] w-full object-cover object-center transition duration-700 hover:scale-105 md:aspect-auto md:h-72 md:min-h-[18rem]"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            <div className="min-w-0 md:col-span-5 md:pl-2">
              <p className="text-xs uppercase tracking-[0.28em] text-gold/75">Our Ingredients</p>
              <h2 className="mt-3 font-heading text-3xl text-[#f5efe2] md:text-4xl">Naturally premium.</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                We believe in honest cooking that starts at the farm. Our ingredients are selected daily and refined into recipes that feel both rustic and luxurious.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-white/75">
                {[
                  'Seasonal ingredients from the farm and local growers',
                  'House-made pantry staples: oils, pickles, and seasonings',
                  'Small-batch roasts and fresh dairy pairings',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Menu */}
        <section id="menu" className="bg-[#151515] py-20 md:py-24">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Seasonal Menu</p>
              <h2 className="mt-3 font-heading text-4xl text-[#f5efe2] md:text-5xl">The Menu</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {menuColumns.map((col, index) => (
                <motion.div
                  key={col.key}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>{col.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {col.items.map((item) => (
                        <div key={`${col.key}-${item.itemName}`} className="border-b border-gold/15 pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gold/15 bg-black/30">
                              {item.image ? (
                                <img src={item.image} alt={item.itemName} className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(205,163,73,0.14),transparent_55%)]">
                                  <ImageIcon className="h-4 w-4 text-gold/70" aria-hidden="true" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-4">
                                <p className="truncate text-sm font-medium text-[#f5efe2]">{item.itemName}</p>
                                <p className="shrink-0 text-sm font-semibold text-gold">${Number(item.price).toFixed(0)}</p>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-white/65">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Reserve */}
        <section id="reserve" className="border-t border-gold/20 bg-[#0b0b0b] py-16">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gold/20 bg-white/[0.03] p-6 md:p-10">
              <p className="text-xs uppercase tracking-[0.28em] text-gold/70">Reserve a Table</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/55">
                {[
                  { icon: <Clock3 className="h-4 w-4 text-gold/90" />, text: 'Request in 30 seconds' },
                  { icon: <CalendarDays className="h-4 w-4 text-gold/90" />, text: 'Fast confirmation by email' },
                  { icon: <Users className="h-4 w-4 text-gold/90" />, text: 'Dietary notes welcome' },
                ].map((b) => (
                  <span
                    key={b.text}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-black/30 px-3 py-1"
                  >
                    {b.icon}
                    {b.text}
                  </span>
                ))}
              </div>

              <form
                className="mt-7 grid gap-4 text-left md:grid-cols-12"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setReserveState({ loading: true, message: '', error: '' })
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/bookings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fullName: name,
                        email,
                        bookingDate: selectedDate,
                        source: 'cafe',
                        guestCount: guests,
                        timeFrom,
                        timeUntil,
                        message: notes
                          ? `Period: ${period}. Notes: ${notes}`
                          : `Period: ${period}. Preferred window: ${timeFrom}-${timeUntil}.`,
                      }),
                    })
                    if (!res.ok) {
                      const payload = await res.json().catch(() => null)
                      throw new Error(payload?.message ?? 'Could not submit booking request')
                    }
                    setReserveState({ loading: false, message: 'Booking request submitted. We will contact you shortly.', error: '' })
                    setName('')
                    setEmail('')
                    setNotes('')
                  } catch (err) {
                    setReserveState({
                      loading: false,
                      message: '',
                      error: err instanceof Error ? err.message : 'Could not submit booking request',
                    })
                  }
                }}
              >
                {/* Period */}
                <div className="md:col-span-12">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">Dining</p>
                  <div className="mt-2 inline-flex rounded-xl border border-gold/15 bg-black/30 p-1">
                    {periods.map((p) => {
                      const active = p === period
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPeriod(p)
                            setTimeFrom(defaultsByPeriod[p].from)
                            setTimeUntil(defaultsByPeriod[p].until)
                          }}
                          className={[
                            'rounded-lg px-4 py-2 text-sm transition',
                            active ? 'bg-gold text-black' : 'text-white/75 hover:text-white',
                          ].join(' ')}
                        >
                          {p === 'Tea' ? 'Afternoon Tea' : p}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Date */}
                <div className="md:col-span-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/55">Pick a date</p>
                    <span className="text-xs text-white/45">{prettyDate}</span>
                  </div>

                  <div className="mt-3">
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gold/15 bg-black/30 p-4">
                      <label className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Date</p>
                        <div className="relative">
                          <input
                            className="field w-full bg-black/20 pr-10"
                            type="date"
                            ref={dateInputRef}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            aria-label="Select date"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openNativePicker(dateInputRef.current)
                            }}
                            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-gold/15 bg-black/20 text-gold/80 transition hover:border-gold/30 hover:text-gold"
                            aria-label="Open date picker"
                          >
                            <CalendarDays className="h-4 w-4" />
                          </button>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="md:col-span-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/55">Pick a time</p>
                    <span className="inline-flex items-center gap-2 text-xs text-white/50">
                      <Clock3 className="h-4 w-4 text-gold/80" />
                      {period === 'Tea' ? 'Tea service window' : 'Preferred window'}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 rounded-2xl border border-gold/15 bg-black/30 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">From</p>
                        <div className="relative">
                          <input
                            className="field w-full bg-black/20 pr-10"
                            type="time"
                            step={300}
                            ref={timeFromInputRef}
                            value={timeFrom}
                            onChange={(e) => {
                              const n = normalizeTime(e.target.value)
                              if (n) setTimeFrom(n)
                            }}
                            aria-label="From time"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openNativePicker(timeFromInputRef.current)
                            }}
                            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-gold/15 bg-black/20 text-gold/80 transition hover:border-gold/30 hover:text-gold"
                            aria-label="Open from-time picker"
                          >
                            <Clock3 className="h-4 w-4" />
                          </button>
                        </div>
                      </label>
                      <label className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Until</p>
                        <div className="relative">
                          <input
                            className="field w-full bg-black/20 pr-10"
                            type="time"
                            step={300}
                            ref={timeUntilInputRef}
                            value={timeUntil}
                            onChange={(e) => {
                              const n = normalizeTime(e.target.value)
                              if (n) setTimeUntil(n)
                            }}
                            aria-label="Until time"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openNativePicker(timeUntilInputRef.current)
                            }}
                            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-gold/15 bg-black/20 text-gold/80 transition hover:border-gold/30 hover:text-gold"
                            aria-label="Open until-time picker"
                          >
                            <Clock3 className="h-4 w-4" />
                          </button>
                        </div>
                      </label>
                    </div>

                    <p className="text-xs text-white/45">Tip: choose a start & end time (we’ll confirm availability).</p>
                  </div>
                </div>

                {/* Guests */}
                <div className="md:col-span-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">Guests</p>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-gold/15 bg-black/30 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-sm text-white/75">
                      <Users className="h-4 w-4 text-gold/80" />
                      {guests} {guests === 1 ? 'Guest' : 'Guests'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setGuests((g) => Math.max(1, g - 1))}
                        className="rounded-lg border border-gold/15 bg-black/20 p-2 text-white/70 transition hover:border-gold/30 hover:text-white"
                        aria-label="Decrease guests"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuests((g) => Math.min(10, g + 1))}
                        className="rounded-lg border border-gold/15 bg-black/20 p-2 text-white/70 transition hover:border-gold/30 hover:text-white"
                        aria-label="Increase guests"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/45">For 10+ guests, add a note and we’ll arrange it.</p>
                </div>

                {/* Name / Email */}
                <div className="md:col-span-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">Full name</p>
                  <input className="field mt-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="md:col-span-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">Email</p>
                  <input
                    className="field mt-2"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-12">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">Dietary notes (optional)</p>
                  <textarea
                    className="field mt-2 min-h-[92px] resize-none"
                    placeholder="Allergies, pram access, celebration, seating preference…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <div className="md:col-span-12">
                  <Button type="submit" className="w-full" disabled={reserveState.loading}>
                    {reserveState.loading ? 'Submitting...' : 'Book Now'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  {reserveState.message ? <p className="mt-3 text-center text-sm text-emerald-300">{reserveState.message}</p> : null}
                  {reserveState.error ? <p className="mt-3 text-center text-sm text-red-300">{reserveState.error}</p> : null}
                  <p className="mt-3 text-center text-xs text-white/45">
                    Selected: <span className="text-gold/85">{selectedDate}</span> • <span className="text-gold/85">{timeFrom}</span>–{' '}
                    <span className="text-gold/85">{timeUntil}</span> •{' '}
                    <span className="text-gold/85">{guests}</span> guests
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

