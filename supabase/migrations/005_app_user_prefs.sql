-- ─────────────────────────────────────────────────────────────────────────────
-- Cross-device user preferences — fuente autoritativa de sync entre dispositivos
--
-- Llave: email (mismo que app_streaks) — sin dependencia de Supabase Auth.
-- Merge strategy por campo: ver DATABASE.md para reglas completas.
-- Las rutas API usan service_role key y validan email server-side.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.app_user_prefs (
  email              text PRIMARY KEY,  -- email en minúsculas (de Google/Fitbit)

  -- ── T1: Crítico — causa bugs visibles cuando difiere entre dispositivos ──────
  goals              jsonb,    -- {stp, cal, act} metas diarias
  goals_ts           bigint,   -- unix ms del último guardado manual por el usuario
  steps_streak       jsonb,    -- {count, lastDate, goal} racha de pasos

  -- ── T2: Identidad ──────────────────────────────────────────────────────────
  aira_uid           text,     -- AURA ID Pro — primer write gana, nunca sobreescribir
  display_name       text,     -- nombre del usuario
  bio                jsonb,    -- {age, weight, height, sex, activity} — afecta cálculos de metas

  -- ── T2: Logros y puntos ────────────────────────────────────────────────────
  achievements       jsonb,    -- {achievementId: true} — merge por unión, nunca se pierde un logro
  ach_stats          jsonb,    -- {maxStreak, stepsMax, calStreakMax, ...} — max por campo
  atlas_pts          int       DEFAULT 0,  -- puntos Atlas acumulados — max merge
  atlas_last_award   text,     -- YYYY-MM-DD de la última asignación de puntos
  records            jsonb,    -- {maxSteps, maxStepsDate, bestStreak, peakRecovery, totalActiveDays}

  -- ── T2: Avatar ─────────────────────────────────────────────────────────────
  avatar_frame       text,     -- frame activo ('aura', 'nebula', ...)
  avatar_unlocked    jsonb,    -- {frameId: true} — merge por unión
  nebula_days        jsonb,    -- ['YYYY-MM-DD', ...] sorted unique — unión de arrays

  -- ── T2: Preferencias UI ────────────────────────────────────────────────────
  lang               text,     -- 'es' | 'en'
  theme              text,     -- 'mc' | 'halo' | 'naruto' | 'fut' | 'bloom'
  seen_tour          boolean   DEFAULT false,  -- true si vio el tour en cualquier device
  welcomed           boolean   DEFAULT false,  -- true si pasó el welcome en cualquier device
  notif_pref         boolean   DEFAULT false,  -- opt-in a notificaciones push
  prefs_ts           bigint,   -- timestamp compartido para lang/theme/bio/display_name/notif/avatar_frame/cycle_on

  -- ── T2: Salud sensible ─────────────────────────────────────────────────────
  -- Nota: cycle_data contiene información de salud personal (ciclo menstrual).
  -- Evaluar cifrado del payload antes de lanzar en producción (GDPR).
  cycle_on           boolean   DEFAULT false,  -- tracking de ciclo activado
  cycle_data         jsonb,    -- {meta: {len, period, last, ...}, log: {'YYYY-MM-DD': {flow,sex,sx}}}

  -- ── T3: Futuro — schema listo, implementación pendiente ────────────────────
  widget_layout      jsonb,    -- {order: [...], size: {widgetId: 'sm'|'md'|'lg'}, state: {...}}
  health_ranges      jsonb,    -- {hrv_days: number, spo2_days: number}

  updated_at         timestamptz DEFAULT now()
);

-- Índice para queries de "usuarios actualizados recientemente" (admin/debug)
CREATE INDEX ON public.app_user_prefs(updated_at DESC);

-- RLS habilitado — acceso solo via service_role key desde las API routes
ALTER TABLE public.app_user_prefs ENABLE ROW LEVEL SECURITY;
-- Sin políticas explícitas = nadie puede acceder salvo service_role (que bypassa RLS)

-- Trigger: mantiene updated_at al día en cada UPDATE
-- Reutiliza la función set_updated_at() creada en 001_initial.sql
CREATE TRIGGER trg_user_prefs_updated_at
  BEFORE UPDATE ON public.app_user_prefs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
