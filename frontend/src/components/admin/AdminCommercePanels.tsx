import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiUrl } from '@/utils/api'

async function adminFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init?.headers)
        ? Object.fromEntries(init.headers)
        : { ...((init?.headers as Record<string, string> | undefined) ?? {}) }),
  }
  if (token && token !== 'cookie-session') {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message ?? `Request failed (${res.status})`)
  return data as T
}

type Order = {
  id: number
  orderNumber: string
  email: string
  fullName: string
  total: number
  status: string
  fulfillmentStatus: string
  shippingPostcode: string
  createdAt: string
}

type ShippingRule = {
  id: number
  name: string
  postcodePrefixes: string
  baseFee: number
  perKgFee: number
  freeOver: number | null
  sortOrder: number
  isActive: boolean
}

type Property = {
  id: number
  name: string
  nightlyRate: number
  minNights: number
  maxGuests: number
  cleaningFee: number
  icalAirbnbUrl: string | null
  icalBookingUrl: string | null
  isActive: boolean
}

type TableHold = {
  id: number
  holdNumber: string
  fullName: string
  email: string
  phone: string
  partyDate: string
  slot: string
  covers: number
  notes: string
  status: string
  expiresAt: string
  createdAt?: string
}

type CafeCapacity = {
  lunchCovers: number
  dinnerCovers: number
  maxPartySize: number
  openDays: number[]
}

type Sales = {
  storeOrders: number
  storeRevenue: number
  stayBookings: number
  stayRevenue: number
  onlineRevenue: number
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

const HOLD_STATUSES = ['pending', 'confirmed', 'seated', 'cancelled', 'declined', 'expired'] as const

function holdStatusClass(status: string) {
  if (status === 'confirmed' || status === 'seated') return 'text-emerald-700'
  if (status === 'pending') return 'text-amber-800'
  if (status === 'declined' || status === 'cancelled' || status === 'expired') return 'text-stone'
  return 'text-charcoal'
}

export function AdminCommercePanels({ section, token }: { section: 'orders' | 'shipping' | 'stays' | 'tables' | 'sales'; token: string }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [holds, setHolds] = useState<TableHold[]>([])
  const [cafeCapacity, setCafeCapacity] = useState<CafeCapacity>({
    lunchCovers: 40,
    dinnerCovers: 30,
    maxPartySize: 10,
    openDays: [4, 5, 6, 0],
  })
  const [editingHoldId, setEditingHoldId] = useState<number | null>(null)
  const [holdDraft, setHoldDraft] = useState({
    fullName: '',
    email: '',
    phone: '',
    partyDate: '',
    slot: 'lunch',
    covers: '2',
    notes: '',
    status: 'pending',
  })
  const [sales, setSales] = useState<Sales | null>(null)
  const [newRule, setNewRule] = useState({
    name: '',
    postcodePrefixes: '*',
    baseFee: '15',
    perKgFee: '3',
    freeOver: '200',
    sortOrder: '100',
  })
  const [blockForm, setBlockForm] = useState({ propertyId: '', startDate: '', endDate: '', note: '' })

  const load = useCallback(async () => {
    setError('')
    try {
      if (section === 'orders') setOrders(await adminFetch('/api/admin/orders', token))
      if (section === 'shipping') setRules(await adminFetch('/api/admin/shipping-rules', token))
      if (section === 'stays') setProperties(await adminFetch('/api/admin/properties', token))
      if (section === 'tables') {
        const [holdRows, capacity] = await Promise.all([
          adminFetch<TableHold[]>('/api/admin/table-holds', token),
          adminFetch<CafeCapacity>('/api/admin/cafe-capacity', token),
        ])
        setHolds(holdRows)
        setCafeCapacity(capacity)
      }
      if (section === 'sales') setSales(await adminFetch('/api/admin/sales-summary', token))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    }
  }, [section, token])

  useEffect(() => {
    void load()
  }, [load])

  const updateHoldStatus = async (holdId: number, status: string) => {
    setError('')
    setMessage('')
    try {
      const result = await adminFetch<{ ok: boolean; hold?: TableHold }>(`/api/admin/table-holds/${holdId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      if (result.hold) {
        setHolds((rows) => rows.map((row) => (row.id === holdId ? { ...row, ...result.hold! } : row)))
      } else {
        setHolds((rows) => rows.map((row) => (row.id === holdId ? { ...row, status } : row)))
      }
      setMessage(`Status updated to ${status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
      await load()
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      {section === 'sales' && sales ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Store orders', sales.storeOrders],
            ['Store revenue', `$${Number(sales.storeRevenue).toFixed(2)}`],
            ['Stay bookings', sales.stayBookings],
            ['Online total', `$${Number(sales.onlineRevenue).toFixed(2)}`],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-gold">{value}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {section === 'orders' ? (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orders.length === 0 ? <p className="text-sm text-stone">No orders yet.</p> : null}
            {orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-parchment px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-stone">
                    {o.fullName} · {o.email} · ${Number(o.total).toFixed(2)} · {o.status}
                  </p>
                </div>
                <select
                  className="field w-auto"
                  value={o.fulfillmentStatus}
                  onChange={async (e) => {
                    await adminFetch(`/api/admin/orders/${o.id}`, token, {
                      method: 'PUT',
                      body: JSON.stringify({ fulfillmentStatus: e.target.value }),
                    })
                    setMessage('Order updated')
                    await load()
                  }}
                >
                  <option value="unfulfilled">unfulfilled</option>
                  <option value="packed">packed</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {section === 'shipping' ? (
        <>
          <p className="text-sm text-stone">
            Live Australia Post rates are used at checkout when <code className="text-charcoal">AUSPOST_PAC_API_KEY</code> is set
            (origin 3922, preferred Parcel Post). These admin rules remain as
            fallback and for free-shipping thresholds. Zones match the first postcode prefix in sort order. Chargeable kg is the
            higher of packed weight and volume ÷ 5000.
          </p>
          <Card>
            <CardHeader>
              <CardTitle>Add shipping rule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <input className="field" placeholder="Name" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
              <input className="field" placeholder="Postcode prefixes (comma or *)" value={newRule.postcodePrefixes} onChange={(e) => setNewRule({ ...newRule, postcodePrefixes: e.target.value })} />
              <input className="field" placeholder="Base fee" value={newRule.baseFee} onChange={(e) => setNewRule({ ...newRule, baseFee: e.target.value })} />
              <input className="field" placeholder="Per kg fee" value={newRule.perKgFee} onChange={(e) => setNewRule({ ...newRule, perKgFee: e.target.value })} />
              <input className="field" placeholder="Free over" value={newRule.freeOver} onChange={(e) => setNewRule({ ...newRule, freeOver: e.target.value })} />
              <Button
                type="button"
                onClick={async () => {
                  await adminFetch('/api/admin/shipping-rules', token, {
                    method: 'POST',
                    body: JSON.stringify({
                      name: newRule.name,
                      postcodePrefixes: newRule.postcodePrefixes,
                      baseFee: Number(newRule.baseFee),
                      perKgFee: Number(newRule.perKgFee),
                      freeOver: newRule.freeOver ? Number(newRule.freeOver) : null,
                      sortOrder: Number(newRule.sortOrder),
                    }),
                  })
                  setMessage('Rule added')
                  await load()
                }}
              >
                Save rule
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Shipping rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="rounded-lg border border-parchment px-3 py-2 text-sm">
                  <p className="font-semibold">
                    {r.name} {r.isActive ? '' : '(inactive)'}
                  </p>
                  <p className="text-stone">
                    prefixes: {r.postcodePrefixes} · base ${Number(r.baseFee).toFixed(2)} · /kg ${Number(r.perKgFee).toFixed(2)}
                    {r.freeOver != null ? ` · free over $${Number(r.freeOver).toFixed(2)}` : ''}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {section === 'stays' ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Properties</CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const result = await adminFetch<{ imported: number }>('/api/admin/ical-sync', token, { method: 'POST' })
                  setMessage(`iCal sync imported ${result.imported} blocks`)
                }}
              >
                Sync iCal now
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {properties.map((p) => (
                <div key={p.id} className="space-y-2 rounded-lg border border-parchment p-3">
                  <p className="font-heading text-lg">{p.name}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      className="field"
                      type="number"
                      defaultValue={p.nightlyRate}
                      onBlur={async (e) => {
                        await adminFetch(`/api/admin/properties/${p.id}`, token, {
                          method: 'PUT',
                          body: JSON.stringify({ ...p, nightlyRate: Number(e.target.value) }),
                        })
                        setMessage('Property saved')
                      }}
                    />
                    <input
                      className="field"
                      placeholder="Airbnb iCal URL"
                      defaultValue={p.icalAirbnbUrl ?? ''}
                      onBlur={async (e) => {
                        await adminFetch(`/api/admin/properties/${p.id}`, token, {
                          method: 'PUT',
                          body: JSON.stringify({ ...p, icalAirbnbUrl: e.target.value }),
                        })
                      }}
                    />
                    <input
                      className="field"
                      placeholder="Booking.com iCal URL"
                      defaultValue={p.icalBookingUrl ?? ''}
                      onBlur={async (e) => {
                        await adminFetch(`/api/admin/properties/${p.id}`, token, {
                          method: 'PUT',
                          body: JSON.stringify({ ...p, icalBookingUrl: e.target.value }),
                        })
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manual date block-out</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <select
                className="field"
                value={blockForm.propertyId}
                onChange={(e) => setBlockForm({ ...blockForm, propertyId: e.target.value })}
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input className="field" placeholder="Note" value={blockForm.note} onChange={(e) => setBlockForm({ ...blockForm, note: e.target.value })} />
              <input className="field" type="date" value={blockForm.startDate} onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })} />
              <input className="field" type="date" value={blockForm.endDate} onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })} />
              <Button
                type="button"
                className="sm:col-span-2"
                onClick={async () => {
                  await adminFetch(`/api/admin/properties/${blockForm.propertyId}/blocks`, token, {
                    method: 'POST',
                    body: JSON.stringify(blockForm),
                  })
                  setMessage('Block created')
                }}
              >
                Block dates
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {section === 'tables' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Café capacity</CardTitle>
              <p className="mt-1 text-xs font-normal text-stone">
                Controls how many covers can be requested per lunch/dinner service. Pending + confirmed + seated count toward capacity.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="text-stone">Lunch covers</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={cafeCapacity.lunchCovers}
                  onChange={(e) => setCafeCapacity((c) => ({ ...c, lunchCovers: Number(e.target.value) || 1 }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone">Dinner covers</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={cafeCapacity.dinnerCovers}
                  onChange={(e) => setCafeCapacity((c) => ({ ...c, dinnerCovers: Number(e.target.value) || 1 }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone">Max party size</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={cafeCapacity.maxPartySize}
                  onChange={(e) => setCafeCapacity((c) => ({ ...c, maxPartySize: Number(e.target.value) || 1 }))}
                />
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="mb-2 text-sm text-stone">Open days</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const active = cafeCapacity.openDays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? 'border-gold bg-gold/10 text-charcoal'
                            : 'border-parchment bg-white text-stone'
                        }`}
                        onClick={() => {
                          setCafeCapacity((c) => ({
                            ...c,
                            openDays: active
                              ? c.openDays.filter((d) => d !== day.value)
                              : [...c.openDays, day.value].sort((a, b) => a - b),
                          }))
                        }}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      setMessage('')
                      const next = await adminFetch<CafeCapacity>('/api/admin/cafe-capacity', token, {
                        method: 'PUT',
                        body: JSON.stringify(cafeCapacity),
                      })
                      setCafeCapacity(next)
                      setMessage('Café capacity saved')
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to save capacity')
                    }
                  }}
                >
                  Save capacity
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Table holds</CardTitle>
              <p className="mt-1 text-xs font-normal text-stone">
                New requests start as <strong>pending</strong>. Confirm after WhatsApp/phone, or decline/cancel to free capacity.
                Use <strong>Edit</strong> to change date, time, guests, or guest details after speaking with the customer.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {holds.length === 0 ? (
                <p className="text-sm text-stone">No table holds yet.</p>
              ) : null}
              {holds.map((h) => {
                const party = String(h.partyDate).slice(0, 10)
                const expiresDay = String(h.expiresAt).slice(0, 10)
                const phone = String(h.phone ?? '').trim()
                const notes = String(h.notes ?? '').trim()
                const statusValue = HOLD_STATUSES.includes(h.status as (typeof HOLD_STATUSES)[number])
                  ? h.status
                  : 'pending'
                const isEditing = editingHoldId === h.id
                return (
                  <div
                    key={h.id}
                    className="rounded-lg border border-parchment px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-charcoal">
                          {h.holdNumber} — {h.fullName}{' '}
                          <span className={`text-xs font-semibold uppercase tracking-wide ${holdStatusClass(statusValue)}`}>
                            {statusValue}
                          </span>
                        </p>
                        <p className="text-stone">
                          Dining {party} · {h.slot} · {h.covers} covers
                          {statusValue === 'pending' ? ` · confirm by ${expiresDay}` : ''}
                        </p>
                        <p className="text-charcoal">
                          <span className="text-stone">Email:</span>{' '}
                          {h.email ? (
                            <a className="text-gold-deep underline-offset-2 hover:underline" href={`mailto:${h.email}`}>
                              {h.email}
                            </a>
                          ) : (
                            <span className="text-stone">—</span>
                          )}
                          {' · '}
                          <span className="text-stone">Phone:</span>{' '}
                          {phone ? (
                            <a
                              className="text-gold-deep underline-offset-2 hover:underline"
                              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                            >
                              {phone}
                            </a>
                          ) : (
                            <span className="text-stone">—</span>
                          )}
                        </p>
                        {notes ? <p className="text-stone">Notes: {notes}</p> : null}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              setEditingHoldId(isEditing ? null : h.id)
                              setHoldDraft({
                                fullName: h.fullName ?? '',
                                email: h.email ?? '',
                                phone: String(h.phone ?? ''),
                                partyDate: String(h.partyDate).slice(0, 10),
                                slot: h.slot === 'dinner' ? 'dinner' : 'lunch',
                                covers: String(h.covers ?? 2),
                                notes: String(h.notes ?? ''),
                                status: statusValue,
                              })
                            }}
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </Button>
                          {statusValue === 'pending' ? (
                            <>
                              <Button
                                type="button"
                                className="h-8 px-3 text-xs"
                                onClick={() => void updateHoldStatus(h.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 px-3 text-xs"
                                onClick={() => void updateHoldStatus(h.id, 'declined')}
                              >
                                Decline
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <select
                        className="field w-auto"
                        value={statusValue}
                        onChange={(e) => void updateHoldStatus(h.id, e.target.value)}
                      >
                        {HOLD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid gap-2 border-t border-parchment/70 pt-3 sm:grid-cols-2">
                        <label className="block text-xs text-stone">
                          Guest name
                          <input
                            className="field mt-1"
                            value={holdDraft.fullName}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, fullName: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Email
                          <input
                            className="field mt-1"
                            type="email"
                            value={holdDraft.email}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, email: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Phone
                          <input
                            className="field mt-1"
                            value={holdDraft.phone}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, phone: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Dining date
                          <input
                            className="field mt-1"
                            type="date"
                            value={holdDraft.partyDate}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, partyDate: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Service
                          <select
                            className="field mt-1"
                            value={holdDraft.slot}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, slot: e.target.value }))}
                          >
                            <option value="lunch">lunch</option>
                            <option value="dinner">dinner</option>
                          </select>
                        </label>
                        <label className="block text-xs text-stone">
                          Covers
                          <input
                            className="field mt-1"
                            type="number"
                            min={1}
                            value={holdDraft.covers}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, covers: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone sm:col-span-2">
                          Notes
                          <textarea
                            className="field mt-1 min-h-20"
                            value={holdDraft.notes}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, notes: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-stone">
                          Status
                          <select
                            className="field mt-1"
                            value={holdDraft.status}
                            onChange={(e) => setHoldDraft((d) => ({ ...d, status: e.target.value }))}
                          >
                            {HOLD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-end gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                setError('')
                                setMessage('')
                                await adminFetch(`/api/admin/table-holds/${h.id}`, token, {
                                  method: 'PUT',
                                  body: JSON.stringify({
                                    fullName: holdDraft.fullName,
                                    email: holdDraft.email,
                                    phone: holdDraft.phone,
                                    partyDate: holdDraft.partyDate,
                                    slot: holdDraft.slot,
                                    covers: Number(holdDraft.covers) || 1,
                                    notes: holdDraft.notes,
                                    status: holdDraft.status,
                                  }),
                                })
                                setMessage('Table hold updated')
                                setEditingHoldId(null)
                                await load()
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Failed to update hold')
                              }
                            }}
                          >
                            Save changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingHoldId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
