import { Seo } from '@/components/site/Seo'
import { StayBookingPanel } from '@/components/stay/StayBookingPanel'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BedDouble,
  Bird,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MapPin,
  PawPrint,
  Sunrise,
  UtensilsCrossed,
  Users,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { staticUrl } from '@/utils/staticUrl'
import { apiUrl } from '@/utils/api'
import {
  DEFAULT_WHATSAPP_NUMBER,
  formatWhatsAppDisplay,
  openWhatsAppSiteRequest,
  parseWhatsAppNumber,
} from '@/utils/whatsapp'

type GalleryPhoto = { src: string; label: string }

const roseSrc = (n: number) =>
  staticUrl(`/images/holiday-homes/rose/rose-${String(n).padStart(2, '0')}.jpg`)

// Ordered to match Airbnb's gallery categories: Living room → Kitchen → Dining →
// Bedrooms → Bathrooms → Laundry → Exterior → More
const ROSE_GALLERY: GalleryPhoto[] = [
  { src: roseSrc(1),  label: 'Living room' },
  { src: roseSrc(2),  label: 'Living room' },
  { src: roseSrc(12), label: 'Living room' },
  { src: roseSrc(17), label: 'Living room' },
  { src: roseSrc(4),  label: 'Kitchen' },
  { src: roseSrc(8),  label: 'Kitchen' },
  { src: roseSrc(3),  label: 'Dining area' },
  { src: roseSrc(5),  label: 'Dining area' },
  { src: roseSrc(10), label: 'Bedroom 1' },
  { src: roseSrc(13), label: 'Bedroom 1' },
  { src: roseSrc(16), label: 'Bedroom 1' },
  { src: roseSrc(14), label: 'Bedroom 2' },
  { src: roseSrc(15), label: 'Bedroom 3' },
  { src: roseSrc(6),  label: 'Bedroom 4' },
  { src: roseSrc(9),  label: 'Bathroom 1' },
  { src: roseSrc(11), label: 'Bathroom 1' },
  { src: roseSrc(7),  label: 'Bathroom 2' },
  { src: roseSrc(19), label: 'Laundry' },
  { src: roseSrc(20), label: 'Exterior' },
  { src: roseSrc(21), label: 'Exterior' },
  { src: roseSrc(22), label: 'Exterior' },
  { src: roseSrc(18), label: 'More of the home' },
  { src: roseSrc(23), label: 'More of the home' },
]

const jasmineSrc = (n: number) =>
  staticUrl(`/images/holiday-homes/jasmine/jasmine-${String(n).padStart(2, '0')}.jpg`)

// Files were downloaded in Airbnb's gallery section order, so jasmine-NN.jpg
// already maps 1-to-1 with the labels below.
const JASMINE_GALLERY: GalleryPhoto[] = [
  { src: jasmineSrc(1),  label: 'Living room' },
  { src: jasmineSrc(2),  label: 'Living room' },
  { src: jasmineSrc(3),  label: 'Living room' },
  { src: jasmineSrc(4),  label: 'Kitchen' },
  { src: jasmineSrc(5),  label: 'Kitchen' },
  { src: jasmineSrc(6),  label: 'Kitchen' },
  { src: jasmineSrc(7),  label: 'Dining area' },
  { src: jasmineSrc(8),  label: 'Bedroom 1' },
  { src: jasmineSrc(9),  label: 'Bedroom 1' },
  { src: jasmineSrc(10), label: 'Bedroom 2' },
  { src: jasmineSrc(11), label: 'Bedroom 2' },
  { src: jasmineSrc(12), label: 'Bedroom 3' },
  { src: jasmineSrc(13), label: 'Bedroom 3' },
  { src: jasmineSrc(14), label: 'Bedroom 4' },
  { src: jasmineSrc(15), label: 'Bedroom 4' },
  { src: jasmineSrc(16), label: 'Bedroom 5' },
  { src: jasmineSrc(17), label: 'Bedroom 5' },
  { src: jasmineSrc(18), label: 'Bathroom 1' },
  { src: jasmineSrc(19), label: 'Bathroom 2' },
  { src: jasmineSrc(20), label: 'Bathroom 2' },
  { src: jasmineSrc(21), label: 'Half bathroom' },
  { src: jasmineSrc(22), label: 'Backyard' },
  { src: jasmineSrc(23), label: 'Patio' },
  { src: jasmineSrc(24), label: 'Front yard' },
  { src: jasmineSrc(25), label: 'Laundry' },
  { src: jasmineSrc(26), label: 'Exterior' },
  { src: jasmineSrc(27), label: 'Game room' },
  { src: jasmineSrc(28), label: 'Game room' },
  { src: jasmineSrc(29), label: 'More of the home' },
]

const GOLD_GRADIENT = 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)'

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

type StayGroup = 'on-farm' | 'holiday-home'

const ON_FARM_STAYS = [
  {
    id: 'glass-pavilion',
    group: 'on-farm' as StayGroup,
    name: 'The Glass Pavilion',
    type: 'On-Farm · Self-Contained Cabin',
    badge: 'Most Popular',
    tagline: 'Wake to the sound of the farm.',
    description:
      'A self-contained cabin on Omaru Farm — part of a working farm established in 1970. Enjoy life in the open paddock without compromising on comfort, with the finest farm produce on your doorstep.',
    amenities: [
      { Icon: BedDouble, label: 'King bed + sofa bed' },
      { Icon: Waves, label: 'Private deck, ocean views' },
      { Icon: UtensilsCrossed, label: 'Self-contained kitchen' },
    ],
    guests: '2–4',
    bookingUrl: null,
    image: staticUrl('/images/farm/IMG_9130.jpg'),
    gallery: undefined as GalleryPhoto[] | undefined,
    imagePosition: 'left' as const,
  },
  {
    id: 'stone-cottage',
    group: 'on-farm' as StayGroup,
    name: 'Heritage Stone Cottage',
    type: 'On-Farm · Self-Contained Cabin',
    badge: null,
    tagline: 'Surrounded by olive trees and open skies.',
    description:
      'A self-contained heritage cabin on Omaru Farm, nestled among ancient olive groves. Stone walls carry warmth from the land while veranda views stretch across the Phillip Island farmscape.',
    amenities: [
      { Icon: BedDouble, label: 'Queen & twin rooms' },
      { Icon: Leaf, label: 'Olive grove outlook' },
      { Icon: PawPrint, label: 'Dog-friendly outdoors' },
    ],
    guests: '2–4',
    bookingUrl: null,
    image: staticUrl('/images/farm/2025-01-12-8.jpg'),
    gallery: undefined as GalleryPhoto[] | undefined,
    imagePosition: 'right' as const,
  },
]

const HOLIDAY_HOME_STAYS = [
  {
    id: 'rose-by-omaru-farm',
    group: 'holiday-home' as StayGroup,
    name: 'Rose by Omaru Farm',
    type: 'Holiday Home · Phillip Island',
    badge: null,
    tagline: 'The perfect island getaway in Cowes.',
    description:
      'A spacious four-bedroom holiday home in the heart of Cowes, Phillip Island. Relax in the outdoor hot tub after exploring the island, unwind in cosy living spaces, and enjoy a fully equipped kitchen close to local beaches, cafes, shops, and the Penguin Parade.',
    amenities: [
      { Icon: Users, label: '10 guests' },
      { Icon: BedDouble, label: '4 bedrooms, 5 beds, 2 baths' },
      { Icon: Waves, label: 'Outdoor hot tub' },
      { Icon: UtensilsCrossed, label: 'Kitchen, wifi, parking' },
    ],
    guests: '10',
    bookingUrl: 'https://www.airbnb.com.au/rooms/1377277021524589149?guests=1&adults=1&s=67&unique_share_id=9414357d-89c2-4786-b862-7b94c999640f&source_impression_id=p3_1779517969_P3IRQGtTZUwYTH6T',
    image: ROSE_GALLERY[0]!.src,
    gallery: ROSE_GALLERY,
    imagePosition: 'left' as const,
  },
  {
    id: 'jasmine-by-omaru-farm',
    group: 'holiday-home' as StayGroup,
    name: 'Jasmine by Omaru Farm',
    type: 'Holiday Home · Phillip Island',
    badge: null,
    tagline: 'A peaceful five-bedroom retreat near Cowes.',
    description:
      'A warm and welcoming five-bedroom holiday home for families or friends seeking a peaceful Phillip Island escape. Walk to Cowes town centre, cafes, and the foreshore, enjoy a game on the pool table or relaxed barbeque, and explore Red Rocks Beach, the Grand Prix Circuit, the Penguin Parade, and the Nobbies.',
    amenities: [
      { Icon: Users, label: '12 guests' },
      { Icon: BedDouble, label: '5 bedrooms, 6 beds, 2.5 baths' },
      { Icon: MapPin, label: 'Walk to Cowes and foreshore' },
      { Icon: UtensilsCrossed, label: 'Kitchen, wifi, workspace, parking' },
    ],
    guests: '12',
    bookingUrl: 'https://www.airbnb.com.au/rooms/1387952701303020884?guests=1&adults=1&s=67&unique_share_id=19c46540-f704-42d5-9848-e975de620952&source_impression_id=p3_1779517989_P34-Oun_Clb_uWZm',
    image: JASMINE_GALLERY[0]!.src,
    gallery: JASMINE_GALLERY,
    imagePosition: 'right' as const,
  },
]

const STAY_GROUPS = [
  {
    id: 'on-farm',
    title: 'On the Farm',
    lead: 'Only our self-contained cabins sit on Omaru Farm — wake to paddocks, farm sounds, and views across the land.',
    stays: ON_FARM_STAYS,
  },
  {
    id: 'holiday-homes',
    title: 'Holiday Homes on Phillip Island',
    lead: 'Rose and Jasmine by Omaru Farm are separate holiday homes in Cowes, available for accommodation with easy access to Omaru Farm, beaches, cafes, and island attractions.',
    stays: HOLIDAY_HOME_STAYS,
  },
] as const

const EXPERIENCES = [
  { Icon: Sunrise,         label: 'Taste the Life',      desc: 'Savour breakfast on your private deck as mist lifts from the paddocks at dawn.' },
  { Icon: UtensilsCrossed, label: 'Wildlife Chef',        desc: 'Dine on produce grown steps from your door — picked fresh, served with care.' },
]

export function StayPage() {
  const pad2 = (n: number) => `${n}`.padStart(2, '0')
  const toISODate = (d: Date) => {
    const y = d.getFullYear(); const m = pad2(d.getMonth() + 1); const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
  }

  const [checkIn, setCheckIn]   = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return toISODate(d) })
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 10); return toISODate(d) })
  const [cabin, setCabin]       = useState('The Glass Pavilion')
  const [guests, setGuests]     = useState('2 Guests')
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [website, setWebsite]   = useState('')
  const [businessNumber, setBusinessNumber] = useState(DEFAULT_WHATSAPP_NUMBER)
  const [formState, setFormState] = useState({ loading: false, success: false, error: '' })

  const [lightbox, setLightbox] = useState<{ images: GalleryPhoto[]; index: number; name: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/content/site-settings'), { signal: controller.signal })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return
        const value = data as Record<string, unknown>
        if (value.whatsappUrl) {
          setBusinessNumber(parseWhatsAppNumber(String(value.whatsappUrl)))
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleStayEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState({ loading: true, success: false, error: '' })

    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      setFormState({
        loading: false,
        success: false,
        error: 'Please enter your phone number so we can confirm availability on WhatsApp.',
      })
      return
    }

    if (checkOut <= checkIn) {
      setFormState({
        loading: false,
        success: false,
        error: 'Check-out must be after check-in.',
      })
      return
    }

    const guestCount = parseInt(guests, 10) || 2
    const apiMessage = [
      `Phone: ${trimmedPhone}`,
      `Accommodation: ${cabin}`,
      `Check-in: ${checkIn}`,
      `Check-out: ${checkOut}`,
      `Guests: ${guests}`,
    ].join('\n')

    const whatsappDetails = [
      `*Accommodation:* ${cabin}`,
      `*Check-in:* ${checkIn}`,
      `*Check-out:* ${checkOut}`,
      `*Guests:* ${guestCount}`,
    ].join('\n')

    try {
      const res = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          bookingDate: checkIn,
          source: 'stay',
          guestCount,
          message: apiMessage,
          website,
        }),
      })
      if (!res.ok) {
        throw new Error((await res.json().catch(() => null))?.message ?? 'Could not submit enquiry')
      }

      openWhatsAppSiteRequest({
        businessNumber,
        pageLabel: 'Stay',
        headline: 'New farm stay availability enquiry from your website.',
        name: fullName,
        phone: trimmedPhone,
        email,
        details: whatsappDetails,
      })

      setFormState({ loading: false, success: true, error: '' })
      setFullName('')
      setEmail('')
      setPhone('')
      setWebsite('')
    } catch (err) {
      setFormState({
        loading: false,
        success: false,
        error: err instanceof Error ? err.message : 'Could not submit enquiry',
      })
    }
  }

  const whatsappDisplay = formatWhatsAppDisplay(businessNumber)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.images.length } : l))
      if (e.key === 'ArrowLeft') setLightbox((l) => (l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l))
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightbox])

  return (
    <>
      <Seo
        title="Stay at Omaru Farm | On-Farm Cabins & Phillip Island Holiday Homes"
        description="Self-contained cabins on Omaru Farm, plus separate holiday homes on Phillip Island. Farm stays, dark skies, and easy access to the Penguin Parade."
        path="/stay"
        image="/images/farm/image-farm/Gemini_Generated_Image_f9njj4f9njj4f9nj.jpg"
      />

      <main>

        {/* ══════════════════════════════════════════
            HERO — sunset patio retreat, bottom-left text
        ══════════════════════════════════════════ */}
        <section className="relative flex min-h-[80vh] items-end overflow-hidden bg-surface">
          <img
            src={staticUrl('/images/farm/image-farm/Gemini_Generated_Image_f9njj4f9njj4f9nj.jpg')}
            alt="Terrace dining at Omaru Farm overlooking Phillip Island coastline at sunset"
            className="absolute inset-0 h-full w-full object-cover object-[center_45%]"
            loading="eager"
            fetchPriority="high"
          />
          {/* Light scrim — readable text without heavy darkening */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/48 via-charcoal/18 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/52 via-charcoal/12 to-white/8" />

          <div className="relative z-10 mx-auto w-full max-w-[92vw] px-5 pb-20 md:pb-28">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl"
            >
              <p className="mb-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-gold drop-shadow-[0_1px_10px_rgba(255,255,255,0.75)]">
                Welcome to Omaru
              </p>
              <h1 className="hero-headline font-heading text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white drop-shadow-[0_2px_24px_rgba(22,14,4,0.48)] sm:text-5xl md:text-[3.5rem] lg:text-[4rem]">
                A Sanctuary<br />
                of <span className="italic text-gold">Silence</span>
              </h1>
              <p className="mt-5 font-body text-base leading-[1.78] text-white/92 drop-shadow-[0_2px_16px_rgba(22,14,4,0.42)] md:text-lg">
                Only our self-contained cabins are on Omaru Farm. Holiday homes are separate properties on Phillip Island — each a comfortable base minutes from the farm and the Penguin Parade.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#stays"
                  className="inline-flex h-11 items-center rounded-sm px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-105"
                  style={{ background: GOLD_GRADIENT }}
                >
                  Explore Retreats
                </a>
                <a
                  href="#book"
                  className="inline-flex h-11 items-center rounded-sm border border-white/25 bg-transparent px-8 font-body text-sm font-semibold uppercase tracking-[0.12em] text-white/85 transition hover:border-white/45 hover:bg-white/8"
                >
                  Check Availability
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            THE STAYS — white, alternating editorial rows
        ══════════════════════════════════════════ */}
        <section id="stays" className="bg-white py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            {/* Section heading */}
            <motion.div
              className="mb-14"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                The Stays
              </h2>
              <p className="mt-4 max-w-xl font-body text-base leading-[1.75] text-stone">
                Stay in a self-contained cabin on the farm, or choose a holiday home elsewhere on Phillip Island — both keep you close to Omaru, the café, and island adventures.
              </p>
            </motion.div>

            <motion.div className="space-y-24 md:space-y-32">
              {STAY_GROUPS.map((group, groupIdx) => (
                <motion.div key={group.id}>
                  <div className={`mb-12 ${groupIdx > 0 ? 'border-t border-charcoal/8 pt-12' : ''}`}>
                    <h3 className="font-heading text-2xl font-semibold tracking-[-0.02em] text-charcoal md:text-3xl">
                      {group.title}
                    </h3>
                    <p className="mt-3 max-w-2xl font-body text-sm leading-[1.75] text-stone">
                      {group.lead}
                    </p>
                  </div>

                  <div className="space-y-20 md:space-y-28">
              {group.stays.map((stay, idx) => {
                const isLeft = stay.imagePosition === 'left'
                return (
                  <motion.div
                    key={stay.id}
                    className={`grid items-center gap-10 md:grid-cols-[5fr_6fr] md:gap-14 lg:gap-20 ${isLeft ? '' : 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1'}`}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    custom={idx * 0.05}
                    variants={fadeUp}
                  >
                    {/* Image + optional gallery */}
                    <div>
                      <div className="group relative overflow-hidden rounded-sm">
                        {stay.badge && (
                          <span
                            className="absolute left-4 top-4 z-10 rounded-sm px-3 py-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white"
                            style={{ background: GOLD_GRADIENT }}
                          >
                            {stay.badge}
                          </span>
                        )}
                        {stay.gallery && stay.gallery.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setLightbox({ images: stay.gallery!, index: 0, name: stay.name })}
                            className="block h-72 w-full overflow-hidden md:h-[380px]"
                            aria-label={`Open ${stay.name} photo gallery`}
                          >
                            <img
                              src={stay.image}
                              alt={`${stay.name} — ${stay.gallery[0]!.label}`}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                            <span className="pointer-events-none absolute bottom-3 left-3 rounded-sm bg-black/55 px-2.5 py-1 font-body text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                              {stay.gallery[0]!.label}
                            </span>
                            <span className="pointer-events-none absolute bottom-3 right-3 rounded-sm bg-black/55 px-2.5 py-1 font-body text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                              {stay.gallery.length} photos
                            </span>
                          </button>
                        ) : (
                          <img
                            src={stay.image}
                            alt={stay.name}
                            className="h-72 w-full object-cover transition duration-700 group-hover:scale-[1.03] md:h-[380px]"
                            loading="lazy"
                          />
                        )}
                      </div>
                      {stay.gallery && stay.gallery.length > 1 && (
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                          {stay.gallery.slice(1, 6).map((photo, gIdx) => (
                            <button
                              type="button"
                              key={photo.src}
                              onClick={() => setLightbox({ images: stay.gallery!, index: gIdx + 1, name: stay.name })}
                              className="group relative overflow-hidden rounded-sm"
                              aria-label={`Open ${photo.label} photo of ${stay.name}`}
                            >
                              <img
                                src={photo.src}
                                alt={`${stay.name} — ${photo.label}`}
                                className="h-20 w-full object-cover transition duration-500 group-hover:scale-[1.05] md:h-20"
                                loading="lazy"
                              />
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-3 text-center font-body text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-white">
                                {photo.label}
                              </span>
                              {gIdx === 4 && stay.gallery!.length > 6 && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-body text-xs font-semibold text-white">
                                  +{stay.gallery!.length - 6}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div>
                      <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
                        {stay.type}
                      </p>
                      <h3 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.02em] text-charcoal md:text-4xl">
                        {stay.name}
                      </h3>
                      <p className="mt-1.5 font-body text-sm italic text-stone">{stay.tagline}</p>
                      <p className="mt-5 font-body text-base leading-[1.78] text-stone">{stay.description}</p>

                      {/* Amenity icons */}
                      <div className="mt-6 flex flex-wrap gap-5">
                        {stay.amenities.map(({ Icon, label }) => (
                          <span key={label} className="inline-flex items-center gap-2 font-body text-sm text-bark">
                            <Icon className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
                            {label}
                          </span>
                        ))}
                      </div>

                      {/* Enquire link */}
                      <a
                        href={stay.bookingUrl ?? '#book'}
                        target={stay.bookingUrl ? '_blank' : undefined}
                        rel={stay.bookingUrl ? 'noreferrer' : undefined}
                        className="mt-7 inline-flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                      >
                        {stay.bookingUrl ? 'View on Airbnb' : 'Enquire to Book Details'} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                  </motion.div>
                )
              })}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            THE EXPERIENCE — light editorial grid
        ══════════════════════════════════════════ */}
        <section className="bg-surface py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            {/* Heading */}
            <motion.div
              className="mb-14 text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={0}
              variants={fadeUp}
            >
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold/70">
                More Than a Place to Sleep
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                The Experience
              </h2>
              <p className="mx-auto mt-4 max-w-lg font-body text-base leading-[1.75] text-stone">
                Slow mornings, farm encounters, and paddock views that reset the soul.
              </p>
            </motion.div>

            {/* Asymmetric experience grid */}
            <div className="grid gap-4 md:grid-cols-[3fr_2fr]">

              {/* Left: large dark image card — Cosmic Silence */}
              <motion.div
                className="group relative min-h-[440px] overflow-hidden rounded-sm"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                custom={0.06}
                variants={fadeUp}
              >
                <img
                  src={staticUrl('/images/farm/AEA8C771269A966E816D1F714AD4BE2D.JPG')}
                  alt="Night sky at Omaru Farm — stargazing and Aurora Australis, Phillip Island"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-estate/90 via-estate/50 to-estate/20" />
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                  <span className="inline-flex items-center gap-2 font-body text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-gold">
                    <Sunrise className="h-3.5 w-3.5" aria-hidden />
                    Far from the City
                  </span>
                  <h3 className="mt-2 font-heading text-3xl font-semibold text-white">
                    Cosmic Silence
                  </h3>
                  <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-white/65">
                    Experience absolute darkness and absolute quiet. Away from city light pollution, the night sky at Omaru is extraordinary — and on clear southern nights, guests may be fortunate enough to witness the Aurora Australis from the farm.
                  </p>
                </div>
              </motion.div>

              {/* Right column */}
              <motion.div
                className="flex flex-col gap-4"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                custom={0.16}
                variants={fadeUp}
              >
                {/* Heritage estate card */}
                <div
                  className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-sm border border-parchment/70 bg-white p-7 shadow-[0_8px_30px_rgba(26,18,8,0.04)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(197,160,89,0.12) 0%, transparent 55%)' }}
                  />
                  <div className="relative">
                    <p className="font-body text-[0.6rem] font-semibold uppercase tracking-[0.36em] text-gold-deep">
                      Farm Heritage
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-semibold tracking-[0.06em] text-charcoal">
                      Omaru Farm
                    </h3>
                    <p className="mt-0.5 font-body text-[0.6rem] uppercase tracking-[0.24em] text-stone">Est. 1970 · Phillip Island</p>
                  </div>
                  <div className="relative mt-4">
                    <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.25), transparent)' }} />
                    <p className="mt-4 font-heading text-lg italic font-normal text-bark">
                      "Where the land speaks and silence is the luxury."
                    </p>
                  </div>
                </div>

                {/* Two small experience icon cards */}
                <div className="grid grid-cols-2 gap-4">
                  {EXPERIENCES.map(({ Icon, label, desc }) => (
                    <div key={label} className="rounded-sm border border-parchment/70 bg-white p-6 shadow-[0_8px_30px_rgba(26,18,8,0.04)]">
                      <div
                        className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm"
                        style={{ background: GOLD_GRADIENT }}
                      >
                        <Icon className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
                      </div>
                      <p className="font-heading text-base font-semibold text-charcoal">{label}</p>
                      <p className="mt-1.5 font-body text-xs leading-relaxed text-stone">{desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Feature strip */}
            <motion.div
              className="mt-14 flex flex-wrap items-center justify-center gap-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={0.3}
              variants={fadeUp}
            >
              {[
                { Icon: Bird,   text: '5 min to Penguin Parade' },
                { Icon: Waves,  text: 'Ocean views from the paddock' },
                { Icon: PawPrint, text: 'Farm animals on-site' },
                { Icon: MapPin,  text: '776 Ventnor Road, Ventnor, Phillip Island VIC 3922' },
              ].map(({ Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-2 font-body text-xs text-stone">
                  <Icon className="h-3.5 w-3.5 text-gold/55" aria-hidden />
                  {text}
                </span>
              ))}
            </motion.div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            BOOK YOUR RETREAT — surface-low, clean form
        ══════════════════════════════════════════ */}
        <section id="book" className="bg-surface-low py-24 md:py-32">
          <div className="mx-auto max-w-[92vw] px-5">

            <motion.div
              className="mx-auto max-w-2xl"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
            >
              {/* Heading */}
              <div className="mb-12 text-center">
                <h2 className="font-heading text-4xl font-semibold leading-[1.07] tracking-[-0.025em] text-charcoal md:text-5xl">
                  Book Your Retreat
                </h2>
                <p className="mx-auto mt-4 max-w-sm font-body text-base leading-[1.75] text-stone">
                  Complete the form below to check availability. We'll get back to you promptly to confirm your arrival.
                </p>
              </div>

              {formState.success ? (
                <div className="rounded-sm bg-white py-14 text-center shadow-[0_8px_40px_rgba(26,18,8,0.06)]">
                  <div
                    className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <CalendarDays className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <p className="font-heading text-2xl font-semibold text-charcoal">Enquiry Received!</p>
                  <p className="mx-auto mt-2 max-w-xs font-body text-sm text-stone">
                    Your request is saved. WhatsApp is opening — tap Send and we&apos;ll confirm availability with you.
                  </p>
                  <p className="mx-auto mt-3 max-w-xs font-body text-xs text-stone">
                    Didn&apos;t open? Message us at{' '}
                    <span className="font-semibold text-[#128C7E]">{whatsappDisplay}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormState({ loading: false, success: false, error: '' })}
                    className="mt-6 font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition hover:text-gold"
                  >
                    Make Another Enquiry
                  </button>
                </div>
              ) : (
                <form
                  className="space-y-6 rounded-sm bg-white p-8 shadow-[0_8px_40px_rgba(26,18,8,0.06)] md:p-10"
                  onSubmit={handleStayEnquiry}
                >
                  <input
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    aria-hidden="true"
                  />
                  {/* Row 1: Check-in + Check-out */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Check-in
                      </span>
                      <div className="relative mt-2">
                        <input
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          required
                          className="field w-full pr-8"
                          aria-label="Check-in date"
                        />
                        <CalendarDays className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                      </div>
                    </label>
                    <label className="block">
                      <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Check-out
                      </span>
                      <div className="relative mt-2">
                        <input
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          required
                          className="field w-full pr-8"
                          aria-label="Check-out date"
                        />
                        <CalendarDays className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                      </div>
                    </label>
                  </div>

                  {/* Row 2: Accommodation */}
                  <label className="block">
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Accommodation
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={cabin}
                        onChange={(e) => setCabin(e.target.value)}
                        className="field w-full appearance-none pr-8"
                        aria-label="Select accommodation"
                      >
                        <optgroup label="On-Farm · Self-Contained Cabins">
                          <option>The Glass Pavilion</option>
                          <option>Heritage Stone Cottage</option>
                        </optgroup>
                        <optgroup label="Holiday Homes · Phillip Island">
                          <option>Rose by Omaru Farm</option>
                          <option>Jasmine by Omaru Farm</option>
                        </optgroup>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                    </div>
                  </label>

                  {/* Row 3: Guests */}
                  <label className="block">
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Guests
                    </span>
                    <div className="relative mt-2">
                      <select
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="field w-full appearance-none pr-8"
                        aria-label="Number of guests"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={`${n} ${n === 1 ? 'Guest' : 'Guests'}`}>
                            {n} {n === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                      <Users className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/55" aria-hidden />
                    </div>
                  </label>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Full name
                      </span>
                      <input
                        className="field mt-2 w-full"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </label>
                    <label className="block">
                      <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                        Email
                      </span>
                      <input
                        className="field mt-2 w-full"
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone">
                      Phone number
                    </span>
                    <input
                      className="field mt-2 w-full"
                      placeholder="+61 400 000 000"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      autoComplete="tel"
                    />
                  </label>

                  {/* Submit */}
                  <div className="pt-2 text-center">
                    <button
                      type="submit"
                      disabled={formState.loading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-sm font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-105 disabled:opacity-60"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      {formState.loading ? 'Submitting…' : 'Check Availability & open WhatsApp'}
                    </button>
                    {formState.error ? (
                      <p className="mt-3 font-body text-sm text-red-600">{formState.error}</p>
                    ) : null}
                    <p className="mt-4 font-body text-xs text-stone/55">
                      776 Ventnor Road, Ventnor, Phillip Island VIC 3922 · Or message us at{' '}
                      <span className="font-semibold text-[#128C7E]">{whatsappDisplay}</span>
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </section>

        <StayBookingPanel />

      </main>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close gallery"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox((l) => (l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l))
              }}
              className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:left-6"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.images.length } : l))
              }}
              className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-6"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <motion.div
              key={lightbox.index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto flex max-h-[90vh] max-w-[92vw] flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.images[lightbox.index]!.src}
                alt={`${lightbox.name} — ${lightbox.images[lightbox.index]!.label}`}
                className="max-h-[80vh] w-auto rounded-sm object-contain shadow-[0_30px_120px_rgba(0,0,0,0.5)]"
              />
              <p className="mt-4 font-heading text-base font-semibold text-white">
                {lightbox.images[lightbox.index]!.label}
              </p>
              <p className="mt-1 font-body text-[0.65rem] uppercase tracking-[0.22em] text-white/55">
                {lightbox.name} · {lightbox.index + 1} / {lightbox.images.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
