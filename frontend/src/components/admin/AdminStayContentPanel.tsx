import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BedDouble, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiUrl } from '@/utils/api'
import { productImageUrl } from '@/utils/productImage'
import { cn } from '@/lib/utils'

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message ?? `Request failed (${res.status})`)
  return data as T
}

async function uploadStayImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(apiUrl('/api/admin/media/upload'), {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  const payload = (await res.json().catch(() => null)) as { message?: string; name?: string } | null
  if (!res.ok) throw new Error(payload?.message ?? 'Upload failed')
  if (!payload?.name) throw new Error('Upload failed')
  return `uploads/${payload.name}`
}

function stayPublicPath(uploaded: string) {
  const raw = String(uploaded ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('uploads/')) return `/images/${raw}`
  if (raw.startsWith('/')) return raw
  return `/images/${raw}`
}

function AdminLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-stone">
      {children}
    </label>
  )
}

type StayAmenity = { icon: string; label: string }
type StayGalleryPhoto = { src: string; label: string }

type StayPageCopy = {
  heroKicker: string
  heroTitleLine: string
  heroTitleItalic: string
  heroLead: string
  heroImage: string
  sectionTitle: string
  sectionLead: string
}

type StayGroup = {
  id: number
  slug: string
  title: string
  lead: string
  isPublished: boolean
  sortOrder: number
}

type StayListing = {
  id: number
  groupId: number
  groupSlug?: string
  groupTitle?: string
  slug: string
  name: string
  type: string
  badge: string | null
  tagline: string
  description: string
  guests: string
  bookingUrl: string | null
  bookingCta: string
  image: string
  gallery: StayGalleryPhoto[]
  amenities: StayAmenity[]
  imagePosition: 'left' | 'right'
  isPublished: boolean
  sortOrder: number
}

const STAY_AMENITY_ICONS = ['BedDouble', 'Waves', 'UtensilsCrossed', 'Leaf', 'PawPrint', 'Users', 'MapPin', 'Sunrise', 'Bird'] as const
const EMPTY_STAY_PAGE: StayPageCopy = {
  heroKicker: '',
  heroTitleLine: '',
  heroTitleItalic: '',
  heroLead: '',
  heroImage: '',
  sectionTitle: '',
  sectionLead: '',
}

export function AdminStayContentPanel() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [stayPageCopy, setStayPageCopy] = useState<StayPageCopy>(EMPTY_STAY_PAGE)
  const [stayGroups, setStayGroups] = useState<StayGroup[]>([])
  const [stayListings, setStayListings] = useState<StayListing[]>([])
  const [newStayGroup, setNewStayGroup] = useState({ title: '', lead: '' })
  const [newStayListing, setNewStayListing] = useState({ name: '', groupId: '' })
  const [expandedStayId, setExpandedStayId] = useState<number | null>(null)
  const [savingStayId, setSavingStayId] = useState<number | 'page' | 'group' | null>(null)

  const load = useCallback(async () => {
    setError('')
    const [page, groups, listings] = await Promise.all([
      adminFetch<StayPageCopy>('/api/admin/content/stay-page'),
      adminFetch<StayGroup[]>('/api/admin/stay-groups'),
      adminFetch<StayListing[]>('/api/admin/stay-listings'),
    ])
    setStayPageCopy(page)
    setStayGroups(groups)
    setStayListings(listings)
  }, [])

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load stay content'))
  }, [load])

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-parchment/60 bg-[linear-gradient(125deg,rgba(205,163,73,0.08)_0%,transparent_55%)] px-4 py-5 sm:px-6">
                <p className="text-xs uppercase tracking-[0.22em] text-gold/70">Public Stay page</p>
                <h2 className="mt-1 font-heading text-3xl text-charcoal sm:text-4xl">Stay listings</h2>
                <p className="mt-2 max-w-2xl text-sm text-stone">
                  Add, hide, or rewrite cabins and holiday homes shown on <span className="text-gold/80">/stay</span>. Upload photos, change booking links, and unpublish anything that should not receive enquiries.
                </p>
              </div>

              <Card className="overflow-hidden border-gold/20">
                <CardHeader className="border-b border-gold/10 bg-surface">
                  <CardTitle>Page heading</CardTitle>
                  <p className="text-sm font-normal text-stone">Hero and “The Stays” section copy. Listings below are edited separately.</p>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                  <div>
                    <AdminLabel htmlFor="stay-kicker">Hero kicker</AdminLabel>
                    <input id="stay-kicker" className="field" value={stayPageCopy.heroKicker} onChange={(e) => setStayPageCopy((v) => ({ ...v, heroKicker: e.target.value }))} />
                  </div>
                  <div>
                    <AdminLabel htmlFor="stay-title">Hero title</AdminLabel>
                    <input id="stay-title" className="field" value={stayPageCopy.heroTitleLine} onChange={(e) => setStayPageCopy((v) => ({ ...v, heroTitleLine: e.target.value }))} />
                  </div>
                  <div>
                    <AdminLabel htmlFor="stay-italic">Gold italic word</AdminLabel>
                    <input id="stay-italic" className="field" value={stayPageCopy.heroTitleItalic} onChange={(e) => setStayPageCopy((v) => ({ ...v, heroTitleItalic: e.target.value }))} />
                  </div>
                  <div>
                    <AdminLabel htmlFor="stay-section-title">Section title</AdminLabel>
                    <input id="stay-section-title" className="field" value={stayPageCopy.sectionTitle} onChange={(e) => setStayPageCopy((v) => ({ ...v, sectionTitle: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <AdminLabel htmlFor="stay-hero-lead">Hero introduction</AdminLabel>
                    <textarea id="stay-hero-lead" className="field min-h-24 resize-y" value={stayPageCopy.heroLead} onChange={(e) => setStayPageCopy((v) => ({ ...v, heroLead: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <AdminLabel htmlFor="stay-section-lead">Section introduction</AdminLabel>
                    <textarea id="stay-section-lead" className="field min-h-20 resize-y" value={stayPageCopy.sectionLead} onChange={(e) => setStayPageCopy((v) => ({ ...v, sectionLead: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <AdminLabel htmlFor="stay-hero-image">Hero image</AdminLabel>
                    <input id="stay-hero-image" className="field font-mono text-xs" value={stayPageCopy.heroImage} onChange={(e) => setStayPageCopy((v) => ({ ...v, heroImage: e.target.value }))} />
                    <input
                      className="mt-2 text-sm"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        try {
                          const path = stayPublicPath(await uploadStayImage(file))
                          setStayPageCopy((v) => ({ ...v, heroImage: path }))
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Hero image upload failed')
                        }
                      }}
                    />
                    {stayPageCopy.heroImage ? (
                      <img src={productImageUrl(stayPageCopy.heroImage)} alt="" className="mt-3 h-28 w-full rounded-lg object-cover" />
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      disabled={savingStayId === 'page'}
                      onClick={async () => {
                        setError('')
                        setSavingStayId('page')
                        try {
                          await adminFetch('/api/admin/content/stay-page', {
                            method: 'PUT',
                            body: JSON.stringify(stayPageCopy),
                          })
                          setMessage('Stay page heading saved')
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to save stay heading')
                        } finally {
                          setSavingStayId(null)
                        }
                      }}
                    >
                      Save page heading
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-gold/20">
                <CardHeader className="border-b border-gold/10 bg-surface">
                  <CardTitle>Sections</CardTitle>
                  <p className="text-sm font-normal text-stone">Group listings into sections such as On the Farm or Holiday Homes.</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {stayGroups.map((group) => (
                    <div key={group.id} className="grid gap-3 rounded-xl border border-parchment/70 bg-white p-4 md:grid-cols-12">
                      <div className="md:col-span-3">
                        <AdminLabel>Title</AdminLabel>
                        <input className="field" value={group.title} onChange={(e) => setStayGroups((rows) => rows.map((x) => (x.id === group.id ? { ...x, title: e.target.value } : x)))} />
                      </div>
                      <div className="md:col-span-5">
                        <AdminLabel>Lead text</AdminLabel>
                        <input className="field" value={group.lead} onChange={(e) => setStayGroups((rows) => rows.map((x) => (x.id === group.id ? { ...x, lead: e.target.value } : x)))} />
                      </div>
                      <div>
                        <AdminLabel>Sort</AdminLabel>
                        <input className="field" inputMode="numeric" value={String(group.sortOrder)} onChange={(e) => setStayGroups((rows) => rows.map((x) => (x.id === group.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x)))} />
                      </div>
                      <div className="flex items-end gap-2 md:col-span-3">
                        <label className="flex h-11 items-center gap-2 text-sm text-stone">
                          <input type="checkbox" checked={group.isPublished} onChange={(e) => setStayGroups((rows) => rows.map((x) => (x.id === group.id ? { ...x, isPublished: e.target.checked } : x)))} />
                          Published
                        </label>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            setError('')
                            try {
                              await adminFetch(`/api/admin/stay-groups/${group.id}`, { method: 'PUT', body: JSON.stringify(group) })
                              setMessage(`Saved section “${group.title}”`)
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to save section')
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!window.confirm(`Delete section “${group.title}”?`)) return
                            setError('')
                            try {
                              await adminFetch(`/api/admin/stay-groups/${group.id}`, { method: 'DELETE' })
                              setMessage('Section deleted')
                              await load()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to delete section')
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="grid gap-3 md:grid-cols-[2fr_3fr_auto]">
                    <input className="field" placeholder="New section title" value={newStayGroup.title} onChange={(e) => setNewStayGroup((v) => ({ ...v, title: e.target.value }))} />
                    <input className="field" placeholder="Short lead text" value={newStayGroup.lead} onChange={(e) => setNewStayGroup((v) => ({ ...v, lead: e.target.value }))} />
                    <Button
                      disabled={!newStayGroup.title.trim()}
                      onClick={async () => {
                        setError('')
                        try {
                          await adminFetch('/api/admin/stay-groups', { method: 'POST', body: JSON.stringify(newStayGroup) })
                          setNewStayGroup({ title: '', lead: '' })
                          setMessage('Section added')
                          await load()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to add section')
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add section
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-gold/20">
                <CardHeader className="border-b border-gold/10 bg-surface">
                  <CardTitle>Add listing</CardTitle>
                  <p className="text-sm font-normal text-stone">Creates a new stay. Open it below to add photos, amenities, and the booking link.</p>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-[2fr_2fr_auto]">
                  <div>
                    <AdminLabel htmlFor="new-stay-name">Name</AdminLabel>
                    <input id="new-stay-name" className="field" placeholder="Cottage name" value={newStayListing.name} onChange={(e) => setNewStayListing((v) => ({ ...v, name: e.target.value }))} />
                  </div>
                  <div>
                    <AdminLabel htmlFor="new-stay-group">Section</AdminLabel>
                    <select id="new-stay-group" className="field" value={newStayListing.groupId} onChange={(e) => setNewStayListing((v) => ({ ...v, groupId: e.target.value }))}>
                      <option value="">Select a section</option>
                      {stayGroups.map((group) => (
                        <option key={group.id} value={String(group.id)}>{group.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      disabled={!newStayListing.name.trim() || !newStayListing.groupId}
                      onClick={async () => {
                        setError('')
                        try {
                          const created = await adminFetch<{ id: number }>('/api/admin/stay-listings', {
                            method: 'POST',
                            body: JSON.stringify({
                              name: newStayListing.name,
                              groupId: Number(newStayListing.groupId),
                              amenities: [],
                              gallery: [],
                            }),
                          })
                          setNewStayListing({ name: '', groupId: newStayListing.groupId })
                          setMessage('Listing added')
                          await load()
                          if (created?.id) setExpandedStayId(created.id)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to add listing')
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add listing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="mb-4">
                  <h3 className="font-heading text-2xl text-gold">All stay listings</h3>
                  <p className="text-sm text-stone">{stayListings.length} total — click a row to edit photos, copy, and booking links.</p>
                </div>
                {stayListings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gold/25 bg-surface py-16 text-center">
                    <BedDouble className="mx-auto h-12 w-12 text-gold/30" aria-hidden />
                    <p className="mt-4 font-heading text-xl text-stone">No stay listings yet</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-stone">Add a listing above, then upload photos and publish it.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gold/18 bg-surface">
                    <ul className="divide-y divide-gold/10" role="list">
                      {stayListings.map((listing) => {
                        const isOpen = expandedStayId === listing.id
                        return (
                          <li key={listing.id}>
                            <button
                              type="button"
                              className={cn('flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4', isOpen ? 'bg-gold/[0.07]' : 'hover:bg-surface')}
                              onClick={() => setExpandedStayId((id) => (id === listing.id ? null : listing.id))}
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold/20 bg-surface-low">
                                {listing.image ? <img src={productImageUrl(listing.image)} alt="" className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold/90">{listing.groupTitle || 'Section'}</span>
                                  {listing.isPublished ? (
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-700">Published</span>
                                  ) : (
                                    <span className="rounded-full border border-parchment/60 bg-surface-low px-2 py-0.5 text-[10px] text-stone">Hidden</span>
                                  )}
                                </div>
                                <p className="mt-1 truncate font-heading text-base text-charcoal">{listing.name || 'Untitled stay'}</p>
                                <p className="truncate text-xs text-stone">{listing.bookingUrl ? listing.bookingUrl : 'Enquiry form (no booking link)'}</p>
                              </div>
                              <ChevronDown className={cn('h-5 w-5 text-gold/60', isOpen && 'rotate-180')} />
                            </button>
                            {isOpen ? (
                              <div className="space-y-4 border-t border-gold/10 bg-surface-low px-3 py-4 sm:px-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <AdminLabel>Name</AdminLabel>
                                    <input className="field" value={listing.name} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, name: e.target.value } : x)))} />
                                  </div>
                                  <div>
                                    <AdminLabel>Section</AdminLabel>
                                    <select className="field" value={String(listing.groupId)} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, groupId: Number(e.target.value) } : x)))}>
                                      {stayGroups.map((group) => (
                                        <option key={group.id} value={String(group.id)}>{group.title}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <AdminLabel>Type label</AdminLabel>
                                    <input className="field" placeholder="On-Farm · Self-Contained Cabin" value={listing.type} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, type: e.target.value } : x)))} />
                                  </div>
                                  <div>
                                    <AdminLabel>Badge</AdminLabel>
                                    <input className="field" placeholder="Most Popular" value={listing.badge ?? ''} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, badge: e.target.value } : x)))} />
                                  </div>
                                  <div>
                                    <AdminLabel>Guests</AdminLabel>
                                    <input className="field" placeholder="2–4" value={listing.guests} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, guests: e.target.value } : x)))} />
                                  </div>
                                  <div>
                                    <AdminLabel>Image position</AdminLabel>
                                    <select className="field" value={listing.imagePosition} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, imagePosition: e.target.value === 'right' ? 'right' : 'left' } : x)))}>
                                      <option value="left">Photo left</option>
                                      <option value="right">Photo right</option>
                                    </select>
                                  </div>
                                  <div className="md:col-span-2">
                                    <AdminLabel>Tagline</AdminLabel>
                                    <input className="field" value={listing.tagline} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, tagline: e.target.value } : x)))} />
                                  </div>
                                  <div className="md:col-span-2">
                                    <AdminLabel>Description</AdminLabel>
                                    <textarea className="field min-h-28 resize-y" value={listing.description} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, description: e.target.value } : x)))} />
                                  </div>
                                  <div className="md:col-span-2">
                                    <AdminLabel>Booking link (leave empty to use the enquiry form)</AdminLabel>
                                    <input className="field" placeholder="https://www.airbnb.com.au/rooms/…" value={listing.bookingUrl ?? ''} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, bookingUrl: e.target.value } : x)))} />
                                  </div>
                                  <div>
                                    <AdminLabel>Button label</AdminLabel>
                                    <input className="field" placeholder="View on Airbnb" value={listing.bookingCta} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, bookingCta: e.target.value } : x)))} />
                                  </div>
                                  <div>
                                    <AdminLabel>Sort order</AdminLabel>
                                    <input className="field" inputMode="numeric" value={String(listing.sortOrder)} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x)))} />
                                  </div>
                                </div>

                                <div>
                                  <AdminLabel>Cover photo</AdminLabel>
                                  <input className="field font-mono text-xs" value={listing.image} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, image: e.target.value } : x)))} />
                                  <input
                                    className="mt-2 text-sm"
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      e.target.value = ''
                                      if (!file) return
                                      try {
                                        const path = stayPublicPath(await uploadStayImage(file))
                                        setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, image: path } : x)))
                                      } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Photo upload failed')
                                      }
                                    }}
                                  />
                                  {listing.image ? <img src={productImageUrl(listing.image)} alt="" className="mt-3 h-36 w-full max-w-md rounded-lg object-cover" /> : null}
                                </div>

                                <div>
                                  <AdminLabel>Gallery photos</AdminLabel>
                                  <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {(listing.gallery ?? []).map((photo, photoIdx) => (
                                      <div key={`${photo.src}-${photoIdx}`} className="rounded-lg border border-parchment/70 bg-white p-2">
                                        <img src={productImageUrl(photo.src)} alt="" className="h-24 w-full rounded object-cover" />
                                        <input
                                          className="field mt-2 text-xs"
                                          placeholder="Photo label"
                                          value={photo.label}
                                          onChange={(e) => setStayListings((rows) => rows.map((x) => {
                                            if (x.id !== listing.id) return x
                                            const gallery = [...x.gallery]
                                            gallery[photoIdx] = { ...gallery[photoIdx]!, label: e.target.value }
                                            return { ...x, gallery }
                                          }))}
                                        />
                                        <button
                                          type="button"
                                          className="mt-2 text-xs text-red-600"
                                          onClick={() => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, gallery: x.gallery.filter((_, idx) => idx !== photoIdx) } : x)))}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <input
                                    className="mt-3 text-sm"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files ?? [])
                                      e.target.value = ''
                                      if (!files.length) return
                                      try {
                                        const uploaded: StayGalleryPhoto[] = []
                                        for (const file of files) {
                                          uploaded.push({ src: stayPublicPath(await uploadStayImage(file)), label: '' })
                                        }
                                        setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, gallery: [...(x.gallery ?? []), ...uploaded], image: x.image || uploaded[0]!.src } : x)))
                                      } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Gallery upload failed')
                                      }
                                    }}
                                  />
                                </div>

                                <div>
                                  <AdminLabel>Amenities</AdminLabel>
                                  <div className="mt-2 space-y-2">
                                    {(listing.amenities ?? []).map((amenity, amenityIdx) => (
                                      <div key={`${amenity.label}-${amenityIdx}`} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                                        <select
                                          className="field"
                                          value={amenity.icon}
                                          onChange={(e) => setStayListings((rows) => rows.map((x) => {
                                            if (x.id !== listing.id) return x
                                            const amenities = [...x.amenities]
                                            amenities[amenityIdx] = { ...amenities[amenityIdx]!, icon: e.target.value }
                                            return { ...x, amenities }
                                          }))}
                                        >
                                          {STAY_AMENITY_ICONS.map((icon) => (
                                            <option key={icon} value={icon}>{icon}</option>
                                          ))}
                                        </select>
                                        <input
                                          className="field"
                                          value={amenity.label}
                                          onChange={(e) => setStayListings((rows) => rows.map((x) => {
                                            if (x.id !== listing.id) return x
                                            const amenities = [...x.amenities]
                                            amenities[amenityIdx] = { ...amenities[amenityIdx]!, label: e.target.value }
                                            return { ...x, amenities }
                                          }))}
                                        />
                                        <Button variant="outline" onClick={() => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, amenities: x.amenities.filter((_, idx) => idx !== amenityIdx) } : x)))}>
                                          Remove
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                  <Button
                                    className="mt-2"
                                    variant="outline"
                                    onClick={() => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, amenities: [...(x.amenities ?? []), { icon: 'Leaf', label: '' }] } : x)))}
                                  >
                                    Add amenity
                                  </Button>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                  <label className="flex items-center gap-2 text-sm text-stone">
                                    <input type="checkbox" checked={listing.isPublished} onChange={(e) => setStayListings((rows) => rows.map((x) => (x.id === listing.id ? { ...x, isPublished: e.target.checked } : x)))} />
                                    Published on /stay
                                  </label>
                                  <Button
                                    disabled={savingStayId === listing.id}
                                    onClick={async () => {
                                      setError('')
                                      setSavingStayId(listing.id)
                                      try {
                                        await adminFetch(`/api/admin/stay-listings/${listing.id}`, {
                                          method: 'PUT',
                                          body: JSON.stringify(listing),
                                        })
                                        setMessage(`Saved “${listing.name}”`)
                                        await load()
                                      } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Failed to save listing')
                                      } finally {
                                        setSavingStayId(null)
                                      }
                                    }}
                                  >
                                    Save listing
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={async () => {
                                      if (!window.confirm(`Delete “${listing.name}”? This removes it from the Stay page.`)) return
                                      setError('')
                                      try {
                                        await adminFetch(`/api/admin/stay-listings/${listing.id}`, { method: 'DELETE' })
                                        setMessage('Listing deleted')
                                        await load()
                                      } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Failed to delete listing')
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </Button>
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
    </div>
  )
}
