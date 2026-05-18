"use client";

import { useTheme } from "@/components/providers/AppProviders";
import { useI18n } from "@/components/providers/AppProviders";
import { THEMES } from "@/lib/themes";
import type { Theme } from "@/lib/supabase/types";
import { clsx } from "clsx";

export function ThemeSelector() {
  const { theme, setTheme, config } = useTheme();
  const { tr } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className={clsx("text-xs opacity-60", config.text)}>
        {tr.themes.label}
      </span>
      <div className="flex gap-1">
        {(Object.values(THEMES)).map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id as Theme)}
            title={t.name}
            className={clsx(
              "w-7 h-7 rounded text-sm transition-all",
              theme === t.id
                ? "ring-2 ring-white scale-110"
                : "opacity-60 hover:opacity-100"
            )}
          >
            {t.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
