import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user_id)
    .single()

  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: 'No se encontró suscripción' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fitbit-dashboard-zeta.vercel.app'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${appUrl}/app.html`,
  })

  return NextResponse.json({ url: portalSession.url })
}
