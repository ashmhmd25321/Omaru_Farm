import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dog,
  MapPin,
  UtensilsCrossed,
  Users,
} from 'lucide-react'
import { staticUrl } from '@/utils/staticUrl'

const GOLD_GRADIENT = 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)'

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

type MenuItem = {
  id?: number
  section: string
  itemName: string
  description: string
  price: number
  image: string
  sortOrder?: number
}

type DaypartKey = 'morning' | 'lunch' | 'sunset' | 'evening'

const daypartOptions: { key: DaypartKey; label: string; blurb: string }[] = [
  {
    key: 'morning',
    label: 'Morning',
    blurb: 'Start slow with fresh coffee, warm bakes, and bright paddock light.',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    blurb: 'Seasonal farm plates and relaxed country dining at midday.',
  },
  {
    key: 'sunset',
    label: 'Sunset',
    blurb: 'Golden-hour views, grazing fields, and a restorative atmosphere.',
  },
  {
    key: 'evening',
    label: 'Evening',
    blurb: 'A warm dining room, curated pours, and a slower farm rhythm.',
  },
]

const fallbackMenu: MenuItem[] = [
  { section: 'Breakfast', itemName: 'Heritage Grain Porridge', description: 'Oat porridge, stone-fruit compote, crème fraîche, honey and toasted farm seeds', price: 19, image: '' },
  { section: 'Breakfast', itemName: 'Poached Farm Eggs', description: 'Free-range eggs on sourdough with hollandaise, shaved garden greens and chilli oil', price: 24, image: '' },
  { section: 'Breakfast', itemName: 'Smashed Garden Peas', description: 'Herb-smashed peas on grilled sourdough, whipped ricotta, lemon oil and micro-herbs', price: 21, image: '' },
  { section: 'Lunch', itemName: 'Roasted Root Medley', description: 'Seasonal roasted vegetables, feta, herb dressing, cold-pressed olive oil from our grove', price: 22, image: '' },
  { section: 'Lunch', itemName: 'Omaru Lamb Ragu', description: 'Slow-cooked ragu with pappardelle, parmesan, gremolata and braised garden onions', price: 28, image: '' },
  { section: 'Lunch', itemName: 'Wild Mushroom Risotto', description: 'Creamy arborio, seasonal mushrooms, thyme oil, truffle and aged parmesan', price: 26, image: '' },
  { section: 'Afternoon Tea', itemName: 'Devonshire Scones', description: 'House-baked scones with clotted cream, house-made strawberry preserve and local honey', price: 18, image: '' },
  { section: 'Afternoon Tea', itemName: 'Lavender Lemon Tart', description: 'Buttery pastry shell, garden lavender curd, meringue and candied lemon peel', price: 16, image: '' },
  { section: 'Afternoon Tea', itemName: 'The Omaru Tea Set', description: 'Three sandwiches, petit fours and your choice of loose-leaf tea', price: 44, image: '' },
]

export function CafePage() {
  const pad2 = (n: number) => `${n}`.padStart(2, '0')
  const toISODate = (d: Date) => {
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
  }

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return toISODate(d)
  })
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const openPicker = (el: HTMLInputElement | null) => {
    if (!el) return
    el.focus({ preventScroll: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = el as any
    if (typeof any.showPicker === 'function') { any.showPicker(); return }
    el.click()
  }

  const [guests,   setGuests]   = useState('2 Guests')
  const [timeSlot, setTimeSlot] = useState('Breakfast 10:00 – 13:00')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [notes,    setNotes]    = useState('')
  const [formState, setFormState] = useState({ loading: false, success: false, error: '' })

  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenu)
  const [activeDaypart, setActiveDaypart] = useState<DaypartKey>('sunset')
  const [statsInView, setStatsInView] = useState(false)
  const [statsAnimated, setStatsAnimated] = useState(false)
  const [panoramicCount, setPanoramicCount] = useState(0)
  const [produceCount, setProduceCount] = useState(0)
  const experienceSectionRef = useRef<HTMLElement | null>(null)

  const prettyDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    if (!y || !m || !d) return selectedDate
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short', month: 'long', day: '2-digit', year: 'numeric',
    })
  }, [selectedDate])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/menu`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows) || rows.length === 0) return
        const mapped = rows.map((item) => {
          const row = item as Record<string, unknown>
          return {
            id: Number(row.id ?? 0),
            section: String(row.section ?? ''),
            itemName: String(row.itemName ?? ''),
            description: String(row.description ?? ''),
            price: Number(row.price ?? 0),
            image: String(row.image ?? ''),
            sortOrder: Number(row.sortOrder ?? 0),
          }
        })
        if (mapped.length > 0) setMenuItems(mapped)
      })
      .catch(() => setMenuItems(fallbackMenu))
    return () => controller.abort()
  }, [])

  const menuColumns = useMemo(() => {
    const order = ['Breakfast', 'Lunch', 'Afternoon Tea', 'Dinner', 'Beverages']
    const sections = Array.from(new Set(menuItems.map((i) => i.section)))
    const ordered = [...order.filter((s) => sections.includes(s)), ...sections.filter((s) => !order.includes(s))]
    return ordered.map((section, idx) => ({
      key: section,
      num: String(idx + 1).padStart(2, '0'),
      items: menuItems.filter((x) => x.section === section).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
  }, [menuItems])

  const activeDaypartBlurb = useMemo(
    () => daypartOptions.find((option) => option.key === activeDaypart)?.blurb ?? '',
    [activeDaypart],
  )

  const isMediaActive = (targets: DaypartKey[]) => targets.includes(activeDaypart)

  useEffect(() => {
    if (!experienceSectionRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsInView(true)
      },
      { threshold: 0.3 },
    )
    observer.observe(experienceSectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!statsInView || statsAnimated) return

    const duration = 1300
    let frame = 0
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - t) ** 3

      setPanoramicCount(Math.round(360 * eased))
      setProduceCount(Math.round(100 * eased))

      if (t < 1) {
        frame = requestAnimationFrame(step)
      } else {
        setStatsAnimated(true)
      }
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [statsAnimated, statsInView])

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState({ loading: true, success: false, error: '' })
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name, email, bookingDate: selectedDate, source: 'cafe',
          guestCount: parseInt(guests) || 2,
          message: `Time: ${timeSlot}. ${notes}`.trim(),
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Could not submit')
      setFormState({ loading: false, success: true, error: '' })
      setName(''); setEmail(''); setNotes('')
    } catch (err) {
      setFormState({ loading: false, success: false, error: err instanceof Error ? err.message : 'Could not submit' })
    }
  }

  return (
    <>
      <Helmet>
        <title>Café Omaru | Farm-to-Table Dining on Phillip Island</title>
        <meta
          name="description"
          content="Premium farm-to-table breakfast, lunch and afternoon tea at Café Omaru, Phillip Island. Fully licensed bar, local wines, barista coffee. Dog friendly. Open Thu–Sun."
        />
      </Helmet>

      <main>

        {/* ══════════════════════════════════════════
            HERO — full-viewport farm view, centered text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[85vh] items-end justify-center overflow-hidden">
          <img
            src={staticUrl('/images/farm/image-farm/IMG_0620.jpg')}
            alt="Café Omaru — farm-to-table dining with breathtaking paddock views, Phillip Island"
            className="absolute inset-0 h-full w-full object-cover [filter:saturate(1.08)_contrast(1.06)_brightness(0.9)]"
            loading="eager"
            fetchPriority="high"
          />
          {/* Dual overlay for maximum readability while preserving image */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/26 via-black/34 to-black/72" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-black/8 to-black/24" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.34)_72%,rgba(0,0,0,0.45)_100%)]" />

          {/* Centered bottom content */}
          <div className="relative z-10 w-full px-6 pb-20 text-center md:pb-28">
            <motion.p
              className="mx-auto mb-4 inline-flex items-center rounded-sm border border-gold/45 bg-black/38 px-3 py-1.5 font-body text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-gold backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Established Tradition
            </motion.p>
            <motion.h1
              className="hero-headline mx-auto max-w-3xl font-heading text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl md:text-[3.75rem]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              A Beautiful View,<br />
              <span className="italic text-gold">A Restorative Plate.</span>
            </motion.h1>
            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.38 }}
            >
              <a
                href="#reserve"
                className="inline-flex h-11 items-center rounded-sm px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-105"
                style={{ background: GOLD_GRADIENT }}
              >
                Reserve Table
              </a>
              <a
                href="#menu"
                className="inline-flex h-11 items-center rounded-sm border border-white/28 bg-transparent px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white/88 transition hover:border-white/50 hover:bg-white/8"
              >
                View Menu
              </a>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            INFO STRIP — hours, dog-friendly, address
        ══════════════════════════════════════════ */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-[92vw] gap-6 px-5 py-8 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <div>
                <p className="font-body text-xs font-semibold text-charcoal">
                  Thu–Fri: 10am–2pm &amp; 5–8pm
                </p>
                <p className="mt-0.5 font-body text-xs text-stone">Sat–Sun: 10am–8pm</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Dog className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <p className="font-body text-xs text-stone">
                Bring your furry friend along — Omaru Farm Café is dog-friendly in our outdoor dining area.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <p className="font-body text-xs text-stone">
                776 Ventnor Road, Ventnor<br />Phillip Island VIC 3922
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            THE OMARU TABLE — editorial 2×2 food grid
        ══════════════════════════════════════════ */}
        <section id="menu" className="bg-surface py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            {/* Section heading with gold accent */}
            <motion.div
              className="mb-12 text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={0}
              variants={fadeUp}
            >
              <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                The Omaru Table
              </h2>
              <div className="mx-auto mt-4 h-0.5 w-12" style={{ background: GOLD_GRADIENT }} />
            </motion.div>

            {/* Featured story + supporting cards */}
            <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">

              {/* Featured: Farm Dinner */}
              <motion.article
                className="group relative min-h-[440px] overflow-hidden rounded-sm lg:min-h-[640px]"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.16 }}
                custom={0.06}
                variants={fadeUp}
              >
                <img
                  src={staticUrl('/images/farm/image-farm/IMG_0674.jpg')}
                  alt="Farm dinner sunset at Café Omaru"
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.16)_contrast(1.08)_brightness(0.94)]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-estate/88 via-estate/35 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
                  <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">
                    Featured Story
                  </p>
                  <h3 className="mt-3 font-heading text-3xl font-semibold text-white md:text-4xl">
                    Farm Dinner
                  </h3>
                  <p className="mt-3 max-w-xl font-body text-sm leading-relaxed text-white/78">
                    An elevated sunset dining journey through Omaru&apos;s best produce, paired with warm hospitality and uninterrupted paddock views.
                  </p>
                  <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
                    <div className="relative overflow-hidden rounded-sm border border-white/20">
                      <img
                        src={staticUrl('/images/farm/image-farm/IMG_0620.jpg')}
                        alt="Omaru sunset dining view"
                        className="h-16 w-full object-cover [filter:saturate(1.15)_contrast(1.07)_brightness(0.97)]"
                        loading="lazy"
                      />
                    </div>
                    <div className="relative overflow-hidden rounded-sm border border-white/20">
                      <img
                        src={staticUrl('/images/farm/image-farm/IMG_0644.jpg')}
                        alt="Fresh fruit spread at Omaru"
                        className="h-16 w-full object-cover [filter:saturate(1.14)_contrast(1.06)_brightness(1.02)]"
                        loading="lazy"
                      />
                    </div>
                    <div className="relative overflow-hidden rounded-sm border border-white/20">
                      <img
                        src={staticUrl('/images/farm/image-farm/IMG_0869.jpg')}
                        alt="Chef's starter platter at Omaru"
                        className="h-16 w-full object-cover [filter:saturate(1.13)_contrast(1.08)_brightness(1.01)]"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <a
                    href="#reserve"
                    className="mt-6 inline-flex items-center gap-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold transition hover:text-white"
                  >
                    Reserve for Dinner <ArrowRight className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </motion.article>

              <div className="grid gap-4">
                {/* Supporting 1: Artisan Lunch */}
                <motion.article
                  className="group overflow-hidden rounded-sm bg-white"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.12 }}
                  custom={0.12}
                  variants={fadeUp}
                >
                  <div className="grid sm:grid-cols-[1.2fr_1fr]">
                    <div className="overflow-hidden">
                      <img
                        src={staticUrl('/images/farm/image-farm/IMG_0642.jpg')}
                        alt="Artisan lunch spread at Café Omaru"
                        className="h-52 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.15)_contrast(1.07)_brightness(1.01)]"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5">
                      <p className="font-body text-[0.58rem] font-semibold uppercase tracking-[0.27em] text-gold">
                        Midday Magic
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-charcoal">Artisan Lunch</h3>
                      <p className="mt-2 font-body text-xs leading-relaxed text-stone">
                        Seasonal dishes crafted from our farm produce and trusted local makers.
                      </p>
                    </div>
                  </div>
                </motion.article>

                {/* Supporting 2: Barista Coffee */}
                <motion.article
                  className="group overflow-hidden rounded-sm bg-white"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.12 }}
                  custom={0.18}
                  variants={fadeUp}
                >
                  <div className="grid sm:grid-cols-[1.2fr_1fr]">
                    <div className="overflow-hidden">
                      <img
                        src={staticUrl('/images/farm/image-farm/IMG_0641.jpg')}
                        alt="Barista and artisan breads at Café Omaru"
                        className="h-52 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.14)_contrast(1.08)_brightness(0.98)]"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5">
                      <p className="font-body text-[0.58rem] font-semibold uppercase tracking-[0.27em] text-gold">
                        Morning Ritual
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-charcoal">Barista Coffee</h3>
                      <p className="mt-2 font-body text-xs leading-relaxed text-stone">
                        Freshly ground single-origin coffee with house-made bites and relaxed country warmth.
                      </p>
                    </div>
                  </div>
                </motion.article>

                {/* Supporting 3: Phillip Island Wines */}
                <motion.article
                  className="group overflow-hidden rounded-sm bg-white"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.12 }}
                  custom={0.24}
                  variants={fadeUp}
                >
                  <div className="grid sm:grid-cols-[1.2fr_1fr]">
                    <div className="overflow-hidden">
                      <img
                        src={staticUrl('/images/farm/image-farm/IMG_6051.jpg')}
                        alt="Phillip Island wines at Café Omaru"
                        className="h-52 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.17)_contrast(1.1)_brightness(0.99)]"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5">
                      <p className="font-body text-[0.58rem] font-semibold uppercase tracking-[0.27em] text-gold">
                        Cellar Selection
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-charcoal">Phillip Island Wines</h3>
                      <p className="mt-2 font-body text-xs leading-relaxed text-stone">
                        Regional varietals from Phillip Island and Mornington Peninsula, chosen to complement our menu.
                      </p>
                    </div>
                  </div>
                </motion.article>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FULL MENU — dark estate, 3 numbered columns
        ══════════════════════════════════════════ */}
        <section id="full-menu" className="bg-estate py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            <motion.div
              className="mb-14 text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <h2 className="font-heading text-5xl font-semibold italic tracking-[-0.02em] text-white md:text-6xl">
                The Menu
              </h2>
              <p className="mt-3 font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold/65">
                A Seasonal Synthesis
              </p>
            </motion.div>

            <div className={`grid gap-10 ${menuColumns.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              {menuColumns.map((col, colIdx) => (
                <motion.div
                  key={col.key}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.12 }}
                  custom={colIdx * 0.1}
                  variants={fadeUp}
                >
                  <div className="mb-8 flex items-baseline gap-3">
                    <span className="font-body text-[0.58rem] font-semibold text-gold/45">{col.num}</span>
                    <h3 className="font-heading text-2xl font-semibold text-white">{col.key}</h3>
                  </div>
                  <div className="space-y-7">
                    {col.items.map((item) => (
                      <div key={`${col.key}-${item.itemName}`}>
                        <div className="flex items-start justify-between gap-4">
                          <p className="font-body text-sm font-semibold leading-snug text-white/90">
                            {item.itemName}
                          </p>
                          <span
                            className="shrink-0 rounded-sm px-2 py-0.5 font-body text-[0.62rem] font-semibold text-white"
                            style={{ background: GOLD_GRADIENT }}
                          >
                            ${Number(item.price).toFixed(0)}
                          </span>
                        </div>
                        <p className="mt-1.5 font-body text-xs leading-relaxed text-white/42">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            WHERE THE PADDOCK MEETS THE PLATE
            Left: global-view media collage  |  Right: text + stats
        ══════════════════════════════════════════ */}
        <section ref={experienceSectionRef} className="bg-white py-24 md:py-32">
          <div className="mx-auto grid max-w-[92vw] items-center gap-12 px-5 md:grid-cols-2 md:gap-16 lg:gap-24">

            {/* Left: global-view media collage */}
            <motion.div
              className="grid gap-3"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={0}
              variants={fadeUp}
            >
              <div className={`group relative overflow-hidden rounded-sm ${isMediaActive(['sunset', 'evening']) ? 'ring-1 ring-gold/45' : ''}`}>
                <video
                  src={staticUrl('/images/farm/image-farm/e16abd906ce342f0bd27ac365d346401.mov')}
                  poster={staticUrl('/images/farm/image-farm/20260127_204402.jpg')}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="h-[320px] w-full object-cover transition duration-700 group-hover:scale-[1.02] md:h-[420px] [filter:saturate(1.14)_contrast(1.08)_brightness(0.95)]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-estate/48 via-transparent to-transparent" />
                <p className="pointer-events-none absolute left-4 top-4 rounded-sm border border-white/30 bg-white/12 px-2.5 py-1 font-body text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/92 backdrop-blur-md">
                  Sunset Panorama
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`group relative overflow-hidden rounded-sm ${isMediaActive(['morning', 'lunch']) ? 'ring-1 ring-gold/45' : ''}`}>
                  <video
                    src={staticUrl('/images/farm/image-farm/IMG_0659.MOV')}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="h-40 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.12)_contrast(1.06)_brightness(0.98)]"
                  />
                  <p className="pointer-events-none absolute left-2 top-2 rounded-sm border border-white/30 bg-white/12 px-2 py-0.5 font-body text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Farm Walk
                  </p>
                </div>

                <div className={`group relative overflow-hidden rounded-sm ${isMediaActive(['sunset', 'evening']) ? 'ring-1 ring-gold/45' : ''}`}>
                  <video
                    src={staticUrl('/images/farm/image-farm/IMG_0669.MOV')}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="h-40 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.12)_contrast(1.06)_brightness(0.98)]"
                  />
                  <p className="pointer-events-none absolute left-2 top-2 rounded-sm border border-white/30 bg-white/12 px-2 py-0.5 font-body text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Golden Hour
                  </p>
                </div>

                <div className={`group relative overflow-hidden rounded-sm border border-estate/10 bg-surface ${isMediaActive(['morning', 'evening']) ? 'ring-1 ring-gold/45' : ''}`}>
                  <img
                    src={staticUrl('/images/farm/image-farm/IMG_0781.jpg')}
                    alt="Guests enjoying the indoor Omaru Farm cafe atmosphere"
                    className="h-40 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.13)_contrast(1.08)_brightness(0.99)]"
                    loading="lazy"
                  />
                  <p className="pointer-events-none absolute left-2 top-2 rounded-sm border border-white/30 bg-white/12 px-2 py-0.5 font-body text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Dining Hall
                  </p>
                </div>
              </div>

              <div className={`group relative overflow-hidden rounded-sm border border-estate/10 bg-surface ${isMediaActive(['sunset', 'lunch']) ? 'ring-1 ring-gold/45' : ''}`}>
                <img
                  src={staticUrl('/images/farm/image-farm/20260127_204402.jpg')}
                  alt="Omaru farm paddock and cattle at golden hour"
                  className="h-44 w-full object-cover transition duration-700 group-hover:scale-[1.02] [filter:saturate(1.13)_contrast(1.08)_brightness(0.97)]"
                  loading="lazy"
                />
                <p className="pointer-events-none absolute left-3 top-3 rounded-sm border border-white/30 bg-white/12 px-2 py-0.5 font-body text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                  Cattle & Coastline
                </p>
              </div>
            </motion.div>

            {/* Right: content + stats */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0.12}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
                The Experience
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {daypartOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveDaypart(option.key)}
                    className={`rounded-sm border px-3 py-1.5 font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] transition ${
                      option.key === activeDaypart
                        ? 'border-gold/65 bg-gold/10 text-gold-deep'
                        : 'border-estate/14 text-stone hover:border-gold/35 hover:text-charcoal'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 font-body text-sm leading-relaxed text-stone">{activeDaypartBlurb}</p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                Where the Paddock<br />Meets the Plate.
              </h2>
              <p className="mt-6 font-body text-base leading-[1.78] text-stone">
                The best dining experiences leave you closer to the ocean, closer to the land. At Omaru, our food is literally steps from where it grows — the soil, the grove, the free-range paddock.
              </p>
              <p className="mt-4 font-body text-base leading-[1.78] text-stone">
                From an olive oil as green and grassy as the view itself, to an egg so orange it seems to hold the sunrise — every element on your plate is a reminder of where you are.
              </p>

              {/* Stats */}
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-sm border border-estate/10 bg-surface p-5">
                  <p className="font-heading text-5xl font-semibold leading-none text-charcoal">
                    {panoramicCount}<span className="text-gold">°</span>
                  </p>
                  <p className="mt-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone">
                    Panoramic Views
                  </p>
                </div>
                <div className="rounded-sm border border-estate/10 bg-surface p-5">
                  <p className="font-heading text-5xl font-semibold leading-none text-charcoal">
                    {produceCount}<span className="text-gold">%</span>
                  </p>
                  <p className="mt-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone">
                    Farm-Grown Produce
                  </p>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#reserve"
                  className="inline-flex h-11 items-center rounded-sm px-6 font-body text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-105"
                  style={{ background: GOLD_GRADIENT }}
                >
                  Book a Table
                </a>
                <a
                  href="#full-menu"
                  className="inline-flex h-11 items-center rounded-sm border border-estate/16 bg-white px-6 font-body text-xs font-semibold uppercase tracking-[0.14em] text-charcoal transition hover:border-gold/45 hover:text-gold-deep"
                >
                  View Full Menu
                </a>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            RESERVE — surface-low, clean booking form
        ══════════════════════════════════════════ */}
        <section id="reserve" className="bg-surface-low py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            <motion.div
              className="mx-auto max-w-xl"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              {/* Heading block */}
              <div className="mb-12 text-center">
                {/* Fork & knife icon */}
                <div
                  className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-sm"
                  style={{ background: GOLD_GRADIENT }}
                >
                  <UtensilsCrossed className="h-7 w-7 text-white" aria-hidden />
                </div>
                <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                  Join Us this Weekend
                </h2>
                <p className="mx-auto mt-4 max-w-sm font-body text-base leading-[1.75] text-stone">
                  Table reservations ensure the best experience. We recommend booking ahead for weekend service.
                </p>
              </div>

              {/* Form */}
              {formState.success ? (
                <div className="rounded-sm bg-white p-10 text-center shadow-[0_8px_40px_rgba(26,18,8,0.06)]">
                  <p className="font-heading text-2xl font-semibold text-charcoal">Booking Received!</p>
                  <p className="mx-auto mt-2 max-w-xs font-body text-sm text-stone">
                    Thank you — we'll confirm your table by email shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormState({ loading: false, success: false, error: '' })}
                    className="mt-5 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                  >
                    Book Another
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleReserve}
                  className="space-y-5 rounded-sm bg-white p-8 shadow-[0_8px_40px_rgba(26,18,8,0.06)] md:p-10"
                >
                  {/* Row 1: Date + Guests */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Date
                      </span>
                      <div className="relative mt-2">
                        <input
                          type="date"
                          value={selectedDate}
                          ref={dateInputRef}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          required
                          className="field w-full pr-8"
                          aria-label="Booking date"
                        />
                        <button
                          type="button"
                          onClick={() => openPicker(dateInputRef.current)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-gold/55 hover:text-gold"
                          aria-label="Open date picker"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 font-body text-[0.6rem] text-stone/55">{prettyDate}</p>
                    </label>

                    <label className="block">
                      <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Guests
                      </span>
                      <div className="relative mt-2">
                        <select
                          value={guests}
                          onChange={(e) => setGuests(e.target.value)}
                          className="field w-full appearance-none pr-8"
                          aria-label="Number of guests"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={`${n} ${n === 1 ? 'Guest' : 'Guests'}`}>
                              {n} {n === 1 ? 'Guest' : 'Guests'}
                            </option>
                          ))}
                        </select>
                        <Users className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                      </div>
                    </label>
                  </div>

                  {/* Row 2: Time slot */}
                  <label className="block">
                    <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Preferred Time
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="field w-full appearance-none pr-8"
                        aria-label="Time slot"
                      >
                        <option>Breakfast 10:00 – 13:00</option>
                        <option>Lunch 10:00 – 14:00</option>
                        <option>Afternoon Tea 13:00 – 16:00</option>
                        <option>Dinner 17:00 – 20:00</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                    </div>
                  </label>

                  {/* Row 3: Name + Email */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Full Name
                      </span>
                      <input
                        className="field mt-2 w-full"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Email
                      </span>
                      <input
                        className="field mt-2 w-full"
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  {/* Notes */}
                  <label className="block">
                    <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Notes <span className="normal-case font-normal text-stone/45">(optional)</span>
                    </span>
                    <textarea
                      className="field mt-2 w-full min-h-[72px] resize-none"
                      placeholder="Dietary needs, allergies, dog-friendly seating, celebrations…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>

                  {/* Submit */}
                  <div className="pt-1 text-center">
                    <button
                      type="submit"
                      disabled={formState.loading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-sm font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-105 disabled:opacity-60"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      {formState.loading ? 'Submitting…' : 'Book a Table'}
                    </button>
                    {formState.error && (
                      <p className="mt-3 font-body text-sm text-red-600">{formState.error}</p>
                    )}
                    <p className="mt-4 font-body text-xs text-stone/50">
                      Thu–Fri: 10am–2pm &amp; 5–8pm · Sat–Sun: 10am–8pm
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </section>

      </main>
    </>
  )
}
