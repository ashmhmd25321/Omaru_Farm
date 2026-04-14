import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Dog, GlassWater, Image as ImageIcon, Leaf, Minus, Plus, UtensilsCrossed, Users, Wine } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  { section: 'Lunch', itemName: 'Roasted Root Medley', description: 'Seasonal roasted vegetables, feta, herb dressing, cold-pressed olive oil from our grove', price: 22, image: '' },
  { section: 'Lunch', itemName: 'Omaru Lamb Ragu', description: 'Slow-cooked ragu with pasta, parmesan, and fresh garden herbs', price: 28, image: '' },
  { section: 'Lunch', itemName: 'Wild Mushroom Risotto', description: 'Creamy risotto, seasonal mushrooms, thyme oil from our kitchen garden', price: 26, image: '' },
  { section: 'Dinner', itemName: 'Paddock-to-Plate Beef', description: 'Locally sourced beef, seasonal vegetables, house jus, garden herbs', price: 38, image: '' },
  { section: 'Dinner', itemName: 'Harvest Chicken', description: 'Free-range chicken, garden greens, roasted root vegetables, farm olive oil', price: 34, image: '' },
  { section: 'Dinner', itemName: 'Fresh Garden Pasta', description: 'House-made pasta, garden tomatoes, fresh herbs, aged parmesan', price: 29, image: '' },
  { section: 'Beverages', itemName: 'Barista Coffee', description: 'Single origin beans, locally roasted — espresso, flat white, cold brew', price: 6, image: '' },
  { section: 'Beverages', itemName: 'Phillip Island Wines', description: 'Curated selection of local Phillip Island and Mornington Peninsula wines', price: 12, image: '' },
  { section: 'Beverages', itemName: 'Fully Licensed Bar', description: 'Local beers, cocktails, and a full beverage menu — including zero-alcohol options', price: 10, image: '' },
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
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
    return `${pad2(h)}:${pad2(m)}`
  }

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return toISODate(d)
  })
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const timeFromInputRef = useRef<HTMLInputElement | null>(null)
  const timeUntilInputRef = useRef<HTMLInputElement | null>(null)

  const openNativePicker = (el: HTMLInputElement | null) => {
    if (!el) return
    el.focus({ preventScroll: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any
    if (typeof anyEl.showPicker === 'function') { anyEl.showPicker(); return }
    el.click()
  }

  const periods = useMemo(() => ['Lunch', 'Dinner'] as const, [])
  const [period, setPeriod] = useState<(typeof periods)[number]>('Lunch')

  const defaultsByPeriod = useMemo(() => ({
    Lunch:  { from: '10:00', until: '14:00' },
    Dinner: { from: '17:00', until: '20:00' },
  }), [])

  const [timeFrom, setTimeFrom] = useState(() => defaultsByPeriod.Lunch.from)
  const [timeUntil, setTimeUntil] = useState(() => defaultsByPeriod.Lunch.until)
  const [guests, setGuests] = useState(2)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [reserveState, setReserveState] = useState({ loading: false, message: '', error: '' })
  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenuItems)

  const prettyDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map((v) => Number(v))
    if (!y || !m || !d) return selectedDate
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' })
  }, [selectedDate])

  useEffect(() => {
    if (timeUntil <= timeFrom) {
      const [h, m] = timeFrom.split(':').map((v) => Number(v))
      const dt = new Date(); dt.setHours(h || 0, m || 0, 0, 0); dt.setMinutes(dt.getMinutes() + 60)
      setTimeUntil(`${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`)
    }
  }, [timeFrom, timeUntil])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/menu`, { signal: controller.signal })
      .then((res) => res.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        const mapped = rows.map((item) => {
          const row = item as Record<string, unknown>
          return { id: Number(row.id ?? 0), section: String(row.section ?? 'Menu'), itemName: String(row.itemName ?? ''), description: String(row.description ?? ''), price: Number(row.price ?? 0), image: String(row.image ?? ''), sortOrder: Number(row.sortOrder ?? 0) }
        })
        const noBreakfast = mapped.filter((i) => i.section.toLowerCase() !== 'breakfast')
        if (noBreakfast.length > 0) setMenuItems(noBreakfast)
      })
      .catch(() => setMenuItems(fallbackMenuItems))
    return () => controller.abort()
  }, [])

  const menuColumns = useMemo(() => {
    const sectionOrder = ['Lunch', 'Dinner', 'Beverages']
    const sections = Array.from(new Set(menuItems.map((i) => i.section).filter((s) => s.toLowerCase() !== 'breakfast')))
    const ordered = [...sectionOrder.filter((s) => sections.includes(s)), ...sections.filter((s) => !sectionOrder.includes(s))]
    return ordered.map((section, idx) => ({
      key: section,
      title: `${String(idx + 1).padStart(2, '0')}. ${section}`,
      items: menuItems.filter((x) => x.section === section).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
  }, [menuItems])

  return (
    <>
      <Helmet>
        <title>Café Omaru | Farm-to-Table Dining on Phillip Island</title>
        <meta name="description" content="Premium farm-to-table lunch and sunset dinner at Café Omaru, Phillip Island. Fully licensed bar, local Phillip Island wines, barista coffee. Dog friendly. Open Thu–Sun." />
      </Helmet>

      <main>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <img
            src={staticUrl('/images/farm/20211027_195611.jpg')}
            alt="Farm-to-table dining at Café Omaru, Phillip Island"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/22 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          <div className="relative mx-auto grid min-h-[75vh] max-w-[92vw] items-center gap-10 px-5 py-16 md:grid-cols-12">
            <motion.div className="hero-panel md:col-span-8 lg:col-span-7" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-gold-deep">Café Omaru · Phillip Island</p>
              <h1 className="font-heading text-4xl leading-tight text-charcoal md:text-6xl">
                Farm-to-Table<br />
                <span className="italic text-gold">Dining</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-stone">
                From our olive groves and kitchen garden to your plate — lunch, sunset dinners, barista coffee,
                and Phillip Island wines in a breathtaking paddock setting.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[
                  { icon: <UtensilsCrossed className="h-3.5 w-3.5" />, label: 'Lunch & Dinner' },
                  { icon: <Wine className="h-3.5 w-3.5" />, label: 'Fully Licensed' },
                  { icon: <GlassWater className="h-3.5 w-3.5" />, label: 'Phillip Island Wines' },
                  { icon: <Dog className="h-3.5 w-3.5" />, label: 'Dog Friendly' },
                ].map((b) => (
                  <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-parchment bg-zinc-50 px-3 py-1.5 text-bark">
                    <span className="text-gold">{b.icon}</span>
                    {b.label}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="bg-gold text-white hover:bg-gold-deep">
                  <a href="#menu">Explore The Menu</a>
                </Button>
                <Button variant="outline" asChild className="border-parchment text-bark hover:bg-zinc-50">
                  <a href="#reserve">Reserve a Table</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── HOURS & INFO STRIP ───────────────────────────────── */}
        <section className="border-b border-parchment bg-zinc-50">
          <div className="mx-auto max-w-[92vw] px-5 py-8">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { icon: <Clock3 className="h-5 w-5 text-gold" />, title: 'Thu – Fri', hours: '10:00am – 2:00pm\n5:00pm – 8:00pm' },
                { icon: <Clock3 className="h-5 w-5 text-gold" />, title: 'Sat – Sun', hours: '10:00am – 8:00pm\n(All day)' },
                { icon: <Dog className="h-5 w-5 text-gold" />, title: 'Dog Friendly', hours: 'Bring your furry friend!\nOutdoor seating welcome.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  {item.icon}
                  <div>
                    <p className="font-medium text-charcoal">{item.title}</p>
                    <p className="mt-0.5 text-sm whitespace-pre-line text-stone">{item.hours}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FARM TO TABLE STORY ──────────────────────────────── */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="grid gap-12 md:grid-cols-12 md:items-center">
              <div className="md:col-span-5">
                <div className="grid grid-cols-2 gap-3">
                  <img src={staticUrl('/images/farm/PXL_20210512_061750528.PORTRAIT.jpg')} alt="Fresh farm produce" className="aspect-[3/4] rounded-2xl border border-parchment object-cover w-full" loading="lazy" />
                  <div className="flex flex-col gap-3">
                    <img src={staticUrl('/images/farm/20210907_144206.jpg')} alt="Farm fresh eggs" className="flex-1 rounded-2xl border border-parchment object-cover w-full" loading="lazy" />
                    <div className="rounded-2xl bg-gold/10 border border-gold/20 p-4 text-center">
                      <p className="font-heading text-2xl text-gold">Est.</p>
                      <p className="font-heading text-3xl text-charcoal">1924</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Our Ingredients</p>
                <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Naturally Premium</h2>
                <p className="mt-4 text-base leading-relaxed text-stone">
                  We believe in honest cooking that starts at the farm. Our kitchen uses olive oil pressed from our own grove,
                  eggs from our free-range chooks, herbs picked fresh each morning, and sun-ripened tomatoes from the garden.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Olive oil pressed from our own olive grove',
                    'Eggs from our free-range chooks — paddock to plate',
                    'Tomatoes and herbs grown in our kitchen garden',
                    'Seasonal produce from the farm and local Phillip Island growers',
                    'Fully licensed bar with local Phillip Island wines',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-stone">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── MENU ─────────────────────────────────────────────── */}
        <section id="menu" className="bg-zinc-50 py-20 md:py-24">
          <div className="mx-auto max-w-[92vw] px-5">
            <motion.div className="text-center" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Seasonal Menu</p>
              <h2 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">The Menu</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-stone">
                Our menu celebrates the farm's harvest — honest, seasonal, and genuinely farm-to-table.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {menuColumns.map((col, index) => (
                <motion.div
                  key={col.key}
                  className="rounded-2xl border border-parchment bg-white p-6 shadow-sm"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">{col.title}</p>
                  <div className="mt-5 space-y-5">
                    {col.items.map((item) => (
                      <div key={`${col.key}-${item.itemName}`} className="border-b border-parchment pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-parchment bg-zinc-50">
                            {item.image ? (
                              <img src={item.image} alt={item.itemName} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="grid h-full w-full place-items-center">
                                <ImageIcon className="h-4 w-4 text-parchment" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-sm font-medium text-charcoal">{item.itemName}</p>
                              <p className="shrink-0 text-sm font-semibold text-gold">${Number(item.price).toFixed(0)}</p>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-stone">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Wine & Beverages callout */}
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-6 rounded-2xl border border-gold/20 bg-white p-6 md:p-8"
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              <Wine className="h-10 w-10 shrink-0 text-gold" />
              <div className="flex-1">
                <h3 className="font-heading text-xl text-charcoal">Fully Licensed Bar · Local Phillip Island Wines</h3>
                <p className="mt-1 text-sm text-stone">
                  Enjoy a selection of local Phillip Island and Mornington Peninsula wines, craft beers, cocktails, and zero-alcohol options.
                  We take pride in supporting the incredible producers right here on the island.
                </p>
              </div>
            </motion.div>

            {/* Dog friendly strip */}
            <motion.div
              className="mt-5 flex flex-wrap items-center gap-5 rounded-2xl border border-parchment bg-zinc-50 p-6"
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              <Dog className="h-8 w-8 shrink-0 text-gold" />
              <div>
                <h3 className="font-medium text-charcoal">Dog Friendly Café</h3>
                <p className="mt-0.5 text-sm text-stone">
                  Bring your furry friend along — Omaru Farm Café is dog friendly, so there's no need to leave your pet behind.
                  Dogs are welcome in our outdoor dining area.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── RESERVE ──────────────────────────────────────────── */}
        <section id="reserve" className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[92vw] px-5">
            <div className="mx-auto max-w-4xl rounded-2xl border border-parchment bg-white p-6 shadow-sm md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Reserve a Table</p>
              <h2 className="mt-2 font-heading text-3xl text-charcoal">Book Your Table</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {[
                  { icon: <Clock3 className="h-4 w-4 text-gold" />, text: 'Quick 30-second request' },
                  { icon: <CalendarDays className="h-4 w-4 text-gold" />, text: 'Fast confirmation by email' },
                  { icon: <Users className="h-4 w-4 text-gold" />, text: 'Dietary notes welcome' },
                ].map((b) => (
                  <span key={b.text} className="inline-flex items-center gap-2 rounded-full border border-parchment bg-zinc-50 px-3 py-1 text-stone">
                    {b.icon} {b.text}
                  </span>
                ))}
              </div>

              <form
                className="mt-7 grid gap-5 md:grid-cols-12"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setReserveState({ loading: true, message: '', error: '' })
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/bookings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fullName: name, email, bookingDate: selectedDate, source: 'cafe',
                        guestCount: guests, timeFrom, timeUntil,
                        message: notes ? `Period: ${period}. Notes: ${notes}` : `Period: ${period}. Preferred window: ${timeFrom}-${timeUntil}.`,
                      }),
                    })
                    if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Could not submit')
                    setReserveState({ loading: false, message: 'Booking request submitted! We\'ll be in touch shortly.', error: '' })
                    setName(''); setEmail(''); setNotes('')
                  } catch (err) {
                    setReserveState({ loading: false, message: '', error: err instanceof Error ? err.message : 'Could not submit booking' })
                  }
                }}
              >
                {/* Period */}
                <div className="md:col-span-12">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Dining</p>
                  <div className="mt-2 inline-flex rounded-xl border border-parchment bg-zinc-50 p-1">
                    {periods.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setPeriod(p); setTimeFrom(defaultsByPeriod[p].from); setTimeUntil(defaultsByPeriod[p].until) }}
                        className={['rounded-lg px-5 py-2 text-sm font-medium transition', p === period ? 'bg-gold text-white shadow-sm' : 'text-stone hover:text-charcoal'].join(' ')}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="md:col-span-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Select Date</p>
                    <span className="text-xs text-stone">{prettyDate}</span>
                  </div>
                  <div className="mt-2 rounded-2xl border border-parchment bg-zinc-50 p-4">
                    <div className="relative">
                      <input
                        className="field"
                        type="date"
                        ref={dateInputRef}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        aria-label="Select date"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); openNativePicker(dateInputRef.current) }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-parchment bg-white p-1.5 text-gold hover:border-gold/40"
                        aria-label="Open date picker"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="md:col-span-5">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Preferred Time</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 rounded-2xl border border-parchment bg-zinc-50 p-4">
                    {([['From', timeFrom, timeFromInputRef, setTimeFrom], ['Until', timeUntil, timeUntilInputRef, setTimeUntil]] as const).map(([label, val, ref, setter]) => (
                      <label key={label} className="space-y-1.5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-stone">{label}</p>
                        <div className="relative">
                          <input
                            className="field pr-10"
                            type="time"
                            step={300}
                            ref={ref}
                            value={val}
                            onChange={(e) => { const n = normalizeTime(e.target.value); if (n) setter(n) }}
                            aria-label={`${label} time`}
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); openNativePicker(ref.current) }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-parchment bg-white p-1 text-gold hover:border-gold/40"
                            aria-label={`Open ${label.toLowerCase()} time picker`}
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Guests */}
                <div className="md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Guests</p>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-parchment bg-zinc-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-bark">
                      <Users className="h-4 w-4 text-gold" />
                      {guests} {guests === 1 ? 'Guest' : 'Guests'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="rounded-lg border border-parchment bg-white p-2 text-stone hover:text-charcoal" aria-label="Decrease guests">
                        <Minus className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setGuests((g) => Math.min(20, g + 1))} className="rounded-lg border border-parchment bg-white p-2 text-stone hover:text-charcoal" aria-label="Increase guests">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-stone">Large groups? Add a note below.</p>
                </div>

                {/* Name */}
                <div className="md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Full Name</p>
                  <input className="field mt-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                {/* Email */}
                <div className="md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Email</p>
                  <input className="field mt-2" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                {/* Notes */}
                <div className="md:col-span-12">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone">Notes (optional)</p>
                  <textarea
                    className="field mt-2 min-h-[80px] resize-none"
                    placeholder="Dietary requirements, allergies, high chair, dog-friendly seating, celebrations…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <div className="md:col-span-12">
                  <Button type="submit" className="w-full bg-gold text-white hover:bg-gold-deep" disabled={reserveState.loading}>
                    {reserveState.loading ? 'Submitting…' : 'Request Table'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  {reserveState.message && <p className="mt-3 text-center text-sm text-sage font-medium">{reserveState.message}</p>}
                  {reserveState.error && <p className="mt-3 text-center text-sm text-red-600">{reserveState.error}</p>}
                  <p className="mt-3 text-center text-xs text-stone">
                    <Leaf className="mr-1 inline h-3 w-3 text-gold" />
                    Thu–Fri: 10am–2pm & 5–8pm · Sat–Sun: 10am–8pm · 776 Ventnor Road, Phillip Island
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
