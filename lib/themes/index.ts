import type { Theme } from "@/lib/supabase/types";

export interface ThemeConfig {
  id: Theme;
  name: string;
  /** Tailwind classes aplicadas al <html> via data-theme */
  bg: string;
  surface: string;
  accent: string;
  text: string;
  border: string;
  card: string;
  font: string;
  /** Clases extra para la progress bar */
  progress: string;
  /** Emoji/icono representativo */
  icon: string;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  minecraft: {
    id: "minecraft",
    name: "Minecraft",
    bg: "bg-[#1a1a1a]",
    surface: "bg-[#3d3d3d]",
    accent: "bg-[#4CAF50]",
    text: "text-[#d4edda] font-minecraft",
    border: "border-[#5a5a5a] border-2",
    card: "bg-[#2d2d2d] border-2 border-[#555] rounded-none",
    font: "'Press Start 2P', monospace",
    progress: "bg-[#4CAF50]",
    icon: "⛏️",
  },
  halo: {
    id: "halo",
    name: "Halo",
    bg: "bg-[#0a0f1e]",
    surface: "bg-[#0d1b2a]",
    accent: "bg-[#00c8ff]",
    text: "text-[#e0f4ff]",
    border: "border-[#00c8ff]/30",
    card: "bg-[#0d1b2a]/80 border border-[#00c8ff]/20 rounded-lg backdrop-blur-sm",
    font: "'Exo 2', sans-serif",
    progress: "bg-gradient-to-r from-[#0055aa] to-[#00c8ff]",
    icon: "🎖️",
  },
  naruto: {
    id: "naruto",
    name: "Naruto",
    bg: "bg-[#1a0a00]",
    surface: "bg-[#2d1000]",
    accent: "bg-[#ff6b00]",
    text: "text-[#fff5e6]",
    border: "border-[#ff6b00]/40",
    card: "bg-[#1f0c00]/90 border border-[#ff6b00]/30 rounded-lg",
    font: "'Noto Sans JP', sans-serif",
    progress: "bg-gradient-to-r from-[#ff6b00] to-[#ffd700]",
    icon: "🍃",
  },
  futuristic: {
    id: "futuristic",
    name: "Futuristic",
    bg: "bg-[#050510]",
    surface: "bg-[#0a0a1f]",
    accent: "bg-[#7c3aed]",
    text: "text-[#e2d9f3]",
    border: "border-[#7c3aed]/30",
    card: "bg-[#0a0a1f]/80 border border-[#7c3aed]/20 rounded-xl backdrop-blur-md",
    font: "'Orbitron', sans-serif",
    progress: "bg-gradient-to-r from-[#4c1d95] to-[#7c3aed]",
    icon: "🚀",
  },
};

export const DEFAULT_THEME: Theme = "futuristic";

export function getTheme(id: Theme): ThemeConfig {
  return THEMES[id] ?? THEMES[DEFAULT_THEME];
}
