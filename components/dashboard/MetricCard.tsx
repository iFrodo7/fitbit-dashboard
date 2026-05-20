"use client";

import { clsx } from "clsx";
import { useState } from "react";
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
  /** Si es true, la tarjeta se puede expandir con tap/click */
  expandable?: boolean;
  /** Contenido que aparece al expandir */
  expandedContent?: React.ReactNode;
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
  expandable,
  expandedContent,
}: Props) {
  const { config } = useTheme();
  const [expanded, setExpanded] = useState(false);

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
    <div
      className={clsx(
        config.card,
        "p-4 flex flex-col gap-2 transition-all duration-300",
        expandable && "cursor-pointer select-none active:scale-[0.98]"
      )}
      onClick={() => expandable && setExpanded((v) => !v)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className={clsx("text-xs uppercase tracking-wider opacity-60", config.text)}>
            {label}
          </span>
        </div>
        {expandable && (
          <span
            className={clsx(
              "text-xs opacity-40 transition-transform duration-300",
              config.text,
              expanded ? "rotate-180" : "rotate-0"
            )}
          >
            ▼
          </span>
        )}
      </div>

      {/* Valor principal */}
      <div className={clsx("flex items-end gap-1", config.text)}>
        <span className="text-3xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm opacity-70 mb-1">{unit}</span>}
      </div>

      {/* Barra de progreso */}
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

      {/* Contenido expandido */}
      {expandable && expandedContent && (
        <div
          className={clsx(
            "overflow-hidden transition-all duration-300",
            expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {expandedContent}
        </div>
      )}
    </div>
  );
}
