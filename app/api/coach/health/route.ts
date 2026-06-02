import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!key) {
    return NextResponse.json({ key_set: false, gemini_status: "no key" });
  }

  // Try a minimal Gemini call to see if the key + model work
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return NextResponse.json({
      key_set: true,
      key_prefix: key.slice(0, 8) + "...",
      model,
      gemini_status: res.ok ? "ok" : "error",
      gemini_http: res.status,
      gemini_response: text,
      gemini_error: res.ok ? null : JSON.stringify(body, null, 2),
    });
  } catch (e) {
    return NextResponse.json({
      key_set: true,
      model,
      gemini_status: "exception",
      gemini_error: String(e),
    });
  }
}
