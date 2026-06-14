import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/streak?email=<email>  — returns {date, count} for the user
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({ count: 0 });

  const db = createServiceClient();
  const { data } = await db
    .from("app_streaks")
    .select("date, count")
    .eq("email", email)
    .single();

  return NextResponse.json(data ?? { count: 0 });
}

// POST /api/streak  body: {email, date, count}
// Upserts only when the incoming value is more recent or higher.
export async function POST(req: NextRequest) {
  let body: { email?: string; date?: string; count?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const email = body.email?.toLowerCase().trim();
  const date  = body.date;
  const count = Number(body.count);

  if (!email || !date || !count || count < 1) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: existing } = await db
    .from("app_streaks")
    .select("date, count")
    .eq("email", email)
    .single();

  // Only update when: no existing record, newer date, or same date with higher count
  const shouldUpdate =
    !existing ||
    date > existing.date ||
    (date === existing.date && count > existing.count);

  if (shouldUpdate) {
    await db
      .from("app_streaks")
      .upsert({ email, date, count, updated_at: new Date().toISOString() });
  }

  const finalCount = shouldUpdate ? count : existing!.count;
  return NextResponse.json({ ok: true, count: finalCount });
}
