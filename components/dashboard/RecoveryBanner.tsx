"use client";

import { clsx } from "clsx";
import { useTheme } from "@/components/providers/AppProviders";
import type { RecoveryScore, StrainScore, SleepPerformance } from "@/lib/analytics/scores";

interface Props {
  recovery:  RecoveryScore;
  strain:    StrainScore;
  sleep:     SleepPerformance;
  loading?:  boolean;
}

// ─── Anillo SVG circular ──────────────────────────────────────────────────────
function Ring({
  value, max = 100, size = 112, stroke = 10, color, children,
}: {
  value: number; max?: number; size?: number; stroke?: number;
  color: string; children?: React.ReactNode;
}) {
  const r           = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled      = circumference * (1 - Math.min(value / max, 1));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size} height={size}
        className="-rotate-90 absolute inset-0"
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)",
            filter: `drop-shadow(0 0 6px ${color}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Barra mini con label ─────────────────────────────────────────────────────
function MiniBar({
  label, value, max, color, textClass,
}: {
  label: string; value: number; max: number; color: string; textClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx("text-xs opacity-50 w-16 shrink-0", textClass)}>{label}</span>
      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }}
        />
      </div>
      <span className={clsx("text-xs opacity-40 w-5 text-right tabular-nums", textClass)}>
        {value}
      </span>
    </div>
  );
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────
function Skeleton({ cardClass }: { cardClass: string }) {
  return (
    <div className={clsx(cardClass, "p-5 mb-6 animate-pulse")}>
      <div className="h-3 bg-white/10 rounded w-28 mb-5" />
      <div className="flex gap-6">
        <div className="w-28 h-28 rounded-full bg-white/10 shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-10 bg-white/10 rounded w-1/2" />
          <div className="h-2 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function RecoveryBanner({ recovery, strain, sleep, loading }: Props) {
  const { config } = useTheme();

  if (loading) return <Skeleton cardClass={config.card} />;

  const STRAIN_GRAD = `linear-gradient(90deg, #3b82f6, ${strain.color})`;

  return (
    <div className={clsx(config.card, "p-5 mb-6")}>
      {/* Título */}
      <p className={clsx("text-xs uppercase tracking-widest opacity-40 mb-4", config.text)}>
        Resumen de hoy
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-6">

        {/* ── Anillo de Recuperación ── */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <Ring value={recovery.score} color={recovery.color} size={120} stroke={11}>
            <span
              className="text-4xl font-bold tabular-nums leading-none"
              style={{ color: recovery.color }}
            >
              {recovery.score}
            </span>
            <span className={clsx("text-xs opacity-40 mt-0.5", config.text)}>%</span>
          </Ring>
          <span className="text-sm font-semibold" style={{ color: recovery.color }}>
            {recovery.label}
          </span>
          <span className={clsx("text-xs opacity-40 text-center", config.text)}>
            Recuperación
          </span>
        </div>

        {/* Separador vertical */}
        <div className="hidden sm:block w-px h-28 bg-white/10 shrink-0" />

        {/* ── Esfuerzo + Sueño ── */}
        <div className="flex flex-1 gap-5 w-full sm:w-auto">

          {/* Strain */}
          <div className="flex-1 flex flex-col gap-1.5">
            <p className={clsx("text-xs opacity-40 uppercase tracking-wider", config.text)}>
              Esfuerzo
            </p>
            <div className="flex items-end gap-1">
              <span className={clsx("text-4xl font-bold tabular-nums", config.text)}>
                {strain.score.toFixed(1)}
              </span>
              <span className={clsx("text-xs opacity-40 mb-1", config.text)}>/21</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${(strain.score / 21) * 100}%`, background: STRAIN_GRAD }}
              />
            </div>
            <span className="text-xs font-medium mt-0.5" style={{ color: strain.color }}>
              {strain.label}
            </span>
            <p className={clsx("text-xs opacity-35 mt-1", config.text)}>
              {strain.zones.peak}m zona pico · {strain.zones.cardio}m cardio
            </p>
          </div>

          {/* Sleep Performance */}
          <div className="flex-1 flex flex-col gap-1.5">
            <p className={clsx("text-xs opacity-40 uppercase tracking-wider", config.text)}>
              Sueño
            </p>
            <div className="flex items-end gap-1">
              <span className={clsx("text-4xl font-bold tabular-nums", config.text)}>
                {sleep.performance}
              </span>
              <span className={clsx("text-xs opacity-40 mb-1", config.text)}>%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={clsx(config.progress, "h-1.5 rounded-full transition-all duration-700")}
                style={{ width: `${sleep.performance}%` }}
              />
            </div>
            <p className={clsx("text-xs opacity-50 mt-0.5", config.text)}>
              {sleep.hoursSlept}h · efic. {sleep.efficiency}%
              {sleep.debtMinutes > 0 && (
                <span className="text-red-400 ml-1.5">
                  −{(sleep.debtMinutes / 60).toFixed(1)}h deuda
                </span>
              )}
            </p>
            {sleep.latency > 0 && (
              <p className={clsx("text-xs opacity-35", config.text)}>
                {sleep.latency}m en dormirse
              </p>
            )}
          </div>
        </div>

        {/* Separador vertical */}
        <div className="hidden lg:block w-px h-28 bg-white/10 shrink-0" />

        {/* ── Desglose de Recuperación ── */}
        <div className="hidden lg:flex flex-col gap-2.5 shrink-0 min-w-[140px]">
          <p className={clsx("text-xs opacity-40 uppercase tracking-wider mb-0.5", config.text)}>
            Factores
          </p>
          <MiniBar label="Duración" value={recovery.breakdown.sleepDuration}   max={30} color={recovery.color} textClass={config.text} />
          <MiniBar label="Eficiencia" value={recovery.breakdown.sleepEfficiency} max={25} color={recovery.color} textClass={config.text} />
          <MiniBar label="Etapas"   value={recovery.breakdown.sleepQuality}    max={20} color={recovery.color} textClass={config.text} />
          <MiniBar label="FC reposo" value={recovery.breakdown.restingHR}       max={25} color={recovery.color} textClass={config.text} />
        </div>
      </div>

      {/* ── Recomendación de entrenamiento ── */}
      <div
        className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: recovery.color, boxShadow: `0 0 6px ${recovery.color}` }}
        />
        <p className={clsx("text-sm", config.text)}>
          <span className="opacity-40">Recomendación · </span>
          <span className="opacity-80">{recovery.recommendation}</span>
        </p>
      </div>
    </div>
  );
}
