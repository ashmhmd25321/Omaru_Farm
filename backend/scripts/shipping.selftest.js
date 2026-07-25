import { computeShippingQuote, matchShippingRule } from '../src/commerce/shipping.js'

const rules = [
  { id: 1, name: 'Metro', postcode_prefixes: '3000,3001', base_fee: 12, per_kg_fee: 2.5, free_over: 150, sort_order: 10, is_active: 1 },
  { id: 2, name: 'Default', postcode_prefixes: '*', base_fee: 25, per_kg_fee: 4.5, free_over: 250, sort_order: 100, is_active: 1 },
]

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(matchShippingRule(rules, '3000')?.name === 'Metro', 'metro match')
assert(matchShippingRule(rules, '4000')?.name === 'Default', 'fallback match')

const q1 = computeShippingQuote({ rules, postcode: '3000', subtotal: 40, totalWeightGrams: 1000, method: 'delivery' })
assert(q1.fee === 14.5, `expected 14.5 got ${q1.fee}`)

const q2 = computeShippingQuote({ rules, postcode: '3000', subtotal: 160, totalWeightGrams: 1000, method: 'delivery' })
assert(q2.fee === 0 && q2.breakdown.freeShippingApplied, 'free shipping')

const q3 = computeShippingQuote({ rules, postcode: '3000', subtotal: 40, totalWeightGrams: 1000, method: 'pickup' })
assert(q3.fee === 0 && q3.method === 'pickup', 'pickup free')

console.log('shipping.selftest.ok')
