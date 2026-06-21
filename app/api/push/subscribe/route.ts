import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

// El cliente envía aquí su PushSubscription (endpoint + keys) tras suscribirse.
// user_id es opcional: si hay cookie de sesión la asociamos; si no, queda anónima
// (la app es personal). El endpoint es único → upsert.
export async function POST(request: NextRequest) {
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  // email: dueño de la suscripción → el webhook de Google Health lo usa para
  // dirigir el push de datos al dispositivo correcto (ver /api/google/webhook).
  const email = body?.email?.toLowerCase().trim() || null;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("fbd_session")?.value ?? null;

  const db = createServiceClient();
  const { error } = await db
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        email,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get("user-agent"),
        last_seen: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Permite al cliente darse de baja (al desactivar notificaciones).
export async function DELETE(request: NextRequest) {
  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
