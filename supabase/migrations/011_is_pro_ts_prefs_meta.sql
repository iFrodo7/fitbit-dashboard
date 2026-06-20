-- ─────────────────────────────────────────────────────────────────────────────
-- is_pro_ts: timestamp del último checkProStatus() autoritativo. Antes is_pro era
-- last-write-wins sin reloj, así que un check transitorio fallido (uid faltante,
-- 429 de Stripe) escribía is_pro:false y APAGABA el Pro en todos los dispositivos.
-- Ahora gana el check más reciente; además el cliente ya no escribe false sin un
-- uid válido ni para cuentas beta (PRO_EMAILS).
--
-- prefs_meta: timestamps POR CAMPO de las preferencias que antes compartían un
-- único prefs_ts ({lang, theme, display_name, notif_pref, avatar_frame, cycle_on,
-- cycle_data}). Con un solo reloj, cambiar el tema en un dispositivo bloqueaba la
-- aplicación de un cambio de idioma sin sincronizar de otro. Cada campo lleva su
-- propio timestamp → ya no se pisan entre sí.
--   prefs_meta = { "lang": 1718800000000, "theme": 1718800050000, ... }
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS is_pro_ts  bigint,  -- ms epoch del último estado Pro autoritativo
  ADD COLUMN IF NOT EXISTS prefs_meta jsonb;   -- {campo: ms epoch} por preferencia
