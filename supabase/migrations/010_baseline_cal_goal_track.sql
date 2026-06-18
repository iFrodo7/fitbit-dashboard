-- ─────────────────────────────────────────────────────────────────────────────
-- baseline_cal: factor de auto-calibración del baseline adaptativo {factor, lastDate}.
-- Gana el registro con lastDate más reciente — cubre el dispositivo nuevo que
-- arranca sin semanas de historial de cumplimiento de metas.
--
-- goal_track: metas finales del día de hoy y ayer {today:{date,stp,cal,act},
-- prev:{date,stp,cal,act}}. Alimenta _antiSpikeClamp() para que el límite ±20%
-- funcione correctamente en un dispositivo nuevo sin historial local.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS baseline_cal jsonb,  -- {factor:number, lastDate:string}
  ADD COLUMN IF NOT EXISTS goal_track   jsonb;  -- {today:{date,stp,cal,act}, prev:{date,stp,cal,act}}
