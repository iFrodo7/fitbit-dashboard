import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("fbd_session");
  return NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_APP_URL!)
  );
}
