-- ─────────────────────────────────────────────────────────────────────────────
-- Push notifications — suscripciones Web Push (#4 fase 2, server push)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,                       -- opcional: null = anónimo (app personal)
  endpoint   text not null unique,       -- URL única del push service del navegador
  p256dh     text not null,              -- clave pública del cliente
  auth       text not null,              -- secreto de auth del cliente
  user_agent text,
  created_at timestamptz default now(),
  last_seen  timestamptz default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- RLS: las rutas usan el service role (server-only), así que bloqueamos acceso anon/auth directo.
alter table public.push_subscriptions enable row level security;
-- (sin políticas = nadie accede salvo service_role, que las bypassa)
