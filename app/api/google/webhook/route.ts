import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPush, pushConfigured, type WebPushSub } from "@/lib/push";

// ── POST /api/google/webhook ──────────────────────────────────────────────────
// Receptor de notificaciones de la Google Health API (webhook subscriptions).
//
// Google llama aquí cuando llegan datos NUEVOS de un usuario a su nube (tras el
// sync Bluetooth Fitbit Air → app Google Health → cloud). El payload trae el
// healthUserId, el dataType y la operación (UPSERT/DELETE). Mapeamos
// healthUserId → email (guardado al conectar vía GET users/me/identity) y
// disparamos un Web Push a los dispositivos de ese usuario para que AIRA
// re-fetchee la métrica fresca SIN que el usuario tenga que abrir Google Health.
//
// Contrato con Google (ver https://developers.google.com/health/webhooks):
//  · El secreto de la subscription llega en el header Authorization de cada
//    notificación. Lo validamos contra GH_WEBHOOK_SECRET.
//  · Verificación del subscriber (confirmada al registrar 2026-06-20): Google
//    envía {"type":"verification"} DOS veces — una CON el secret (hay que
//    devolver el body en eco con 200) y otra SIN auth (hay que rechazar 401).
//    También sondea con GET → debe responder 2xx.
//  · Hay que responder 2xx (204) rápido. Si fallamos, Google reintenta con
//    backoff hasta 7 días — así que nunca devolvemos 5xx por un error de push.
// Google sends GET probes during subscriber verification — must return 2xx.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  // Read body first — needed to detect verification challenges before auth check.
  let rawBody = '';
  try { rawBody = await req.text(); } catch { /* ignore */ }

  // ── 1. Autenticación ─────────────────────────────────────────────────────────
  const secret = process.env.GH_WEBHOOK_SECRET;
  const authHeader = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();

  // ── Verification challenge: Google sends {"type":"verification"} WITH the secret ──
  // Must validate auth first, then echo the body.
  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); } catch { /* not JSON */ }
  const isVerification = parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>).type === 'verification';

  if (isVerification) {
    // Authorized challenge → echo the body, proving we hold the secret.
    if (authHeader && secret && authHeader === secret) {
      return new NextResponse(rawBody, { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Missing OR wrong secret → MUST reject. Google's verification deliberately
    // sends an unauthenticated challenge to confirm the endpoint enforces auth.
    return new NextResponse(null, { status: 401 });
  }

  // ── Normal notifications: require valid auth ──────────────────────────────────
  if (!authHeader) return new NextResponse(null, { status: 204 });
  if (!secret || authHeader !== secret) {
    return new NextResponse(null, { status: 401 });
  }

  // ── 2. Parseo defensivo del payload ──────────────────────────────────────────
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return new NextResponse(null, { status: 204 }); }

  const notes: Array<Record<string, unknown>> =
    Array.isArray((payload as { notifications?: unknown })?.notifications)
      ? (payload as { notifications: Array<Record<string, unknown>> }).notifications
      : Array.isArray(payload)
        ? (payload as Array<Record<string, unknown>>)
        : [payload as Record<string, unknown>];

  const healthUserIds = Array.from(
    new Set(notes.map((n) => n?.healthUserId).filter(Boolean) as string[])
  );
  if (!healthUserIds.length) return new NextResponse(null, { status: 204 });

  // ── 3. healthUserId → email → suscripciones push de ese usuario ───────────────
  // Errores de DB/push NO deben provocar 5xx (Google reintentaría 7 días). Best-effort.
  try {
    const db = createServiceClient();

    const { data: users } = await db
      .from("app_user_prefs")
      .select("email, gh_user_id")
      .in("gh_user_id", healthUserIds);

    const emails = Array.from(
      new Set((users ?? []).map((u) => u.email).filter(Boolean) as string[])
    );

    // DEBUG temporal — quitar tras confirmar el pipeline end-to-end
    let _sent = 0, _subCount = 0;
    if (emails.length && pushConfigured) {
      const { data: subs } = await db
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("email", emails);

      _subCount = (subs ?? []).length;
      const stale: string[] = [];
      for (const s of subs ?? []) {
        const sub: WebPushSub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
        // Push de "data-sync": el service worker lo intercepta y dispara un
        // re-fetch silencioso. tag fijo → coalesce si llegan varias seguidas.
        const res = await sendPush(sub, { title: "", tag: "gh-sync", url: "/?ghsync=1" });
        if (res.gone) stale.push(s.endpoint); else _sent++;
      }
      if (stale.length) await db.from("push_subscriptions").delete().in("endpoint", stale);
    }
    // DEBUG temporal
    console.log('[webhook-debug] healthUserIds=' + healthUserIds.length + ' emails=' + emails.length + ' subs=' + _subCount + ' pushed=' + _sent + ' pushConfigured=' + pushConfigured);
  } catch {
    // tragamos: ya validamos a Google; el push es best-effort.
  }

  return new NextResponse(null, { status: 204 });
}
