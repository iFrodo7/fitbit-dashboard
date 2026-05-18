"use client";

import { useI18n } from "@/components/providers/AppProviders";
import { useTheme } from "@/components/providers/AppProviders";
import { clsx } from "clsx";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const { config } = useTheme();

  return (
    <button
      onClick={() => setLang(lang === "es" ? "en" : "es")}
      className={clsx(
        "px-3 py-1 rounded text-xs font-semibold transition-all",
        config.accent,
        "text-white hover:opacity-90"
      )}
      aria-label="Toggle language"
    >
      {lang === "es" ? "EN" : "ES"}
    </button>
  );
}
