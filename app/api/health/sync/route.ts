import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// ── GET /api/health/sync ──────────────────────────────────────────────────────
// Reporta si la cadena de sync (Google Health → webhook → push) sigue viva,
// según la antigüedad del último latido que el webhook escribió en system_health.
// 200 = sano · 503 = caído (Google no entrega hace >STALE_HOURS). Un GitHub
// Action lo revisa cada 6h con `curl --fail` y avisa si devuelve 503.
//
// La gente genera datos de pasos/sueño a diario, así que un hueco de >24h casi
// siempre = webhook roto (no falso positivo por la noche).
const STALE_HOURS = 24;

export async function GET() {
  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("system_health")
      .select("ts")
      .eq("id", "gh_webhook_last")
      .single();

    // "Aún no configurado" (migración 015 pendiente o sin primer latido) NO es una
    // caída → 200 para no disparar falsas alarmas. El 503 se reserva para un latido
    // que SÍ existió pero quedó viejo (caída real y accionable).
    if (error) {
      return NextResponse.json({ healthy: true, configured: false, reason: "system_health no disponible (¿migración 015?)" });
    }
    if (!data?.ts) {
      return NextResponse.json({ healthy: true, configured: false, reason: "sin latido todavía (el webhook no ha recibido datos)" });
    }

    const ageHours = +((Date.now() - new Date(data.ts).getTime()) / 3_600_000).toFixed(1);
    const healthy = ageHours <= STALE_HOURS;
    return NextResponse.json(
      { healthy, lastWebhookAt: data.ts, ageHours, thresholdHours: STALE_HOURS },
      { status: healthy ? 200 : 503 }
    );
  } catch (e) {
    return NextResponse.json({ healthy: false, error: String(e) }, { status: 503 });
  }
}
