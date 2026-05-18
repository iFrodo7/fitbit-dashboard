import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/fitbit/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  // Validaciones
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeCode(code);
    const db = createServiceClient();

    // Generar user_id interno si es primera vez
    const { data: existing } = await db
      .from("fitbit_sessions")
      .select("user_id")
      .eq("fitbit_user_id", tokens.user_id)
      .maybeSingle();

    const userId = (existing as { user_id: string } | null)?.user_id ?? crypto.randomUUID();

    // Upsert sesión
    await db.from("fitbit_sessions").upsert(
      {
        user_id: userId,
        fitbit_user_id: tokens.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
      },
      { onConflict: "fitbit_user_id" }
    );

    // Preferencias por defecto si son nuevas
    await db.from("user_preferences").upsert(
      { user_id: userId, theme: "futuristic", language: "es" },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    // Cookie de sesión (httpOnly, no contiene tokens)
    cookieStore.set("fbd_session", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    cookieStore.delete("oauth_state");

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
