-- ─────────────────────────────────────────────────────────────────────────────
-- Recovery Score sync cross-device.
-- El score se calcula localmente desde datos de Fitbit (sueño, RHR de IndexedDB).
-- Ambos dispositivos usan la misma API de Fitbit, por lo que el score debería
-- converger; pero en el arranque el dispositivo B puede mostrar 0 mientras
-- espera su primer poll. Estos columnas permiten que el dispositivo B arranque
-- con el score computado más recientemente (timestamp más alto gana).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS recovery_score     smallint,   -- 0-100, computado desde sueño+RHR
  ADD COLUMN IF NOT EXISTS recovery_score_ts  bigint;     -- unix ms, timestamp más alto gana
