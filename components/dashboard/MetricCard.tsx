"use client";

import { clsx } from "clsx";
import { useTheme } from "@/components/providers/AppProviders";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  icon: string;
  progress?: number; // 0-100
  goal?: string | number;
  goalLabel?: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  progress,
  goal,
  goalLabel,
  loading,
}: Props) {
  const { config } = useTheme();

  if (loading) {
    return (
      <div className={clsx(config.card, "p-4 animate-pulse")}>
        <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
        <div className="h-8 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-2 bg-white/10 rounded w-full" />
      </div>
    );
  }

  return (
    <div className={clsx(config.card, "p-4 flex flex-col gap-2")}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className={clsx("text-xs uppercase tracking-wider opacity-60", config.text)}>
          {label}
        </span>
      </div>

      <div className={clsx("flex items-end gap-1", config.text)}>
        <span className="text-3xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm opacity-70 mb-1">{unit}</span>}
      </div>

      {progress !== undefined && (
        <div className="space-y-1">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className={clsx(config.progress, "h-2 rounded-full transition-all duration-700")}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {goal && (
            <p className={clsx("text-xs opacity-50", config.text)}>
              {goalLabel ?? ""} {goal}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
