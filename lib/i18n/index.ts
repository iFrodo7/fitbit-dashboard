import { es } from "./es";
import { en } from "./en";
import type { Language } from "@/lib/supabase/types";

export const translations = { es, en } as const;

// Interfaz común con strings en lugar de literales exactos
export interface Translations {
  nav: { dashboard: string; history: string; settings: string; logout: string };
  auth: { connect: string; connecting: string; tagline: string };
  metrics: {
    steps: string; calories: string; distance: string; activeMin: string;
    sleep: string; heartRate: string; floors: string; goal: string;
    of: string; km: string; bpm: string; hours: string; minutes: string;
  };
  sleep: { deep: string; light: string; rem: string; awake: string; efficiency: string; total: string };
  themes: { label: string; minecraft: string; halo: string; naruto: string; futuristic: string };
  errors: { loadFailed: string; retry: string; sessionExpired: string };
  time: { lastUpdate: string; justNow: string; minutesAgo: string };
}

export function t(lang: Language): Translations {
  return translations[lang];
}
