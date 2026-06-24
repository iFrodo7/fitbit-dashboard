import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPush, pushConfigured, type WebPushSub } from "@/lib/push";
import { decideNotif, localParts, type NotifSignal, type NotifState } from "@/lib/notif";

// ── GET /api/push/cron ────────────────────────────────────────────────────────
// Tick HORARIO del cron (Vercel Cron → vercel.json: "0 * * * *").
// Por cada usuario con notificaciones activas, lee su SEÑAL DERIVADA (notif_signal)
// y decide si toca un push según SU hora local: resumen matutino (7am) o racha en
// riesgo (7pm). El horario silencioso queda respetado por construcción (solo se
// dispara a esas dos horas). notif_state guarda los flags "ya enviado hoy" para
// el tope 1–2/día. El server NO procesa pasos crudos → solo lee la señal derivada.
//
// Nota de plataforma: el tick horario requiere un plan de Vercel que permita crons
// sub-diarios. En Hobby (1/día) el endpoint sigue siendo correcto pero solo cubrirá
// una de las dos ventanas por día.
export async function GET(request: NextRequest) {
  if (!pushConfigured) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const db = createServiceClient();

  // Usuarios con señal de notificaciones (los que tienen el toggle global apagado
  // se filtran por notif_pref === false).
  let users: Array<Record<string, unknown>> = [];
  try {
    const { data, error } = await db
      .from("app_user_prefs")
      .select("email, lang, notif_pref, notif_signal, notif_state");
    if (error) {
      // Migración 014 aún no aplicada → no-op limpio (no es un fallo del cron).
      if (/notif_signal|notif_state/i.test(error.message)) {
        return NextResponse.json({ ok: true, skipped: "migration 014 pending" });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    users = data ?? [];
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  let sent = 0;
  let evaluated = 0;
  const cleaned: string[] = [];

  for (const u of users) {
    const email = u.email as string | null;
    if (!email) continue;
    if (u.notif_pref === false) continue;
    const sig = u.notif_signal as NotifSignal | null;
    if (!sig) continue;
    evaluated++;

    const lang = (u.lang as string) || "es";
    const state = (u.notif_state as NotifState | null) ?? null;
    const decision = decideNotif(sig, state, now, lang);
    if (!decision) continue;

    // Suscripciones del usuario.
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("email", email);
    if (!subs || !subs.length) continue;

    let deliveredAny = false;
    for (const s of subs) {
      const sub: WebPushSub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      const res = await sendPush(sub, {
        title: decision.title,
        body: decision.body,
        tag: decision.tag,
        url: "/app.html",
      });
      if (res.ok) { deliveredAny = true; sent++; }
      else if (res.gone) cleaned.push(s.endpoint);
    }

    // Marca "enviado hoy" para no repetir en ticks posteriores (tope 1–2/día).
    if (deliveredAny) {
      const localDate = localParts(now, sig.tzOffset || 0).date;
      const prev: NotifState = state && state.date === localDate ? state : { date: localDate };
      const next: NotifState = {
        date: localDate,
        morningSent: prev.morningSent || decision.kind === "morning",
        streakSent: prev.streakSent || decision.kind === "streak",
      };
      await db.from("app_user_prefs").update({ notif_state: next }).eq("email", email);
    }
  }

  if (cleaned.length) {
    await db.from("push_subscriptions").delete().in("endpoint", cleaned);
  }

  return NextResponse.json({ ok: true, sent, evaluated, cleaned: cleaned.length });
}
