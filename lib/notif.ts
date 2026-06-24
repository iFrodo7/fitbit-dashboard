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
  streak: boolean;    // "racha en riesgo" (de pasos)
  recovery: boolean;  // "resumen matutino"
  open: boolean;      // "racha de uso" — recordatorio ingenioso de abrir la app
}

export interface NotifSignal {
  date: string;              // 'YYYY-MM-DD' en la fecha LOCAL del usuario
  tzOffset: number;          // Date.getTimezoneOffset() en minutos (UTC-5 → +300)
  goalMet: boolean;
  streak: number;
  stepsRemaining: number;    // bucketed (aprox) — solo para el copy
  recovery: number | null;
  sleepMin: number | null;
  openStreak?: number;       // racha de días consecutivos ABRIENDO la app
  lastOpenDate?: string;     // 'YYYY-MM-DD' local del último día que abrió la app
  cats: NotifCats;
  updatedAt: number;         // ms epoch
}

export interface NotifState {
  date?: string;
  morningSent?: boolean;
  streakSent?: boolean;
  openSent?: boolean;
}

export type NotifKind = "morning" | "streak" | "open";

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
// Racha de uso mínima para que valga la pena avisar (evita molestar por 1 día suelto).
export const OPEN_STREAK_MIN = 2;

// 'YYYY-MM-DD' del día anterior (mediodía UTC para esquivar DST).
export function prevDate(ymd: string): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Índice estable por fecha → la variante de copy varía día a día pero no cambia
// entre ticks/reintentos del mismo día.
function pickIdx(seed: string, n: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

// Pool de recordatorios ingeniosos para la racha de uso (ES/EN). {n} = días.
function openReminder(n: number, date: string, es: boolean): NotifDecision {
  const esPool = [
    { t: "👀 ¿Te perdimos?", b: `Tu racha de ${n} días abriendo AIRA está temblando. Un toquecito y la salvas 😏` },
    { t: "🙈 AIRA te extraña", b: `${n} días seguidos y hoy no apareces… ¿la dejamos morir? 👀` },
    { t: "🔥 No rompas el hechizo", b: `${n} días seguidos abriéndome. No me hagas esto justo hoy 🥺` },
    { t: "⏰ Antes de medianoche", b: `Tu racha de ${n} días pende de un hilo. Ábreme y duerme tranquilo 😌` },
  ];
  const enPool = [
    { t: "👀 Did we lose you?", b: `Your ${n}-day AIRA streak is on thin ice. One tap saves it 😏` },
    { t: "🙈 AIRA misses you", b: `${n} days straight and you ghosted us today? 👀` },
    { t: "🔥 Don't break the spell", b: `${n} days in a row opening me. Don't do me dirty today 🥺` },
    { t: "⏰ Before midnight", b: `Your ${n}-day streak hangs by a thread. Open up and sleep easy 😌` },
  ];
  const pool = es ? esPool : enPool;
  const p = pool[pickIdx(date, pool.length)];
  return { kind: "open", title: p.t, body: p.b, tag: "open-streak" };
}

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
  const es = lang === "es";
  const sentToday = state && state.date === date ? state : null;

  // ── Racha de uso en riesgo (7pm local) ──
  // Va ANTES del chequeo de frescura: lastOpenDate/openStreak son estables aunque
  // la señal sea de ayer. Solo si abrió AYER pero NO hoy (la racha muere esta noche)
  // → nunca molesta por una racha ya rota. Prioridad sobre la racha de pasos para
  // respetar el tope diario: abrir la app cubre ambas.
  if (
    hour === EVENING_HOUR &&
    sig.cats && sig.cats.open !== false &&
    (sig.openStreak || 0) >= OPEN_STREAK_MIN &&
    sig.lastOpenDate === prevDate(date)
  ) {
    if (sentToday && sentToday.openSent) return null;
    return openReminder(sig.openStreak || 0, date, es);
  }

  // Señal vieja (de ayer): el cliente no ha sincronizado hoy → para resumen/racha
  // de pasos no arriesgamos (necesitan datos frescos de HOY).
  if (sig.date !== date) return null;

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
