-- ─────────────────────────────────────────────────────────────────────────────
-- Fitbit Dashboard — schema inicial
-- ─────────────────────────────────────────────────────────────────────────────

-- Sesiones OAuth de Fitbit (tokens cifrados a nivel de fila con RLS)
create table public.fitbit_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,          -- ID interno (no requiere Supabase Auth)
  fitbit_user_id text not null unique,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Preferencias de usuario (tema, idioma)
create table public.user_preferences (
  user_id   uuid primary key,
  theme     text not null default 'futuristic'
              check (theme in ('minecraft','halo','naruto','futuristic')),
  language  text not null default 'es'
              check (language in ('es','en')),
  updated_at timestamptz default now()
);

-- Cache de respuestas de la API de Fitbit
create table public.fitbit_cache (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  endpoint    text not null,            -- ej: 'activities/steps', 'sleep'
  date        date not null,
  payload     jsonb not null,
  fetched_at  timestamptz default now(),
  unique (user_id, endpoint, date)
);

-- Historial de métricas (para gráficas históricas)
create table public.metrics_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  date       date not null,
  steps      int,
  calories   int,
  distance   numeric(8,3),             -- km
  active_min int,
  sleep_min  int,
  resting_hr int,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
create index on public.fitbit_cache    (user_id, endpoint, date);
create index on public.metrics_history (user_id, date desc);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.fitbit_sessions  enable row level security;
alter table public.user_preferences enable row level security;
alter table public.fitbit_cache     enable row level security;
alter table public.metrics_history  enable row level security;

-- Policies: solo el propio usuario puede leer/escribir sus filas.
-- Usamos un JWT claim custom "fitbit_user_id" seteado en el server.

-- fitbit_sessions: el backend (service role) gestiona esto, no el cliente.
create policy "service only" on public.fitbit_sessions
  using (false);   -- acceso solo via service role key

-- user_preferences
create policy "own prefs" on public.user_preferences
  for all using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- fitbit_cache
create policy "own cache" on public.fitbit_cache
  for all using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- metrics_history
create policy "own metrics" on public.metrics_history
  for all using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- ─── Trigger: updated_at automático ──────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_sessions_updated_at
  before update on public.fitbit_sessions
  for each row execute procedure public.set_updated_at();

create trigger trg_prefs_updated_at
  before update on public.user_preferences
  for each row execute procedure public.set_updated_at();
