import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  return NextResponse.json({
    key_set: !!key,
    key_prefix: key ? key.slice(0, 6) + "..." : null,
    key_length: key?.length ?? 0,
    model: model ?? "(not set — default: gemini-2.0-flash)",
    node_env: process.env.NODE_ENV,
  });
}
