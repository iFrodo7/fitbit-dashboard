-- ─────────────────────────────────────────────────────────────────────────────
-- Activity history sync cross-device.
-- Los últimos 30 días de actividad (pasos, calorías, minutos, meta usada) se
-- sincronizan entre dispositivos. Sin esto, el baseline adaptativo de un
-- dispositivo nuevo parte de cero y tarda semanas en calibrarse al nivel real
-- del usuario. Merge strategy T2: unión por fecha, gana el registro con más
-- pasos (dato más completo del día).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_user_prefs
  ADD COLUMN IF NOT EXISTS activity_history jsonb;  -- array [{date,steps,cal,actMin,vigMin,goalMet,goalUsed,readiness,phase}]
