-- ─────────────────────────────────────────────────────────────────────────────
-- Pro status sync cross-device.
-- checkProStatus() escribe is_pro cuando Stripe confirma la suscripción.
-- _supabasePrefsRead() lo restaura en cualquier dispositivo / sesión fresca
-- sin depender de aira_uid ni fb_pro en localStorage.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
