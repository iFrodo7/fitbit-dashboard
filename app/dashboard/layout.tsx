import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { AppProviders } from "@/components/providers/AppProviders";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fbd_session")?.value;
  if (!userId) redirect("/");

  const db = createServiceClient();
  const { data: prefs } = await db
    .from("user_preferences")
    .select("theme, language")
    .eq("user_id", userId)
    .single();

  return (
    <AppProviders
      initialTheme={prefs?.theme ?? "futuristic"}
      initialLang={prefs?.language ?? "es"}
    >
      {children}
    </AppProviders>
  );
}
