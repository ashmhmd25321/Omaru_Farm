import {
  chargeableGrams,
  computeShippingQuote,
  DEFAULT_SHIPPING_MATRIX,
  matchShippingRule,
} from '../src/commerce/shipping.js'
import { pickRecommendedService, packageDimensionsCm } from '../src/commerce/auspost.js'

const rules = DEFAULT_SHIPPING_MATRIX.map((r, id) => ({
  id: id + 1,
  name: r.name,
  postcode_prefixes: r.postcodePrefixes,
  base_fee: r.baseFee,
  per_kg_fee: r.perKgFee,
  free_over: r.freeOver,
  sort_order: r.sortOrder,
  is_active: 1,
}))

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(matchShippingRule(rules, '3922')?.name === 'Phillip Island / Bass Coast', 'Phillip Island 3922')
assert(matchShippingRule(rules, '3000')?.name === 'Metro Melbourne', 'Melbourne 3000')
assert(matchShippingRule(rules, '3550')?.name === 'Regional VIC', 'Bendigo 3550')
assert(matchShippingRule(rules, '2000')?.name === 'NSW / ACT', 'Sydney 2000')
assert(matchShippingRule(rules, '4000')?.name === 'QLD', 'Brisbane 4000')
assert(matchShippingRule(rules, '5000')?.name === 'SA', 'Adelaide 5000')
assert(matchShippingRule(rules, '7000')?.name === 'TAS', 'Hobart 7000')
assert(matchShippingRule(rules, '6000')?.name === 'WA', 'Perth 6000')
assert(matchShippingRule(rules, '0800')?.name === 'NT', 'Darwin 0800')
assert(matchShippingRule(rules, '9999')?.name === 'Rest of AU (default)', 'fallback')
assert(matchShippingRule(rules, '') == null, 'empty postcode does not use catch-all')

// Mixed cart: 500g oil + 1500g hamper = 2kg to Melbourne → $12 + 2*2.50 = $17
const mixedMelbourne = computeShippingQuote({
  rules,
  postcode: '3000',
  subtotal: 48,
  totalWeightGrams: 500 + 1500,
  method: 'delivery',
})
assert(mixedMelbourne.fee === 17, `mixed Melbourne expected 17 got ${mixedMelbourne.fee}`)

// Same mixed cart to Phillip Island → $10 + 2*2.00 = $14
const mixedIsland = computeShippingQuote({
  rules,
  postcode: '3922',
  subtotal: 48,
  totalWeightGrams: 2000,
  method: 'delivery',
})
assert(mixedIsland.fee === 14, `mixed Island expected 14 got ${mixedIsland.fee}`)

// Same mixed cart interstate NSW → $18 + 2*3.50 = $25
const mixedNsw = computeShippingQuote({
  rules,
  postcode: '2010',
  subtotal: 48,
  totalWeightGrams: 2000,
  method: 'delivery',
})
assert(mixedNsw.fee === 25, `mixed NSW expected 25 got ${mixedNsw.fee}`)

const freeShip = computeShippingQuote({
  rules,
  postcode: '3000',
  subtotal: 150,
  totalWeightGrams: 2000,
  method: 'delivery',
})
assert(freeShip.fee === 0 && freeShip.breakdown.freeShippingApplied, 'free over metro')

const pickup = computeShippingQuote({
  rules,
  postcode: '3000',
  subtotal: 48,
  totalWeightGrams: 2000,
  method: 'pickup',
})
assert(pickup.fee === 0 && pickup.method === 'pickup', 'pickup free')

// Volume: 20L box (20,000 cm³) / 5000 = 4kg volumetric vs 1kg actual → charge 4kg
assert(chargeableGrams({ weightGrams: 1000, volumeCm3: 20000 }) === 4000, 'volumetric wins')
assert(chargeableGrams({ weightGrams: 5000, volumeCm3: 20000 }) === 5000, 'actual wins when heavier')
assert(chargeableGrams({ weightGrams: 1000, volumeCm3: 0 }) === 1000, 'no volume uses actual')

const bulky = computeShippingQuote({
  rules,
  postcode: '3000',
  subtotal: 40,
  totalWeightGrams: 1000,
  totalVolumeCm3: 20000,
  method: 'delivery',
})
assert(bulky.fee === 22, `bulky Melbourne expected 22 (12+4*2.5) got ${bulky.fee}`)
assert(bulky.breakdown.chargeableKg === 4, 'chargeable 4kg')

const recommended = pickRecommendedService([
  { code: 'AUS_PARCEL_EXPRESS', name: 'Express Post', price: 18.5 },
  { code: 'AUS_PARCEL_REGULAR', name: 'Parcel Post', price: 12.2 },
])
assert(recommended?.code === 'AUS_PARCEL_REGULAR', 'prefer Parcel Post')

const dims = packageDimensionsCm(0)
assert(dims.length >= dims.width && dims.width >= dims.height, 'dimension order L>=W>=H')

console.log('shipping.selftest.ok')
