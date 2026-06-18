-- ─────────────────────────────────────────────────────────────────────────────
-- bio_ts: timestamp independiente para el perfil biométrico del usuario.
-- Sin esto, bio comparte prefs_ts con tema/idioma/notif → cualquier cambio de
-- tema en un dispositivo bloquea la sincronización del bio desde otro.
-- Mismo patrón que recovery_score_ts (migration 007).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS bio_ts bigint DEFAULT 0;
