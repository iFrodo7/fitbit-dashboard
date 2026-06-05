import { NextRequest, NextResponse } from "next/server";

// AIRA coach endpoint. Free for users; the API key (if any) lives only here,
// never in the client. Without GEMINI_API_KEY it returns a rule-based local
// answer so the chat always works at $0. Add a free key from Google AI Studio
// (aistudio.google.com, no credit card) in Vercel env to enable real answers.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const MAX_Q        = 400;   // cap question length — reduce input tokens
const MAX_HISTORY  = 8;     // max history entries (4 turns) sent to Gemini
const MAX_TOKENS   = 800;   // max output tokens — coach answers don't need to be long
const DAILY_FREE   = 3;     // Gemini calls/day for free users
const DAILY_PRO    = 50;    // Gemini calls/day for PRO users (~$0.24/mes worst case)

// Simple in-memory rate limiter per IP.
// Resets on cold start — Fase 2 moverá esto a Supabase (issue #47).
const _rl = new Map<string, { date: string; n: number }>();

function allowRequest(ip: string, pro: boolean): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const cur   = _rl.get(ip) ?? { date: today, n: 0 };
  if (cur.date !== today) { cur.date = today; cur.n = 0; }
  const limit = pro ? DAILY_PRO : DAILY_FREE;
  if (cur.n >= limit) return false;
  cur.n++;
  _rl.set(ip, cur);
  return true;
}

type Trend = {
  days?: number;
  avgRecovery?: number | null;
  avgRhr?: number | null;
  avgDeepMin?: number | null;
  avgRemMin?: number | null;
  avgSleepMin?: number | null;
  avgSteps?: number | null;
};

type Metrics = {
  recovery?: number | string;
  rhr?: number | string;
  hrv?: number | string;
  spo2?: number | string;
  breathing?: number | string;
  sleep?: string;
  sleepEff?: number | string;
  sleepWakes?: number | string;
  deepSleep?: string;
  remSleep?: string;
  steps?: number | string;
  strain?: number | string;
  fatBurnMin?: string;
  cardioMin?: string;
  peakMin?: string;
  date?: string;
  trend?: Trend;
};

type HistoryEntry = { role: "user" | "model"; text: string };

function qualRec(v: number): string {
  if (v >= 67) return "green zone — ready for intensity";
  if (v >= 34) return "yellow zone — moderate effort recommended";
  return "red zone — rest/recovery priority";
}
function qualHrv(v: number): string {
  if (v >= 60) return "excellent nervous system recovery";
  if (v >= 40) return "good";
  if (v >= 20) return "low — fatigue or stress likely";
  return "very low — possible illness or heavy accumulation";
}
function qualRhr(v: number): string {
  if (v <= 50) return "athlete-level";
  if (v <= 65) return "healthy range";
  if (v <= 75) return "slightly elevated";
  return "elevated — possible stress, fatigue or dehydration";
}
function qualSleepEff(v: number): string {
  if (v >= 85) return "good";
  if (v >= 75) return "fair";
  return "poor";
}

function metricsLine(m: Metrics): string {
  const parts: string[] = [];

  const rec = typeof m.recovery === "number" ? m.recovery : parseInt(String(m.recovery ?? ""));
  if (m.recovery != null && m.recovery !== "") {
    parts.push(`recovery ${m.recovery}/100 (${!isNaN(rec) ? qualRec(rec) : "unknown zone"})`);
  }

  const rhr = typeof m.rhr === "number" ? m.rhr : parseInt(String(m.rhr ?? ""));
  if (m.rhr) parts.push(`resting HR ${m.rhr} bpm (${!isNaN(rhr) ? qualRhr(rhr) : ""})`);

  const hrv = typeof m.hrv === "number" ? m.hrv : parseInt(String(m.hrv ?? ""));
  if (m.hrv) parts.push(`HRV ${m.hrv} ms (${!isNaN(hrv) ? qualHrv(hrv) : ""})`);

  if (m.spo2) {
    const spo2 = typeof m.spo2 === "number" ? m.spo2 : parseFloat(String(m.spo2));
    const qual = !isNaN(spo2) ? (spo2 >= 95 ? "normal" : spo2 >= 92 ? "watch closely" : "consult a doctor") : "";
    parts.push(`SpO2 ${m.spo2}% (${qual})`);
  }

  if (m.breathing) parts.push(`breathing rate ${m.breathing}/min (normal at rest: 12–20)`);

  if (m.sleep) {
    let sleepStr = `last sleep ${m.sleep}`;
    const details: string[] = [];
    if (m.deepSleep) details.push(`deep ${m.deepSleep}`);
    if (m.remSleep) details.push(`REM ${m.remSleep}`);
    if (details.length) sleepStr += ` (${details.join(", ")})`;
    const eff = typeof m.sleepEff === "number" ? m.sleepEff : parseFloat(String(m.sleepEff ?? ""));
    if (m.sleepEff) sleepStr += `, efficiency ${m.sleepEff}% (${!isNaN(eff) ? qualSleepEff(eff) : ""})`;
    if (m.sleepWakes) sleepStr += `, ${m.sleepWakes} awakenings`;
    parts.push(sleepStr);
  }

  if (m.steps) parts.push(`steps today ${m.steps}`);
  if (m.strain) parts.push(`strain ${m.strain}/21`);

  if (m.fatBurnMin || m.cardioMin || m.peakMin) {
    const zones: string[] = [];
    if (m.fatBurnMin) zones.push(`fat-burn ${m.fatBurnMin}`);
    if (m.cardioMin) zones.push(`cardio ${m.cardioMin}`);
    if (m.peakMin) zones.push(`peak ${m.peakMin}`);
    parts.push(`HR zones today: ${zones.join(", ")}`);
  }

  if (m.trend && m.trend.days && m.trend.days >= 3) {
    const t = m.trend;
    const tp: string[] = [];
    if (t.avgRecovery != null) tp.push(`avg recovery ${t.avgRecovery}/100`);
    if (t.avgRhr != null) tp.push(`avg RHR ${t.avgRhr} bpm`);
    if (t.avgSleepMin != null) tp.push(`avg sleep ${(t.avgSleepMin / 60).toFixed(1)}h`);
    if (t.avgDeepMin != null) tp.push(`avg deep ${t.avgDeepMin}min`);
    if (t.avgSteps != null) tp.push(`avg steps ${t.avgSteps}`);
    if (tp.length) parts.push(`${t.days}-day trend → ${tp.join(", ")}`);
  }

  return parts.length ? parts.join("; ") : "no recent data yet";
}

function systemPrompt(m: Metrics, lang: string): string {
  const langName = lang === "en" ? "English" : "Spanish";
  let dateCtx = "";
  if (m.date) {
    try {
      dateCtx = `Today is ${new Date(m.date).toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })}.`;
    } catch { /* ignore bad dates */ }
  }
  const hasMetrics = metricsLine(m) !== "no recent data yet";
  return [
    // Identity
    "You are AIRA, the AI coach inside the Fitbit Air wellness app.",
    "You are a certified personal trainer, sports nutritionist, and sleep & recovery specialist.",

    // Personality & voice — this defines tone across all responses
    "YOUR VOICE: Direct, warm, and to the point — like a knowledgeable coach who genuinely knows the user.",
    "You speak clearly, avoid jargon (or explain it briefly when needed), and give advice the user can act on TODAY.",
    "You never pad responses with filler phrases like 'Great question!' or 'Absolutely!'.",
    "You never lecture. You coach.",

    // Tone adapts to topic
    "TONE BY TOPIC:",
    "- Training & performance questions → energetic, motivating, specific.",
    "- Sleep & recovery questions → calm, analytical, reassuring.",
    "- Stress & mental load → empathetic, grounding, practical.",
    "- Nutrition questions → evidence-based, no diet culture, no moralizing.",

    // Metrics context
    dateCtx,
    hasMetrics
      ? `USER BIOMETRICS RIGHT NOW: ${metricsLine(m)}.`
      : "No biometric data available for this user yet — give solid general advice.",

    // Cross-metric analysis — this is the key analytical instruction
    hasMetrics ? [
      "CROSS-METRIC ANALYSIS — always look for patterns across metrics, not just individual values:",
      "- Low recovery + low HRV + short or poor sleep = accumulated fatigue. Not a day to push. Prioritize rest.",
      "- Low recovery but good sleep = possible overtraining or illness starting. Reduce load.",
      "- Good recovery + elevated RHR = possible dehydration or early illness. Hydrate, monitor.",
      "- Good recovery + good HRV = green light for intensity. Say so clearly.",
      "- Low deep sleep + many awakenings = sleep quality issue, not just duration.",
      "- High steps but no HR zone time = active day but not a structured training load.",
      "Always reference the user's ACTUAL numbers when they're relevant. Don't be vague when you have data.",
    ].join(" ") : "",

    // Response format rules
    "RESPONSE FORMAT:",
    "- Simple questions (one metric, one concept) → 2–4 sentences. No headers, no bullets.",
    "- Complex questions (multi-step plans, full analysis) → use short sections or a brief bullet list.",
    "- Always end with ONE clear, actionable recommendation when relevant.",
    "- Never cut off mid-explanation. Complete every thought.",
    "- If a question is about something you don't have data for, say so and give a general answer.",

    // Domain guard
    "DOMAIN: You only coach on health, fitness, nutrition, sleep, and wellness.",
    "If asked about anything outside this domain (politics, finance, coding, movies, sports scores, etc.),",
    "respond with a SHORT, witty, in-character joke that plays on your role as a fitness coach.",
    "Then offer to help with something health-related. Keep it light and fun — never rude.",
    "Examples of the humor style: if asked about politics → 'My only political opinion is that burpees should be illegal.'",
    "If asked about movies → 'I only watch training montages.' If asked about crypto → 'The only pump I track is heart rate.'",
    "Adapt the joke to whatever topic they asked about. NEVER break character.",

    // Safety
    "You are NOT a doctor. For medical symptoms or anything clinical, always say: consult a healthcare professional.",
    "Never invent or guess metric values you were not given.",

    `Always reply in ${langName}.`,
  ].filter(Boolean).join(" ");
}

// Rule-based answers used when no API key is configured. Keeps the coach useful at $0.
function localFallback(q: string, m: Metrics, lang: string): string {
  const es = lang !== "en";
  const ql = q.toLowerCase();
  const rec = typeof m.recovery === "number" ? m.recovery : parseInt(String(m.recovery ?? ""));
  const hrv = typeof m.hrv === "number" ? m.hrv : parseInt(String(m.hrv ?? ""));
  const rhr = typeof m.rhr === "number" ? m.rhr : parseInt(String(m.rhr ?? ""));
  const eff = typeof m.sleepEff === "number" ? m.sleepEff : parseFloat(String(m.sleepEff ?? ""));
  const has = (...w: string[]) => w.some((x) => ql.includes(x));

  const fatigueSigns = [
    !isNaN(rec) && rec < 34,
    !isNaN(hrv) && hrv < 30,
    !isNaN(eff) && eff < 75,
  ].filter(Boolean).length;
  const accumulatedFatigue = fatigueSigns >= 2;

  // Off-topic — respond with a fitness-themed joke, then offer real help
  const offTopicJoke = (): string => {
    if (has("polít", "politic", "eleccion", "election", "gobierno", "president")) {
      return es
        ? `Mi única posición política es que los burpees deberían ser ilegales. 🏋️ Para lo demás, no soy la indicada. ¿Te ayudo con algo de entrenamiento o recovery?`
        : `My only political stance is that burpees should be illegal. 🏋️ For everything else, I'm not your gal. Want help with training or recovery instead?`;
    }
    if (has("crypt", "bitcoin", "stock", "bolsa", "invert", "financ", "dinero", "money", "econom")) {
      return es
        ? `La única pump que monitoreo es la frecuencia cardíaca. 📈 Y la única inversión que te recomiendo es en sueño de calidad. ¿Hablamos de eso?`
        : `The only pump I track is heart rate. 📈 And the only investment I recommend is quality sleep. Want to talk about that instead?`;
    }
    if (has("movie", "pelíc", "serie", "netflix", "film", "cine")) {
      return es
        ? `Solo veo videos de montajes de entrenamiento. 🎬 Todo lo demás sube el tiempo sedentario y baja el HRV. ¿Necesitas un plan de movimiento para el día?`
        : `I only watch training montages. 🎬 Everything else raises sedentary time and lowers HRV. Need a movement plan for today?`;
    }
    if (has("música", "music", "cancion", "song", "playlist", "spotify")) {
      return es
        ? `Mis únicas recomendaciones musicales son las que mantienen tu zona cardio en 140–160 bpm. 🎵 ¿Quieres que hablemos de entrenamiento?`
        : `My only music recommendation is whatever keeps your heart rate in the 140–160 bpm zone. 🎵 Want to talk training instead?`;
    }
    if (has("fútbol", "soccer", "basket", "nfl", "nba", "deport", "marcador", "score", "partido", "game")) {
      return es
        ? `El único marcador que me importa es tu recovery score. Hoy tienes ${m.recovery || "—"}/100. ¿Eso sí te lo analizo? ⚡`
        : `The only score I care about is your recovery score. You're at ${m.recovery || "—"}/100 today. Want me to break that down? ⚡`;
    }
    if (has("clima", "weather", "lluvia", "rain", "sol", "sun", "temperatura", "temperature")) {
      return es
        ? `El único clima que analizo es el que hay dentro de tu cuerpo: HRV ${m.hrv || "—"} ms, recovery ${m.recovery || "—"}/100. Ese pronóstico sí te lo doy. ☀️`
        : `The only weather I analyze is inside your body: HRV ${m.hrv || "—"} ms, recovery ${m.recovery || "—"}/100. That forecast I can give you. ☀️`;
    }
    if (has("amor", "relaci", "novio", "novia", "pareja", "love", "dating")) {
      return es
        ? `Lo único que sé de relaciones es que el sueño en pareja puede bajar tu deep sleep hasta un 15%. Científicamente comprobado. 😄 ¿Hablamos de sueño?`
        : `The only relationship advice I have is that co-sleeping can reduce your deep sleep by up to 15%. Science says so. 😄 Want to talk sleep?`;
    }
    if (has("programar", "código", "javascript", "python", "código", "coding", "software")) {
      return es
        ? `No sé de código, pero sé que programar 8 horas seguido sin moverse es lo más efectivo para bajar tu HRV. 💻 ¿Te armo un plan de movimiento para el día de trabajo?`
        : `I don't know code, but I do know that 8 hours of sitting still while coding is the most efficient way to tank your HRV. 💻 Want a movement plan for your work day?`;
    }
    if (has("chiste", "joke", "funny", "humor", "broma")) {
      return es
        ? `¿Quieres un chiste? ¿Por qué el corredor nunca llega tarde? Porque siempre está en su zona. 🏃 Ahora en serio — ¿con qué te ayudo hoy?`
        : `Want a joke? Why is the runner never late? Because they're always in the zone. 🏃 Now seriously — what can I help you with today?`;
    }
    // Generic off-topic
    return es
      ? `Eso está fuera de mi zona de entrenamiento. 😅 Soy AIRA — solo proceso repeticiones, sueño, HRV y recovery. Hoy tienes ${m.recovery || "—"}/100 de recovery y ${m.steps || "—"} pasos. ¿Te ayudo con algo de salud?`
      : `That's outside my training zone. 😅 I'm AIRA — I only process reps, sleep, HRV, and recovery. You're at ${m.recovery || "—"}/100 recovery and ${m.steps || "—"} steps today. Can I help you with something health-related?`;
  };

  if (has("polít", "politic", "eleccion", "election", "gobierno", "president",
          "crypt", "bitcoin", "stock", "bolsa", "invert", "financ", "dinero", "money", "econom",
          "programar", "código", "javascript", "python", "coding", "software",
          "historia", "history", "movie", "pelíc", "serie", "netflix", "film", "cine",
          "música", "music", "cancion", "song", "playlist", "spotify",
          "amor", "relaci", "novio", "novia", "pareja", "love", "dating",
          "fútbol", "soccer", "basket", "nfl", "nba", "marcador", "partido", "game",
          "clima", "weather", "lluvia", "rain", "chiste", "joke", "funny", "humor")) {
    return offTopicJoke();
  }

  // Sleep
  if (has("dorm", "sleep", "sueñ", "descan", "rest")) {
    const hasSleepData = m.sleep || m.deepSleep || m.sleepEff;
    if (!hasSleepData) {
      return es
        ? "No tengo datos de tu último sueño todavía. En general, apunta a 7.5–8 h con horario fijo (±20 min), evita pantallas 1 h antes y cafeína después del mediodía."
        : "I don't have your latest sleep data yet. In general, aim for 7.5–8 h on a fixed schedule (±20 min), avoid screens 1 h before bed and caffeine after midday.";
    }
    const sleepDetails = [m.deepSleep ? (es ? `profundo: ${m.deepSleep}` : `deep: ${m.deepSleep}`) : "", m.remSleep ? `REM: ${m.remSleep}` : ""].filter(Boolean).join(", ");
    const effComment = !isNaN(eff)
      ? (eff >= 85 ? (es ? "buena eficiencia" : "good efficiency") : eff >= 75 ? (es ? "eficiencia aceptable, hay margen" : "fair efficiency, room to improve") : (es ? "eficiencia baja — muchos despertares o demasiado tiempo en cama" : "poor efficiency — too many awakenings or too long in bed"))
      : "";
    const wakes = m.sleepWakes ? (es ? `, ${m.sleepWakes} despertares` : `, ${m.sleepWakes} awakenings`) : "";
    const crossNote = !isNaN(rec) && rec < 34
      ? (es ? ` Tu recovery de ${rec}/100 confirma que el cuerpo no terminó de recuperarse esa noche.` : ` Your recovery of ${rec}/100 confirms your body didn't fully restore during that night.`)
      : "";
    return es
      ? `Último sueño: ${m.sleep || "—"}${sleepDetails ? ` (${sleepDetails})` : ""}${m.sleepEff ? `, eficiencia ${m.sleepEff}% — ${effComment}` : ""}${wakes}.${crossNote} Para mejorar la calidad: horario fijo, cuarto fresco (17–19°C), sin alcohol y sin pantallas 1 h antes.`
      : `Last sleep: ${m.sleep || "—"}${sleepDetails ? ` (${sleepDetails})` : ""}${m.sleepEff ? `, efficiency ${m.sleepEff}% — ${effComment}` : ""}${wakes}.${crossNote} To improve quality: fixed schedule, cool room (63–66°F), no alcohol, no screens 1 h before bed.`;
  }

  // Training — exercises, body parts, movement, improvement questions
  if (has(
    "entren", "train", "rutina", "routine", "ejercici", "workout", "gym",
    "cardio", "fuerza", "strength", "hiit", "interval",
    // lower body
    "pierna", "leg", "sentadilla", "squat", "lunge", "zancada", "glúteo", "glute",
    "peso muerto", "deadlift", "prensa", "isquio", "femoral", "pantorrilla", "calf",
    // upper body
    "pecho", "chest", "press", "lagartija", "push",
    "espalda", "back", "dominada", "pullup", "pull up", "remo", "row",
    "hombro", "shoulder", "militar", "lateral",
    "bícep", "bicep", "trícep", "tricep", "curl",
    // core
    "abdomen", "core", "abs", "plancha", "plank",
    // cardio / sports
    "correr", "run", "nadar", "swim", "sprint", "velocidad", "speed",
    "calistenia", "bodyweight", "yoga", "pilates",
    // mobility & technique
    "movilidad", "mobility", "estira", "stretch", "calenta", "warm",
    "técnica", "tecnica", "form",
    // intent keywords that point to training
    "mejorar", "improve", "recomend",
  )) {
    // Detect body part / focus for specific advice
    const isLegs  = has("pierna", "leg", "sentadilla", "squat", "lunge", "zancada",
                        "glúteo", "glute", "peso muerto", "deadlift", "prensa",
                        "isquio", "femoral", "pantorrilla", "calf");
    const isUpper = has("pecho", "chest", "press", "lagartija", "push",
                        "espalda", "back", "dominada", "pullup", "pull up", "remo", "row",
                        "hombro", "shoulder", "bícep", "bicep", "trícep", "tricep", "curl");
    const isCore  = has("abdomen", "core", "abs", "plancha", "plank");
    const isCardio = has("correr", "run", "nadar", "swim", "sprint", "cardio", "hiit", "interval");
    const isTech  = has("mejorar", "improve", "técnica", "tecnica", "form", "recomend");

    const alreadyActive = m.cardioMin || m.peakMin
      ? (es ? ` Ya llevas tiempo en zona cardio/pico hoy — ajusta el volumen total.`
            : ` You already have cardio/peak zone time today — adjust total volume accordingly.`)
      : "";

    if (accumulatedFatigue) {
      const bodyNote = isLegs
        ? (es ? "Para piernas: solo movilidad de cadera y estiramiento de cuádriceps/isquios — sin carga."
               : "For legs: hip mobility and quad/hamstring stretching only — no load.")
        : isUpper
        ? (es ? "Para tren superior: foam rolling de espalda y movilidad de hombros."
               : "For upper body: back foam rolling and shoulder mobility.")
        : (es ? "Movilidad suave, caminata o descanso activo es lo máximo para hoy."
               : "Light mobility, a walk, or active rest is your ceiling today.");
      return es
        ? `Tus métricas muestran fatiga acumulada: recovery ${m.recovery || "—"}/100, HRV ${m.hrv || "—"} ms${!isNaN(eff) && eff < 75 ? `, eficiencia de sueño ${m.sleepEff}%` : ""}. Entrenar duro hoy no suma — puede retrasarte. ${bodyNote} Mañana será mejor.`
        : `Your metrics show accumulated fatigue: recovery ${m.recovery || "—"}/100, HRV ${m.hrv || "—"} ms${!isNaN(eff) && eff < 75 ? `, sleep efficiency ${m.sleepEff}%` : ""}. Pushing hard today won't help — it can set you back. ${bodyNote} Tomorrow will be better.`;
    }

    if (!isNaN(rec) && rec >= 67) {
      // Green zone — actual exercise content by body part
      if (isLegs && isTech) {
        return es
          ? `Para mejorar la sentadilla con recovery ${rec}/100 (verde): trabaja 5×3 al 75–80%, foco total en profundidad y control de rodillas sobre el pie. Antes de cada serie: 10 activaciones de glúteo en suelo + movilidad de tobillo en círculos. Los dos limitantes más comunes son la dorsiflexión de tobillo y la activación del glúteo — trabájalos primero. Graba un set de lado para revisarte.`
          : `To improve your squat with recovery ${rec}/100 (green): work 5×3 at 75–80%, full focus on depth and knees tracking over the foot. Before each set: 10 glute bridges + ankle circles. The two most common limiters are ankle dorsiflexion and glute activation — address those first. Record a set from the side to self-review.`;
      }
      if (isLegs) {
        return es
          ? `Recovery ${rec}/100 — verde. Rutina de piernas: sentadilla 4×5 al 80–85% (descanso 2–3 min), peso muerto rumano 3×8, prensa 3×10, curl de isquios 3×12, elevaciones de pantorrilla 3×15.${alreadyActive} Finaliza con 10 min de movilidad de cadera y estiramiento de cuádriceps.`
          : `Recovery ${rec}/100 — green. Leg day: back squat 4×5 at 80–85% (2–3 min rest), Romanian deadlift 3×8, leg press 3×10, hamstring curl 3×12, calf raises 3×15.${alreadyActive} Finish with 10 min hip mobility and quad stretching.`;
      }
      if (isUpper && isTech) {
        return es
          ? `Para mejorar el press o fuerza de tren superior con recovery ${rec}/100 (verde): 5×3 al 80% con foco en retracción escapular y control en la bajada (3 s excéntrico). Agrega remo con barra 4×6 para equilibrar el empuje con tracción. Finaliza con rotadores externos: 3×15 con banda.`
          : `To improve press or upper body strength with recovery ${rec}/100 (green): 5×3 at 80% focusing on scapular retraction and controlled descent (3 s eccentric). Add barbell row 4×6 to balance push with pull. Finish with band external rotations 3×15.`;
      }
      if (isUpper) {
        return es
          ? `Recovery ${rec}/100 — verde. Tren superior: press de banca o press militar 4×5 al 80%, dominadas 4×máx (o remo con barra 4×6), fondos o aperturas 3×10, curl de bíceps 3×12.${alreadyActive} Descansa 90 s–2 min entre series pesadas. Finaliza con estiramiento de pecho y hombros.`
          : `Recovery ${rec}/100 — green. Upper body: bench or overhead press 4×5 at 80%, pull-ups 4×max (or barbell row 4×6), dips or flyes 3×10, bicep curl 3×12.${alreadyActive} Rest 90 s–2 min between heavy sets. Finish with chest and shoulder stretching.`;
      }
      if (isCore) {
        return es
          ? `Recovery ${rec}/100 — verde para core. Circuito: plancha 3×45–60 s, plancha lateral 3×30 s por lado, rueda abdominal 3×10 (o hollow body hold 3×30 s), hip thrust 3×15.${alreadyActive} El core se recupera en 24–48 h — puedes entrenarlo 3–4 veces por semana sin problema.`
          : `Recovery ${rec}/100 — green for core. Circuit: plank 3×45–60 s, side plank 3×30 s per side, ab wheel 3×10 (or hollow body hold 3×30 s), hip thrust 3×15.${alreadyActive} Core recovers in 24–48 h — you can train it 3–4 times per week without issue.`;
      }
      if (isCardio) {
        return es
          ? `Recovery ${rec}/100 y HRV ${m.hrv || "—"} ms — verde para alta intensidad. Para correr: 10 min suave → 5–6 × 400 m al 90% con 90 s de descanso → 10 min de enfriamiento. O 30–40 min en Zona 3 (ritmo sostenido y desafiante).${alreadyActive} Hidrátate bien y no saltees el calentamiento.`
          : `Recovery ${rec}/100 and HRV ${m.hrv || "—"} ms — green for high intensity. Running: 10 min easy → 5–6 × 400 m at 90% with 90 s rest → 10 min cool-down. Or 30–40 min at Zone 3 (comfortably hard).${alreadyActive} Hydrate well and don't skip the warm-up.`;
      }
      // Generic green
      return es
        ? `Recovery ${rec}/100 y HRV ${m.hrv || "—"} ms — verde. Hoy puedes ir fuerte.${alreadyActive} Dime qué quieres trabajar — pierna, tren superior, core o cardio — y te armo una rutina adaptada a tu estado actual.`
        : `Recovery ${rec}/100 and HRV ${m.hrv || "—"} ms — green. Today you can push.${alreadyActive} Tell me what you want to work — legs, upper body, core, or cardio — and I'll give you a routine built around your current state.`;
    }

    if (!isNaN(rec) && rec >= 34) {
      // Yellow zone — technique / moderate volume
      if (isLegs && isTech) {
        return es
          ? `Recovery ${rec}/100 — zona amarilla, perfecto para técnica. Sentadilla: 5×3–5 al 65–70%, foco total en profundidad y control. Agrega movilidad de tobillo y activación de glúteo antes de cada serie. Sin cargas máximas — el sistema nervioso aprende mejor con carga moderada.`
          : `Recovery ${rec}/100 — yellow zone, ideal for technique. Squat: 5×3–5 at 65–70%, full focus on depth and control. Add ankle mobility and glute activation before each set. No max loads — motor learning works best at moderate intensity.`;
      }
      if (isLegs) {
        return es
          ? `Recovery ${rec}/100 — zona amarilla. Piernas de volumen moderado: sentadilla goblet 4×10 (técnica perfecta), split squat búlgaro 3×10 por lado, curl de isquios 3×12, puente de glúteos 3×15. Sin sets al fallo — termina cada serie sintiéndote bien.`
          : `Recovery ${rec}/100 — yellow zone. Moderate leg volume: goblet squat 4×10 (perfect form), Bulgarian split squat 3×10 per side, hamstring curl 3×12, glute bridge 3×15. No failure sets — end each set feeling strong.`;
      }
      if (isCardio) {
        return es
          ? `Recovery ${rec}/100 — zona amarilla. Ideal para Zona 2: 30–45 min a ritmo conversacional (puedes hablar sin jadear). Este cardio aeróbico mejora la base sin profundizar la fatiga — suma sin restar.`
          : `Recovery ${rec}/100 — yellow zone. Ideal for Zone 2: 30–45 min at conversational pace (you can talk without gasping). Aerobic base training improves fitness without deepening fatigue — all gain, no drain.`;
      }
      return es
        ? `Recovery ${rec}/100 — zona amarilla. Ideal para técnica, volumen moderado o cardio Zona 2. No es día de récords, pero es perfecto para acumular trabajo de calidad. ¿Quieres rutina de pierna, tren superior, core o cardio?`
        : `Recovery ${rec}/100 — yellow zone. Good for technique, moderate volume, or Zone 2 cardio. Not a PR day, but perfect for quality work. Want a leg, upper body, core, or cardio routine?`;
    }

    // Red zone
    const redBodyNote = isLegs
      ? (es ? "Para piernas: solo estiramiento de cuádriceps, isquios y movilidad de cadera — sin carga hoy."
             : "For legs: quad/hamstring stretching and hip mobility only — no load today.")
      : isUpper
      ? (es ? "Para tren superior: foam rolling de espalda y movilidad de hombros."
             : "For upper body: back foam rolling and shoulder mobility.")
      : (es ? "Caminata suave, estiramiento o foam rolling." : "Easy walk, stretching, or foam rolling.");
    return es
      ? `Recovery ${m.recovery || "—"}/100 — zona roja. El cuerpo pide pausa. ${redBodyNote} Forzarlo ahora eleva el riesgo de lesión y alarga la recuperación. Mañana rendirás mejor.`
      : `Recovery ${m.recovery || "—"}/100 — red zone. Your body needs a pause. ${redBodyNote} Pushing raises injury risk and extends recovery time. You'll perform better tomorrow.`;
  }

  // Nutrition
  if (has("comer", "comida", "diet", "eat", "nutri", "aliment", "protein", "cen", "desayun", "breakfast", "lunch", "almuerz")) {
    const highActivity = !isNaN(rec) && rec >= 67;
    return es
      ? `Para tu nivel de actividad actual (${m.steps || "—"} pasos, recovery ${m.recovery || "—"}/100): apunta a ~1.6–2 g de proteína/kg al día, repartida en 3–4 comidas. ${highActivity ? "Hoy estás en verde — asegura carbohidratos antes del entrenamiento y proteína + carbs en los 45 min post-esfuerzo." : "Con recovery más bajo, enfócate en proteína y verduras para apoyar la recuperación."} Comida real primero, suplementos solo si no cubres con dieta.`
      : `For your current activity level (${m.steps || "—"} steps, recovery ${m.recovery || "—"}/100): aim for ~1.6–2 g protein/kg/day spread across 3–4 meals. ${highActivity ? "Today you're in the green — make sure you have carbs pre-training and protein + carbs within 45 min post-workout." : "With lower recovery, focus on protein and vegetables to support restoration."} Real food first, supplements only where diet falls short.`;
  }

  // Steps / activity
  if (has("paso", "step", "activ", "caminar", "walk", "sedent")) {
    return es
      ? `Llevas ${m.steps || "—"} pasos hoy. Los pasos diarios mejoran el HRV, la calidad del sueño y el recovery con el tiempo. Si estás en zona roja (recovery ${m.recovery || "—"}/100), una caminata suave es una de las mejores cosas que puedes hacer hoy. La constancia semanal vale más que los picos aislados.`
      : `You're at ${m.steps || "—"} steps today. Daily steps improve HRV, sleep quality, and recovery over time. If you're in the red zone (recovery ${m.recovery || "—"}/100), an easy walk is one of the best things you can do today. Weekly consistency beats isolated spikes.`;
  }

  // HRV
  if (has("hrv", "variabil")) {
    const hrvComment = !isNaN(hrv)
      ? (hrv >= 60 ? (es ? "Excelente — sistema nervioso bien recuperado." : "Excellent — nervous system well recovered.")
        : hrv >= 40 ? (es ? "Bueno. El cuerpo lleva bien la carga." : "Good. Body is handling the load well.")
        : hrv >= 20 ? (es ? "Bajo — estrés o fatiga acumulada presente." : "Low — accumulated stress or fatigue present.")
        : (es ? "Muy bajo — posible inicio de enfermedad, estrés severo o sobrecarga. Descansa hoy." : "Very low — possible illness onset, severe stress, or overload. Rest today."))
      : "";
    const crossNote = !isNaN(hrv) && !isNaN(rec) && hrv < 30 && rec < 34
      ? (es ? ` Combinado con tu recovery de ${rec}/100, el patrón es claro: el cuerpo necesita recuperación, no carga.` : ` Combined with your recovery of ${rec}/100, the pattern is clear: your body needs restoration, not load.`)
      : "";
    return es
      ? `Tu HRV es ${m.hrv || "—"} ms. ${hrvComment}${crossNote} Para mejorar el HRV a largo plazo: sueño consistente, sin alcohol la noche anterior, respiración lenta (5 s inhala / 5 s exhala) y manejo del estrés acumulado.`
      : `Your HRV is ${m.hrv || "—"} ms. ${hrvComment}${crossNote} To improve HRV long-term: consistent sleep, no alcohol the night before, slow breathing (5 s in / 5 s out), and managing accumulated stress.`;
  }

  // SpO2
  if (has("spo2", "oxíg", "oxyg", "saturaci")) {
    const spo2 = typeof m.spo2 === "number" ? m.spo2 : parseFloat(String(m.spo2 ?? ""));
    const spo2Note = !isNaN(spo2)
      ? (spo2 >= 95 ? (es ? "Estás dentro del rango normal." : "You're in the normal range.")
        : spo2 >= 92 ? (es ? "Ligeramente bajo — monitorea y descansa bien." : "Slightly low — monitor and rest well.")
        : (es ? "Por debajo de 92% es señal de alerta — consulta a un médico." : "Below 92% is a warning sign — consult a doctor."))
      : "";
    return es
      ? `Tu SpO2 es ${m.spo2 || "—"}%. ${spo2Note} El rango normal es 95–100%. Durante ejercicio intenso puede bajar momentáneamente — lo que importa es el valor en reposo.`
      : `Your SpO2 is ${m.spo2 || "—"}%. ${spo2Note} Normal range is 95–100%. During intense exercise it can dip briefly — what matters is the resting value.`;
  }

  // Breathing rate
  if (has("respir", "breath", "frecuencia resp")) {
    const br = typeof m.breathing === "number" ? m.breathing : parseFloat(String(m.breathing ?? ""));
    const brNote = !isNaN(br)
      ? (br <= 20 ? (es ? "Dentro del rango normal en reposo (12–20)." : "Within normal resting range (12–20).") : (es ? "Elevada para reposo — puede indicar estrés, fatiga o hidratación baja." : "Elevated for rest — may indicate stress, fatigue, or low hydration."))
      : "";
    return es
      ? `Tu frecuencia respiratoria es ${m.breathing || "—"} resp/min. ${brNote} Para bajarla rápido: respiración en caja (4 s inhala, 4 s aguanta, 4 s exhala, 4 s aguanta) — activa el sistema parasimpático en 2–3 ciclos.`
      : `Your breathing rate is ${m.breathing || "—"} breaths/min. ${brNote} To bring it down fast: box breathing (4 s in, 4 s hold, 4 s out, 4 s hold) — activates the parasympathetic system within 2–3 cycles.`;
  }

  // Recovery score
  if (has("recuper", "recovery", "readiness")) {
    const recLabel = !isNaN(rec) ? (rec >= 67 ? (es ? "zona verde — adelante" : "green zone — go for it") : rec >= 34 ? (es ? "zona amarilla — moderado" : "yellow zone — moderate") : (es ? "zona roja — descansa" : "red zone — rest")) : "";
    const crossNote = accumulatedFatigue
      ? (es ? ` Tu HRV de ${m.hrv || "—"} ms y eficiencia de sueño ${m.sleepEff || "—"}% refuerzan esa señal — no es un número aislado, es un patrón.` : ` Your HRV of ${m.hrv || "—"} ms and sleep efficiency ${m.sleepEff || "—"}% reinforce that signal — it's not an isolated number, it's a pattern.`)
      : "";
    return es
      ? `Recovery ${m.recovery || "—"}/100 — ${recLabel}.${crossNote} Los tres factores que más lo mueven: calidad del sueño profundo, hidratación y manejo del estrés. El alcohol y el entrenamiento muy tardío lo bajan consistentemente.`
      : `Recovery ${m.recovery || "—"}/100 — ${recLabel}.${crossNote} The three biggest drivers: deep sleep quality, hydration, and stress management. Alcohol and late-night hard training reliably lower it.`;
  }

  // Hydration
  if (has("hidrat", "agua", "water", "hydrat", "beber", "drink")) {
    const rhrNote = !isNaN(rhr) && rhr > 70
      ? (es ? ` Tu RHR de ${rhr} bpm está algo elevado — la deshidratación es una causa común.` : ` Your RHR of ${rhr} bpm is slightly elevated — dehydration is a common cause.`)
      : "";
    return es
      ? `Meta general: 35–40 ml/kg de peso al día, más ~500 ml por cada hora de ejercicio intenso.${rhrNote} Ancla el hábito: un vaso al levantarte, uno antes de entrenar, uno con cada comida. La deshidratación del 2% ya reduce el HRV y el rendimiento físico hasta un 10%.`
      : `General target: 35–40 ml/kg of body weight per day, plus ~500 ml per hour of intense exercise.${rhrNote} Anchor the habit: a glass when you wake up, one before training, one with each meal. Just 2% dehydration reduces HRV and physical performance by up to 10%.`;
  }

  // Stress / mental
  if (has("estres", "stress", "ansiedad", "anxiety", "relaj", "calm", "medita")) {
    const stressSignals: string[] = [];
    if (!isNaN(hrv) && hrv < 35) stressSignals.push(es ? `HRV baja (${hrv} ms)` : `low HRV (${hrv} ms)`);
    if (!isNaN(rhr) && rhr > 72) stressSignals.push(es ? `RHR elevado (${rhr} bpm)` : `elevated RHR (${rhr} bpm)`);
    const signalLine = stressSignals.length
      ? (es ? ` Tus métricas lo confirman: ${stressSignals.join(" y ")}.` : ` Your metrics reflect it: ${stressSignals.join(" and ")}.`)
      : "";
    return es
      ? `El estrés crónico sube el RHR, baja el HRV y fragmenta el sueño profundo — todo está conectado.${signalLine} Lo que funciona: respiración lenta (5 s inhala / 5 s exhala) por 5 min, caminata al aire libre y desconexión digital antes de dormir. 10 min al día de práctica consistente mueve más el marcador que sesiones largas y esporádicas.`
      : `Chronic stress raises RHR, lowers HRV, and fragments deep sleep — it's all connected.${signalLine} What works: slow breathing (5 s in / 5 s out) for 5 min, outdoor walk, and digital disconnection before sleep. 10 min/day consistently moves the needle more than sporadic long sessions.`;
  }

  // Default
  const stateLabel = !isNaN(rec)
    ? (rec >= 67 ? (es ? "en verde" : "in the green") : rec >= 34 ? (es ? "en zona moderada" : "in the moderate zone") : (es ? "en zona de recuperación" : "in recovery territory"))
    : "";
  return es
    ? `Hoy estás ${stateLabel || "registrado"}: recovery ${m.recovery || "—"}/100, HRV ${m.hrv || "—"} ms, ${m.steps || "—"} pasos. Pregúntame algo específico — sueño, entrenamiento, HRV, nutrición, pasos, estrés o hidratación — y te doy un análisis directo basado en tu estado real.`
    : `Today you're ${stateLabel || "in the system"}: recovery ${m.recovery || "—"}/100, HRV ${m.hrv || "—"} ms, ${m.steps || "—"} steps. Ask me something specific — sleep, training, HRV, nutrition, steps, stress, or hydration — and I'll give you a direct analysis based on your actual state.`;
}

// Model cascade: primary (from env) → free fallbacks if primary returns 429/quota error
const GEMINI_MODEL_CASCADE = [
  GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter((m, i, arr) => arr.indexOf(m) === i); // deduplicate

async function callGemini(
  q: string,
  m: Metrics,
  lang: string,
  key: string,
  history: HistoryEntry[],
  model: string,
): Promise<{ text: string | null; httpStatus: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = [
    ...history.slice(-MAX_HISTORY).map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: q }] },
  ];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000); // 25 s hard timeout

  // Gemini 2.5-series models share the token budget between thinking and output.
  // Disable thinking for chat coaching (not a reasoning task) to give the full
  // 8192-token budget to the visible response.
  const isThinkingModel = model.startsWith("gemini-2.5");
  const generationConfig: Record<string, unknown> = {
    temperature: 0.65,
    maxOutputTokens: MAX_TOKENS,
  };
  if (isThinkingModel) {
    generationConfig.thinkingConfig = { thinkingBudget: 0, includeThoughts: false };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(m, lang) }] },
        contents,
        generationConfig,
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[AIRA] Gemini ${model} error ${res.status}:`, errText.slice(0, 200));
    return { text: null, httpStatus: res.status };
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  // Filter out thinking parts (thought:true) — only return the visible response
  const text = candidate?.content?.parts
    ?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();

  if (!text) {
    console.error("[AIRA] Empty response from", model, "finishReason:", candidate?.finishReason);
    return { text: null, httpStatus: 200 };
  }

  const final = candidate?.finishReason === "MAX_TOKENS"
    ? text + "\n\n_(Respuesta muy larga — prueba dividir la pregunta.)_"
    : text;

  return { text: final, httpStatus: 200 };
}

export async function POST(request: NextRequest) {
  let body: { q?: string; lang?: string; metrics?: Metrics; history?: HistoryEntry[]; pro?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const q       = (body.q || "").toString().slice(0, MAX_Q).trim();
  const lang    = body.lang === "en" ? "en" : "es";
  const metrics = (body.metrics || {}) as Metrics;
  const history = Array.isArray(body.history)
    ? (body.history as HistoryEntry[]).slice(-MAX_HISTORY)
    : [];
  const isPro   = body.pro === true;

  if (!q) return NextResponse.json({ error: "Empty question" }, { status: 400 });

  // Rate limit — protege el gasto de Gemini API
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowRequest(ip, isPro)) {
    const limit = isPro ? DAILY_PRO : DAILY_FREE;
    const msg   = lang === "en"
      ? `Daily limit of ${limit} messages reached. Come back tomorrow!`
      : `Límite diario de ${limit} mensajes alcanzado. ¡Vuelve mañana!`;
    return NextResponse.json({ answer: msg, source: "quota" }, { status: 429 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    for (const model of GEMINI_MODEL_CASCADE) {
      try {
        const { text, httpStatus } = await callGemini(q, metrics, lang, key, history, model);
        if (text) return NextResponse.json({ answer: text, source: "gemini", model });
        // 429 = quota/credits exhausted → try next model in cascade
        // Any other error → stop trying (auth error, bad request, etc.)
        if (httpStatus !== 429 && httpStatus !== 503) break;
      } catch {
        break; // network / timeout error — skip to local
      }
    }
  }
  return NextResponse.json({ answer: localFallback(q, metrics, lang), source: "local" });
}
