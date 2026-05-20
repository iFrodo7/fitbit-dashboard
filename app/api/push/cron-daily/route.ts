import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPush, pushConfigured, type WebPushSub } from "@/lib/push";

// Recordatorio diario (Vercel Cron, ver vercel.json → 08:00).
// Vercel Cron envía `Authorization: Bearer $CRON_SECRET`. Validamos eso.
// Hace broadcast de un recordatorio de sincronización a todas las suscripciones.
export async function GET(request: NextRequest) {
  if (!pushConfigured) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = {
    title: "Fitbit Air",
    body: "Buenos días ☀️ Sincroniza para ver tu Recovery de hoy.",
    tag: "daily-reminder",
    url: "/app.html",
  };

  let sent = 0;
  const stale: string[] = [];
  for (const s of subs ?? []) {
    const sub: WebPushSub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    const res = await sendPush(sub, payload);
    if (res.ok) sent++;
    else if (res.gone) stale.push(s.endpoint);
  }
  if (stale.length) await db.from("push_subscriptions").delete().in("endpoint", stale);

  return NextResponse.json({ ok: true, sent, cleaned: stale.length, total: subs?.length ?? 0 });
}
