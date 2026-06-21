import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPush, pushConfigured, type WebPushSub } from "@/lib/push";

// ── POST /api/google/webhook ──────────────────────────────────────────────────
// Receptor de notificaciones de la Google Health API (webhook subscriptions).
//
// Google llama aquí cuando llegan datos NUEVOS de un usuario a su nube (tras el
// sync Bluetooth Fitbit Air → app Google Health → cloud). El payload trae el
// healthUserId, el dataType y la operación (UPSERT/DELETE). Mapeamos
// healthUserId → email (guardado al conectar vía users/me:getIdentity) y
// disparamos un Web Push a los dispositivos de ese usuario para que AIRA
// re-fetchee la métrica fresca SIN que el usuario tenga que abrir Google Health.
//
// Contrato con Google (ver https://developers.google.com/health/webhooks):
//  · El secreto de la subscription llega en el header Authorization de cada
//    notificación. Lo validamos contra GH_WEBHOOK_SECRET.
//  · Hay que responder 2xx (204) rápido. Si fallamos, Google reintenta con
//    backoff hasta 7 días — así que nunca devolvemos 5xx por un error de push.
//
// ⚠️ PENDIENTE DE VERIFICAR contra una notificación real (forma exacta del
//    envelope y del header Authorization). Marcado con TODO donde aplica.
// Google sends GET probes during subscriber verification — must return 2xx.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  // Read body first — needed to detect verification challenges before auth check.
  let rawBody = '';
  try { rawBody = await req.text(); } catch { /* ignore */ }

  // ── Verification challenge: Google sends {"type":"verification"} (with or without auth) ──
  // Echo the body back so the verification check passes.
  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); } catch { /* not JSON */ }
  if (parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>).type === 'verification') {
    return new NextResponse(rawBody, { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ── 1. Autenticación: el secreto de la subscription en Authorization ──────────
  const secret = process.env.GH_WEBHOOK_SECRET;
  const authHeader = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
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

    if (emails.length && pushConfigured) {
      const { data: subs } = await db
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("email", emails);

      const stale: string[] = [];
      for (const s of subs ?? []) {
        const sub: WebPushSub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
        // Push de "data-sync": el service worker lo intercepta y dispara un
        // re-fetch silencioso. tag fijo → coalesce si llegan varias seguidas.
        const res = await sendPush(sub, { title: "", tag: "gh-sync", url: "/?ghsync=1" });
        if (res.gone) stale.push(s.endpoint);
      }
      if (stale.length) await db.from("push_subscriptions").delete().in("endpoint", stale);
    }
  } catch {
    // tragamos: ya validamos a Google; el push es best-effort.
  }

  return new NextResponse(null, { status: 204 });
}
