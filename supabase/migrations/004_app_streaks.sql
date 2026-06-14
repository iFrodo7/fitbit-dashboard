-- App-open streak — sincronización cross-device usando email de Google como llave
create table public.app_streaks (
  email       text primary key,         -- email de Google (lowercase)
  date        date not null,            -- última fecha en que se abrió la app
  count       int  not null default 1,  -- días consecutivos
  updated_at  timestamptz default now()
);
