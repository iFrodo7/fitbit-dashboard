import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// ── GET /api/user/prefs?email=<email> ─────────────────────────────────────────
// Devuelve la fila completa de app_user_prefs para el usuario.
// Retorna {} si el usuario no tiene preferencias guardadas aún.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({}, { status: 400 });

  const db = createServiceClient();
  const { data } = await db
    .from("app_user_prefs")
    .select("*")
    .eq("email", email)
    .single();

  return NextResponse.json(data ?? {});
}

// ── POST /api/user/prefs ──────────────────────────────────────────────────────
// Aplica merge field-by-field según la estrategia de cada columna.
// Nunca hace un reemplazo bruto — siempre merge para evitar pérdida de datos.
// Ver DATABASE.md para las reglas completas de merge.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const email = (body.email as string)?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  const db = createServiceClient();

  // Leer fila existente para calcular el merge
  const { data: ex } = await db
    .from("app_user_prefs")
    .select("*")
    .eq("email", email)
    .single();

  const update: Record<string, unknown> = { email };

  // ── T1: Goals — gana el timestamp más alto (guardado manual) ────────────────
  const inGoalsTs = Number(body.goals_ts) || 0;
  const exGoalsTs = Number((ex as Record<string,unknown> | null)?.goals_ts) || 0;
  if (body.goals && inGoalsTs > exGoalsTs) {
    update.goals    = body.goals;
    update.goals_ts = inGoalsTs;
  }

  // ── T1: Adaptive goals (Pro) — gana el timestamp más alto ──────────────────
  const inAdaptTs = Number(body.adaptive_goals_ts) || 0;
  const exAdaptTs = Number((ex as Record<string,unknown> | null)?.adaptive_goals_ts) || 0;
  if (body.adaptive_goals && inAdaptTs > exAdaptTs) {
    update.adaptive_goals    = body.adaptive_goals;
    update.adaptive_goals_ts = inAdaptTs;
  }

  // ── T1: Recovery score — gana el timestamp más alto ────────────────────────
  const inRecTs = Number(body.recovery_score_ts) || 0;
  const exRecTs = Number((ex as Record<string,unknown> | null)?.recovery_score_ts) || 0;
  if (typeof body.recovery_score === "number" && inRecTs > exRecTs) {
    update.recovery_score    = Math.round(body.recovery_score as number);
    update.recovery_score_ts = inRecTs;
  }

  // ── T1: Steps streak — gana mayor count (racha nunca retrocede) ─────────────
  if (body.steps_streak && typeof body.steps_streak === "object") {
    const inc = body.steps_streak as { count?: number; lastDate?: string; goal?: number };
    const exS  = (ex as Record<string,unknown> | null)?.steps_streak as { count?: number; lastDate?: string } | null;
    const incCount = Number(inc.count) || 0;
    const exCount  = Number(exS?.count) || 0;
    if (incCount > exCount || (incCount === exCount && (inc.lastDate ?? "") > (exS?.lastDate ?? ""))) {
      update.steps_streak = inc;
    }
  }

  // ── T2: AURA ID — primer write gana, nunca sobreescribir ────────────────────
  if (body.aira_uid && !(ex as Record<string,unknown> | null)?.aira_uid) {
    update.aira_uid = body.aira_uid;
  }

  // ── T2: Prefs timestamp — gana el más reciente ──────────────────────────────
  const inPrefsTs = Number(body.prefs_ts) || 0;
  const exPrefsTs = Number((ex as Record<string,unknown> | null)?.prefs_ts) || 0;
  if (inPrefsTs > exPrefsTs) {
    update.prefs_ts = inPrefsTs;
    const prefsFields = ["display_name", "bio", "lang", "theme", "notif_pref",
                         "avatar_frame", "cycle_on", "cycle_data"] as const;
    for (const f of prefsFields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
  }

  // ── T2: Achievements — unión total, un logro nunca se pierde ────────────────
  if (body.achievements && typeof body.achievements === "object") {
    const exA = ((ex as Record<string,unknown> | null)?.achievements as Record<string, boolean> | null) ?? {};
    update.achievements = { ...exA, ...(body.achievements as Record<string, boolean>) };
  }

  // ── T2: Ach stats — max por campo numérico ──────────────────────────────────
  if (body.ach_stats && typeof body.ach_stats === "object") {
    const exAS = ((ex as Record<string,unknown> | null)?.ach_stats as Record<string, unknown> | null) ?? {};
    const merged: Record<string, unknown> = { ...exAS };
    for (const [k, v] of Object.entries(body.ach_stats as Record<string, unknown>)) {
      if (typeof v === "number") {
        merged[k] = Math.max(Number(merged[k]) || 0, v);
      } else if (typeof v === "object" && v !== null) {
        // themeDays: {[theme]: number} — max por sub-campo
        const exSub = (merged[k] as Record<string, number>) ?? {};
        const merged2: Record<string, number> = { ...exSub };
        for (const [t, n] of Object.entries(v as Record<string, number>)) {
          merged2[t] = Math.max(merged2[t] || 0, n);
        }
        merged[k] = merged2;
      }
    }
    update.ach_stats = merged;
  }

  // ── T2: Atlas points — max acumulado ────────────────────────────────────────
  const inPts = Number(body.atlas_pts);
  const exPts = Number((ex as Record<string,unknown> | null)?.atlas_pts) || 0;
  if (!isNaN(inPts) && inPts > exPts) {
    update.atlas_pts = inPts;
    if (body.atlas_last_award) update.atlas_last_award = body.atlas_last_award;
  }

  // ── T2: Records — max por campo numérico ────────────────────────────────────
  if (body.records && typeof body.records === "object") {
    const exR = ((ex as Record<string,unknown> | null)?.records as Record<string, unknown> | null) ?? {};
    const merged: Record<string, unknown> = { ...exR };
    const numFields = ["maxSteps", "bestStreak", "peakRecovery", "totalActiveDays"] as const;
    for (const k of numFields) {
      const inc = Number((body.records as Record<string, unknown>)[k]);
      if (!isNaN(inc) && inc > (Number(merged[k]) || 0)) {
        merged[k] = inc;
        const dateKey = k + "Date";
        if ((body.records as Record<string, unknown>)[dateKey]) {
          merged[dateKey] = (body.records as Record<string, unknown>)[dateKey];
        }
      }
    }
    update.records = merged;
  }

  // ── T2: Avatar unlocked — unión total ───────────────────────────────────────
  if (body.avatar_unlocked && typeof body.avatar_unlocked === "object") {
    const exAU = ((ex as Record<string,unknown> | null)?.avatar_unlocked as Record<string, boolean> | null) ?? {};
    update.avatar_unlocked = { ...exAU, ...(body.avatar_unlocked as Record<string, boolean>) };
  }

  // ── T2: Nebula days — unión de arrays de fechas únicas ──────────────────────
  if (Array.isArray(body.nebula_days) && body.nebula_days.length) {
    const exND = ((ex as Record<string,unknown> | null)?.nebula_days as string[] | null) ?? [];
    const merged = Array.from(new Set([...exND, ...(body.nebula_days as string[])])).sort();
    update.nebula_days = merged;
  }

  // ── T2: Boolean OR — una vez true, siempre true ──────────────────────────────
  if (body.seen_tour === true) update.seen_tour = true;
  if (body.welcomed  === true) update.welcomed  = true;

  // ── Upsert con merge aplicado ────────────────────────────────────────────────
  const { error } = await db
    .from("app_user_prefs")
    .upsert(update, { onConflict: "email" });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
