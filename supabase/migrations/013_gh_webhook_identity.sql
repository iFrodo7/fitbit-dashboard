-- ─────────────────────────────────────────────────────────────────────────────
-- Soporte para webhooks de la Google Health API (frescura sin abrir Google Health).
--
-- Flujo: Google llama a /api/google/webhook con { healthUserId, dataType, op }.
-- Para empujar un Web Push al dispositivo correcto necesitamos dos mapeos:
--
--   1) gh_user_id  → email   : el healthUserId opaco de Google ↔ nuestro email-key.
--      Se guarda al conectar, vía users/me:getIdentity (GoogleHealthSource.ep.identity).
--
--   2) push_subscriptions.email : hoy la tabla es broadcast (sin dueño). Para dirigir
--      el push al usuario cuyos datos cambiaron, cada suscripción lleva su email.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS gh_user_id text;   -- healthUserId opaco de Google Health

-- Lookup inverso healthUserId → email en el webhook (debe ser rápido).
CREATE INDEX IF NOT EXISTS app_user_prefs_gh_user_id_idx
  ON public.app_user_prefs (gh_user_id);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS email text;        -- dueño de la suscripción (lowercase)

CREATE INDEX IF NOT EXISTS push_subscriptions_email_idx
  ON public.push_subscriptions (email);
