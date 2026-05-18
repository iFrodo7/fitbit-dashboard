import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProfile } from "@/lib/fitbit/client";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fbd_session")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await getProfile(userId);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
