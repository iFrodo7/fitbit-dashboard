/**
 * Motor de análisis biométrico — compite con Whoop
 * Calcula Recovery Score, Strain Score y Sleep Performance
 * usando los datos reales de Fitbit disponibles.
 */

import type { FitbitActivity, FitbitSleep, FitbitHeartRate } from "@/lib/fitbit/types";

// ─── Tipos de salida ──────────────────────────────────────────────────────────

export type RecoveryLevel = "peak" | "good" | "moderate" | "low";
export type StrainLevel   = "rest" | "light" | "moderate" | "strenuous" | "all-out";

export interface RecoveryScore {
  score: number;           // 0–100
  level: RecoveryLevel;
  label: string;           // "En forma" / "Buena" / "Moderada" / "Descansa"
  recommendation: string;  // Texto de recomendación de entrenamiento
  color: string;           // Color hex para UI
  breakdown: {
    sleepDuration:   number;  // 0–30 pts
    sleepEfficiency: number;  // 0–25 pts
    sleepQuality:    number;  // 0–20 pts  (etapas profundo+REM)
    restingHR:       number;  // 0–25 pts
  };
}

export interface StrainScore {
  score: number;        // 0–21 (escala Whoop)
  level: StrainLevel;
  label: string;
  color: string;
  zones: {
    fatBurn:  number;  // minutos en zona Fat Burn
    cardio:   number;  // minutos en zona Cardio
    peak:     number;  // minutos en zona Peak
  };
  caloriesFromExercise: number;
}

export interface SleepPerformance {
  performance:  number;  // 0–100%
  hoursSlept:   number;
  hoursNeeded:  number;  // 8h por defecto
  efficiency:   number;  // 0–100% (tiempo dormido / tiempo en cama)
  latency:      number;  // minutos que tardó en dormirse
  debtMinutes:  number;  // deuda de sueño acumulada hoy
  stages: {
    deep:  number;  // minutos
    rem:   number;
    light: number;
    wake:  number;
  };
}

// ─── Recovery Score ───────────────────────────────────────────────────────────

/**
 * Calcula el Recovery Score (0–100) al estilo Whoop.
 *
 * Componentes:
 *  · Duración del sueño  → 0–30 pts  (vs 8h ideal)
 *  · Eficiencia del sueño → 0–25 pts  (% tiempo dormido/en cama)
 *  · Calidad del sueño   → 0–20 pts  (% profundo+REM sobre total)
 *  · FC en reposo        → 0–25 pts  (más baja = mejor recuperación)
 */
export function calcRecoveryScore(
  sleep: FitbitSleep | null,
  heart: FitbitHeartRate | null
): RecoveryScore {
  const summary     = sleep?.summary;
  const mainSleep   = sleep?.sleep?.find((s) => s.isMainSleep) ?? sleep?.sleep?.[0];
  const heartValue  = heart?.["activities-heart"]?.[0]?.value;

  // 1. Duración del sueño (0–30 pts)
  const minutesAsleep   = summary?.totalMinutesAsleep ?? 0;
  const sleepDuration   = Math.round(Math.min(minutesAsleep / 480, 1) * 30);

  // 2. Eficiencia del sueño (0–25 pts) — dato real de Fitbit
  const efficiency      = mainSleep?.efficiency ?? 85;
  const sleepEfficiency = Math.round((efficiency / 100) * 25);

  // 3. Calidad por etapas (0–20 pts) — % profundo+REM sobre total dormido
  const deep    = summary?.stages?.deep  ?? 0;
  const rem     = summary?.stages?.rem   ?? 0;
  const qualityRatio = minutesAsleep > 0
    ? (deep + rem) / minutesAsleep
    : 0;
  // Ideal ≈ 45% del sueño en profundo+REM
  const sleepQuality = Math.round(Math.min(qualityRatio / 0.45, 1) * 20);

  // 4. FC en reposo (0–25 pts) — rango saludable 40–80 bpm
  const rhr        = heartValue?.restingHeartRate ?? 65;
  const hrScore    = Math.max(0, Math.min((80 - rhr) / 40, 1));
  const restingHR  = Math.round(hrScore * 25);

  const score = Math.min(100, sleepDuration + sleepEfficiency + sleepQuality + restingHR);

  const level: RecoveryLevel =
    score >= 67 ? "peak"     :
    score >= 50 ? "good"     :
    score >= 34 ? "moderate" : "low";

  const labels: Record<RecoveryLevel, string> = {
    peak:     "En forma",
    good:     "Buena",
    moderate: "Moderada",
    low:      "Descansa",
  };

  const recommendations: Record<RecoveryLevel, string> = {
    peak:     "Listo para entrenar al máximo",
    good:     "Buen día para entrenamiento moderado-alto",
    moderate: "Mantén la intensidad baja o media",
    low:      "Prioriza el descanso hoy",
  };

  const colors: Record<RecoveryLevel, string> = {
    peak:     "#22c55e",  // verde
    good:     "#84cc16",  // lima
    moderate: "#f59e0b",  // amarillo
    low:      "#ef4444",  // rojo
  };

  return {
    score,
    level,
    label:          labels[level],
    recommendation: recommendations[level],
    color:          colors[level],
    breakdown: { sleepDuration, sleepEfficiency, sleepQuality, restingHR },
  };
}

// ─── Strain Score ─────────────────────────────────────────────────────────────

/**
 * Calcula el Strain Score (0–21) al estilo Whoop.
 * Usa tiempo en zonas de frecuencia cardíaca de Fitbit.
 *
 * Pesos por zona:
 *  · Fat Burn  → ×0.6
 *  · Cardio    → ×2.0
 *  · Peak      → ×4.5
 */
export function calcStrainScore(heart: FitbitHeartRate | null): StrainScore {
  const zones = heart?.["activities-heart"]?.[0]?.value?.heartRateZones ?? [];

  const fatBurn = zones.find((z) => z.name === "Fat Burn")?.minutes ?? 0;
  const cardio  = zones.find((z) => z.name === "Cardio")?.minutes   ?? 0;
  const peak    = zones.find((z) => z.name === "Peak")?.minutes     ?? 0;

  const calories = zones.reduce((sum, z) => sum + (z.caloriesOut ?? 0), 0);
  const baseCals  = zones.find((z) => z.name === "Out of Range")?.caloriesOut ?? 0;
  const exerciseCals = Math.round(calories - baseCals);

  // Carga cardiovascular ponderada → escala 0–21
  const raw   = fatBurn * 0.6 + cardio * 2.0 + peak * 4.5;
  const score = parseFloat(Math.min(raw / 60, 21).toFixed(1));

  const level: StrainLevel =
    score >= 18 ? "all-out"    :
    score >= 14 ? "strenuous"  :
    score >= 8  ? "moderate"   :
    score >= 3  ? "light"      : "rest";

  const labels: Record<StrainLevel, string> = {
    "all-out":   "Al límite",
    strenuous:   "Intenso",
    moderate:    "Moderado",
    light:       "Ligero",
    rest:        "Reposo",
  };

  const colors: Record<StrainLevel, string> = {
    "all-out":   "#ef4444",
    strenuous:   "#f97316",
    moderate:    "#3b82f6",
    light:       "#22d3ee",
    rest:        "#6b7280",
  };

  return {
    score,
    level,
    label:                labels[level],
    color:                colors[level],
    zones:                { fatBurn, cardio, peak },
    caloriesFromExercise: Math.max(0, exerciseCals),
  };
}

// ─── Sleep Performance ────────────────────────────────────────────────────────

/**
 * Calcula el rendimiento de sueño (0–100%) al estilo Whoop.
 * Usa datos reales de Fitbit: eficiencia, latencia y etapas.
 */
export function calcSleepPerformance(sleep: FitbitSleep | null): SleepPerformance {
  const summary   = sleep?.summary;
  const mainSleep = sleep?.sleep?.find((s) => s.isMainSleep) ?? sleep?.sleep?.[0];

  const minutesAsleep = summary?.totalMinutesAsleep ?? 0;
  const minutesInBed  = summary?.totalTimeInBed     ?? 0;
  const hoursNeeded   = 8;
  const minutesNeeded = hoursNeeded * 60;

  const performance = Math.round(Math.min((minutesAsleep / minutesNeeded) * 100, 100));
  const efficiency  = minutesInBed > 0
    ? Math.round((minutesAsleep / minutesInBed) * 100)
    : (mainSleep?.efficiency ?? 0);
  const latency     = mainSleep?.minutesToFallAsleep ?? 0;
  const debtMinutes = Math.max(0, minutesNeeded - minutesAsleep);

  return {
    performance,
    hoursSlept:  parseFloat((minutesAsleep / 60).toFixed(1)),
    hoursNeeded,
    efficiency,
    latency,
    debtMinutes,
    stages: {
      deep:  summary?.stages?.deep  ?? 0,
      rem:   summary?.stages?.rem   ?? 0,
      light: summary?.stages?.light ?? 0,
      wake:  summary?.stages?.wake  ?? 0,
    },
  };
}
