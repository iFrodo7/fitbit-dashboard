-- ─────────────────────────────────────────────────────────────────────────────
-- Adaptive goals sync para usuarios Pro.
-- El algoritmo adaptativo calcula el baseline localmente desde fb_activity_history
-- (IndexedDB). Sin sync, dispositivos distintos divergen porque tienen distinto
-- historial acumulado. Estos dos campos sincronizan el baseline pre-multiplicador
-- para que todos los dispositivos partan del mismo punto y apliquen su propio
-- multiplicador diario (Recovery, ciclo, fatiga) de forma independiente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS adaptive_goals     jsonb,   -- {stp, cal, act} — baseline pre-mult
  ADD COLUMN IF NOT EXISTS adaptive_goals_ts  bigint;  -- unix ms, timestamp más alto gana
