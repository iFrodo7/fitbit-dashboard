import { NextRequest, NextResponse } from "next/server";

// AIRA coach endpoint. Free for users; the API key (if any) lives only here,
// never in the client. Without GEMINI_API_KEY it returns a rule-based local
// answer so the chat always works at $0. Add a free key from Google AI Studio
// (aistudio.google.com, no credit card) in Vercel env to enable real answers.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const MAX_Q = 600; // cap question length (abuse / cost guard)

type Metrics = {
  recovery?: number | string;
  rhr?: number | string;
  hrv?: number | string;
  spo2?: number | string;
  breathing?: number | string;
  sleep?: string;
  steps?: number | string;
  strain?: number | string;
};

function metricsLine(m: Metrics): string {
  const parts: string[] = [];
  if (m.recovery != null && m.recovery !== "") parts.push(`recovery ${m.recovery}/100`);
  if (m.rhr) parts.push(`resting HR ${m.rhr} bpm`);
  if (m.hrv) parts.push(`HRV ${m.hrv} ms`);
  if (m.spo2) parts.push(`SpO2 ${m.spo2}%`);
  if (m.breathing) parts.push(`breathing ${m.breathing}/min`);
  if (m.sleep) parts.push(`last sleep ${m.sleep}`);
  if (m.steps) parts.push(`steps ${m.steps}`);
  if (m.strain) parts.push(`strain ${m.strain}/21`);
  return parts.length ? parts.join(", ") : "no recent data yet";
}

function systemPrompt(m: Metrics, lang: string): string {
  const langName = lang === "en" ? "English" : "Spanish";
  return [
    "You are AIRA, the fitness & wellness coach inside the Fitbit Air app.",
    `The user's latest metrics: ${metricsLine(m)}.`,
    "Give concise, practical, encouraging advice grounded in THESE numbers:",
    "training readiness, recovery, sleep timing, routines, hydration and nutrition habits.",
    "Keep answers short (2-4 sentences) and actionable. Use the data when relevant.",
    "Stay strictly on fitness/wellness. You are NOT a doctor; for medical symptoms,",
    "recommend seeing a professional. Do not invent metrics you weren't given.",
    `Always reply in ${langName}.`,
  ].join(" ");
}

// Rule-based answer used when no API key is configured. Keeps the coach useful at $0.
function localFallback(q: string, m: Metrics, lang: string): string {
  const es = lang !== "en";
  const ql = q.toLowerCase();
  const rec = typeof m.recovery === "number" ? m.recovery : parseInt(String(m.recovery || ""));
  const has = (...w: string[]) => w.some((x) => ql.includes(x));

  if (has("dorm", "sleep", "sueñ", "descan", "rest")) {
    return es
      ? `Tu último sueño fue ${m.sleep || "—"}. Apunta a 7.5–8 h con horario constante (±20 min). Evita pantallas 1 h antes y cafeína después del mediodía.`
      : `Your last sleep was ${m.sleep || "—"}. Aim for 7.5–8 h on a consistent schedule (±20 min). Avoid screens 1 h before bed and caffeine after midday.`;
  }
  if (has("entren", "train", "rutina", "routine", "ejercici", "workout", "gym")) {
    if (!isNaN(rec) && rec >= 67) return es ? `Recovery ${rec}/100: estás listo para alta intensidad. Buen día para fuerza pesada o intervalos. Calienta bien e hidrátate.` : `Recovery ${rec}/100: you're ready for high intensity. Great day for heavy strength or intervals. Warm up well and hydrate.`;
    if (!isNaN(rec) && rec >= 34) return es ? `Recovery ${rec}/100: intensidad moderada hoy. Cardio Zona 2 o técnica/movilidad rinden mejor que ir al máximo.` : `Recovery ${rec}/100: keep it moderate today. Zone 2 cardio or technique/mobility will pay off more than going all-out.`;
    return es ? `Recovery ${rec || "bajo"}/100: prioriza recuperación — caminata suave, estiramiento o descanso. Forzar hoy aumenta el riesgo de lesión.` : `Recovery ${rec || "low"}/100: prioritize recovery — easy walk, stretching or rest. Pushing today raises injury risk.`;
  }
  if (has("comer", "comida", "diet", "eat", "nutri", "aliment", "protein", "ceno", "cena")) {
    return es
      ? `Para tu nivel de actividad (${m.steps || "—"} pasos), reparte proteína en cada comida (~1.6 g/kg/día), prioriza comida real y mantente hidratado. Tras entrenar fuerte, proteína + carbohidrato ayuda a recuperar.`
      : `For your activity level (${m.steps || "—"} steps), spread protein across meals (~1.6 g/kg/day), favor whole foods and stay hydrated. After hard training, protein + carbs aids recovery.`;
  }
  if (has("paso", "step", "activ", "caminar", "walk")) {
    return es ? `Llevas ${m.steps || "—"} pasos. Si te falta para tu meta, una caminata de 10–15 min suma y mejora tu recovery. La constancia gana a los picos.` : `You're at ${m.steps || "—"} steps. If you're short of your goal, a 10–15 min walk helps and boosts recovery. Consistency beats spikes.`;
  }
  return es
    ? `Con tus datos (${metricsLine(m)}), enfócate en sueño constante, entrenar según tu recovery e hidratarte. Pregúntame algo específico: sueño, rutina, o nutrición.`
    : `Based on your data (${metricsLine(m)}), focus on consistent sleep, training to your recovery, and hydration. Ask me something specific: sleep, routine, or nutrition.`;
}

async function callGemini(q: string, m: Metrics, lang: string, key: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(m, lang) }] },
      contents: [{ role: "user", parts: [{ text: q }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
  return text || null;
}

export async function POST(request: NextRequest) {
  let body: { q?: string; lang?: string; metrics?: Metrics };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const q = (body.q || "").toString().slice(0, MAX_Q).trim();
  const lang = body.lang === "en" ? "en" : "es";
  const metrics = (body.metrics || {}) as Metrics;
  if (!q) return NextResponse.json({ error: "Empty question" }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const answer = await callGemini(q, metrics, lang, key);
      if (answer) return NextResponse.json({ answer, source: "gemini" });
    } catch { /* fall through to local */ }
  }
  return NextResponse.json({ answer: localFallback(q, metrics, lang), source: "local" });
}
