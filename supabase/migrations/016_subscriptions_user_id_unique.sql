-- ─────────────────────────────────────────────────────────────────────────────
-- AIRA PRO — fix crítico: user_id necesita UNIQUE para el upsert del webhook.
--
-- El webhook de Stripe hace upsert con { onConflict: 'user_id' }, que se traduce
-- a INSERT ... ON CONFLICT (user_id) DO UPDATE. Postgres EXIGE una restricción
-- unique (o índice único) sobre user_id; la migración 003 solo creó un índice
-- normal. Resultado: el upsert fallaba con 42P10 y la fila nunca se escribía →
-- PRO no se activaba tras pagar. El webhook devolvía 200 igual porque no revisaba
-- el error del upsert (eso se endurece por separado en el route handler).
-- ─────────────────────────────────────────────────────────────────────────────

-- El índice normal de 003 queda cubierto por el índice único de la constraint.
drop index if exists public.subscriptions_user_id_idx;

alter table public.subscriptions
  add constraint subscriptions_user_id_key unique (user_id);
