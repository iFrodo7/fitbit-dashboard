import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/fitbit/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();

  // Guardar state para validar en callback (CSRF protection)
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutos
    path: "/",
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
