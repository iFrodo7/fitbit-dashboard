import { createServiceClient } from "@/lib/supabase/server";

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";

const SCOPES = [
  "activity",
  "heartrate",
  "location",
  "nutrition",
  "profile",
  "settings",
  "sleep",
  "social",
  "weight",
].join(" ");

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.FITBIT_CLIENT_ID!,
    redirect_uri: process.env.FITBIT_REDIRECT_URI!,
    scope: SCOPES,
    state,
    expires_in: "604800", // 7 días
  });
  return `${FITBIT_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const credentials = Buffer.from(
    `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.FITBIT_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

export async function refreshAccessToken(
  userId: string
): Promise<TokenResponse> {
  const db = createServiceClient();
  const { data: session, error } = await db
    .from("fitbit_sessions")
    .select("refresh_token")
    .eq("user_id", userId)
    .single();

  if (error || !session) throw new Error("Session not found");

  const credentials = Buffer.from(
    `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refresh_token,
    }),
  });

  if (!res.ok) throw new Error("Token refresh failed");
  const tokens: TokenResponse = await res.json();

  await db.from("fitbit_sessions").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq("user_id", userId);

  return tokens;
}

/** Obtiene un access_token válido, refrescando si es necesario */
export async function getValidToken(userId: string): Promise<string> {
  const db = createServiceClient();
  const { data: session } = await db
    .from("fitbit_sessions")
    .select("access_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (!session) throw new Error("No session");

  const expiresAt = new Date(session.expires_at).getTime();
  // Refrescar si expira en menos de 5 minutos
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    const tokens = await refreshAccessToken(userId);
    return tokens.access_token;
  }

  return session.access_token;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  user_id: string;
  token_type: string;
}
