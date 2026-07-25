import Stripe from 'stripe'

let stripeSingleton = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!stripeSingleton) stripeSingleton = new Stripe(key)
  return stripeSingleton
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY)
}

export function getPublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? ''
}

export function getCurrency() {
  return (process.env.STRIPE_CURRENCY ?? 'aud').toLowerCase()
}

/** Convert AUD dollars to Stripe cents */
export function toStripeAmount(dollars) {
  return Math.round(Number(dollars) * 100)
}
