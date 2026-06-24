-- ─────────────────────────────────────────────────────────────────────────────
-- Notificaciones útiles (issue #68) — arquitectura A (híbrida).
--
-- notif_signal  : SEÑAL DERIVADA mínima que sube el CLIENTE (no pasos crudos).
--   { date, tzOffset, goalMet, streak, stepsRemaining, recovery, sleepMin,
--     cats:{achv,streak,recovery}, updatedAt }
--   El cron (/api/push/cron) la lee para decidir resumen matutino / racha en
--   riesgo según la hora local del usuario. El server NO procesa datos de salud
--   crudos → preserva la exención $0 del assessment CASA (ver MIGRATION.md).
--
-- notif_state   : flags "ya enviado hoy" que escribe el CRON (service role) para
--   el tope diario. { date, morningSent, streakSent }. El cliente nunca lo toca.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS notif_signal jsonb,
  ADD COLUMN IF NOT EXISTS notif_state  jsonb;
