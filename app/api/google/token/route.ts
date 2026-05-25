import { NextRequest, NextResponse } from "next/server";

// Google OAuth token exchange (server-side).
//
// Google "Web application" OAuth clients require the client_secret at the token
// endpoint — it can't live in the browser. So the client does the PKCE
// authorize step, then sends the auth code (+ code_verifier) here; we add the
// secret and exchange it with Google. Only the OAuth code/token transit this
// route — health data is fetched directly by the client and stays on-device
// (local-first), which keeps AIRA exempt from Google's paid security review.
//
// Required Vercel env vars:
//   GOOGLE_CLIENT_ID      (the "AIRA Web" OAuth client id)
//   GOOGLE_CLIENT_SECRET  (its secret — from Google Cloud → Clients → AIRA Web)

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function POST(request: NextRequest) {
  let body: {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
    refresh_token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel env.",
      },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);

  if (body.refresh_token) {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", body.refresh_token);
  } else if (body.code) {
    params.set("grant_type", "authorization_code");
    params.set("code", body.code);
    params.set("redirect_uri", body.redirect_uri || "");
    if (body.code_verifier) params.set("code_verifier", body.code_verifier);
  } else {
    console.error(
      "[google/token] missing code and refresh_token; body keys:",
      JSON.stringify(Object.keys(body || {}))
    );
    return NextResponse.json(
      { error: "Missing code or refresh_token" },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Google token endpoint" },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(
      "[google/token] exchange failed",
      JSON.stringify({
        grant: body.refresh_token ? "refresh" : "code",
        hasCode: !!body.code,
        hasVerifier: !!body.code_verifier,
        redirect_uri: body.redirect_uri,
        status: res.status,
        google: data,
      })
    );
    return NextResponse.json(
      { error: "Token exchange failed", detail: data },
      { status: res.status }
    );
  }
  // { access_token, expires_in, refresh_token?, scope, token_type, id_token? }
  return NextResponse.json(data);
}
