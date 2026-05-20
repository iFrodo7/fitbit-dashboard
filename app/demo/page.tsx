"use client";

/**
 * Página de demo — no requiere Fitbit ni autenticación.
 * Muestra el dashboard completo con datos realistas de ejemplo.
 */

import { clsx } from "clsx";
import { AppProviders } from "@/components/providers/AppProviders";
import { useTheme, useI18n } from "@/components/providers/AppProviders";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecoveryBanner } from "@/components/dashboard/RecoveryBanner";
import {
  calcRecoveryScore,
  calcStrainScore,
  calcSleepPerformance,
} from "@/lib/analytics/scores";
import type { FitbitActivity, FitbitSleep, FitbitHeartRate } from "@/lib/fitbit/types";

// ─── Datos de ejemplo realistas ───────────────────────────────────────────────

const MOCK_ACTIVITY: FitbitActivity = {
  activities: [],
  goals: {
    activeMinutes: 30,
    caloriesOut: 2500,
    distance: 8,
    floors: 10,
    steps: 10000,
  },
  summary: {
    steps: 8432,
    caloriesOut: 2184,
    caloriesBMR: 1620,
    activityCalories: 564,
    marginalCalories: 412,
    distances: [{ activity: "total", distance: 6.31 }],
    fairlyActiveMinutes: 18,
    veryActiveMinutes: 27,
    lightlyActiveMinutes: 185,
    sedentaryMinutes: 520,
    floors: 8,
    elevation: 24,
  },
};

const MOCK_SLEEP: FitbitSleep = {
  sleep: [
    {
      dateOfSleep: "2026-05-18",
      duration: 25920000,
      efficiency: 94,
      isMainSleep: true,
      levels: {},
      minutesAfterWakeup: 3,
      minutesAsleep: 432,
      minutesAwake: 18,
      minutesToFallAsleep: 11,
      startTime: "2026-05-17T23:45:00.000",
      endTime: "2026-05-18T07:00:00.000",
      timeInBed: 450,
      type: "stages",
    },
  ],
  summary: {
    stages: { deep: 85, light: 228, rem: 108, wake: 18 },
    totalMinutesAsleep: 432,
    totalSleepRecords: 1,
    totalTimeInBed: 450,
  },
};

const MOCK_HEART: FitbitHeartRate = {
  "activities-heart": [
    {
      dateTime: "2026-05-18",
      value: {
        customHeartRateZones: [],
        restingHeartRate: 61,
        heartRateZones: [
          { name: "Out of Range", min: 30,  max: 112, minutes: 840, caloriesOut: 1620 },
          { name: "Fat Burn",     min: 112, max: 133, minutes: 52,  caloriesOut: 310  },
          { name: "Cardio",       min: 133, max: 160, minutes: 22,  caloriesOut: 198  },
          { name: "Peak",         min: 160, max: 220, minutes: 6,   caloriesOut: 56   },
        ],
      },
    },
  ],
};

// ─── Dashboard interno (necesita contexto de tema) ────────────────────────────

function DemoContent() {
  const { config } = useTheme();
  const { tr } = useI18n();

  const summary   = MOCK_ACTIVITY.summary;
  const goals     = MOCK_ACTIVITY.goals;
  const sleepSum  = MOCK_SLEEP.summary;
  const heartVal  = MOCK_HEART["activities-heart"][0].value;

  const recoveryScore    = calcRecoveryScore(MOCK_SLEEP, MOCK_HEART);
  const strainScore      = calcStrainScore(MOCK_HEART);
  const sleepPerformance = calcSleepPerformance(MOCK_SLEEP);

  return (
    <div className={clsx("min-h-screen flex flex-col", config.bg)}>
      <Header userName="Demo User" lastUpdate={new Date()} />

      {/* Badge de demo */}
      <div className="px-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className={clsx("text-xs opacity-50", config.text)}>
            Modo demo — datos de ejemplo
          </span>
        </div>
      </div>

      <main className="flex-1 p-6">
        {/* ── Banner Whoop-style ── */}
        <RecoveryBanner
          recovery={recoveryScore}
          strain={strainScore}
          sleep={sleepPerformance}
        />

        {/* ── Grid de métricas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

          {/* Pasos */}
          <MetricCard
            label={tr.metrics.steps}
            value={summary.steps}
            icon="👟"
            progress={(summary.steps / goals.steps) * 100}
            goal={goals.steps.toLocaleString()}
            goalLabel={tr.metrics.goal}
          />

          {/* Calorías — expandible */}
          <MetricCard
            label={tr.metrics.calories}
            value={summary.caloriesOut}
            icon="🔥"
            progress={(summary.caloriesOut / goals.caloriesOut) * 100}
            goal={goals.caloriesOut}
            goalLabel={tr.metrics.goal}
            expandable
            expandedContent={
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded p-2 text-center">
                    <p className={clsx("text-xs opacity-50 mb-1", config.text)}>Basal (BMR)</p>
                    <p className={clsx("text-lg font-bold tabular-nums", config.text)}>
                      {summary.caloriesBMR.toLocaleString()}
                    </p>
                    <p className={clsx("text-xs opacity-40", config.text)}>kcal</p>
                  </div>
                  <div className="bg-white/5 rounded p-2 text-center">
                    <p className={clsx("text-xs opacity-50 mb-1", config.text)}>Activas</p>
                    <p className={clsx("text-lg font-bold tabular-nums", config.text)}>
                      {summary.activityCalories.toLocaleString()}
                    </p>
                    <p className={clsx("text-xs opacity-40", config.text)}>kcal</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={clsx("text-xs opacity-40 uppercase tracking-wider", config.text)}>
                    Minutos por intensidad
                  </p>
                  {[
                    { label: "Sedentario", min: summary.sedentaryMinutes,      color: "bg-white/25" },
                    { label: "Ligero",     min: summary.lightlyActiveMinutes,  color: "bg-blue-400/60" },
                    { label: "Moderado",   min: summary.fairlyActiveMinutes,   color: "bg-yellow-400/60" },
                    { label: "Intenso",    min: summary.veryActiveMinutes,     color: "bg-red-400/70" },
                  ].map(({ label, min, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={clsx("text-xs opacity-60 w-16 shrink-0", config.text)}>
                        {label}
                      </span>
                      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={clsx(color, "h-1.5 rounded-full transition-all duration-700")}
                          style={{ width: `${Math.min((min / 1440) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={clsx("text-xs opacity-50 w-12 text-right tabular-nums", config.text)}>
                        {min}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          {/* Distancia */}
          <MetricCard
            label={tr.metrics.distance}
            value={summary.distances[0].distance.toFixed(2)}
            unit={tr.metrics.km}
            icon="📍"
            progress={(summary.distances[0].distance / goals.distance) * 100}
            goal={`${goals.distance} km`}
            goalLabel={tr.metrics.goal}
          />

          {/* Minutos activos */}
          <MetricCard
            label={tr.metrics.activeMin}
            value={summary.fairlyActiveMinutes + summary.veryActiveMinutes}
            unit={tr.metrics.minutes}
            icon="⚡"
            progress={((summary.fairlyActiveMinutes + summary.veryActiveMinutes) / goals.activeMinutes) * 100}
            goal={goals.activeMinutes}
            goalLabel={tr.metrics.goal}
          />

          {/* Sueño */}
          <MetricCard
            label={tr.metrics.sleep}
            value={`${Math.floor(sleepSum.totalMinutesAsleep / 60)}${tr.metrics.hours} ${sleepSum.totalMinutesAsleep % 60}${tr.metrics.minutes}`}
            icon="🌙"
            progress={Math.min((sleepSum.totalMinutesAsleep / 480) * 100, 100)}
            goal="8h"
            goalLabel={tr.metrics.goal}
          />

          {/* FC en reposo */}
          <MetricCard
            label={tr.metrics.heartRate}
            value={heartVal.restingHeartRate}
            unit={tr.metrics.bpm}
            icon="❤️"
          />

          {/* Pisos */}
          <MetricCard
            label={tr.metrics.floors}
            value={summary.floors}
            icon="🏢"
            progress={(summary.floors / goals.floors) * 100}
            goal={goals.floors}
            goalLabel={tr.metrics.goal}
          />

          {/* Sedentario */}
          <MetricCard
            label="Sedentario"
            value={`${Math.floor(summary.sedentaryMinutes / 60)}${tr.metrics.hours}`}
            icon="🪑"
          />
        </div>

        {/* ── Zonas cardíacas ── */}
        <section className="mt-6">
          <h2 className={clsx("text-sm font-semibold mb-3 opacity-70", config.text)}>
            Zonas cardíacas hoy
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {heartVal.heartRateZones.map((zone) => (
              <div key={zone.name} className={clsx(config.card, "p-3 text-center")}>
                <p className={clsx("text-xs opacity-60 mb-1", config.text)}>{zone.name}</p>
                <p className={clsx("text-2xl font-bold", config.text)}>{zone.minutes}</p>
                <p className={clsx("text-xs opacity-50", config.text)}>min</p>
                <p className={clsx("text-xs opacity-40 mt-1", config.text)}>
                  {zone.min}–{zone.max} bpm
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Etapas del sueño ── */}
        <section className="mt-6">
          <h2 className={clsx("text-sm font-semibold mb-3 opacity-70", config.text)}>
            {tr.metrics.sleep} — Etapas
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: "deep",  label: tr.sleep.deep,   icon: "🔵" },
              { key: "light", label: tr.sleep.light,  icon: "🟢" },
              { key: "rem",   label: tr.sleep.rem,    icon: "🟣" },
              { key: "wake",  label: tr.sleep.awake,  icon: "🟡" },
            ].map(({ key, label, icon }) => (
              <div key={key} className={clsx(config.card, "p-3 text-center")}>
                <p className="text-lg">{icon}</p>
                <p className={clsx("text-xs opacity-60 mb-1", config.text)}>{label}</p>
                <p className={clsx("text-xl font-bold", config.text)}>
                  {sleepSum.stages[key as keyof typeof sleepSum.stages]}
                </p>
                <p className={clsx("text-xs opacity-50", config.text)}>min</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Wrapper con proveedores (no requiere Supabase) ───────────────────────────

export default function DemoPage() {
  return (
    <AppProviders initialTheme="futuristic" initialLang="es">
      <DemoContent />
    </AppProviders>
  );
}
