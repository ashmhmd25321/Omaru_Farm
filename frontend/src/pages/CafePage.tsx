import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dog,
  MapPin,
  UtensilsCrossed,
  Users,
  Wine,
} from 'lucide-react'
import { productImageUrl } from '@/utils/productImage'
import { staticUrl } from '@/utils/staticUrl'
import { apiUrl } from '@/utils/api'

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
    key: 'lunch',
    label: 'Lunch',
    blurb: 'Authentic Sri Lankan set menu with fresh farm produce in relaxed country dining.',
  },
  {
    key: 'sunset',
    label: 'Sunset',
    blurb: 'Golden-hour views, grazing fields, and a restorative atmosphere.',
  },
  {
    key: 'evening',
    label: 'Dinner',
    blurb: 'Set menu Sri Lankan dinner in a warm dining room with curated pours.',
  },
]

const fallbackMenu: MenuItem[] = [
  { section: 'Lunch', itemName: 'Sri Lankan Rice & Curry', description: 'Traditional rice and curry with coconut sambol, dhal curry, and seasonal vegetables', price: 28, image: 'images/farm/image-farm/IMG_0869.jpg' },
  { section: 'Lunch', itemName: 'Kottu Roti', description: 'Chopped roti stir-fried with vegetables, egg, and choice of chicken or vegetables', price: 24, image: 'images/farm/image-farm/IMG_0642.jpg' },
  { section: 'Lunch', itemName: 'Fish Ambul Thiyal', description: 'Sour fish curry with goraka, onions, and aromatic spices, served with rice', price: 32, image: 'images/farm/image-farm/IMG_4672.JPG' },
  { section: 'Dinner', itemName: 'Lampries Set', description: 'Traditional Dutch Burgher meal with rice, curries, and accompaniments wrapped in banana leaf', price: 45, image: 'images/farm/image-farm/IMG_0674.jpg' },
  { section: 'Dinner', itemName: 'Seafood Curry Feast', description: 'Fresh Phillip Island seafood in rich coconut curry with string hoppers', price: 42, image: 'images/farm/image-farm/IMG_0781.jpg' },
  { section: 'Dinner', itemName: 'Devilled Prawns', description: 'Spicy stir-fried prawns with capsicum, onions, and Sri Lankan spices', price: 38, image: 'images/farm/image-farm/IMG_4682.jpg' },
  { section: 'Beverages', itemName: 'Barista Coffee', description: 'Freshly ground single-origin coffee, espresso and milk-based drinks', price: 6, image: 'images/farm/image-farm/IMG_0641.jpg' },
  { section: 'Beverages', itemName: 'Phillip Island Wine Selection', description: 'Regional varietals from Phillip Island and Mornington Peninsula', price: 14, image: 'images/farm/image-farm/IMG_6051.jpg' },
  { section: 'Beverages', itemName: 'Fully Licensed Bar', description: 'Beer, spirits, and cocktails — fully licensed dining with curated pours', price: 12, image: 'images/farm/image-farm/IMG_6051.jpg' },
]

function menuImageUrl(image: string | undefined | null): string | null {
  const raw = String(image ?? '').trim()
  if (!raw) return null
  return productImageUrl(raw)
}

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
  const [timeSlot, setTimeSlot] = useState('Lunch 12:00 – 15:00')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [notes,    setNotes]    = useState('')
  const [website, setWebsite] = useState('')
  const [formState, setFormState] = useState({ loading: false, success: false, error: '' })

  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenu)
  const [activeDaypart, setActiveDaypart] = useState<DaypartKey>('sunset')
  const [statsInView, setStatsInView] = useState(false)
  const [statsAnimated, setStatsAnimated] = useState(false)
  const [produceCount, setProduceCount] = useState(0)
  const experienceSectionRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const prettyDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    if (!y || !m || !d) return selectedDate
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short', month: 'long', day: '2-digit', year: 'numeric',
    })
  }, [selectedDate])

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/menu'), {
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
    const allowedSections = ['Lunch', 'Dinner', 'Beverages']
    const filteredItems = menuItems.filter((item) => allowedSections.includes(item.section))
    const sections = Array.from(new Set(filteredItems.map((i) => i.section)))
    const ordered = allowedSections.filter((s) => sections.includes(s))
    return ordered.map((section, idx) => ({
      key: section,
      num: String(idx + 1).padStart(2, '0'),
      items: filteredItems.filter((x) => x.section === section).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
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
    const section = experienceSectionRef.current
    if (!section) return
    const videos = Array.from(section.querySelectorAll('video'))
    if (prefersReducedMotion) {
      videos.forEach((video) => video.pause())
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        videos.forEach((video) => {
          if (entry?.isIntersecting) {
            void video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.2 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!statsInView || statsAnimated) return

    const duration = 1300
    let frame = 0
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - t) ** 3

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
      const res = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name, email, bookingDate: selectedDate, source: 'cafe',
          guestCount: parseInt(guests) || 2,
          message: `Time: ${timeSlot}. ${notes}`.trim(),
          website,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Could not submit')
      setFormState({ loading: false, success: true, error: '' })
      setName(''); setEmail(''); setNotes(''); setWebsite('')
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
          content="Sri Lankan flavours meet Phillip Island charm at Café Omaru. Lunch and dinner only — no breakfast. Set menu featuring authentic Sri Lankan cuisine, fully licensed bar, local wines. Dog friendly. Open Thu–Sun."
        />
        <link rel="canonical" href="https://omarufarms.com.au/cafe" />
        <meta property="og:title" content="Café Omaru | Lunch, Dinner & Phillip Island Views" />
        <meta property="og:description" content="Lunch and dinner only at Café Omaru, with Sri Lankan flavours, barista coffee, licensed beverages, and Phillip Island wines." />
        <meta property="og:url" content="https://omarufarms.com.au/cafe" />
        <meta property="og:image" content="/images/farm/image-farm/IMG_0674.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Café Omaru | Lunch, Dinner & Phillip Island Views" />
        <meta name="twitter:description" content="Lunch and dinner only at Café Omaru, with Sri Lankan flavours, barista coffee, licensed beverages, and Phillip Island wines." />
        <meta name="twitter:image" content="/images/farm/image-farm/IMG_0674.jpg" />
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
              <span className="italic text-gold">Authentic Flavour.</span>
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
          <div className="mx-auto grid max-w-[92vw] gap-6 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <div>
                <p className="font-body text-xs font-semibold text-charcoal">
                  Thu–Fri: 10am–2pm &amp; 5–8pm
                </p>
                <p className="mt-0.5 font-body text-xs text-stone">Sat–Sun: 10am–8pm · Lunch &amp; dinner only</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wine className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <p className="font-body text-xs text-stone">
                Fully licensed bar with barista coffee, craft beer, spirits, and Phillip Island wines.
              </p>
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
                    Set Menu Dinner
                  </p>
                  <h3 className="mt-3 font-heading text-3xl font-semibold text-white md:text-4xl">
                    Sunset Dining
                  </h3>
                  <p className="mt-3 max-w-xl font-body text-sm leading-relaxed text-white/78">
                    An elevated dinner set menu with authentic Sri Lankan flavours, curated pours, and uninterrupted paddock views at golden hour.
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
                        Set Menu Lunch
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-charcoal">Lunch at Omaru</h3>
                      <p className="mt-2 font-body text-xs leading-relaxed text-stone">
                        Authentic Sri Lankan set menu with fresh farm produce — lunch only, no breakfast.
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
                        Freshly Ground
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-charcoal">Barista Coffee</h3>
                      <p className="mt-2 font-body text-xs leading-relaxed text-stone">
                        Single-origin espresso and milk-based drinks, served throughout lunch and dinner service.
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
                        Fully Licensed
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-charcoal">Phillip Island Wines</h3>
                      <p className="mt-2 font-body text-xs leading-relaxed text-stone">
                        Fully licensed bar with regional Phillip Island and Mornington Peninsula wines, beer, and spirits.
                      </p>
                    </div>
                  </div>
                </motion.article>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FULL MENU — light set-menu cards
        ══════════════════════════════════════════ */}
        <section id="full-menu" className="bg-surface-low py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            <motion.div
              className="mb-14 text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <h2 className="font-heading text-5xl font-semibold italic tracking-[-0.02em] text-charcoal md:text-6xl">
                The Menu
              </h2>
              <p className="mt-3 font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-deep">
                Sri Lankan Set Menu
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
                    <span className="font-body text-[0.58rem] font-semibold text-gold/70">{col.num}</span>
                    <h3 className="font-heading text-2xl font-semibold text-charcoal">{col.key}</h3>
                  </div>
                  <div className="space-y-7">
                    {col.items.map((item) => {
                      const imageSrc = menuImageUrl(item.image)
                      return (
                      <div key={`${col.key}-${item.itemName}`} className="overflow-hidden rounded-sm border border-parchment/70 bg-white shadow-[0_8px_30px_rgba(26,18,8,0.05)]">
                        {imageSrc ? (
                          <div className="relative h-36 overflow-hidden border-b border-parchment/60">
                            <img
                              src={imageSrc}
                              alt={item.itemName}
                              className="h-full w-full object-cover [filter:saturate(1.12)_contrast(1.06)_brightness(1.02)]"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="font-body text-sm font-semibold leading-snug text-charcoal">
                            {item.itemName}
                          </p>
                          <span
                            className="shrink-0 rounded-sm px-2 py-0.5 font-body text-[0.62rem] font-semibold text-white"
                            style={{ background: GOLD_GRADIENT }}
                          >
                            ${Number(item.price).toFixed(0)}
                          </span>
                        </div>
                        <p className="mt-1.5 font-body text-xs leading-relaxed text-stone">
                          {item.description}
                        </p>
                        </div>
                      </div>
                    )})}
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
              <div className={`group relative overflow-hidden rounded-sm ${isMediaActive(['morning', 'lunch']) ? 'ring-1 ring-gold/45' : ''}`}>
                <video
                  src={staticUrl('/images/farm/image-farm/e16abd906ce342f0bd27ac365d346401.mov')}
                  poster={staticUrl('/images/farm/image-farm/20260127_204402.jpg')}
                  autoPlay={!prefersReducedMotion}
                  loop
                  muted
                  playsInline
                  preload={prefersReducedMotion ? 'none' : 'metadata'}
                  className="h-[320px] w-full object-cover transition duration-700 group-hover:scale-[1.02] md:h-[420px] [filter:saturate(1.14)_contrast(1.08)_brightness(0.95)]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-estate/48 via-transparent to-transparent" />
                <p className="pointer-events-none absolute left-4 top-4 rounded-sm border border-white/30 bg-white/12 px-2.5 py-1 font-body text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/92 backdrop-blur-md">
                  Freshly Baked
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`group relative overflow-hidden rounded-sm ${isMediaActive(['morning', 'lunch']) ? 'ring-1 ring-gold/45' : ''}`}>
                  <video
                    src={staticUrl('/images/farm/image-farm/IMG_0659.MOV')}
                    autoPlay={!prefersReducedMotion}
                    loop
                    muted
                    playsInline
                    preload={prefersReducedMotion ? 'none' : 'metadata'}
                    className="h-40 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.12)_contrast(1.06)_brightness(0.98)]"
                  />
                  <p className="pointer-events-none absolute left-2 top-2 rounded-sm border border-white/30 bg-white/12 px-2 py-0.5 font-body text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Farm Kitchen
                  </p>
                </div>

                <div className={`group relative overflow-hidden rounded-sm ${isMediaActive(['lunch', 'evening']) ? 'ring-1 ring-gold/45' : ''}`}>
                  <video
                    src={staticUrl('/images/farm/image-farm/IMG_0669.mp4')}
                    autoPlay={!prefersReducedMotion}
                    loop
                    muted
                    playsInline
                    preload={prefersReducedMotion ? 'none' : 'metadata'}
                    className="h-40 w-full object-cover transition duration-700 group-hover:scale-[1.03] [filter:saturate(1.12)_contrast(1.06)_brightness(0.98)]"
                  />
                  <p className="pointer-events-none absolute left-2 top-2 rounded-sm border border-white/30 bg-white/12 px-2 py-0.5 font-body text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Slow-Cooked Flavours
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
                Where Sri Lankan Flavours<br />Meet Phillip Island Charm.
              </h2>
              <p className="mt-6 font-body text-base leading-[1.78] text-stone">
                We serve lunch and dinner only — no breakfast. Our set menu features authentic Sri Lankan flavours paired with the finest farm produce grown steps from your table. Each dish celebrates the spices and traditions of Sri Lanka alongside fresh ingredients from the soil, the grove, and the free-range paddock of Phillip Island.
              </p>
              <p className="mt-4 font-body text-base leading-[1.78] text-stone">
                Our fully licensed bar serves barista coffee, Phillip Island wines, craft beer, and spirits — the perfect accompaniment to lunch or sunset dinner with a view.
              </p>
              <p className="mt-4 font-body text-base leading-[1.78] text-stone">
                From an olive oil as green and grassy as the view itself, to an egg so orange it seems to hold the sunrise — every element on your plate is a reminder of where you are.
              </p>

              {/* Stats */}
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col justify-center rounded-sm border border-estate/10 bg-surface p-5">
                  <p className="font-heading text-3xl font-semibold leading-tight tracking-[-0.02em] text-charcoal md:text-4xl">
                    Panoramic View
                  </p>
                  <p className="mt-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone">
                    Land &amp; Sea Outlook
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
                  <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" />
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
                        <option>Lunch 12:00 – 15:00</option>
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
