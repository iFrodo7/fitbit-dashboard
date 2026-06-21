import crypto from 'crypto'

const PIXEL_ID = process.env.META_PIXEL_ID!
const CAPI_TOKEN = process.env.META_CAPI_TOKEN!
const API_VERSION = 'v19.0'

function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

interface PurchaseEventData {
  email?: string
  value: number      // en USD
  currency: string   // 'USD'
  orderId: string    // stripe checkout session id
}

export async function sendMetaPurchaseEvent(data: PurchaseEventData) {
  if (!PIXEL_ID || !CAPI_TOKEN) {
    console.warn('[meta-capi] Missing META_PIXEL_ID or META_CAPI_TOKEN — skipping')
    return
  }

  const userData: Record<string, string> = {}
  if (data.email) userData.em = hash(data.email)

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: userData,
        custom_data: {
          value: data.value,
          currency: data.currency,
          order_id: data.orderId,
        },
      },
    ],
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[meta-capi] error:', err)
  } else {
    console.log('[meta-capi] Purchase event sent for order', data.orderId)
  }
}
