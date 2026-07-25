import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiUrl } from '@/utils/api'

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
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
  partyDate: string
  slot: string
  covers: number
  status: string
  expiresAt: string
}

type Sales = {
  storeOrders: number
  storeRevenue: number
  stayBookings: number
  stayRevenue: number
  onlineRevenue: number
}

export function AdminCommercePanels({ section }: { section: 'orders' | 'shipping' | 'stays' | 'tables' | 'sales' }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [holds, setHolds] = useState<TableHold[]>([])
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
      if (section === 'orders') setOrders(await adminFetch('/api/admin/orders'))
      if (section === 'shipping') setRules(await adminFetch('/api/admin/shipping-rules'))
      if (section === 'stays') setProperties(await adminFetch('/api/admin/properties'))
      if (section === 'tables') setHolds(await adminFetch('/api/admin/table-holds'))
      if (section === 'sales') setSales(await adminFetch('/api/admin/sales-summary'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    }
  }, [section])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

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
                    await adminFetch(`/api/admin/orders/${o.id}`, {
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
                  await adminFetch('/api/admin/shipping-rules', {
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
                  const result = await adminFetch<{ imported: number }>('/api/admin/ical-sync', { method: 'POST' })
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
                        await adminFetch(`/api/admin/properties/${p.id}`, {
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
                        await adminFetch(`/api/admin/properties/${p.id}`, {
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
                        await adminFetch(`/api/admin/properties/${p.id}`, {
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
                  await adminFetch(`/api/admin/properties/${blockForm.propertyId}/blocks`, {
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
        <Card>
          <CardHeader>
            <CardTitle>Table holds (24h expiry)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {holds.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-parchment px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold">
                    {h.holdNumber} — {h.fullName}
                  </p>
                  <p className="text-stone">
                    {String(h.partyDate).slice(0, 10)} · {h.slot} · {h.covers} covers · {h.status} · expires {String(h.expiresAt)}
                  </p>
                </div>
                <select
                  className="field w-auto"
                  value={h.status}
                  onChange={async (e) => {
                    await adminFetch(`/api/admin/table-holds/${h.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ status: e.target.value }),
                    })
                    await load()
                  }}
                >
                  <option value="held">held</option>
                  <option value="seated">seated</option>
                  <option value="cancelled">cancelled</option>
                  <option value="expired">expired</option>
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
