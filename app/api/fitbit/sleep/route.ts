import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSleep } from "@/lib/fitbit/client";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fbd_session")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = request.nextUrl.searchParams.get("date") ?? undefined;

  try {
    const data = await getSleep(userId, date);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
