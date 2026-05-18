import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import type { Theme, Language } from "@/lib/supabase/types";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fbd_session")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data, error } = await db
    .from("user_preferences")
    .select("theme, language")
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ theme: "futuristic", language: "es" });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fbd_session")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { theme?: Theme; language?: Language };
  const validThemes: Theme[] = ["minecraft", "halo", "naruto", "futuristic"];
  const validLangs: Language[] = ["es", "en"];

  const update: Partial<{ theme: Theme; language: Language }> = {};
  if (body.theme && validThemes.includes(body.theme)) update.theme = body.theme;
  if (body.language && validLangs.includes(body.language)) update.language = body.language;

  const db = createServiceClient();
  const { data, error } = await db
    .from("user_preferences")
    .upsert({ user_id: userId, ...update }, { onConflict: "user_id" })
    .select("theme, language")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
