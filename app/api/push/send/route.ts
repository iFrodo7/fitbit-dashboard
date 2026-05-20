import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPush, pushConfigured, type PushPayload, type WebPushSub } from "@/lib/push";

// Dispara una notificación a todas las suscripciones (app personal → broadcast).
// Protegido por PUSH_ADMIN_SECRET (header `x-push-secret`).
// Pensado para llamarse desde un Vercel Cron o manualmente:
//   POST /api/push/send  { "title": "...", "body": "..." }
export async function POST(request: NextRequest) {
  if (!pushConfigured) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  const secret = process.env.PUSH_ADMIN_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PushPayload;
  try {
    const body = await request.json();
    if (!body?.title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
    payload = { title: body.title, body: body.body, tag: body.tag, url: body.url, icon: body.icon };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  const stale: string[] = [];
  for (const s of subs ?? []) {
    const sub: WebPushSub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    const res = await sendPush(sub, payload);
    if (res.ok) sent++;
    else if (res.gone) stale.push(s.endpoint);
  }
  // Limpia suscripciones revocadas/expiradas
  if (stale.length) await db.from("push_subscriptions").delete().in("endpoint", stale);

  return NextResponse.json({ ok: true, sent, cleaned: stale.length, total: subs?.length ?? 0 });
}
