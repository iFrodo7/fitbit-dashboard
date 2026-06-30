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

    // Plan: 'monthly' (default) o 'annual' (bundle Fitbit Air). Moneda: 'usd' (default) o 'mxn'.
    const plan = body.plan === 'annual' ? 'annual' : 'monthly'
    const currency = body.currency === 'mxn' ? 'mxn' : 'usd'

    // Precios en la unidad mínima (centavos / centavos MXN).
    const PRICING = {
      monthly: { usd: 999, mxn: 17900 },     // $9.99 / $179
      annual:  { usd: 7900, mxn: 149900 },   // $79   / $1,499  (~30% off vs mensual)
    } as const

    const unitAmount = PRICING[plan][currency]
    const interval = plan === 'annual' ? 'year' : 'month'
    const planName = plan === 'annual' ? 'AIRA PRO Anual' : 'AIRA PRO'
    const planDesc = plan === 'annual'
      ? '12 meses de AIRA PRO — Coach IA ilimitado, temas exclusivos y todas las funciones premium'
      : 'Coach IA avanzado, análisis ilimitado y acceso a todas las funciones premium'

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
            currency,
            product_data: {
              name: planName,
              description: planDesc,
              images: [`${appUrl}/icons/icon-192.png`],
            },
            unit_amount: unitAmount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app.html?payment=success`,
      cancel_url: `${appUrl}/app.html?payment=canceled`,
      metadata: { user_id: userId, plan },
      subscription_data: {
        // El plan anual no lleva trial: los "2 meses gratis" ya están en el precio.
        ...(plan === 'annual' ? {} : { trial_period_days: 7 }),
        metadata: { user_id: userId, plan },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
