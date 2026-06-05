import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ plan: 'free', status: 'inactive' })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (!data || data.status !== 'active') {
    return NextResponse.json({ plan: 'free', status: 'inactive' })
  }

  return NextResponse.json({
    plan: data.plan,
    status: data.status,
    current_period_end: data.current_period_end,
  })
}
