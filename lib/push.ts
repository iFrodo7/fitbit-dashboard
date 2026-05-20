import webpush from "web-push";

// Web Push (VAPID) config. Genera las llaves con: npx web-push generate-vapid-keys
// y ponlas en .env.local / Vercel env:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@email)
const PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@fitbitair.app";

export const pushConfigured = Boolean(PUBLIC && PRIVATE);
export const vapidPublicKey = PUBLIC;

if (pushConfigured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
}

export interface PushPayload {
  title: string;
  body?: string;
  tag?: string;
  url?: string;
  icon?: string;
}

export interface WebPushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Envía una notificación a una suscripción. Devuelve { ok } o { gone:true }
 * cuando la suscripción expiró/se revocó (404/410) para poder limpiarla.
 */
export async function sendPush(sub: WebPushSub, payload: PushPayload) {
  if (!pushConfigured) return { ok: false, error: "VAPID not configured" };
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return { ok: true };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, error: String(err) };
  }
}
