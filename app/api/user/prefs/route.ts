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

  // ── T1: Adaptive goals (Pro) — primer dispositivo del día gana ─────────────
  // stp/cal/act: si Supabase ya tiene _final:true+_q:1 para el mismo _date, NO
  // sobreescribir — el primer dispositivo que calcula el día es autoritativo.
  //
  // _history: se mergea por fecha con "existing wins", MÁS un seed obligatorio del
  // exAG._date actual. Esto garantiza que el goalUsed del día anterior (que ya fue
  // aceptado por el servidor vía first-write-wins) quede en _history con el valor
  // correcto, incluso si un segundo dispositivo intentó escribir un valor diferente.
  // Efecto: cualquier cliente que lea _history recibirá el valor autoritativo y podrá
  // corregir su historial local para que todos los dispositivos muestren el mismo goalUsed.
  const inAdaptTs = Number(body.adaptive_goals_ts) || 0;
  const exAdaptTs = Number((ex as Record<string,unknown> | null)?.adaptive_goals_ts) || 0;
  if (body.adaptive_goals) {
    const inAG = body.adaptive_goals as Record<string, unknown>;
    const exAG = ((ex as Record<string,unknown> | null)?.adaptive_goals) as Record<string, unknown> | null;

    // Merge _history por fecha: existing wins sobre incoming
    const exHistory = (exAG?._history as Record<string,number> | null) ?? {};
    const inHistory = (inAG._history as Record<string,number> | null) ?? {};
    const mergedHistory: Record<string,number> = { ...inHistory, ...exHistory };
    // Seed autoritativo: el _date/stp del exAG ya aceptado siempre gana en _history
    if (exAG?._final && exAG._q === 1 && exAG._date && exAG.stp) {
      mergedHistory[exAG._date as string] = exAG.stp as number;
    }
    const histPayload = Object.keys(mergedHistory).length ? mergedHistory : undefined;

    const exIsFinalToday = exAG?._final && exAG?._q === 1 && exAG?._date === inAG._date;
    if (inAdaptTs > exAdaptTs && !exIsFinalToday) {
      // Nuevo día o sin meta de calidad: acepta el goal entrante, con _history mergeado
      update.adaptive_goals    = { ...inAG, _history: histPayload };
      update.adaptive_goals_ts = inAdaptTs;
    } else if (exAG && JSON.stringify(exHistory) !== JSON.stringify(mergedHistory)) {
      // Mismo día (no sobrescribir stp/cal/act) pero _history mejoró: actualizar solo _history
      update.adaptive_goals = { ...exAG, _history: histPayload };
    }
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
    const prefsFields = ["display_name", "lang", "theme", "notif_pref",
                         "avatar_frame", "cycle_on"] as const;
    for (const f of prefsFields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
  }

  // ── T2: bio — timestamp independiente para no competir con tema/idioma ───────
  // bio_ts es análogo a recovery_score_ts: permite que el bio de un dispositivo
  // llegue al otro aunque el prefs_ts local sea más nuevo por un cambio de tema.
  const inBioTs = Number(body.bio_ts) || 0;
  const exBioTs = Number((ex as Record<string,unknown> | null)?.bio_ts) || 0;
  if (body.bio !== undefined && inBioTs > exBioTs) {
    update.bio    = body.bio;
    update.bio_ts = inBioTs;
  }
  // Fallback: si Supabase no tiene bio pero el entrante sí, siempre guardar.
  if (body.bio && !(ex as Record<string,unknown> | null)?.bio) {
    update.bio    = body.bio;
    update.bio_ts = inBioTs || Date.now();
  }

  // ── T2: cycle_data — meta via prefs_ts, log siempre merge por fecha-key ─────
  // El log es acumulativo: entradas de distintos dispositivos deben unirse,
  // nunca reemplazarse. Si prefs_ts del entrante es mayor, también actualiza meta.
  if (body.cycle_data && typeof body.cycle_data === "object") {
    const incoming = body.cycle_data as { meta?: unknown; log?: Record<string, unknown> | null };
    const exCD = ((ex as Record<string,unknown> | null)?.cycle_data as { meta?: unknown; log?: Record<string, unknown> | null } | null) ?? {};
    const merged: Record<string, unknown> = { ...exCD };
    if (inPrefsTs > exPrefsTs && incoming.meta !== undefined) merged.meta = incoming.meta;
    if (incoming.log && typeof incoming.log === "object") {
      merged.log = { ...((exCD.log as Record<string, unknown>) ?? {}), ...incoming.log };
    }
    update.cycle_data = merged;
  }

  // ── T2: Achievements — unión elemento a elemento por tema ───────────────────
  // Los valores son arrays de booleans por tema {naruto:[true,false,...]}.
  // El spread {...exA, ...incoming} remplaza arrays enteros → pierde logros.
  // Hacemos OR bit a bit por posición para que un logro nunca retroceda.
  if (body.achievements && typeof body.achievements === "object") {
    const exA = ((ex as Record<string,unknown> | null)?.achievements as Record<string, unknown> | null) ?? {};
    const incoming = body.achievements as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...exA };
    for (const [tk, supVal] of Object.entries(incoming)) {
      const locVal = exA[tk];
      if (Array.isArray(supVal) && Array.isArray(locVal)) {
        const len = Math.max(supVal.length, locVal.length);
        merged[tk] = Array.from({ length: len }, (_: unknown, i: number) => !!(supVal[i] || locVal[i]));
      } else if (Array.isArray(supVal)) {
        merged[tk] = supVal;
      }
    }
    update.achievements = merged;
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

  // ── T2: Activity history — unión por fecha, gana el registro con más pasos ──
  // Permite que dispositivos nuevos arranquen con historial real en lugar de
  // defaults biométricos, evitando semanas de calibración desde cero.
  if (Array.isArray(body.activity_history) && (body.activity_history as unknown[]).length) {
    const exAH = ((ex as Record<string,unknown> | null)?.activity_history as Array<Record<string,unknown>> | null) ?? [];
    const byDate = new Map(exAH.map(e => [String(e.date ?? ""), e]));
    for (const entry of body.activity_history as Array<Record<string,unknown>>) {
      const d = String(entry.date ?? "");
      if (!d) continue;
      const existing = byDate.get(d);
      if (!existing || (Number(entry.steps) || 0) >= (Number(existing.steps) || 0)) {
        byDate.set(d, entry);
      }
    }
    const sorted = Array.from(byDate.values())
      .sort((a, b) => String(a.date) < String(b.date) ? -1 : 1)
      .slice(-30);
    update.activity_history = sorted;
  }

  // ── T1: baseline_cal — gana el lastDate más reciente ───────────────────────
  if (body.baseline_cal && typeof body.baseline_cal === "object") {
    const inc = body.baseline_cal as { factor?: number; lastDate?: string };
    const exBC = ((ex as Record<string,unknown> | null)?.baseline_cal) as { factor?: number; lastDate?: string } | null;
    if (!exBC || (inc.lastDate ?? "") >= (exBC.lastDate ?? "")) {
      update.baseline_cal = inc;
    }
  }

  // ── T1: goal_track — gana el today.date más reciente ────────────────────────
  if (body.goal_track && typeof body.goal_track === "object") {
    const inc = body.goal_track as { today?: { date?: string }; prev?: unknown };
    const exGT = ((ex as Record<string,unknown> | null)?.goal_track) as { today?: { date?: string } } | null;
    if (!exGT || ((inc.today?.date ?? "") >= (exGT.today?.date ?? ""))) {
      update.goal_track = inc;
    }
  }

  // ── T1: Pro status — escrito por checkProStatus() después de validar con Stripe ─
  // Permite que cualquier dispositivo / sesión fresca recupere el estado Pro
  // leyendo Supabase, sin depender de aira_uid ni fb_pro en localStorage.
  if (typeof body.is_pro === "boolean") {
    update.is_pro = body.is_pro;
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
