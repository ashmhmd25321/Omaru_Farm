import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Seo } from '@/components/site/Seo'
import { AdminCommercePanels } from '@/components/admin/AdminCommercePanels'
import { AdminStayContentPanel } from '@/components/admin/AdminStayContentPanel'
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ChevronDown,
  DollarSign,
  ExternalLink,
  Eye,
  Filter,
  FolderTree,
  Image,
  ImagePlus,
  Info,
  Loader2,
  LogOut,
  Menu,
  NotebookPen,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Table2,
  Tag,
  Trash2,
  Truck,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { apiUrl } from '@/utils/api'
import { staticUrl } from '@/utils/staticUrl'
import { productImageUrl } from '@/utils/productImage'

type Product = {
  id: number
  name: string
  size: string
  price: number
  image: string
  images?: string[]
  description?: string
  category: string
  featured?: boolean
  stockQty?: number
  weightGrams?: number
  volumeCm3?: number
  shippable?: boolean
}

type ProductCategory = {
  id: number
  name: string
  sortOrder: number
}

type Testimonial = {
  id: number
  guestName: string
  location: string
  rating: number
  comment: string
  visitDate: string
  isPublished: boolean
}

type MenuItem = {
  id: number
  section: string
  itemName: string
  description: string
  price: number
  image: string
  sortOrder: number
  isPublished: boolean
}

type AboutContent = {
  legacyTitle: string
  legacyDescription: string
  foundationTitle: string
  foundationDescription: string
}

type ContactContent = {
  farmName: string
  addressLine1: string
  addressLine2: string
  email: string
  phone: string
  whatsapp: string
  whatsappSecondary: string
  instagram: string
  mapQuery: string
  hoursCafe: string
  hoursStore: string
  hoursTours: string
}

type SiteSettings = {
  brandName: string
  missionText: string
  footerTagline: string
  supportEmail: string
  whatsappUrl: string
  whatsappSecondaryUrl: string
  instagramUrl: string
}

type MediaItem = {
  name: string
  size: number
  updatedAt: string
  url: string
}

type Booking = {
  id: number
  fullName: string
  email: string
  bookingDate: string
  message: string
  source: string
  guestCount: number | null
  timeFrom: string | null
  timeUntil: string | null
  status: 'new' | 'confirmed' | 'closed'
  adminNote: string | null
  createdAt?: string
  updatedAt?: string
}

type TabKey = 'products' | 'orders' | 'shipping' | 'stays' | 'stay-page' | 'tables' | 'sales' | 'testimonials' | 'about' | 'menu' | 'bookings' | 'contact' | 'media' | 'settings'

const MENU_SECTIONS = ['Lunch', 'Dinner', 'Beverages'] as const

type NavItem = { id: TabKey; label: string; icon: LucideIcon }
type NavGroup = { title: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Store & Commerce',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'shipping', label: 'Shipping', icon: Truck },
      { id: 'sales', label: 'Sales', icon: BarChart3 },
    ],
  },
  {
    title: 'Bookings & Stays',
    items: [
      { id: 'stays', label: 'Stays', icon: BedDouble },
      { id: 'tables', label: 'Table holds', icon: Table2 },
      { id: 'bookings', label: 'Bookings', icon: CalendarDays },
    ],
  },
  {
    title: 'Site Content',
    items: [
      { id: 'testimonials', label: 'Testimonials', icon: Star },
      { id: 'about', label: 'About Content', icon: Info },
      { id: 'stay-page', label: 'Stay page', icon: NotebookPen },
      { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
      { id: 'contact', label: 'Contact Details', icon: Phone },
      { id: 'media', label: 'Media Library', icon: Image },
      { id: 'settings', label: 'Site Settings', icon: Settings },
    ],
  },
]

const NAV_ITEM_BY_ID: Record<TabKey, NavItem> = NAV_GROUPS.flatMap((g) => g.items).reduce(
  (acc, item) => ({ ...acc, [item.id]: item }),
  {} as Record<TabKey, NavItem>,
)

const ADMIN_TOKEN_KEY = 'omaru_admin_token'

function readStoredAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeStoredAdminToken(token: string) {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    // ignore storage failures (private mode)
  }
}

function adminAuthHeaders(token: string, initHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    ...(initHeaders instanceof Headers
      ? Object.fromEntries(initHeaders.entries())
      : Array.isArray(initHeaders)
        ? Object.fromEntries(initHeaders)
        : { ...(initHeaders ?? {}) }),
  }
  if (token && token !== 'cookie-session') {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...adminAuthHeaders(token, init.headers),
    },
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.message ?? `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function uploadProductImage(token: string, file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(apiUrl('/api/admin/media/upload'), {
    method: 'POST',
    credentials: 'include',
    headers: adminAuthHeaders(token),
    body: fd,
  })
  const payload = (await res.json().catch(() => null)) as { message?: string; name?: string } | null
  if (!res.ok) throw new Error(payload?.message ?? 'Upload failed')
  if (!payload?.name) throw new Error('Upload failed')
  return `uploads/${payload.name}`
}

function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-parchment/70 bg-white p-4 shadow-[0_4px_24px_rgba(26,18,8,0.04)]',
        className,
      )}
    >
      <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">{title}</p>
        {description ? <p className="text-[11px] text-stone">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

function AdminLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-bark">
      {children}
    </label>
  )
}

function AboutContentPreview({ content }: { content: AboutContent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/20 bg-surface shadow-[inset_0_1px_0_rgba(205,163,73,0.06)]">
      <div className="border-b border-gold/10 bg-surface-low px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold/65">Live preview</p>
        <p className="text-xs text-stone">Updates as you type — matches the legacy and “Living Earth” blocks on the public About page.</p>
      </div>
      <div className="max-h-[min(720px,72vh)] overflow-y-auto overscroll-contain">
        <section className="border-b border-gold/10">
          <div className="grid gap-6 px-4 py-8 md:grid-cols-12 md:items-center md:px-5">
            <div className="md:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-parchment/60 bg-surface shadow-[0_8px_28px_rgba(26,18,8,0.06)]">
                <div className="aspect-[4/3] bg-surface-low">
                  <img
                    src="/images/farm/IMG_6144.jpg"
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-gold/70">Omaru Farm</p>
                  <p className="mt-1 font-heading text-xl leading-tight text-charcoal">
                    {content.legacyTitle.trim() || 'Legacy title'}
                  </p>
                </div>
              </div>
            </div>
            <div className="md:col-span-7 md:pl-1">
              <h2 className="font-heading text-3xl leading-[1.05] text-charcoal md:text-4xl md:leading-[1]">
                {content.legacyTitle.trim() || 'Legacy title'}
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone md:text-base">
                {content.legacyDescription.trim() || 'Legacy description will appear here.'}
              </p>
            </div>
          </div>
        </section>
        <section className="px-4 py-8 md:px-5">
          <div className="mx-auto max-w-2xl rounded-[24px] border border-parchment/60 bg-surface-low p-6 shadow-[0_8px_28px_rgba(26,18,8,0.06)]">
            <p className="text-xs uppercase tracking-[0.24em] text-gold/70">Living Earth</p>
            <h2 className="mt-3 font-heading text-3xl leading-[0.98] text-charcoal sm:text-4xl">
              {content.foundationTitle.trim() || 'Foundation title'}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone md:text-base">
              {content.foundationDescription.trim() || 'Foundation description will appear here.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Seasonal harvests', 'Small-batch craft', 'Natural ingredients'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-gold/15 bg-surface px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-stone"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function CategorySelect({
  id,
  value,
  onChange,
  categories,
  disabled,
  className,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  categories: ProductCategory[]
  disabled?: boolean
  className?: string
}) {
  const inList = categories.some((c) => c.name === value)
  return (
    <select
      id={id}
      disabled={disabled}
      className={cn('field pl-10', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select category…</option>
      {categories.map((c) => (
        <option key={c.id} value={c.name}>
          {c.name}
        </option>
      ))}
      {value && !inList ? (
        <option value={value}>Unlisted: {value} (appears after next product save)</option>
      ) : null}
    </select>
  )
}

function FeaturedToggle({
  checked,
  onCheckedChange,
  id,
  disabled,
  labelledBy,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  id: string
  disabled?: boolean
  labelledBy?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      id={id}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-8 w-[3.35rem] shrink-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/50 disabled:cursor-not-allowed disabled:opacity-45',
        checked ? 'border-gold/45 bg-gold/20 shadow-[0_0_20px_rgba(205,163,73,0.12)]' : 'border-parchment/80 bg-surface-low',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-6 w-6 rounded-full bg-gold shadow-md transition-all duration-200 ease-out',
          checked ? 'left-[calc(100%-1.65rem)]' : 'left-1',
        )}
      />
    </button>
  )
}

function ProductImageField({
  token,
  value,
  onChange,
  disabled,
  onError,
  compact,
  className,
  fieldId,
}: {
  token: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  onError: (msg: string) => void
  compact?: boolean
  className?: string
  fieldId: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const pickFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !token) return
    setUploading(true)
    onError('')
    try {
      const path = await uploadProductImage(token, file)
      onChange(path)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    void pickFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && fileRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 text-center transition',
          compact ? 'min-h-[72px] py-2.5' : 'min-h-[100px] py-4',
          dragOver
            ? 'border-gold bg-gold/[0.12] text-gold shadow-[0_0_24px_rgba(205,163,73,0.15)]'
            : 'border-gold/30 text-stone hover:border-gold/50 hover:bg-surface hover:text-bark',
          disabled || uploading ? 'pointer-events-none opacity-50' : '',
        )}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden />
        ) : (
          <ImagePlus className="h-5 w-5 text-gold/85" aria-hidden />
        )}
        <span className="text-xs font-medium">
          {uploading ? 'Uploading…' : compact ? 'Drop or click to upload' : 'Drop an image here, or click to browse'}
        </span>
        <span className="text-[10px] leading-snug text-stone">
          {compact ? 'JPG · PNG · WebP' : 'JPEG, PNG, WebP or GIF · saved to Media Library'}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void pickFiles(e.target.files)}
      />
      <div>
        <AdminLabel htmlFor={`${fieldId}-image-path`}>Image path (optional)</AdminLabel>
        <input
          id={`${fieldId}-image-path`}
          className="field font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 20260311_130334.jpg or uploads/your-file.jpg"
          disabled={disabled}
        />
        <p className="mt-1 text-[11px] text-stone/80">Legacy files use the filename only; new uploads use the uploads/… path.</p>
      </div>
    </div>
  )
}

function ProductImagesField({
  token,
  value,
  onChange,
  disabled,
  onError,
  compact,
  className,
  fieldId,
}: {
  token: string
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  onError: (msg: string) => void
  compact?: boolean
  className?: string
  fieldId: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const normalize = (raw: string[]) =>
    raw
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 10)

  const pickFiles = async (files: FileList | null) => {
    if (!files || !token) return
    const list = Array.from(files).filter(Boolean)
    if (list.length === 0) return
    setUploading(true)
    onError('')
    try {
      const uploaded: string[] = []
      for (const file of list) {
        // eslint-disable-next-line no-await-in-loop
        uploaded.push(await uploadProductImage(token, file))
      }
      onChange(normalize([...(value ?? []), ...uploaded]))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    void pickFiles(e.dataTransfer.files)
  }

  const setPrimary = (img: string) => {
    const rest = (value ?? []).filter((x) => x !== img)
    onChange(normalize([img, ...rest]))
  }

  const removeImage = (img: string) => {
    onChange(normalize((value ?? []).filter((x) => x !== img)))
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && fileRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 text-center transition',
          compact ? 'min-h-[72px] py-2.5' : 'min-h-[110px] py-4',
          dragOver
            ? 'border-gold bg-gold/[0.12] text-gold shadow-[0_0_24px_rgba(205,163,73,0.15)]'
            : 'border-gold/30 text-stone hover:border-gold/50 hover:bg-surface hover:text-bark',
          disabled || uploading ? 'pointer-events-none opacity-50' : '',
        )}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden />
        ) : (
          <ImagePlus className="h-5 w-5 text-gold/85" aria-hidden />
        )}
        <span className="text-xs font-medium">{uploading ? 'Uploading…' : 'Drop images here, or click to browse'}</span>
        <span className="text-[10px] leading-snug text-stone">You can upload multiple files (max 10 images).</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void pickFiles(e.target.files)}
      />

      {value?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((img, idx) => (
            <div key={`${fieldId}-${img}-${idx}`} className="overflow-hidden rounded-xl border border-gold/15 bg-surface-low">
              <button
                type="button"
                onClick={() => setPrimary(img)}
                className="group relative block w-full"
                aria-label={idx === 0 ? 'Primary image' : 'Make primary image'}
                title={idx === 0 ? 'Primary image' : 'Make primary'}
              >
                <img src={productImageUrl(img)} alt="" className="aspect-square w-full object-cover" />
                <span
                  className={cn(
                    'absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                    idx === 0 ? 'bg-gold text-white' : 'bg-black/55 text-white/90 opacity-0 transition group-hover:opacity-100',
                  )}
                >
                  {idx === 0 ? 'Primary' : 'Make primary'}
                </span>
              </button>
              <div className="flex items-center justify-between gap-2 border-t border-gold/10 px-3 py-2">
                <p className="truncate font-mono text-[10px] text-stone" title={img}>
                  {img}
                </p>
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-semibold text-red-700 transition hover:border-red-500/50 hover:bg-red-950/10"
                  aria-label="Remove image"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <AdminLabel htmlFor={`${fieldId}-images-paths`}>Image paths (one per line)</AdminLabel>
        <textarea
          id={`${fieldId}-images-paths`}
          className="field min-h-[92px] font-mono text-xs"
          value={(value ?? []).join('\n')}
          onChange={(e) => onChange(normalize(e.target.value.split('\n')))}
          placeholder={'uploads/your-file.jpg\n20260311_130334.jpg'}
          disabled={disabled || uploading}
        />
        <p className="mt-1 text-[11px] text-stone/80">
          Tip: click a thumbnail to make it the primary image (used for cards). Legacy files may use the filename only.
        </p>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const [token, setToken] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState<TabKey>('products')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [newCategory, setNewCategory] = useState({ name: '', sortOrder: '100' })
  const [savingCategoryId, setSavingCategoryId] = useState<number | 'new' | null>(null)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [about, setAbout] = useState<AboutContent>({
    legacyTitle: '',
    legacyDescription: '',
    foundationTitle: '',
    foundationDescription: '',
  })
  const [contact, setContact] = useState<ContactContent>({
    farmName: '',
    addressLine1: '',
    addressLine2: '',
    email: '',
    phone: '',
    whatsapp: '',
    whatsappSecondary: '',
    instagram: '',
    mapQuery: '',
    hoursCafe: '',
    hoursStore: '',
    hoursTours: '',
  })
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    brandName: '',
    missionText: '',
    footerTagline: '',
    supportEmail: '',
    whatsappUrl: '',
    whatsappSecondaryUrl: '',
    instagramUrl: '',
  })

  const [newProduct, setNewProduct] = useState({
    name: '',
    size: '',
    price: '',
    image: '',
    images: [] as string[],
    description: '',
    category: '',
    featured: false,
    stockQty: '100',
    weightGrams: '500',
    volumeCm3: '0',
    shippable: true,
  })
  const [draftPreviewOpen, setDraftPreviewOpen] = useState(false)
  const [savingProductId, setSavingProductId] = useState<number | 'new' | null>(null)
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null)
  const [expandedMenuItemId, setExpandedMenuItemId] = useState<number | null>(null)
  const [savingMenuItemId, setSavingMenuItemId] = useState<number | null>(null)
  const [productListQuery, setProductListQuery] = useState('')
  const [productListCategory, setProductListCategory] = useState('')
  const [productListFeatured, setProductListFeatured] = useState<'all' | 'yes' | 'no'>('all')
  const [newTestimonial, setNewTestimonial] = useState({
    guestName: '',
    location: '',
    rating: '5',
    comment: '',
    visitDate: '',
  })
  const [newMenuItem, setNewMenuItem] = useState({
    section: 'Lunch',
    itemName: '',
    description: '',
    price: '',
    image: '',
    sortOrder: '0',
  })

  const stats = useMemo(
    () => [
      { label: 'Products', value: products.length },
      { label: 'Categories', value: productCategories.length },
      { label: 'Testimonials', value: testimonials.length },
      { label: 'Menu items', value: menuItems.length },
      { label: 'Bookings', value: bookings.length },
      { label: 'Media files', value: media.length },
    ],
    [bookings.length, media.length, menuItems.length, productCategories.length, products.length, testimonials.length],
  )

  const productFilterCategoryOptions = useMemo(() => {
    const fromProducts = [...new Set(products.map((p) => p.category).filter(Boolean))]
    const ordered = productCategories.map((c) => c.name).filter((n) => fromProducts.includes(n))
    const rest = fromProducts.filter((c) => !ordered.includes(c)).sort((a, b) => a.localeCompare(b))
    return [...ordered, ...rest]
  }, [productCategories, products])

  const filteredAdminProducts = useMemo(() => {
    const q = productListQuery.trim().toLowerCase()
    return products.filter((p) => {
      if (productListCategory && p.category !== productListCategory) return false
      if (productListFeatured === 'yes' && !p.featured) return false
      if (productListFeatured === 'no' && p.featured) return false
      if (q) {
        const hay = `${p.name} ${p.category} ${p.size} ${p.id}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [productListCategory, productListFeatured, productListQuery, products])

  const productListFiltersActive =
    productListQuery.trim() !== '' || productListCategory !== '' || productListFeatured !== 'all'

  useEffect(() => {
    if (expandedProductId === null) return
    if (!filteredAdminProducts.some((p) => p.id === expandedProductId)) {
      setExpandedProductId(null)
    }
  }, [expandedProductId, filteredAdminProducts])

  const loadAll = useCallback(async () => {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      const [p, cats, t, m, b, a, c, mediaRows, settingsRows] = await Promise.all([
        request<Product[]>('/api/admin/products', token),
        request<ProductCategory[]>('/api/admin/product-categories', token),
        request<Testimonial[]>('/api/admin/testimonials', token),
        request<MenuItem[]>('/api/admin/menu', token),
        request<Booking[]>('/api/admin/bookings', token),
        request<AboutContent>('/api/admin/content/about', token),
        request<ContactContent>('/api/admin/content/contact', token),
        request<MediaItem[]>('/api/admin/media', token),
        request<SiteSettings>('/api/admin/content/site-settings', token),
      ])
      setProducts(p)
      setProductCategories(cats)
      setTestimonials(t)
      setMenuItems(m)
      setBookings(b)
      setAbout(a)
      setContact(c)
      setMedia(mediaRows)
      setSiteSettings(settingsRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    const stored = readStoredAdminToken()

    async function restoreSession() {
      try {
        if (stored) {
          const res = await fetch(apiUrl('/api/admin/me'), {
            credentials: 'include',
            headers: adminAuthHeaders(stored),
          })
          if (!res.ok) throw new Error('Stored session expired')
          if (!cancelled) setToken(stored)
          return
        }

        const res = await fetch(apiUrl('/api/admin/me'), { credentials: 'include' })
        if (!res.ok) throw new Error('No active session')
        if (!cancelled) setToken('cookie-session')
      } catch {
        writeStoredAdminToken('')
        if (!cancelled) setToken('')
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function login() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw new Error('Invalid admin credentials')
      const payload = (await res.json().catch(() => null)) as { token?: string } | null
      const nextToken = String(payload?.token ?? '').trim()
      if (!nextToken) throw new Error('Login succeeded but no session token was returned')
      writeStoredAdminToken(nextToken)
      setToken(nextToken)
      setPassword('')
      setMessage('Logged in')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (!token) return
    try {
      await request('/api/admin/logout', token, { method: 'POST' })
    } catch {
      // best effort
    }
    writeStoredAdminToken('')
    setToken('')
    setMessage('Logged out')
  }

  if (checkingSession) {
    return (
      <main className="admin-shell flex min-h-screen items-center justify-center bg-surface px-5 py-12">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-6">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" aria-hidden />
            <p className="mt-3 text-sm text-stone">Checking admin session…</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!token) {
    return (
      <>
        <Seo
          title="Admin Login | Omaru Farm"
          description="Omaru Farm admin login."
          path="/admin"
          noindex
        />
        <main className="admin-shell mx-auto flex min-h-screen w-full max-w-5xl items-center bg-surface px-5 py-12">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-parchment/70">
                <img
                  src={staticUrl('/images/farm/omaru-logo.png')}
                  alt="Omaru Farm logo"
                  className="h-11 w-11"
                  loading="eager"
                />
              </div>
              <CardTitle className="text-3xl">Omaru Admin Login</CardTitle>
              <p className="text-sm text-stone">Sign in to manage the Omaru Farm website.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin username"
              />
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
              />
              <Button disabled={busy || !username || !password} onClick={login} className="w-full">
                {busy ? 'Signing in...' : 'Sign in'}
              </Button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  return (
    <>
      <Seo
        title="Admin Dashboard | Omaru Farm"
        description="Omaru Farm admin dashboard."
        path="/admin"
        noindex
      />

      <main className="admin-shell flex min-h-screen bg-surface">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 flex-none flex-col border-r border-parchment/60 bg-white md:flex">
          <div className="flex items-center gap-3 border-b border-parchment/60 px-5 py-5">
            <img
              src={staticUrl('/images/farm/omaru-logo.png')}
              alt="Omaru Farm logo"
              className="h-9 w-9"
              loading="eager"
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/70">Omaru Farm</p>
              <p className="font-heading text-lg leading-tight text-charcoal">Admin</p>
            </div>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin sections">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone/55">
                  {group.title}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = tab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                          active
                            ? 'bg-gold/15 font-semibold text-gold-deep'
                            : 'text-stone hover:bg-surface hover:text-charcoal',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-parchment/60 p-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </Button>
          </div>
        </aside>

        {/* Mobile nav drawer */}
        {mobileNavOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="fixed inset-0 z-[110] md:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" />
            <div
              className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-parchment/60 px-5 py-5">
                <div className="flex items-center gap-3">
                  <img
                    src={staticUrl('/images/farm/omaru-logo.png')}
                    alt="Omaru Farm logo"
                    className="h-9 w-9"
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/70">Omaru Farm</p>
                    <p className="font-heading text-lg leading-tight text-charcoal">Admin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md p-1.5 text-stone hover:bg-surface hover:text-charcoal"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin sections">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone/55">
                      {group.title}
                    </p>
                    <div className="mt-2 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const active = tab === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setTab(item.id)
                              setMobileNavOpen(false)
                            }}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                              active
                                ? 'bg-gold/15 font-semibold text-gold-deep'
                                : 'text-stone hover:bg-surface hover:text-charcoal',
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="border-t border-parchment/60 p-3">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
                  <LogOut className="h-4 w-4" aria-hidden />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main content column */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-parchment/60 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="rounded-md border border-parchment/70 p-2 text-stone hover:border-gold/50 hover:text-gold-deep md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </button>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold/70">
                    Website Control
                  </p>
                  <h1 className="mt-0.5 font-heading text-2xl text-charcoal sm:text-3xl">
                    {NAV_ITEM_BY_ID[tab]?.label ?? 'Admin Dashboard'}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={loadAll} disabled={busy} className="gap-2">
                  <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} aria-hidden />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button variant="outline" onClick={logout} className="gap-2 md:hidden">
                  <LogOut className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone">{s.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-gold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          {tab === 'products' && (
            <section className="mt-6 space-y-8">
              <div className="rounded-2xl border border-parchment/60 bg-[linear-gradient(125deg,rgba(205,163,73,0.08)_0%,transparent_55%,rgba(249,249,247,0.9)_100%)] px-4 py-5 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gold/70">Store catalog</p>
                    <h2 className="mt-1 font-heading text-3xl text-charcoal sm:text-4xl">Product management</h2>
                    <p className="mt-2 max-w-2xl text-sm text-stone">
                      Organise store categories, add products, upload photos, and mark home-page highlights. Preview on the store anytime.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-gold/20 bg-surface px-4 py-2 text-sm text-stone">
                    <Package className="h-4 w-4 text-gold" aria-hidden />
                    <span>
                      <span className="font-semibold text-gold">{products.length}</span> in catalog
                    </span>
                  </div>
                </div>
              </div>

              <Card className="overflow-hidden border-gold/20 shadow-[0_8px_32px_rgba(26,18,8,0.06)]">
                <CardHeader className="border-b border-gold/10 bg-surface pb-5">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gold">
                      <FolderTree className="h-6 w-6 text-gold/90" aria-hidden />
                      Store categories
                    </CardTitle>
                    <p className="mt-2 text-sm text-stone">
                      These labels power product assignment and the category chips on the public store. Renaming a category updates every product that
                      used the old name. Delete only works when no products reference the category.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <FieldGroup title="New category" description="Add before assigning products, or they will auto-appear when you save a product.">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <AdminLabel htmlFor="new-cat-name">Name</AdminLabel>
                        <input
                          id="new-cat-name"
                          className="field"
                          placeholder="e.g. Pantry, Gifts, Seasonal"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory((v) => ({ ...v, name: e.target.value }))}
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <AdminLabel htmlFor="new-cat-order">Sort</AdminLabel>
                        <input
                          id="new-cat-order"
                          className="field"
                          type="number"
                          inputMode="numeric"
                          value={newCategory.sortOrder}
                          onChange={(e) => setNewCategory((v) => ({ ...v, sortOrder: e.target.value }))}
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full shrink-0 gap-2 sm:w-auto"
                        disabled={savingCategoryId === 'new' || !newCategory.name.trim()}
                        onClick={async () => {
                          setError('')
                          setSavingCategoryId('new')
                          try {
                            await request('/api/admin/product-categories', token, {
                              method: 'POST',
                              body: JSON.stringify({
                                name: newCategory.name.trim(),
                                sortOrder: Number(newCategory.sortOrder || 0),
                              }),
                            })
                            setNewCategory({ name: '', sortOrder: '100' })
                            setMessage('Category added')
                            await loadAll()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to add category')
                          } finally {
                            setSavingCategoryId(null)
                          }
                        }}
                      >
                        {savingCategoryId === 'new' ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Plus className="h-4 w-4" aria-hidden />
                        )}
                        Add category
                      </Button>
                    </div>
                  </FieldGroup>

                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold/55">
                      All categories ({productCategories.length})
                    </p>
                    {productCategories.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-gold/20 bg-surface py-8 text-center text-sm text-stone">
                        No categories loaded. Refresh the page after the API migrates the database.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {productCategories.map((cat) => (
                          <li
                            key={cat.id}
                            className="flex flex-col gap-3 rounded-xl border border-gold/12 bg-surface p-3 sm:flex-row sm:items-center sm:gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <AdminLabel htmlFor={`cat-name-${cat.id}`}>Display name</AdminLabel>
                              <input
                                id={`cat-name-${cat.id}`}
                                className="field"
                                value={cat.name}
                                onChange={(e) =>
                                  setProductCategories((rows) =>
                                    rows.map((x) => (x.id === cat.id ? { ...x, name: e.target.value } : x)),
                                  )
                                }
                              />
                            </div>
                            <div className="w-full sm:w-24">
                              <AdminLabel htmlFor={`cat-sort-${cat.id}`}>Order</AdminLabel>
                              <input
                                id={`cat-sort-${cat.id}`}
                                className="field"
                                type="number"
                                inputMode="numeric"
                                value={String(cat.sortOrder)}
                                onChange={(e) =>
                                  setProductCategories((rows) =>
                                    rows.map((x) =>
                                      x.id === cat.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:pt-5">
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-1.5 px-3 py-1.5 text-xs"
                                disabled={savingCategoryId === cat.id || !cat.name.trim()}
                                onClick={async () => {
                                  setError('')
                                  setSavingCategoryId(cat.id)
                                  try {
                                    await request(`/api/admin/product-categories/${cat.id}`, token, {
                                      method: 'PUT',
                                      body: JSON.stringify({
                                        name: cat.name.trim(),
                                        sortOrder: cat.sortOrder,
                                      }),
                                    })
                                    setMessage('Category updated')
                                    await loadAll()
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to update category')
                                  } finally {
                                    setSavingCategoryId(null)
                                  }
                                }}
                              >
                                {savingCategoryId === cat.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : null}
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-1.5 border-red-500/35 px-3 py-1.5 text-xs text-red-600 hover:border-red-400/50 hover:bg-red-950/30 hover:text-red-200"
                                onClick={async () => {
                                  if (!window.confirm(`Delete category “${cat.name}”? Only allowed if no products use it.`)) return
                                  setError('')
                                  try {
                                    await request(`/api/admin/product-categories/${cat.id}`, token, { method: 'DELETE' })
                                    setMessage('Category deleted')
                                    await loadAll()
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to delete category')
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                Remove
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-gold/20 shadow-[0_8px_32px_rgba(26,18,8,0.06)]">
                <CardHeader className="border-b border-gold/10 bg-surface pb-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-gold">
                        <Plus className="h-6 w-6 text-gold/90" aria-hidden />
                        Add a product
                      </CardTitle>
                      <p className="mt-1 text-sm text-stone">Required: name and category. Price defaults to 0 if left blank.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div className="grid gap-5 xl:grid-cols-12">
                    <div className="space-y-5 xl:col-span-8">
                      <FieldGroup title="Basics" description="Shown on the store and home (if featured)">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <AdminLabel htmlFor="new-prod-name">Product name</AdminLabel>
                            <div className="relative">
                              <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/45" />
                              <input
                                id="new-prod-name"
                                className="field pl-10"
                                placeholder="e.g. Extra Virgin Olive Oil"
                                value={newProduct.name}
                                onChange={(e) => setNewProduct((v) => ({ ...v, name: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div>
                            <AdminLabel htmlFor="new-prod-size">Size / volume *</AdminLabel>
                            <div className="relative">
                              <Ruler className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/45" />
                              <input
                                id="new-prod-size"
                                className="field pl-10"
                                placeholder="250ml"
                                required
                                value={newProduct.size}
                                onChange={(e) => setNewProduct((v) => ({ ...v, size: e.target.value }))}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-stone">Pack label shown to shoppers (e.g. 250ml, 175g).</p>
                          </div>
                          <div>
                            <AdminLabel htmlFor="new-prod-price">Price (AUD)</AdminLabel>
                            <div className="relative">
                              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/45" />
                              <input
                                id="new-prod-price"
                                className="field pl-10"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct((v) => ({ ...v, price: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <AdminLabel htmlFor="new-prod-category">Category</AdminLabel>
                            <div className="relative">
                              <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gold/45" />
                              <CategorySelect
                                id="new-prod-category"
                                className="w-full"
                                categories={productCategories}
                                value={newProduct.category}
                                onChange={(v) => setNewProduct((x) => ({ ...x, category: v }))}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-stone">Add or reorder categories in “Store categories” above.</p>
                          </div>
                        </div>
                      </FieldGroup>

                      <FieldGroup title="Inventory & shipping" description="Used for stock control and shipping quotes">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <AdminLabel htmlFor="new-prod-stock">Stock quantity</AdminLabel>
                            <input
                              id="new-prod-stock"
                              className="field"
                              inputMode="numeric"
                              placeholder="100"
                              value={newProduct.stockQty}
                              onChange={(e) => setNewProduct((v) => ({ ...v, stockQty: e.target.value }))}
                            />
                            <p className="mt-1 text-[11px] text-stone">Set to 0 to mark out of stock.</p>
                          </div>
                          <div>
                            <AdminLabel htmlFor="new-prod-weight">Weight (grams) *</AdminLabel>
                            <input
                              id="new-prod-weight"
                              className="field"
                              inputMode="numeric"
                              placeholder="500"
                              required
                              min={1}
                              step={1}
                              value={newProduct.weightGrams}
                              onChange={(e) => setNewProduct((v) => ({ ...v, weightGrams: e.target.value }))}
                            />
                            <p className="mt-1 text-[11px] text-stone">Required. Packed weight for shipping (jar + contents).</p>
                          </div>
                          <div>
                            <AdminLabel htmlFor="new-prod-volume">Packed volume (cm³) *</AdminLabel>
                            <input
                              id="new-prod-volume"
                              className="field"
                              inputMode="numeric"
                              placeholder="3000"
                              required={newProduct.shippable}
                              min={1}
                              step={1}
                              value={newProduct.volumeCm3}
                              onChange={(e) => setNewProduct((v) => ({ ...v, volumeCm3: e.target.value }))}
                            />
                            <p className="mt-1 text-[11px] text-stone">
                              Required for shipping. Enter packed length × width × height in centimetres.
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="flex flex-col gap-3 rounded-lg border border-gold/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p id="new-prod-shippable-label" className="text-sm font-medium text-charcoal">
                                    Shippable item
                                  </p>
                                  <p className="text-xs text-stone">Turn off for digital / pickup-only products.</p>
                                </div>
                              </div>
                              <FeaturedToggle
                                id="new-prod-shippable"
                                labelledBy="new-prod-shippable-label"
                                checked={newProduct.shippable}
                                onCheckedChange={(v) => setNewProduct((x) => ({ ...x, shippable: v }))}
                              />
                            </div>
                          </div>
                        </div>
                      </FieldGroup>

                      <FieldGroup title="Visibility" description="Featured items fill the home page grid (up to six)">
                        <div className="flex flex-col gap-3 rounded-lg border border-gold/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-8 w-8 shrink-0 text-gold/80" aria-hidden />
                            <div>
                              <p id="new-featured-label" className="text-sm font-medium text-charcoal">
                                Featured on home page
                              </p>
                              <p className="text-xs text-stone">Leave off if this is a supporting catalog item only.</p>
                            </div>
                          </div>
                          <FeaturedToggle
                            id="new-product-featured"
                            labelledBy="new-featured-label"
                            checked={newProduct.featured}
                            onCheckedChange={(v) => setNewProduct((x) => ({ ...x, featured: v }))}
                          />
                        </div>
                      </FieldGroup>

                      <FieldGroup title="Description" description="Shown in the customer product view">
                        <div>
                          <AdminLabel htmlFor="new-prod-description">Product description</AdminLabel>
                          <textarea
                            id="new-prod-description"
                            className="field min-h-[120px]"
                            placeholder="Describe the product, ingredients, flavour notes, or serving suggestions…"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct((v) => ({ ...v, description: e.target.value }))}
                          />
                        </div>
                      </FieldGroup>

                      <FieldGroup title="Images" description="Upload multiple photos and choose the primary">
                        <ProductImagesField
                          fieldId="new-product"
                          token={token}
                          value={newProduct.images}
                          onChange={(images) =>
                            setNewProduct((v) => ({ ...v, images, image: images[0] ?? '' }))
                          }
                          onError={setError}
                        />
                      </FieldGroup>
                    </div>

                    <div className="space-y-3 xl:col-span-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold/55">Live preview</p>
                      <div className="sticky top-6 overflow-hidden rounded-2xl border border-gold/25 bg-surface-low shadow-[0_8px_28px_rgba(26,18,8,0.06)]">
                        <div className="aspect-square w-full overflow-hidden bg-surface-low">
                          <img
                            src={productImageUrl(newProduct.image)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="space-y-1 border-t border-gold/15 p-4">
                          <p className="font-heading text-lg leading-tight text-charcoal line-clamp-2">
                            {newProduct.name || 'Product name'}
                          </p>
                          <p className="text-xs text-stone">{newProduct.category || 'Category'} · {newProduct.size || 'Size'}</p>
                          <p className="pt-1 text-xl font-semibold text-gold">${Number(newProduct.price || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-gold/10 p-3">
                          <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={() => setDraftPreviewOpen(true)}>
                            <Eye className="h-4 w-4" aria-hidden />
                            Full draft preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-gold/10 pt-5">
                    <Button
                      className="gap-2 px-6"
                      disabled={
                        savingProductId === 'new' ||
                        !newProduct.name.trim() ||
                        !newProduct.category.trim() ||
                        !newProduct.size.trim() ||
                        (newProduct.shippable &&
                          (!(Number(newProduct.weightGrams) > 0) || !(Number(newProduct.volumeCm3) > 0)))
                      }
                      onClick={async () => {
                        setError('')
                        const size = newProduct.size.trim()
                        const weightGrams = Math.floor(Number(newProduct.weightGrams))
                        const volumeCm3 = Math.floor(Number(newProduct.volumeCm3))
                        if (!size) {
                          setError('Size is required (e.g. 250ml or 175g)')
                          return
                        }
                        if (newProduct.shippable && (!Number.isFinite(weightGrams) || weightGrams <= 0)) {
                          setError('Weight (grams) must be a whole number greater than 0')
                          return
                        }
                        if (newProduct.shippable && (!Number.isFinite(volumeCm3) || volumeCm3 <= 0)) {
                          setError('Packed volume (cm³) must be a whole number greater than 0')
                          return
                        }
                        setSavingProductId('new')
                        try {
                          await request('/api/admin/products', token, {
                            method: 'POST',
                            body: JSON.stringify({
                              name: newProduct.name,
                              size,
                              price: Number(newProduct.price || 0),
                              image: newProduct.image,
                              images: newProduct.images,
                              description: newProduct.description,
                              category: newProduct.category,
                              featured: newProduct.featured,
                              stockQty: Number(newProduct.stockQty || 0),
                              weightGrams,
                              volumeCm3,
                              shippable: newProduct.shippable,
                            }),
                          })
                          setNewProduct({
                            name: '',
                            size: '',
                            price: '',
                            image: '',
                            images: [],
                            description: '',
                            category: '',
                            featured: false,
                            stockQty: '100',
                            weightGrams: '500',
                            volumeCm3: '0',
                            shippable: true,
                          })
                          setMessage('Product added')
                          await loadAll()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to add product')
                        } finally {
                          setSavingProductId(null)
                        }
                      }}
                    >
                      {savingProductId === 'new' ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Plus className="h-4 w-4" aria-hidden />
                      )}
                      Add to catalog
                    </Button>
                    <p className="text-xs text-stone">Tip: save first, then use “Preview on store” from the list.</p>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-heading text-2xl text-gold">Your products</h3>
                    <p className="text-sm text-stone">
                      List view — click a row to open details, image, and actions.
                      {products.length > 0 ? (
                        <>
                          {' '}
                          <span className="text-stone/80">
                            {productListFiltersActive
                              ? `Showing ${filteredAdminProducts.length} of ${products.length}.`
                              : `${products.length} total.`}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                {products.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gold/25 bg-surface py-16 text-center">
                    <Package className="mx-auto h-12 w-12 text-gold/30" aria-hidden />
                    <p className="mt-4 font-heading text-xl text-stone">No products yet</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-stone">Use the form above to add your first item. It will appear on the public store immediately.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 rounded-xl border border-gold/15 bg-surface-low p-4 shadow-[inset_0_1px_0_rgba(205,163,73,0.05)]">
                      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold/65">
                        <Filter className="h-4 w-4 text-gold/80" aria-hidden />
                        Filter products
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                        <div className="sm:col-span-2 lg:col-span-5">
                          <AdminLabel htmlFor="admin-prod-filter-search">Search</AdminLabel>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/45" aria-hidden />
                            <input
                              id="admin-prod-filter-search"
                              className="field pl-10"
                              placeholder="Name, category, size, or ID…"
                              value={productListQuery}
                              onChange={(e) => setProductListQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="lg:col-span-3">
                          <AdminLabel htmlFor="admin-prod-filter-category">Category</AdminLabel>
                          <select
                            id="admin-prod-filter-category"
                            className="field"
                            value={productListCategory}
                            onChange={(e) => setProductListCategory(e.target.value)}
                          >
                            <option value="">All categories</option>
                            {productFilterCategoryOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="lg:col-span-4">
                          <AdminLabel htmlFor="admin-prod-filter-featured">Home featured</AdminLabel>
                          <select
                            id="admin-prod-filter-featured"
                            className="field"
                            value={productListFeatured}
                            onChange={(e) => setProductListFeatured(e.target.value as 'all' | 'yes' | 'no')}
                          >
                            <option value="all">All products</option>
                            <option value="yes">Featured on home only</option>
                            <option value="no">Not featured on home</option>
                          </select>
                        </div>
                      </div>
                      {productListFiltersActive ? (
                        <button
                          type="button"
                          className="mt-3 text-xs font-medium text-gold/80 underline-offset-2 transition hover:text-gold hover:underline"
                          onClick={() => {
                            setProductListQuery('')
                            setProductListCategory('')
                            setProductListFeatured('all')
                          }}
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>

                    {filteredAdminProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gold/25 bg-surface py-14 text-center">
                        <Filter className="mx-auto h-10 w-10 text-gold/25" aria-hidden />
                        <p className="mt-3 font-heading text-lg text-stone">No products match these filters</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-stone">Try a different search or clear filters to show the full catalog again.</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-5"
                          onClick={() => {
                            setProductListQuery('')
                            setProductListCategory('')
                            setProductListFeatured('all')
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                  <div className="overflow-hidden rounded-2xl border border-gold/18 bg-surface shadow-[0_8px_28px_rgba(26,18,8,0.05)]">
                    <ul className="divide-y divide-gold/10" role="list">
                      {filteredAdminProducts.map((p) => {
                        const isOpen = expandedProductId === p.id
                        return (
                          <li key={p.id} className="bg-[linear-gradient(165deg,rgba(249,249,247,0.8)_0%,transparent_50%)]">
                            <button
                              type="button"
                              className={cn(
                                'flex w-full items-center gap-3 px-3 py-3 text-left transition sm:gap-4 sm:px-4 sm:py-3.5',
                                isOpen ? 'bg-gold/[0.07]' : 'hover:bg-surface',
                              )}
                              aria-expanded={isOpen}
                              aria-controls={`product-panel-${p.id}`}
                              id={`product-row-${p.id}`}
                              onClick={() => setExpandedProductId((id) => (id === p.id ? null : p.id))}
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold/20 bg-surface-low sm:h-16 sm:w-16">
                                <img src={productImageUrl(p.image)} alt="" className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded border border-gold/20 bg-gold/10 px-1.5 py-0.5 font-mono text-[10px] text-gold/90 sm:text-[11px]">
                                    #{p.id}
                                  </span>
                                  {p.featured ? (
                                    <span className="inline-flex items-center gap-0.5 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold sm:text-[11px]">
                                      <Sparkles className="h-3 w-3" aria-hidden />
                                      Featured
                                    </span>
                                  ) : null}
                                  {p.stockQty !== undefined && p.stockQty <= 0 ? (
                                    <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-700 sm:text-[11px]">
                                      Out of stock
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 truncate font-heading text-base text-charcoal sm:text-lg">{p.name || 'Untitled product'}</p>
                                <p className="truncate text-xs text-stone sm:text-sm">
                                  <span className="text-stone">{p.category || 'No category'}</span>
                                  <span className="text-stone/70"> · </span>
                                  {p.size || '—'}
                                  <span className="text-stone/70"> · </span>
                                  <span className="font-medium text-gold">${Number(p.price).toFixed(2)}</span>
                                </p>
                              </div>
                              <ChevronDown
                                className={cn('h-5 w-5 shrink-0 text-gold/60 transition-transform duration-200', isOpen && 'rotate-180')}
                                aria-hidden
                              />
                            </button>

                            {isOpen ? (
                              <div
                                id={`product-panel-${p.id}`}
                                role="region"
                                aria-labelledby={`product-row-${p.id}`}
                                className="border-t border-gold/10 bg-surface-low px-3 pb-5 pt-4 sm:px-5"
                              >
                                <div className="grid gap-5 lg:grid-cols-12">
                                  <div className="space-y-4 lg:col-span-5">
                                    <FieldGroup title="Details" className="!p-3 sm:!p-4">
                                      <div className="space-y-3">
                                        <div>
                                          <AdminLabel htmlFor={`prod-${p.id}-name`}>Name</AdminLabel>
                                          <input
                                            id={`prod-${p.id}-name`}
                                            className="field"
                                            value={p.name}
                                            onChange={(e) =>
                                              setProducts((rows) => rows.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))
                                            }
                                          />
                                        </div>
                                        <div>
                                          <AdminLabel htmlFor={`prod-${p.id}-desc`}>Description</AdminLabel>
                                          <textarea
                                            id={`prod-${p.id}-desc`}
                                            className="field min-h-[120px]"
                                            placeholder="Shown to customers on the store product view…"
                                            value={p.description ?? ''}
                                            onChange={(e) =>
                                              setProducts((rows) =>
                                                rows.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x)),
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <AdminLabel htmlFor={`prod-${p.id}-size`}>Size *</AdminLabel>
                                            <input
                                              id={`prod-${p.id}-size`}
                                              className="field"
                                              required
                                              value={p.size}
                                              onChange={(e) =>
                                                setProducts((rows) => rows.map((x) => (x.id === p.id ? { ...x, size: e.target.value } : x)))
                                              }
                                            />
                                          </div>
                                          <div>
                                            <AdminLabel htmlFor={`prod-${p.id}-price`}>Price</AdminLabel>
                                            <input
                                              id={`prod-${p.id}-price`}
                                              className="field"
                                              inputMode="decimal"
                                              value={String(p.price)}
                                              onChange={(e) =>
                                                setProducts((rows) =>
                                                  rows.map((x) => (x.id === p.id ? { ...x, price: Number(e.target.value || 0) } : x)),
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <AdminLabel htmlFor={`prod-${p.id}-cat`}>Category</AdminLabel>
                                          <div className="relative">
                                            <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gold/45" />
                                            <CategorySelect
                                              id={`prod-${p.id}-cat`}
                                              className="w-full"
                                              categories={productCategories}
                                              value={p.category}
                                              onChange={(v) =>
                                                setProducts((rows) => rows.map((x) => (x.id === p.id ? { ...x, category: v } : x)))
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <AdminLabel htmlFor={`prod-${p.id}-stock`}>Stock quantity</AdminLabel>
                                            <input
                                              id={`prod-${p.id}-stock`}
                                              className="field"
                                              inputMode="numeric"
                                              value={String(p.stockQty ?? 0)}
                                              onChange={(e) =>
                                                setProducts((rows) =>
                                                  rows.map((x) =>
                                                    x.id === p.id ? { ...x, stockQty: Number(e.target.value || 0) } : x,
                                                  ),
                                                )
                                              }
                                            />
                                          </div>
                                          <div>
                                            <AdminLabel htmlFor={`prod-${p.id}-weight`}>Weight (grams) *</AdminLabel>
                                            <input
                                              id={`prod-${p.id}-weight`}
                                              className="field"
                                              inputMode="numeric"
                                              required
                                              min={1}
                                              step={1}
                                              value={String(p.weightGrams ?? 0)}
                                              onChange={(e) =>
                                                setProducts((rows) =>
                                                  rows.map((x) =>
                                                    x.id === p.id ? { ...x, weightGrams: Number(e.target.value || 0) } : x,
                                                  ),
                                                )
                                              }
                                            />
                                            <p className="mt-1 text-[11px] text-stone">Required for shipping quotes.</p>
                                          </div>
                                          <div>
                                            <AdminLabel htmlFor={`prod-${p.id}-volume`}>Packed volume (cm³) *</AdminLabel>
                                            <input
                                              id={`prod-${p.id}-volume`}
                                              className="field"
                                              inputMode="numeric"
                                              required={p.shippable !== false}
                                              min={1}
                                              step={1}
                                              value={String(p.volumeCm3 ?? 0)}
                                              onChange={(e) =>
                                                setProducts((rows) =>
                                                  rows.map((x) =>
                                                    x.id === p.id ? { ...x, volumeCm3: Number(e.target.value || 0) } : x,
                                                  ),
                                                )
                                              }
                                            />
                                            <p className="mt-1 text-[11px] text-stone">Required: packed length × width × height in cm.</p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-3 rounded-lg border border-gold/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                                          <div>
                                            <p id={`prod-${p.id}-shippable-label`} className="text-sm text-charcoal">
                                              Shippable item
                                            </p>
                                            <p className="text-xs text-stone">Turn off for digital / pickup-only products.</p>
                                          </div>
                                          <FeaturedToggle
                                            id={`prod-${p.id}-shippable`}
                                            labelledBy={`prod-${p.id}-shippable-label`}
                                            checked={p.shippable !== false}
                                            onCheckedChange={(v) =>
                                              setProducts((rows) => rows.map((x) => (x.id === p.id ? { ...x, shippable: v } : x)))
                                            }
                                          />
                                        </div>
                                      </div>
                                    </FieldGroup>

                                    <FieldGroup title="Home page" className="!p-3 sm:!p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p id={`prod-${p.id}-feat-label`} className="text-sm text-charcoal">
                                            Feature on home
                                          </p>
                                          <p className="text-xs text-stone">Shown in the home “store” section (max 6).</p>
                                        </div>
                                        <FeaturedToggle
                                          id={`prod-${p.id}-featured`}
                                          labelledBy={`prod-${p.id}-feat-label`}
                                          checked={!!p.featured}
                                          onCheckedChange={(v) =>
                                            setProducts((rows) => rows.map((x) => (x.id === p.id ? { ...x, featured: v } : x)))
                                          }
                                        />
                                      </div>
                                    </FieldGroup>
                                  </div>

                                  <div className="lg:col-span-7">
                                    <FieldGroup title="Photo" description="Replace image anytime" className="h-full !p-3 sm:!p-4">
                                      <div className="grid gap-4 lg:grid-cols-2">
                                        <ProductImagesField
                                          fieldId={`product-${p.id}`}
                                          token={token}
                                          compact
                                          value={(p.images && p.images.length ? p.images : (p.image ? [p.image] : []))}
                                          onChange={(images) =>
                                            setProducts((rows) =>
                                              rows.map((x) => (x.id === p.id ? { ...x, images, image: images[0] ?? '' } : x)),
                                            )
                                          }
                                          onError={setError}
                                        />
                                        <div className="overflow-hidden rounded-xl border border-gold/20 bg-surface-low">
                                          <img
                                            src={productImageUrl((p.images && p.images[0]) ? p.images[0] : p.image)}
                                            alt=""
                                            className="aspect-video w-full object-cover sm:aspect-square"
                                          />
                                          <p className="border-t border-gold/10 px-3 py-2 text-center text-[11px] text-stone">Preview</p>
                                        </div>
                                      </div>
                                    </FieldGroup>
                                  </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 border-t border-gold/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                  <p className="text-xs text-stone/80">
                                    <Store className="mr-1 inline h-3.5 w-3.5 text-gold/50" aria-hidden />
                                    Changes are not live until you save.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      className="gap-1.5 border-gold/35 px-3 py-1.5 text-xs"
                                      type="button"
                                      disabled={
                                        savingProductId === p.id ||
                                        !String(p.size ?? '').trim() ||
                                        (p.shippable !== false &&
                                          (!(Number(p.weightGrams) > 0) || !(Number(p.volumeCm3) > 0))) ||
                                        !String(p.name ?? '').trim() ||
                                        !String(p.category ?? '').trim()
                                      }
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        setError('')
                                        const size = String(p.size ?? '').trim()
                                        const weightGrams = Math.floor(Number(p.weightGrams))
                                        const volumeCm3 = Math.floor(Number(p.volumeCm3))
                                        if (!size) {
                                          setError('Size is required (e.g. 250ml or 175g)')
                                          return
                                        }
                                        if (p.shippable !== false && (!Number.isFinite(weightGrams) || weightGrams <= 0)) {
                                          setError('Weight (grams) must be a whole number greater than 0')
                                          return
                                        }
                                        if (p.shippable !== false && (!Number.isFinite(volumeCm3) || volumeCm3 <= 0)) {
                                          setError('Packed volume (cm³) must be a whole number greater than 0')
                                          return
                                        }
                                        setSavingProductId(p.id)
                                        try {
                                          await request(`/api/admin/products/${p.id}`, token, {
                                            method: 'PUT',
                                            body: JSON.stringify({
                                              name: p.name,
                                              size,
                                              price: p.price,
                                              image: p.image,
                                              images: (p.images && p.images.length ? p.images : (p.image ? [p.image] : [])),
                                              description: p.description ?? '',
                                              category: p.category,
                                              featured: !!p.featured,
                                              stockQty: p.stockQty,
                                              weightGrams,
                                              volumeCm3,
                                              shippable: p.shippable !== false,
                                            }),
                                          })
                                          setMessage('Product updated')
                                          await loadAll()
                                        } catch (err) {
                                          setError(err instanceof Error ? err.message : 'Failed to update product')
                                        } finally {
                                          setSavingProductId(null)
                                        }
                                      }}
                                    >
                                      {savingProductId === p.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                      ) : null}
                                      Save changes
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="gap-1.5 px-3 py-1.5 text-xs"
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        window.open(`${window.location.origin}/store?product=${p.id}`, '_blank', 'noopener,noreferrer')
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4" aria-hidden />
                                      Store preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="gap-1.5 border-red-500/35 px-3 py-1.5 text-xs text-red-600 hover:border-red-400/50 hover:bg-red-950/30 hover:text-red-200"
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        if (!window.confirm(`Delete “${p.name || 'this product'}”? This cannot be undone.`)) return
                                        setError('')
                                        try {
                                          await request(`/api/admin/products/${p.id}`, token, { method: 'DELETE' })
                                          setProducts((rows) => rows.filter((x) => x.id !== p.id))
                                          setExpandedProductId((open) => (open === p.id ? null : open))
                                          setMessage('Product deleted')
                                        } catch (err) {
                                          setError(err instanceof Error ? err.message : 'Failed to delete product')
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                    )}
                  </>
                )}
              </div>

              {draftPreviewOpen ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="draft-preview-title"
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-md"
                  onClick={() => setDraftPreviewOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setDraftPreviewOpen(false)
                  }}
                >
                  <div
                    className="relative w-full max-w-md rounded-2xl border border-gold/30 bg-white p-6 shadow-[0_16px_48px_rgba(26,18,8,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="absolute right-4 top-4 rounded-md border border-parchment/60 px-2 py-1 text-xs text-stone transition hover:border-gold/40 hover:text-gold"
                      onClick={() => setDraftPreviewOpen(false)}
                    >
                      Esc
                    </button>
                    <p id="draft-preview-title" className="text-xs uppercase tracking-[0.22em] text-gold/75">
                      Draft preview
                    </p>
                    <p className="mt-2 text-sm text-stone">Approximates how the card will look on the store. Save the product to open the real store page.</p>
                    <div className="mt-5 overflow-hidden rounded-xl border border-gold/20 bg-surface-low">
                      <img src={productImageUrl(newProduct.image)} alt="" className="h-52 w-full object-cover" />
                      <div className="p-4">
                        <p className="font-heading text-2xl text-charcoal">{newProduct.name || 'Product name'}</p>
                        <p className="mt-1 text-sm text-stone">{newProduct.category || 'Category'}</p>
                        <p className="mt-1 text-sm text-stone">{newProduct.size || 'Size'}</p>
                        <p className="mt-3 text-2xl font-semibold text-gold">${Number(newProduct.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <Button className="mt-5 w-full" type="button" onClick={() => setDraftPreviewOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {(tab === 'orders' || tab === 'shipping' || tab === 'stays' || tab === 'tables' || tab === 'sales') && (
            <section className="mt-5">
              <AdminCommercePanels section={tab} token={token} />
            </section>
          )}

          {tab === 'stay-page' && (
            <section className="mt-5">
              <AdminStayContentPanel token={token} />
            </section>
          )}

          {tab === 'testimonials' && (
            <section className="mt-5 space-y-4">
              <Card>
                <CardHeader><CardTitle>Add Testimonial</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <input className="field" placeholder="Guest name" value={newTestimonial.guestName} onChange={(e) => setNewTestimonial((v) => ({ ...v, guestName: e.target.value }))} />
                  <input className="field" placeholder="Location" value={newTestimonial.location} onChange={(e) => setNewTestimonial((v) => ({ ...v, location: e.target.value }))} />
                  <input className="field" placeholder="Visit date (e.g. Mar 2026)" value={newTestimonial.visitDate} onChange={(e) => setNewTestimonial((v) => ({ ...v, visitDate: e.target.value }))} />
                  <input className="field" placeholder="Rating 1-5" value={newTestimonial.rating} onChange={(e) => setNewTestimonial((v) => ({ ...v, rating: e.target.value }))} />
                  <textarea className="field min-h-24 md:col-span-2" placeholder="Comment" value={newTestimonial.comment} onChange={(e) => setNewTestimonial((v) => ({ ...v, comment: e.target.value }))} />
                  <div className="md:col-span-2">
                    <Button
                      onClick={async () => {
                        setError('')
                        try {
                          await request('/api/admin/testimonials', token, {
                            method: 'POST',
                            body: JSON.stringify({ ...newTestimonial, rating: Number(newTestimonial.rating || 5) }),
                          })
                          setNewTestimonial({ guestName: '', location: '', rating: '5', comment: '', visitDate: '' })
                          setMessage('Testimonial added')
                          await loadAll()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to add testimonial')
                        }
                      }}
                    >
                      Add Testimonial
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Testimonials ({testimonials.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {testimonials.map((t) => (
                    <div key={t.id} className="rounded-xl border border-gold/15 bg-surface p-3">
                      <div className="grid gap-2 md:grid-cols-4">
                        <input className="field" value={t.guestName} onChange={(e) => setTestimonials((rows) => rows.map((x) => (x.id === t.id ? { ...x, guestName: e.target.value } : x)))} />
                        <input className="field" value={t.location} onChange={(e) => setTestimonials((rows) => rows.map((x) => (x.id === t.id ? { ...x, location: e.target.value } : x)))} />
                        <input className="field" value={String(t.rating)} onChange={(e) => setTestimonials((rows) => rows.map((x) => (x.id === t.id ? { ...x, rating: Number(e.target.value || 5) } : x)))} />
                        <input className="field" value={t.visitDate} onChange={(e) => setTestimonials((rows) => rows.map((x) => (x.id === t.id ? { ...x, visitDate: e.target.value } : x)))} />
                        <textarea className="field min-h-20 md:col-span-4" value={t.comment} onChange={(e) => setTestimonials((rows) => rows.map((x) => (x.id === t.id ? { ...x, comment: e.target.value } : x)))} />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm text-stone">
                          <input
                            type="checkbox"
                            checked={t.isPublished}
                            onChange={(e) => setTestimonials((rows) => rows.map((x) => (x.id === t.id ? { ...x, isPublished: e.target.checked } : x)))}
                          />
                          Published
                        </label>
                        <Button variant="outline" onClick={async () => {
                          try {
                            await request(`/api/admin/testimonials/${t.id}`, token, { method: 'PUT', body: JSON.stringify(t) })
                            setMessage('Testimonial updated')
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to update testimonial')
                          }
                        }}>Save</Button>
                        <Button variant="outline" onClick={async () => {
                          try {
                            await request(`/api/admin/testimonials/${t.id}`, token, { method: 'DELETE' })
                            setTestimonials((rows) => rows.filter((x) => x.id !== t.id))
                            setMessage('Testimonial deleted')
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to delete testimonial')
                          }
                        }}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {tab === 'menu' && (
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-parchment/60 bg-[linear-gradient(125deg,rgba(205,163,73,0.08)_0%,transparent_55%)] px-4 py-5 sm:px-6">
                <p className="text-xs uppercase tracking-[0.22em] text-gold/70">Café menu</p>
                <h2 className="mt-1 font-heading text-3xl text-charcoal sm:text-4xl">Menu management</h2>
                <p className="mt-2 max-w-2xl text-sm text-stone">
                  Add dishes below, then use the list to expand any row for full editing, image upload, and publish toggle.
                </p>
              </div>

              <Card className="overflow-hidden border-gold/20">
                <CardHeader className="border-b border-gold/10 bg-surface">
                  <CardTitle>Add menu item</CardTitle>
                  <p className="text-sm font-normal text-stone">Creates a new row — open it from the list to add a photo or tweak details.</p>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                  <div>
                    <AdminLabel htmlFor="new-menu-section">Section</AdminLabel>
                    <select
                      id="new-menu-section"
                      className="field"
                      value={newMenuItem.section}
                      onChange={(e) => setNewMenuItem((v) => ({ ...v, section: e.target.value }))}
                    >
                      {MENU_SECTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <AdminLabel htmlFor="new-menu-name">Item name</AdminLabel>
                    <input
                      id="new-menu-name"
                      className="field"
                      placeholder="Item name"
                      value={newMenuItem.itemName}
                      onChange={(e) => setNewMenuItem((v) => ({ ...v, itemName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <AdminLabel htmlFor="new-menu-price">Price</AdminLabel>
                    <input
                      id="new-menu-price"
                      className="field"
                      placeholder="Price"
                      inputMode="decimal"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem((v) => ({ ...v, price: e.target.value }))}
                    />
                  </div>
                  <div>
                    <AdminLabel htmlFor="new-menu-sort">Sort order</AdminLabel>
                    <input
                      id="new-menu-sort"
                      className="field"
                      placeholder="Sort order"
                      inputMode="numeric"
                      value={newMenuItem.sortOrder}
                      onChange={(e) => setNewMenuItem((v) => ({ ...v, sortOrder: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <AdminLabel htmlFor="new-menu-image">Image path (optional)</AdminLabel>
                    <input
                      id="new-menu-image"
                      className="field font-mono text-xs"
                      placeholder="Filename or uploads/…"
                      value={newMenuItem.image}
                      onChange={(e) => setNewMenuItem((v) => ({ ...v, image: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <AdminLabel htmlFor="new-menu-desc">Description</AdminLabel>
                    <textarea
                      id="new-menu-desc"
                      className="field min-h-24 resize-y"
                      placeholder="Description"
                      value={newMenuItem.description}
                      onChange={(e) => setNewMenuItem((v) => ({ ...v, description: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Button
                      className="gap-2"
                      disabled={!newMenuItem.itemName.trim()}
                      onClick={async () => {
                        setError('')
                        try {
                          await request('/api/admin/menu', token, {
                            method: 'POST',
                            body: JSON.stringify({
                              ...newMenuItem,
                              price: Number(newMenuItem.price || 0),
                              sortOrder: Number(newMenuItem.sortOrder || 0),
                            }),
                          })
                          setNewMenuItem({ section: 'Lunch', itemName: '', description: '', price: '', image: '', sortOrder: '0' })
                          setMessage('Menu item added')
                          await loadAll()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to add menu item')
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Add menu item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="mb-4">
                  <h3 className="font-heading text-2xl text-gold">All menu items</h3>
                  <p className="text-sm text-stone">
                    {menuItems.length} total — click a row to edit. Lower sort numbers appear earlier within a section on the café page.
                  </p>
                </div>

                {menuItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gold/25 bg-surface py-16 text-center">
                    <UtensilsCrossed className="mx-auto h-12 w-12 text-gold/30" aria-hidden />
                    <p className="mt-4 font-heading text-xl text-stone">No menu items yet</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-stone">Use the form above to add dishes for Lunch, Dinner, or Beverages.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gold/18 bg-surface shadow-[0_8px_28px_rgba(26,18,8,0.05)]">
                    <ul className="divide-y divide-gold/10" role="list">
                      {menuItems.map((m) => {
                        const isOpen = expandedMenuItemId === m.id
                        return (
                          <li key={m.id} className="bg-[linear-gradient(165deg,rgba(249,249,247,0.8)_0%,transparent_50%)]">
                            <button
                              type="button"
                              className={cn(
                                'flex w-full items-center gap-3 px-3 py-3 text-left transition sm:gap-4 sm:px-4 sm:py-3.5',
                                isOpen ? 'bg-gold/[0.07]' : 'hover:bg-surface',
                              )}
                              aria-expanded={isOpen}
                              aria-controls={`menu-panel-${m.id}`}
                              id={`menu-row-${m.id}`}
                              onClick={() => setExpandedMenuItemId((id) => (id === m.id ? null : m.id))}
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold/20 bg-surface-low sm:h-16 sm:w-16">
                                <img
                                  src={productImageUrl(m.image)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold/90 sm:text-[11px]">
                                    {m.section}
                                  </span>
                                  <span className="rounded border border-parchment/60 px-1.5 py-0.5 font-mono text-[10px] text-stone sm:text-[11px]">
                                    #{m.id}
                                  </span>
                                  {m.isPublished ? (
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                      Published
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-parchment/60 bg-surface-low px-2 py-0.5 text-[10px] text-stone">
                                      Draft
                                    </span>
                                  )}
                                  <span className="text-[10px] text-stone/80 sm:text-[11px]">sort {m.sortOrder}</span>
                                </div>
                                <p className="mt-1 truncate font-heading text-base text-charcoal sm:text-lg">{m.itemName || 'Untitled dish'}</p>
                                <p className="truncate text-xs text-stone sm:text-sm">
                                  <span className="font-medium text-gold">${Number(m.price).toFixed(2)}</span>
                                  <span className="text-stone/70"> · </span>
                                  <span className="text-stone">{m.description ? `${m.description.slice(0, 72)}${m.description.length > 72 ? '…' : ''}` : 'No description'}</span>
                                </p>
                              </div>
                              <ChevronDown
                                className={cn('h-5 w-5 shrink-0 text-gold/60 transition-transform duration-200', isOpen && 'rotate-180')}
                                aria-hidden
                              />
                            </button>

                            {isOpen ? (
                              <div
                                id={`menu-panel-${m.id}`}
                                role="region"
                                aria-labelledby={`menu-row-${m.id}`}
                                className="border-t border-gold/10 bg-surface-low px-3 pb-5 pt-4 sm:px-5"
                              >
                                <div className="grid gap-5 lg:grid-cols-12">
                                  <div className="space-y-4 lg:col-span-5">
                                    <FieldGroup title="Item details" className="!p-3 sm:!p-4">
                                      <div className="space-y-3">
                                        <div>
                                          <AdminLabel htmlFor={`menu-${m.id}-section`}>Section</AdminLabel>
                                          <select
                                            id={`menu-${m.id}-section`}
                                            className="field"
                                            value={m.section}
                                            onChange={(e) =>
                                              setMenuItems((rows) => rows.map((x) => (x.id === m.id ? { ...x, section: e.target.value } : x)))
                                            }
                                          >
                                            {MENU_SECTIONS.map((s) => (
                                              <option key={s} value={s}>
                                                {s}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <AdminLabel htmlFor={`menu-${m.id}-name`}>Item name</AdminLabel>
                                          <input
                                            id={`menu-${m.id}-name`}
                                            className="field"
                                            value={m.itemName}
                                            onChange={(e) =>
                                              setMenuItems((rows) => rows.map((x) => (x.id === m.id ? { ...x, itemName: e.target.value } : x)))
                                            }
                                          />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <AdminLabel htmlFor={`menu-${m.id}-price`}>Price</AdminLabel>
                                            <input
                                              id={`menu-${m.id}-price`}
                                              className="field"
                                              inputMode="decimal"
                                              value={String(m.price)}
                                              onChange={(e) =>
                                                setMenuItems((rows) =>
                                                  rows.map((x) => (x.id === m.id ? { ...x, price: Number(e.target.value || 0) } : x)),
                                                )
                                              }
                                            />
                                          </div>
                                          <div>
                                            <AdminLabel htmlFor={`menu-${m.id}-sort`}>Sort order</AdminLabel>
                                            <input
                                              id={`menu-${m.id}-sort`}
                                              className="field"
                                              inputMode="numeric"
                                              value={String(m.sortOrder)}
                                              onChange={(e) =>
                                                setMenuItems((rows) =>
                                                  rows.map((x) => (x.id === m.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x)),
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </FieldGroup>

                                    <FieldGroup title="Description" className="!p-3 sm:!p-4">
                                      <AdminLabel htmlFor={`menu-${m.id}-desc`}>Shown on the café page</AdminLabel>
                                      <textarea
                                        id={`menu-${m.id}-desc`}
                                        className="field min-h-[120px] resize-y"
                                        value={m.description}
                                        onChange={(e) =>
                                          setMenuItems((rows) => rows.map((x) => (x.id === m.id ? { ...x, description: e.target.value } : x)))
                                        }
                                      />
                                    </FieldGroup>

                                    <FieldGroup title="Visibility" className="!p-3 sm:!p-4">
                                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gold/10 bg-surface p-3">
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 rounded border-gold/40 bg-surface-low text-gold focus:ring-gold"
                                          checked={m.isPublished}
                                          onChange={(e) =>
                                            setMenuItems((rows) =>
                                              rows.map((x) => (x.id === m.id ? { ...x, isPublished: e.target.checked } : x)),
                                            )
                                          }
                                        />
                                        <div>
                                          <p className="text-sm font-medium text-charcoal">Published on café menu</p>
                                          <p className="text-xs text-stone">Draft items stay hidden from the public API.</p>
                                        </div>
                                      </label>
                                    </FieldGroup>
                                  </div>

                                  <div className="lg:col-span-7">
                                    <FieldGroup title="Photo" description="Upload or set path" className="h-full !p-3 sm:!p-4">
                                      <div className="grid gap-4 lg:grid-cols-2">
                                        <ProductImageField
                                          fieldId={`menu-item-${m.id}`}
                                          token={token}
                                          compact
                                          value={m.image}
                                          onChange={(image) =>
                                            setMenuItems((rows) => rows.map((x) => (x.id === m.id ? { ...x, image } : x)))
                                          }
                                          onError={setError}
                                        />
                                        <div className="overflow-hidden rounded-xl border border-gold/20 bg-surface-low">
                                          <img
                                            src={productImageUrl(m.image)}
                                            alt=""
                                            className="aspect-video w-full object-cover sm:aspect-square"
                                          />
                                          <p className="border-t border-gold/10 px-3 py-2 text-center text-[11px] text-stone">Preview</p>
                                        </div>
                                      </div>
                                    </FieldGroup>
                                  </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 border-t border-gold/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                  <p className="text-xs text-stone/80">
                                    <Store className="mr-1 inline h-3.5 w-3.5 text-gold/50" aria-hidden />
                                    Save to push changes to the live café page.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      className="gap-1.5 border-gold/35 px-3 py-1.5 text-xs"
                                      type="button"
                                      disabled={savingMenuItemId === m.id}
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        setError('')
                                        setSavingMenuItemId(m.id)
                                        try {
                                          await request(`/api/admin/menu/${m.id}`, token, { method: 'PUT', body: JSON.stringify(m) })
                                          setMessage('Menu item updated')
                                          await loadAll()
                                        } catch (err) {
                                          setError(err instanceof Error ? err.message : 'Failed to update menu item')
                                        } finally {
                                          setSavingMenuItemId(null)
                                        }
                                      }}
                                    >
                                      {savingMenuItemId === m.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                      ) : null}
                                      Save changes
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="gap-1.5 border-red-500/35 px-3 py-1.5 text-xs text-red-600 hover:border-red-400/50 hover:bg-red-950/30 hover:text-red-200"
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        if (!window.confirm(`Delete “${m.itemName || 'this item'}”? This cannot be undone.`)) return
                                        setError('')
                                        try {
                                          await request(`/api/admin/menu/${m.id}`, token, { method: 'DELETE' })
                                          setMenuItems((rows) => rows.filter((x) => x.id !== m.id))
                                          setExpandedMenuItemId((open) => (open === m.id ? null : open))
                                          setMessage('Menu item deleted')
                                        } catch (err) {
                                          setError(err instanceof Error ? err.message : 'Failed to delete menu item')
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === 'about' && (
            <section className="mt-5 space-y-6">
              <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                <Card className="overflow-hidden border-gold/20">
                  <CardHeader className="border-b border-gold/10 bg-surface">
                    <CardTitle>About page copy</CardTitle>
                    <p className="text-sm font-normal text-stone">
                      These fields feed the legacy story column and the “Living Earth” card on{' '}
                      <span className="text-gold/80">/about</span>. Save to publish.
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-6">
                    <FieldGroup title="Legacy section" description="Large heading + body beside the heritage image">
                      <AdminLabel htmlFor="about-legacy-title">Title</AdminLabel>
                      <input
                        id="about-legacy-title"
                        className="field"
                        value={about.legacyTitle}
                        onChange={(e) => setAbout((v) => ({ ...v, legacyTitle: e.target.value }))}
                        placeholder="Legacy title"
                      />
                      <AdminLabel htmlFor="about-legacy-desc">Description</AdminLabel>
                      <textarea
                        id="about-legacy-desc"
                        className="field min-h-[100px] resize-y"
                        value={about.legacyDescription}
                        onChange={(e) => setAbout((v) => ({ ...v, legacyDescription: e.target.value }))}
                        placeholder="Legacy description"
                      />
                    </FieldGroup>
                    <FieldGroup title="Living Earth / foundations" description="Title and paragraph in the dark card">
                      <AdminLabel htmlFor="about-foundation-title">Title</AdminLabel>
                      <input
                        id="about-foundation-title"
                        className="field"
                        value={about.foundationTitle}
                        onChange={(e) => setAbout((v) => ({ ...v, foundationTitle: e.target.value }))}
                        placeholder="Foundation title"
                      />
                      <AdminLabel htmlFor="about-foundation-desc">Description</AdminLabel>
                      <textarea
                        id="about-foundation-desc"
                        className="field min-h-[100px] resize-y"
                        value={about.foundationDescription}
                        onChange={(e) => setAbout((v) => ({ ...v, foundationDescription: e.target.value }))}
                        placeholder="Foundation description"
                      />
                    </FieldGroup>
                    <div className="border-t border-gold/10 pt-4">
                      <Button
                        onClick={async () => {
                          try {
                            await request('/api/admin/content/about', token, { method: 'PUT', body: JSON.stringify(about) })
                            setMessage('About content updated')
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to update about content')
                          }
                        }}
                      >
                        Save About Content
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-2 xl:sticky xl:top-6">
                  <AboutContentPreview content={about} />
                </div>
              </div>
            </section>
          )}

          {tab === 'contact' && (
            <section className="mt-5">
              <Card>
                <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <input className="field" value={contact.farmName} onChange={(e) => setContact((v) => ({ ...v, farmName: e.target.value }))} placeholder="Farm name" />
                  <input className="field" value={contact.email} onChange={(e) => setContact((v) => ({ ...v, email: e.target.value }))} placeholder="Email" />
                  <input className="field" value={contact.phone} onChange={(e) => setContact((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone number" />
                  <input className="field" value={contact.addressLine1} onChange={(e) => setContact((v) => ({ ...v, addressLine1: e.target.value }))} placeholder="Address line 1" />
                  <input className="field" value={contact.addressLine2} onChange={(e) => setContact((v) => ({ ...v, addressLine2: e.target.value }))} placeholder="Address line 2" />
                  <input className="field" value={contact.whatsapp} onChange={(e) => setContact((v) => ({ ...v, whatsapp: e.target.value }))} placeholder="WhatsApp URL (main business number)" />
                  <input className="field" value={contact.whatsappSecondary} onChange={(e) => setContact((v) => ({ ...v, whatsappSecondary: e.target.value }))} placeholder="WhatsApp URL (Rosie's backup number)" />
                  <input className="field" value={contact.instagram} onChange={(e) => setContact((v) => ({ ...v, instagram: e.target.value }))} placeholder="Instagram URL" />
                  <input className="field md:col-span-2" value={contact.mapQuery} onChange={(e) => setContact((v) => ({ ...v, mapQuery: e.target.value }))} placeholder="Google map query" />
                  <input className="field" value={contact.hoursCafe} onChange={(e) => setContact((v) => ({ ...v, hoursCafe: e.target.value }))} placeholder="Cafe hours" />
                  <input className="field" value={contact.hoursStore} onChange={(e) => setContact((v) => ({ ...v, hoursStore: e.target.value }))} placeholder="Store hours" />
                  <input className="field md:col-span-2" value={contact.hoursTours} onChange={(e) => setContact((v) => ({ ...v, hoursTours: e.target.value }))} placeholder="Tours hours" />
                  <div className="md:col-span-2">
                    <Button onClick={async () => {
                      try {
                        await request('/api/admin/content/contact', token, { method: 'PUT', body: JSON.stringify(contact) })
                        setMessage('Contact details updated')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to update contact details')
                      }
                    }}>Save Contact Details</Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {tab === 'bookings' && (
            <section className="mt-5">
              <Card>
                <CardHeader><CardTitle>Bookings ({bookings.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-stone">No bookings yet.</p>
                  ) : (
                    bookings.map((b) => (
                      <div key={b.id} className="rounded-xl border border-gold/15 bg-surface p-3">
                        <p className="text-sm text-charcoal">
                          <span className="text-stone">Name:</span> {b.fullName || '—'}
                        </p>
                        <p className="text-sm text-charcoal">
                          <span className="text-stone">Email:</span> {b.email || '—'}
                        </p>
                        <p className="text-sm text-charcoal">
                          <span className="text-stone">Date:</span>{' '}
                          {b.bookingDate ? String(b.bookingDate).slice(0, 10) : '—'}
                        </p>
                        <p className="mt-1 text-sm text-bark">{b.message || 'No message'}</p>
                        <p className="mt-1 text-xs text-stone">
                          {b.source || 'website'}
                          {b.guestCount ? ` · ${b.guestCount} guests` : ''}
                          {b.timeFrom && b.timeUntil ? ` · ${b.timeFrom}-${b.timeUntil}` : ''}
                        </p>

                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <select
                            className="field"
                            value={b.status}
                            onChange={(e) => {
                              const next = e.target.value as Booking['status']
                              setBookings((rows) => rows.map((x) => (x.id === b.id ? { ...x, status: next } : x)))
                            }}
                          >
                            <option value="new">New</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="closed">Closed</option>
                          </select>
                          <textarea
                            className="field min-h-20 md:col-span-2"
                            placeholder="Admin note"
                            value={b.adminNote ?? ''}
                            onChange={(e) =>
                              setBookings((rows) => rows.map((x) => (x.id === b.id ? { ...x, adminNote: e.target.value } : x)))
                            }
                          />
                          <div className="md:col-span-3">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await request(`/api/admin/bookings/${b.id}`, token, {
                                    method: 'PUT',
                                    body: JSON.stringify({ status: b.status, adminNote: b.adminNote ?? '' }),
                                  })
                                  setMessage('Booking updated')
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to update booking')
                                }
                              }}
                            >
                              Save Booking Status
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {tab === 'media' && (
            <section className="mt-5 space-y-4">
              <Card>
                <CardHeader><CardTitle>Upload Image</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="field"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setUploadFile(file)
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!uploadFile}
                      onClick={async () => {
                        if (!uploadFile) return
                        setError('')
                        setMessage('')
                        try {
                          const formData = new FormData()
                          formData.append('file', uploadFile)
                          const res = await fetch(apiUrl('/api/admin/media/upload'), {
                            method: 'POST',
                            credentials: 'include',
                            body: formData,
                          })
                          if (!res.ok) {
                            const payload = await res.json().catch(() => null)
                            throw new Error(payload?.message ?? 'Upload failed')
                          }
                          const payload = (await res.json()) as { url: string }
                          setMessage(`Uploaded: ${payload.url}`)
                          setUploadFile(null)
                          await loadAll()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to upload image')
                        }
                      }}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadFile(null)
                        setMessage('')
                        setError('')
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-stone">
                    Uploaded files become available at paths like `/images/uploads/your-file.jpg`.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Media Library ({media.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {media.length === 0 ? (
                    <p className="text-sm text-stone">No uploaded files yet.</p>
                  ) : (
                    media.map((m) => (
                      <div key={m.name} className="rounded-xl border border-gold/15 bg-surface p-3">
                        <div className="grid gap-3 md:grid-cols-12 md:items-center">
                          <div className="md:col-span-2">
                            <img src={m.url} alt={m.name} className="h-16 w-16 rounded-lg border border-gold/20 object-cover" loading="lazy" />
                          </div>
                          <div className="md:col-span-7">
                            <p className="text-sm text-charcoal">{m.name}</p>
                            <p className="mt-1 text-xs text-stone">
                              {Math.ceil(m.size / 1024)} KB · {new Date(m.updatedAt).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-gold/85">{m.url}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 md:col-span-3 md:justify-end">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(m.url)
                                  setMessage(`Copied URL: ${m.url}`)
                                } catch {
                                  setError('Could not copy URL')
                                }
                              }}
                            >
                              Copy URL
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await request(`/api/admin/media/${encodeURIComponent(m.name)}`, token, { method: 'DELETE' })
                                  setMedia((rows) => rows.filter((x) => x.name !== m.name))
                                  setMessage('File deleted')
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to delete file')
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {tab === 'settings' && (
            <section className="mt-5">
              <Card>
                <CardHeader><CardTitle>Site Settings</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <input className="field" value={siteSettings.brandName} onChange={(e) => setSiteSettings((v) => ({ ...v, brandName: e.target.value }))} placeholder="Brand name" />
                  <input className="field" value={siteSettings.footerTagline} onChange={(e) => setSiteSettings((v) => ({ ...v, footerTagline: e.target.value }))} placeholder="Footer tagline" />
                  <input className="field" value={siteSettings.supportEmail} onChange={(e) => setSiteSettings((v) => ({ ...v, supportEmail: e.target.value }))} placeholder="Support email" />
                  <input className="field" value={siteSettings.whatsappUrl} onChange={(e) => setSiteSettings((v) => ({ ...v, whatsappUrl: e.target.value }))} placeholder="WhatsApp URL (main business number)" />
                  <input className="field" value={siteSettings.whatsappSecondaryUrl} onChange={(e) => setSiteSettings((v) => ({ ...v, whatsappSecondaryUrl: e.target.value }))} placeholder="WhatsApp URL (Rosie's backup number)" />
                  <input className="field md:col-span-2" value={siteSettings.instagramUrl} onChange={(e) => setSiteSettings((v) => ({ ...v, instagramUrl: e.target.value }))} placeholder="Instagram URL" />
                  <textarea className="field min-h-24 md:col-span-2" value={siteSettings.missionText} onChange={(e) => setSiteSettings((v) => ({ ...v, missionText: e.target.value }))} placeholder="Mission text" />
                  <div className="md:col-span-2">
                    <Button
                      onClick={async () => {
                        try {
                          await request('/api/admin/content/site-settings', token, {
                            method: 'PUT',
                            body: JSON.stringify(siteSettings),
                          })
                          setMessage('Site settings updated')
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to update site settings')
                        }
                      }}
                    >
                      Save Site Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
          </div>
        </div>
      </main>
    </>
  )
}

