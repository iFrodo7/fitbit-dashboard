import { NextRequest, NextResponse } from "next/server";

// AIRA coach endpoint. Free for users; the API key (if any) lives only here,
// never in the client. Without GEMINI_API_KEY it returns a rule-based local
// answer so the chat always works at $0. Add a free key from Google AI Studio
// (aistudio.google.com, no credit card) in Vercel env to enable real answers.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const MAX_Q = 600;       // cap question length (abuse / cost guard)
const MAX_HISTORY = 12;  // max history entries (6 turns) sent to Gemini

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

function metricsLine(m: Metrics): string {
  const parts: string[] = [];
  if (m.recovery != null && m.recovery !== "") parts.push(`recovery ${m.recovery}/100`);
  if (m.rhr) parts.push(`resting HR ${m.rhr} bpm`);
  if (m.hrv) parts.push(`HRV ${m.hrv} ms`);
  if (m.spo2) parts.push(`SpO2 ${m.spo2}%`);
  if (m.breathing) parts.push(`breathing ${m.breathing}/min`);
  if (m.sleep) {
    let sleepStr = `last sleep ${m.sleep}`;
    const details: string[] = [];
    if (m.deepSleep) details.push(`deep ${m.deepSleep}`);
    if (m.remSleep) details.push(`REM ${m.remSleep}`);
    if (details.length) sleepStr += ` (${details.join(", ")})`;
    if (m.sleepEff) sleepStr += `, efficiency ${m.sleepEff}%`;
    if (m.sleepWakes) sleepStr += `, ${m.sleepWakes} awakenings`;
    parts.push(sleepStr);
  }
  if (m.steps) parts.push(`steps ${m.steps}`);
  if (m.strain) parts.push(`strain ${m.strain}/21`);
  if (m.fatBurnMin || m.cardioMin || m.peakMin) {
    const zones: string[] = [];
    if (m.fatBurnMin) zones.push(`fat-burn ${m.fatBurnMin}`);
    if (m.cardioMin) zones.push(`cardio ${m.cardioMin}`);
    if (m.peakMin) zones.push(`peak ${m.peakMin}`);
    parts.push(`HR zones: ${zones.join(", ")}`);
  }
  if (m.trend && m.trend.days && m.trend.days >= 3) {
    const t = m.trend;
    const tp: string[] = [];
    if (t.avgRecovery != null) tp.push(`avg recovery ${t.avgRecovery}/100`);
    if (t.avgRhr != null) tp.push(`avg RHR ${t.avgRhr} bpm`);
    if (t.avgSleepMin != null) tp.push(`avg sleep ${(t.avgSleepMin / 60).toFixed(1)}h`);
    if (t.avgDeepMin != null) tp.push(`avg deep sleep ${t.avgDeepMin}min`);
    if (t.avgSteps != null) tp.push(`avg steps ${t.avgSteps}`);
    if (tp.length) parts.push(`${t.days}-day trend: ${tp.join(", ")}`);
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
    "You are AIRA, a certified personal trainer, sports nutritionist, and sleep & recovery coach",
    "embedded in the Fitbit Air wellness app. You have deep expertise across ALL areas of fitness and wellness:",
    "strength training, cardio, HIIT, mobility, periodization, sports nutrition, sleep science,",
    "stress management, hydration, supplementation, injury prevention, and biometric analysis.",

    "DOMAIN: You only coach on health, fitness, and wellness topics.",
    "If the user asks about anything outside this domain (politics, finance, coding, entertainment, etc.),",
    "politely decline and offer a relevant fitness insight instead. NEVER break character.",

    dateCtx,
    hasMetrics
      ? `USER'S CURRENT BIOMETRICS: ${metricsLine(m)}.`
      : "No biometric data available for this user yet.",
    hasMetrics
      ? "Use these metrics to PERSONALIZE your advice — reference specific values when they are relevant to the question."
      : "Give general expert advice since no user data is available.",
    "For questions that don't directly relate to the metrics (e.g. technique, programming, nutrition science),",
    "answer with your full expertise and weave in the user's biometric context where it adds value.",

    "RESPONSE QUALITY RULES:",
    "1. Always give COMPLETE answers — never cut off mid-explanation.",
    "2. Be professional, specific, and evidence-based.",
    "3. Structure longer answers with clear sections when helpful.",
    "4. Be encouraging and motivational without being generic.",
    "5. If a question is simple, a focused 2-3 paragraph answer is fine. If it's complex, go deeper.",
    "6. Never say 'I cannot answer that' for any legitimate fitness/wellness question.",

    "You are NOT a doctor — for medical symptoms always recommend consulting a healthcare professional.",
    "Do not fabricate metric values you were not given.",
    `Always reply in ${langName}.`,
  ].filter(Boolean).join(" ");
}

// Rule-based answers used when no API key is configured. Keeps the coach useful at $0.
function localFallback(q: string, m: Metrics, lang: string): string {
  const es = lang !== "en";
  const ql = q.toLowerCase();
  const rec = typeof m.recovery === "number" ? m.recovery : parseInt(String(m.recovery || ""));
  const hrv = typeof m.hrv === "number" ? m.hrv : parseInt(String(m.hrv || ""));
  const has = (...w: string[]) => w.some((x) => ql.includes(x));

  // Off-topic redirect — stay in character
  if (has("polít", "politic", "econom", "finanz", "dinero", "money", "crypt", "stock",
          "programar", "código", "javascript", "python", "receta de", "cocina",
          "historia", "history", "movie", "pelíc", "música", "music",
          "amor", "relaci", "notic", "news", "fútbol", "soccer",
          "clima", "weather", "chiste", "joke")) {
    return es
      ? `Soy AIRA, tu coach de fitness y bienestar — ese tema está fuera de mi área. Puedo ayudarte con entrenamiento, sueño, nutrición y tus métricas. Hoy tienes ${m.steps || "—"} pasos y recovery ${m.recovery || "—"}/100. ¿Qué aspecto de tu salud quieres trabajar?`
      : `I'm AIRA, your fitness & wellness coach — that topic is outside my scope. I can help with training, sleep, nutrition and your metrics. Today you have ${m.steps || "—"} steps and recovery ${m.recovery || "—"}/100. What aspect of your health do you want to work on?`;
  }

  if (has("dorm", "sleep", "sueñ", "descan", "rest")) {
    const details = [m.deepSleep ? `profundo: ${m.deepSleep}` : "", m.remSleep ? `REM: ${m.remSleep}` : ""].filter(Boolean).join(", ");
    return es
      ? `Tu último sueño fue ${m.sleep || "—"}${details ? ` (${details})` : ""}${m.sleepEff ? `, eficiencia ${m.sleepEff}%` : ""}. Apunta a 7.5–8 h con horario constante (±20 min). Evita pantallas 1 h antes y cafeína después del mediodía.`
      : `Your last sleep was ${m.sleep || "—"}${details ? ` (${details})` : ""}${m.sleepEff ? `, efficiency ${m.sleepEff}%` : ""}. Aim for 7.5–8 h on a consistent schedule (±20 min). Avoid screens 1 h before bed and caffeine after midday.`;
  }
  if (has("entren", "train", "rutina", "routine", "ejercici", "workout", "gym", "cardio", "fuerza", "strength")) {
    if (!isNaN(rec) && rec >= 67) return es
      ? `Recovery ${rec}/100: estás listo para alta intensidad. Buen día para fuerza pesada o intervalos${m.fatBurnMin || m.cardioMin ? ` — ya llevas algo de zona cardio hoy` : ""}. Calienta bien e hidrátate.`
      : `Recovery ${rec}/100: you're ready for high intensity. Great day for heavy strength or intervals${m.fatBurnMin || m.cardioMin ? ` — you already have some cardio zone time today` : ""}. Warm up well and hydrate.`;
    if (!isNaN(rec) && rec >= 34) return es
      ? `Recovery ${rec}/100: intensidad moderada hoy. Cardio Zona 2 o técnica/movilidad rinden mejor que ir al máximo.`
      : `Recovery ${rec}/100: keep it moderate today. Zone 2 cardio or technique/mobility will pay off more than going all-out.`;
    return es
      ? `Recovery ${rec || "bajo"}/100: prioriza recuperación — caminata suave, estiramiento o descanso activo. Forzar hoy aumenta el riesgo de lesión.`
      : `Recovery ${rec || "low"}/100: prioritize recovery — easy walk, stretching or active rest. Pushing today raises injury risk.`;
  }
  if (has("comer", "comida", "diet", "eat", "nutri", "aliment", "protein", "cen", "desayun", "breakfast", "lunch", "almuerz")) {
    return es
      ? `Para tu nivel de actividad (${m.steps || "—"} pasos), reparte proteína en cada comida (~1.6 g/kg/día), prioriza comida real y mantente hidratado. Tras entrenar fuerte, proteína + carbohidrato en los primeros 45 min ayuda a recuperar.`
      : `For your activity level (${m.steps || "—"} steps), spread protein across meals (~1.6 g/kg/day), favor whole foods and stay hydrated. After hard training, protein + carbs within 45 min aids recovery.`;
  }
  if (has("paso", "step", "activ", "caminar", "walk", "sedent")) {
    return es
      ? `Llevas ${m.steps || "—"} pasos. Si te falta para tu meta, una caminata de 10–15 min suma y mejora tu recovery. La constancia diaria gana a los picos aislados.`
      : `You're at ${m.steps || "—"} steps. If you're short of your goal, a 10–15 min walk helps and boosts recovery. Daily consistency beats isolated spikes.`;
  }
  if (has("hrv", "variabil")) {
    return es
      ? `Tu HRV es ${m.hrv || "—"} ms. ${!isNaN(hrv) ? (hrv >= 60 ? "Excelente — sistema nervioso bien recuperado." : hrv >= 40 ? "HRV moderada — considera un día de recuperación activa." : "HRV baja — señal de estrés o fatiga acumulada.") : ""} Mejóralo con sueño consistente, respiración profunda y evitando alcohol la noche anterior.`
      : `Your HRV is ${m.hrv || "—"} ms. ${!isNaN(hrv) ? (hrv >= 60 ? "Excellent — nervous system well recovered." : hrv >= 40 ? "Moderate HRV — consider an active recovery day." : "Low HRV — sign of stress or accumulated fatigue.") : ""} Improve it with consistent sleep, deep breathing, and avoiding alcohol the night before.`;
  }
  if (has("spo2", "oxíg", "oxyg", "saturaci")) {
    return es
      ? `Tu SpO2 es ${m.spo2 || "—"}%. Normal: 95–100%. Por debajo de 92% es señal de alerta — consulta un médico. Durante ejercicio intenso puede bajar levemente; descansa, hidrata y monitorea.`
      : `Your SpO2 is ${m.spo2 || "—"}%. Normal: 95–100%. Below 92% is a warning sign — see a doctor. During intense exercise it can drop slightly; rest, hydrate and monitor.`;
  }
  if (has("respir", "breath", "frecuencia resp")) {
    return es
      ? `Tu frecuencia respiratoria es ${m.breathing || "—"} resp/min. Normal en reposo: 12–20. Elevada puede indicar estrés o fatiga. El "box breathing" (inhala 4 s, aguanta 4 s, exhala 4 s, aguanta 4 s) reduce el sistema nervioso simpático en minutos.`
      : `Your breathing rate is ${m.breathing || "—"} breaths/min. Normal at rest: 12–20. Elevated can indicate stress or fatigue. Box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) activates the parasympathetic system within minutes.`;
  }
  if (has("recuper", "recovery", "readiness")) {
    return es
      ? `Tu recovery score es ${m.recovery || "—"}/100. ${!isNaN(rec) ? (rec >= 67 ? "Listo para alta intensidad." : rec >= 34 ? "Intensidad moderada recomendada." : "Prioriza descanso activo hoy.") : ""} Claves para mejorarlo: sueño profundo, hidratación, reducir estrés y evitar alcohol.`
      : `Your recovery score is ${m.recovery || "—"}/100. ${!isNaN(rec) ? (rec >= 67 ? "Ready for high intensity." : rec >= 34 ? "Moderate intensity recommended." : "Prioritize active rest today.") : ""} Keys to improve it: deep sleep, hydration, reducing stress and avoiding alcohol.`;
  }
  if (has("hidrat", "agua", "water", "hydrat", "beber", "drink")) {
    return es
      ? `La hidratación óptima para tu actividad (${m.steps || "—"} pasos) es 35–40 ml/kg/día. Bebe un vaso al levantarte, antes de entrenar y en cada comida. La deshidratación del 2% reduce el HRV y el rendimiento físico hasta un 10%.`
      : `Optimal hydration for your activity (${m.steps || "—"} steps) is 35–40 ml/kg/day. Drink a glass when you wake up, before training and with each meal. Just 2% dehydration reduces HRV and physical performance by up to 10%.`;
  }
  if (has("estres", "stress", "ansiedad", "anxiety", "relaj", "calm", "medita")) {
    return es
      ? `El estrés se refleja en tus métricas (HRV ${m.hrv || "—"} ms, RHR ${m.rhr || "—"} bpm). Técnicas efectivas: respiración 4-7-8, 10 min de meditación al día, caminatas al aire libre. El estrés crónico eleva el RHR, baja el HRV y degrada el sueño profundo.`
      : `Stress shows in your metrics (HRV ${m.hrv || "—"} ms, RHR ${m.rhr || "—"} bpm). Effective techniques: 4-7-8 breathing, 10 min/day meditation, outdoor walks. Chronic stress raises RHR, lowers HRV and degrades deep sleep.`;
  }
  return es
    ? `Con tus datos (${metricsLine(m)}), enfócate en sueño consistente, entrena según tu recovery e hidrátate bien. Pregúntame algo específico: sueño, entrenamiento, HRV, nutrición, pasos o estrés.`
    : `Based on your data (${metricsLine(m)}), focus on consistent sleep, training to your recovery, and hydration. Ask me something specific: sleep, training, HRV, nutrition, steps or stress.`;
}

async function callGemini(
  q: string,
  m: Metrics,
  lang: string,
  key: string,
  history: HistoryEntry[],
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const contents = [
    ...history.slice(-MAX_HISTORY).map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: q }] },
  ];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(m, lang) }] },
      contents,
      generationConfig: { temperature: 0.65, maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  // Gemini 2.5 thinking models include parts with thought:true — filter them out
  const text = candidate?.content?.parts
    ?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  if (!text) return null;
  // If the model hit the token limit mid-response, append a continuation note
  if (candidate?.finishReason === "MAX_TOKENS") {
    return text + "\n\n[Respuesta completa disponible — intenta reformular la pregunta de forma más específica.]";
  }
  return text;
}

export async function POST(request: NextRequest) {
  let body: { q?: string; lang?: string; metrics?: Metrics; history?: HistoryEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const q = (body.q || "").toString().slice(0, MAX_Q).trim();
  const lang = body.lang === "en" ? "en" : "es";
  const metrics = (body.metrics || {}) as Metrics;
  const history = Array.isArray(body.history)
    ? (body.history as HistoryEntry[]).slice(-MAX_HISTORY)
    : [];
  if (!q) return NextResponse.json({ error: "Empty question" }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const answer = await callGemini(q, metrics, lang, key, history);
      if (answer) return NextResponse.json({ answer, source: "gemini" });
    } catch { /* fall through to local */ }
  }
  return NextResponse.json({ answer: localFallback(q, metrics, lang), source: "local" });
}
