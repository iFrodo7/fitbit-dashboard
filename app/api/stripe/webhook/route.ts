import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendMetaPurchaseEvent } from '@/lib/meta-capi'

export const runtime = 'nodejs'

// En la API 2026-05-27.dahlia, current_period_end se movió del objeto Subscription
// al item (subscription.items.data[].current_period_end). Leemos de ambos y toleramos
// undefined para no romper el webhook (un Date inválido lanzaba RangeError y abortaba
// el upsert → PRO nunca se activaba).
function periodEndISO(sub: any): string | null {
  const ts = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[stripe/webhook] signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      if (!userId || !session.subscription) break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string)

      const { error: upErr } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: sub.id,
        status: 'active',
        plan: 'pro',
        current_period_end: periodEndISO(sub),
      }, { onConflict: 'user_id' })

      // Si el upsert falla (p.ej. falta la constraint UNIQUE en user_id), devolvemos
      // 500 para que Stripe reintente y el fallo sea visible en logs — NO 200 mudo.
      if (upErr) {
        console.error('[stripe/webhook] upsert subscriptions (checkout) falló:', upErr.message)
        return NextResponse.json({ error: 'db upsert failed' }, { status: 500 })
      }

      await sendMetaPurchaseEvent({
        email: session.customer_details?.email ?? undefined,
        value: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'usd').toUpperCase(),
        orderId: session.id,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      if (!userId) break

      const { error: updErr } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: sub.id,
        status: sub.status === 'active' ? 'active' : sub.status as any,
        plan: sub.status === 'active' ? 'pro' : 'free',
        current_period_end: periodEndISO(sub),
      }, { onConflict: 'user_id' })
      if (updErr) {
        console.error('[stripe/webhook] upsert subscriptions (updated) falló:', updErr.message)
        return NextResponse.json({ error: 'db upsert failed' }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      if (!userId) break

      const { error: delErr } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: sub.id,
        status: 'canceled',
        plan: 'free',
        current_period_end: null,
      }, { onConflict: 'user_id' })
      if (delErr) {
        console.error('[stripe/webhook] upsert subscriptions (deleted) falló:', delErr.message)
        return NextResponse.json({ error: 'db upsert failed' }, { status: 500 })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      await supabase.from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
