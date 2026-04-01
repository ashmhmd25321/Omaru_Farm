import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Minus, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map((v) => Number(v))
    if (!y || !m || !d) return new Date()
    return new Date(y, m - 1, d)
  }, [selectedDate])

  const periods = useMemo(() => ['Breakfast', 'Lunch', 'Tea'] as const, [])
  const [period, setPeriod] = useState<(typeof periods)[number]>('Lunch')

  const timesByPeriod = useMemo(
    () => ({
      Breakfast: ['09:00', '09:30', '10:00', '10:30', '11:00'],
      Lunch: ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00'],
      Tea: ['14:00', '14:30', '15:00', '15:30', '16:00'],
    }),
    [],
  )

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
            src="/images/farm/20211027_195611.jpg"
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
        <section className="relative -mt-16 border-b border-gold/20 bg-[#0b0b0b] py-16 md:-mt-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/0 to-[#0b0b0b]" />
          <div className="relative z-10 mx-auto grid max-w-[92vw] gap-10 px-5 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="relative mx-auto max-w-2xl space-y-4 md:mx-0 md:h-[22rem] md:space-y-0">
                <div className="z-10 w-full overflow-hidden rounded-2xl border border-gold/20 bg-black/30 shadow-[0_18px_60px_rgba(0,0,0,0.45)] md:absolute md:left-0 md:top-0 md:w-[58%]">
                  <img
                    src="/images/farm/PXL_20210512_061750528.PORTRAIT.jpg"
                    alt="Fresh produce and farm ingredients"
                    className="h-72 w-full object-cover transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="w-full overflow-hidden rounded-2xl border border-gold/20 bg-black/30 shadow-[0_22px_70px_rgba(0,0,0,0.5)] md:absolute md:right-0 md:top-16 md:w-[62%]">
                  <img
                    src="/images/farm/20210907_144206.jpg"
                    alt="Fresh farm eggs"
                    className="h-72 w-full object-cover transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-5 md:pl-2">
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
              {[
                {
                  title: '01. Breakfast',
                  items: [
                    { name: 'Heritage Oats Porridge', desc: 'House spiced oat porridge, seasonal fruit, honey drizzle', price: '$16' },
                    { name: 'Truffle Farm Eggs', desc: 'Two eggs, greens, toast, cold-pressed oil', price: '$18' },
                    { name: 'Smashed Garden Greens', desc: 'Avocado, herbs, lemon, seeds, sourdough', price: '$17' },
                  ],
                },
                {
                  title: '02. Lunch',
                  items: [
                    { name: 'Roasted Root Medley', desc: 'Seasonal roasted vegetables, feta, herb dressing', price: '$22' },
                    { name: 'Omaru Lamb Ragu', desc: 'Slow-cooked ragu, pasta, parmesan, garden herbs', price: '$28' },
                    { name: 'Wild Mushroom Risotto', desc: 'Creamy risotto, mushrooms, thyme oil', price: '$26' },
                  ],
                },
                {
                  title: '03. Afternoon Tea',
                  items: [
                    { name: 'Devonshire Scones', desc: 'Fresh cream, farm jam, seasonal berries', price: '$14' },
                    { name: 'Lavender Lemon Tart', desc: 'Bright citrus tart with lavender sugar', price: '$12' },
                    { name: 'The Omaru Tea Set', desc: 'Tea selection with small sweet bites', price: '$19' },
                  ],
                },
              ].map((col, index) => (
                <motion.div
                  key={col.title}
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
                        <div key={item.name} className="border-b border-gold/15 pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm font-medium text-[#f5efe2]">{item.name}</p>
                            <p className="text-sm font-semibold text-gold">{item.price}</p>
                          </div>
                          <p className="mt-1 text-sm text-white/65">{item.desc}</p>
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
                onSubmit={(e) => {
                  e.preventDefault()
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
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            aria-label="Select date"
                          />
                          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
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
                            value={timeFrom}
                            onChange={(e) => {
                              const n = normalizeTime(e.target.value)
                              if (n) setTimeFrom(n)
                            }}
                            aria-label="From time"
                          />
                          <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
                        </div>
                      </label>
                      <label className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Until</p>
                        <div className="relative">
                          <input
                            className="field w-full bg-black/20 pr-10"
                            type="time"
                            step={300}
                            value={timeUntil}
                            onChange={(e) => {
                              const n = normalizeTime(e.target.value)
                              if (n) setTimeUntil(n)
                            }}
                            aria-label="Until time"
                          />
                          <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
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
                  <input className="field mt-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="md:col-span-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">Email</p>
                  <input
                    className="field mt-2"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  <Button type="submit" className="w-full">
                    Book Now
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
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

