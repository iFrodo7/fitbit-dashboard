"use client";

import { clsx } from "clsx";
import { useTheme } from "@/components/providers/AppProviders";
import { useI18n } from "@/components/providers/AppProviders";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecoveryBanner } from "@/components/dashboard/RecoveryBanner";
import {
  calcRecoveryScore,
  calcStrainScore,
  calcSleepPerformance,
} from "@/lib/analytics/scores";
import {
  useActivity,
  useSleep,
  useHeartRate,
  useProfile,
} from "@/lib/hooks/useFitbitData";
import { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const { config } = useTheme();
  const { tr } = useI18n();
  const [lastUpdate, setLastUpdate] = useState<Date>();

  const { data: activity, isLoading: loadA, error: errA } = useActivity();
  const { data: sleep, isLoading: loadS } = useSleep();
  const { data: heart, isLoading: loadH } = useHeartRate();
  const { data: profile, isLoading: loadP } = useProfile();

  const prevActivity = useRef<typeof activity>(undefined);
  useEffect(() => {
    if (activity && activity !== prevActivity.current) {
      prevActivity.current = activity;
      setLastUpdate(new Date());
    }
  }, [activity]);

  const summary     = activity?.summary;
  const goals       = activity?.goals;
  const sleepSummary = sleep?.summary;
  const heartData   = heart?.["activities-heart"]?.[0]?.value;

  // ── Scores al estilo Whoop ──────────────────────────────────────────────────
  const recoveryScore    = calcRecoveryScore(sleep ?? null, heart ?? null);
  const strainScore      = calcStrainScore(heart ?? null);
  const sleepPerformance = calcSleepPerformance(sleep ?? null);

  return (
    <div className={clsx("min-h-screen flex flex-col", config.bg)}>
      <Header
        userName={profile?.user?.displayName}
        avatar={profile?.user?.avatar}
        lastUpdate={lastUpdate}
      />

      <main className="flex-1 p-6">
        {/* ── Banner de Recuperación / Esfuerzo / Sueño (Whoop-style) ── */}
        <RecoveryBanner
          recovery={recoveryScore}
          strain={strainScore}
          sleep={sleepPerformance}
          loading={loadS || loadH}
        />

        {/* Error de sesión expirada */}
        {errA?.message === "UNAUTHORIZED" && (
          <div className="mb-4 bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-red-300 text-sm">
            {tr.errors.sessionExpired}{" "}
            <a href="/api/auth/fitbit" className="underline">
              {tr.errors.retry}
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Pasos */}
          <MetricCard
            label={tr.metrics.steps}
            value={summary?.steps ?? 0}
            icon="👟"
            progress={goals?.steps ? (summary?.steps ?? 0) / goals.steps * 100 : undefined}
            goal={goals?.steps?.toLocaleString()}
            goalLabel={tr.metrics.goal}
            loading={loadA}
          />

          {/* Calorías */}
          <MetricCard
            label={tr.metrics.calories}
            value={summary?.caloriesOut ?? 0}
            icon="🔥"
            progress={
              goals?.caloriesOut
                ? (summary?.caloriesOut ?? 0) / goals.caloriesOut * 100
                : undefined
            }
            goal={goals?.caloriesOut}
            goalLabel={tr.metrics.goal}
            loading={loadA}
            expandable
            expandedContent={
              summary ? (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  {/* BMR vs Activas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded p-2 text-center">
                      <p className={clsx("text-xs opacity-50 mb-1", config.text)}>Basal (BMR)</p>
                      <p className={clsx("text-lg font-bold tabular-nums", config.text)}>
                        {summary.caloriesBMR?.toLocaleString() ?? "--"}
                      </p>
                      <p className={clsx("text-xs opacity-40", config.text)}>kcal</p>
                    </div>
                    <div className="bg-white/5 rounded p-2 text-center">
                      <p className={clsx("text-xs opacity-50 mb-1", config.text)}>Activas</p>
                      <p className={clsx("text-lg font-bold tabular-nums", config.text)}>
                        {summary.activityCalories?.toLocaleString() ?? "--"}
                      </p>
                      <p className={clsx("text-xs opacity-40", config.text)}>kcal</p>
                    </div>
                  </div>

                  {/* Desglose por intensidad */}
                  <div className="space-y-2">
                    <p className={clsx("text-xs opacity-40 uppercase tracking-wider", config.text)}>
                      Minutos por intensidad
                    </p>
                    {[
                      { label: "Sedentario", min: summary.sedentaryMinutes ?? 0, color: "bg-white/25" },
                      { label: "Ligero",     min: summary.lightlyActiveMinutes ?? 0, color: "bg-blue-400/60" },
                      { label: "Moderado",   min: summary.fairlyActiveMinutes ?? 0, color: "bg-yellow-400/60" },
                      { label: "Intenso",    min: summary.veryActiveMinutes ?? 0, color: "bg-red-400/70" },
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
              ) : null
            }
          />

          {/* Distancia */}
          <MetricCard
            label={tr.metrics.distance}
            value={
              summary?.distances?.find((d) => d.activity === "total")
                ?.distance?.toFixed(2) ?? 0
            }
            unit={tr.metrics.km}
            icon="📍"
            progress={
              goals?.distance
                ? ((summary?.distances?.find((d) => d.activity === "total")
                    ?.distance ?? 0) /
                    goals.distance) *
                  100
                : undefined
            }
            loading={loadA}
          />

          {/* Minutos activos */}
          <MetricCard
            label={tr.metrics.activeMin}
            value={
              (summary?.fairlyActiveMinutes ?? 0) +
              (summary?.veryActiveMinutes ?? 0)
            }
            unit={tr.metrics.minutes}
            icon="⚡"
            progress={
              goals?.activeMinutes
                ? (((summary?.fairlyActiveMinutes ?? 0) +
                    (summary?.veryActiveMinutes ?? 0)) /
                    goals.activeMinutes) *
                  100
                : undefined
            }
            goal={goals?.activeMinutes}
            goalLabel={tr.metrics.goal}
            loading={loadA}
          />

          {/* Sueño */}
          <MetricCard
            label={tr.metrics.sleep}
            value={
              sleepSummary
                ? `${Math.floor(sleepSummary.totalMinutesAsleep / 60)}${tr.metrics.hours} ${
                    sleepSummary.totalMinutesAsleep % 60
                  }${tr.metrics.minutes}`
                : "--"
            }
            icon="🌙"
            progress={
              sleepSummary
                ? Math.min((sleepSummary.totalMinutesAsleep / 480) * 100, 100)
                : undefined
            }
            goal="8h"
            goalLabel={tr.metrics.goal}
            loading={loadS}
          />

          {/* Frecuencia cardíaca */}
          <MetricCard
            label={tr.metrics.heartRate}
            value={heartData?.restingHeartRate ?? "--"}
            unit={heartData ? tr.metrics.bpm : undefined}
            icon="❤️"
            loading={loadH}
          />

          {/* Pisos */}
          <MetricCard
            label={tr.metrics.floors}
            value={summary?.floors ?? 0}
            icon="🏢"
            progress={
              goals?.floors
                ? ((summary?.floors ?? 0) / goals.floors) * 100
                : undefined
            }
            goal={goals?.floors}
            goalLabel={tr.metrics.goal}
            loading={loadA}
          />

          {/* Sedentario */}
          <MetricCard
            label="Sedentario"
            value={
              summary
                ? `${Math.floor(summary.sedentaryMinutes / 60)}${tr.metrics.hours}`
                : "--"
            }
            icon="🪑"
            loading={loadA}
          />
        </div>

        {/* Zonas de frecuencia cardíaca */}
        {heartData?.heartRateZones && (
          <section className="mt-6">
            <h2 className={clsx("text-sm font-semibold mb-3 opacity-70", config.text)}>
              Zonas cardíacas hoy
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {heartData.heartRateZones.map((zone) => (
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
        )}

        {/* Etapas del sueño */}
        {sleepSummary?.stages && (
          <section className="mt-6">
            <h2 className={clsx("text-sm font-semibold mb-3 opacity-70", config.text)}>
              {tr.metrics.sleep} — Etapas
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: "deep", label: tr.sleep.deep, icon: "🔵" },
                { key: "light", label: tr.sleep.light, icon: "🟢" },
                { key: "rem", label: tr.sleep.rem, icon: "🟣" },
                { key: "wake", label: tr.sleep.awake, icon: "🟡" },
              ].map(({ key, label, icon }) => (
                <div key={key} className={clsx(config.card, "p-3 text-center")}>
                  <p className="text-lg">{icon}</p>
                  <p className={clsx("text-xs opacity-60 mb-1", config.text)}>{label}</p>
                  <p className={clsx("text-xl font-bold", config.text)}>
                    {sleepSummary.stages[key as keyof typeof sleepSummary.stages]}
                  </p>
                  <p className={clsx("text-xs opacity-50", config.text)}>min</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
