import { NextResponse } from "next/server";
import { vapidPublicKey, pushConfigured } from "@/lib/push";

// El cliente (app.html) hace GET aquí para obtener la VAPID public key
// y suscribirse al push. Si no está configurada, devuelve 503 y el cliente
// simplemente no se suscribe (las notificaciones locales siguen funcionando).
export async function GET() {
  if (!pushConfigured) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: vapidPublicKey });
}
