-- App-open streak — sincronización cross-device usando email de Google como llave
create table public.app_streaks (
  email       text primary key,         -- email de Google (lowercase)
  date        date not null,            -- última fecha en que se abrió la app
  count       int  not null default 1,  -- días consecutivos
  updated_at  timestamptz default now()
);

-- RLS: cada fila solo es accesible por el service role (escritura del servidor).
-- Sin esta línea cualquier cliente con la clave anon podría leer todos los emails.
ALTER TABLE public.app_streaks ENABLE ROW LEVEL SECURITY;
