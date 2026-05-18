"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Theme, Language } from "@/lib/supabase/types";
import { THEMES, getTheme } from "@/lib/themes";
import { t, type Translations } from "@/lib/i18n";

// ─── Theme Context ────────────────────────────────────────────────────────────

interface ThemeCtx {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  config: ReturnType<typeof getTheme>;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside AppProviders");
  return ctx;
}

// ─── i18n Context ─────────────────────────────────────────────────────────────

interface I18nCtx {
  lang: Language;
  setLang: (lang: Language) => void;
  tr: Translations;
}

const I18nContext = createContext<I18nCtx | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside AppProviders");
  return ctx;
}

// ─── Combined Provider ────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  initialTheme?: Theme;
  initialLang?: Language;
}

export function AppProviders({
  children,
  initialTheme = "futuristic",
  initialLang = "es",
}: Props) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [lang, setLangState] = useState<Language>(initialLang);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    });
  }, []);

  const setLang = useCallback(async (newLang: Language) => {
    setLangState(newLang);
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLang }),
    });
  }, []);

  // Aplicar clases del tema al <html>
  useEffect(() => {
    const config = THEMES[theme];
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.fontFamily = config.font;
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, config: getTheme(theme) }}
    >
      <I18nContext.Provider value={{ lang, setLang, tr: t(lang) }}>
        {children}
      </I18nContext.Provider>
    </ThemeContext.Provider>
  );
}
