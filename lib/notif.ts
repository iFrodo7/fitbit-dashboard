// ── Lógica de notificaciones útiles (issue #68) ──────────────────────────────
// Funciones PURAS (sin I/O) para decidir qué push enviar a un usuario en un tick
// del cron. Aisladas aquí para poder testearlas sin Supabase ni red.
//
// Arquitectura A (híbrida): el cliente sube una SEÑAL DERIVADA mínima a Supabase
// (booleano goalMet + racha + pasos restantes aprox + recovery + sueño), nunca
// pasos crudos. El cron lee SOLO esa señal — el servidor no procesa datos de
// salud, preservando la exención $0 del assessment CASA (ver MIGRATION.md).

export interface NotifCats {
  achv: boolean;      // "meta cumplida" (se dispara client-side, no en el cron)
  streak: boolean;    // "racha en riesgo"
  recovery: boolean;  // "resumen matutino"
}

export interface NotifSignal {
  date: string;              // 'YYYY-MM-DD' en la fecha LOCAL del usuario
  tzOffset: number;          // Date.getTimezoneOffset() en minutos (UTC-5 → +300)
  goalMet: boolean;
  streak: number;
  stepsRemaining: number;    // bucketed (aprox) — solo para el copy
  recovery: number | null;
  sleepMin: number | null;
  cats: NotifCats;
  updatedAt: number;         // ms epoch
}

export interface NotifState {
  date?: string;
  morningSent?: boolean;
  streakSent?: boolean;
}

export type NotifKind = "morning" | "streak";

export interface NotifDecision {
  kind: NotifKind;
  title: string;
  body: string;
  tag: string;
}

// Horas LOCALES de disparo. Solo 7am (resumen) y 7pm (racha) → el horario
// silencioso (~21:00–07:00) queda respetado por construcción: nunca se dispara
// nada fuera de esas dos horas.
export const MORNING_HOUR = 7;
export const EVENING_HOUR = 19;

// getTimezoneOffset() = minutos que la hora local va DETRÁS de UTC.
// localMs = utcMs - tzOffset*60000  (UTC-5: offset +300 → resta 5h).
export function localParts(utcMs: number, tzOffset: number): { hour: number; date: string } {
  const d = new Date(utcMs - (tzOffset || 0) * 60000);
  return { hour: d.getUTCHours(), date: d.toISOString().slice(0, 10) };
}

// minutos dormidos → "7h20" (vacío si es demasiado poco para ser real)
export function sleepStr(min: number | null): string {
  if (!min || min < 30) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + "h" + String(m).padStart(2, "0");
}

// Decide la notificación a enviar (o null) para un usuario en un instante dado.
export function decideNotif(
  sig: NotifSignal | null | undefined,
  state: NotifState | null | undefined,
  nowUtcMs: number,
  lang: string
): NotifDecision | null {
  if (!sig || !sig.date) return null;
  const { hour, date } = localParts(nowUtcMs, sig.tzOffset);
  // Señal vieja (de ayer): el cliente no ha sincronizado hoy → no arriesgamos.
  if (sig.date !== date) return null;
  const es = lang === "es";
  const sentToday = state && state.date === date ? state : null;

  // ── Resumen matutino (7am local) ──
  if (hour === MORNING_HOUR && sig.cats && sig.cats.recovery !== false && sig.recovery != null) {
    if (sentToday && sentToday.morningSent) return null;
    const rec = Math.round(sig.recovery);
    const slp = sleepStr(sig.sleepMin);
    const body =
      (es ? `Recuperación ${rec}%` : `Recovery ${rec}%`) +
      (slp ? (es ? `, dormiste ${slp}` : `, you slept ${slp}`) : "") +
      (rec >= 66
        ? es ? " — buen día para entrenar" : " — good day to train"
        : es ? " — escucha a tu cuerpo hoy" : " — listen to your body today");
    return {
      kind: "morning",
      title: es ? "😴 Tu resumen de hoy" : "😴 Your morning summary",
      body,
      tag: "morning-summary",
    };
  }

  // ── Racha en riesgo (7pm local, racha ≥3, meta NO cumplida) ──
  if (
    hour === EVENING_HOUR &&
    sig.cats && sig.cats.streak !== false &&
    sig.streak >= 3 &&
    !sig.goalMet
  ) {
    if (sentToday && sentToday.streakSent) return null;
    const rem = sig.stepsRemaining > 0 ? sig.stepsRemaining.toLocaleString("en-US") : "";
    const body = rem
      ? es ? `Te faltan ${rem} pasos para mantenerla` : `${rem} steps left to keep it going`
      : es ? "Completa tu meta para mantenerla" : "Hit your goal to keep it going";
    return {
      kind: "streak",
      title: es ? `🔥 Tu racha de ${sig.streak} días` : `🔥 Your ${sig.streak}-day streak`,
      body,
      tag: "streak-risk",
    };
  }

  return null;
}
