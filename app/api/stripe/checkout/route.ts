import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const body = await req.json()
    const userId = body.user_id as string | undefined

    if (!userId) {
      return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fitbit-dashboard-zeta.vercel.app'

    // Buscar o crear customer en Stripe
    const { data: existing } = await supabase
      .from('subscriptions' as any)
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = (existing as any)?.stripe_customer_id as string | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
      })
      customerId = customer.id
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AIRA PRO',
              description: 'Coach IA avanzado, análisis ilimitado y acceso a todas las funciones premium',
              images: [`${appUrl}/icons/icon-192.png`],
            },
            unit_amount: 999, // $9.99
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/public/app.html?payment=success`,
      cancel_url: `${appUrl}/public/app.html?payment=canceled`,
      metadata: { user_id: userId },
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: userId },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
