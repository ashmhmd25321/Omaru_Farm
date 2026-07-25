/**
 * Dynamic shipping quote from shipping_rules rows.
 * postcode_prefixes: comma-separated prefixes, or "*" for catch-all.
 */
export function matchShippingRule(rules, postcode) {
  const pc = String(postcode ?? '').replace(/\s+/g, '').trim()
  const active = (rules ?? [])
    .filter((r) => r.is_active === 1 || r.is_active === true || r.isActive === true)
    .sort((a, b) => Number(a.sort_order ?? a.sortOrder ?? 100) - Number(b.sort_order ?? b.sortOrder ?? 100))

  let fallback = null
  for (const rule of active) {
    const prefixes = String(rule.postcode_prefixes ?? rule.postcodePrefixes ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (prefixes.includes('*')) {
      fallback = rule
      continue
    }
    if (prefixes.some((prefix) => pc.startsWith(prefix))) return rule
  }
  return fallback
}

export function computeShippingQuote({
  rules,
  postcode,
  subtotal,
  totalWeightGrams,
  method = 'delivery',
}) {
  if (method === 'pickup') {
    return {
      method: 'pickup',
      fee: 0,
      ruleName: 'Farm pickup',
      breakdown: { baseFee: 0, weightFee: 0, freeShippingApplied: false, weightKg: 0 },
    }
  }

  const rule = matchShippingRule(rules, postcode)
  if (!rule) {
    return {
      method: 'delivery',
      fee: 0,
      ruleName: 'No matching rule',
      breakdown: { baseFee: 0, weightFee: 0, freeShippingApplied: false, weightKg: 0, error: 'NO_RULE' },
    }
  }

  const weightKg = Math.max(0, Number(totalWeightGrams ?? 0) / 1000)
  const baseFee = Number(rule.base_fee ?? rule.baseFee ?? 0)
  const perKg = Number(rule.per_kg_fee ?? rule.perKgFee ?? 0)
  const freeOver = rule.free_over ?? rule.freeOver
  const weightFee = +(weightKg * perKg).toFixed(2)
  let fee = +(baseFee + weightFee).toFixed(2)
  let freeShippingApplied = false
  if (freeOver != null && Number(freeOver) > 0 && Number(subtotal) >= Number(freeOver)) {
    fee = 0
    freeShippingApplied = true
  }

  return {
    method: 'delivery',
    fee,
    ruleName: String(rule.name ?? 'Shipping'),
    ruleId: rule.id,
    breakdown: {
      baseFee,
      weightFee,
      freeShippingApplied,
      freeOver: freeOver != null ? Number(freeOver) : null,
      weightKg: +weightKg.toFixed(3),
    },
  }
}
