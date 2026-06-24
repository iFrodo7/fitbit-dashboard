-- ─────────────────────────────────────────────────────────────────────────────
-- Heartbeat de salud del sync (observabilidad).
--
-- El webhook de Google Health (/api/google/webhook) escribe aquí `ts=now()` en
-- cada notificación REAL de datos (NO en los retos de verificación). El endpoint
-- /api/health/sync compara la antigüedad de ese latido: si pasa de un umbral
-- (24h) significa que Google dejó de entregar y el sync está caído. Un GitHub
-- Action revisa el endpoint cada 6h y avisa.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_health (
  id text PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now()
);
