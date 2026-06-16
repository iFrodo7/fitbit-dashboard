import Stripe from 'stripe'

// Lazy: constructing Stripe with an empty key throws immediately, which
// crashes `next build` page-data collection in any environment without
// STRIPE_SECRET_KEY set (e.g. Preview deployments). Only instantiate when
// the key is present; routes that actually use `stripe` without one will
// fail at request time instead, which is the correct place for that error.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })
  : (null as unknown as Stripe)

export const AIRA_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? ''
