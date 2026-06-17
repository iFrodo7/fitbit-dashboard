# DATABASE — Arquitectura de datos y sync cross-device

> Para ingenieros que revisen la base de datos o extiendan el sistema de sincronización.
> Última actualización: 2026-06-16.

---

## Visión general

AIRA no usa Supabase Auth. La llave universal es el **email del usuario** (de Google o Fitbit), guardada en `localStorage` como `fb_email` y usada como PRIMARY KEY en todas las tablas de usuario.

Las rutas API usan `createServiceClient()` (service role key) y validan el email **server-side** — nunca confían en el email que manda el cliente sin pasar por la lógica de merge.

### Fuentes de datos por prioridad

| Capa | Qué guarda | Cuándo aplica |
|---|---|---|
| `localStorage` | Estado actual del dispositivo | Siempre (lectura inmediata) |
| **Supabase** `app_user_prefs` | Fuente autoritativa de preferencias y logros | Al abrir la app, al guardar manualmente |
| **Google Drive** App Data | Caché rápida para rachas (solo Google) | Al abrir la app (Google users) |
| **Supabase** `app_streaks` | Racha de apertura diaria | Al abrir la app (todos) |

**Flujo de escritura:** `localStorage` → `POST /api/user/prefs` (Supabase) → `_driveStreakWrite()` (Google users)  
**Flujo de lectura al arranque:** `Promise.all([_driveStreakRead(), _supabasePrefsRead()])` → luego `_initStreakFromGoogle()` (crítico: las metas deben estar sincronizadas antes de recalcular la racha de pasos)

---

## Tablas

### `app_streaks` ← activa, email-keyed

Racha de apertura diaria de la app. El sistema más simple: una fila por usuario, "último date + count más alto" gana.

| Columna | Tipo | Descripción |
|---|---|---|
| `email` | `text PK` | Email en minúsculas |
| `date` | `date` | Última fecha en que se abrió la app |
| `count` | `int` | Días consecutivos de apertura |
| `updated_at` | `timestamptz` | Auto-actualizado por trigger |

Gestionada por `/api/streak` (GET + POST). La lógica de upsert solo actualiza si la fecha entrante es más reciente o el count es mayor en la misma fecha.

---

### `app_user_prefs` ← nueva, fuente autoritativa de preferencias

Una fila por usuario. Cada campo tiene su propia estrategia de merge aplicada en `POST /api/user/prefs`.

| Columna | Tipo | Estrategia de merge | localStorage key |
|---|---|---|---|
| `email` | `text PK` | — | `fb_email` |
| **T1 — Crítico** ||||
| `goals` | `jsonb` | `goals_ts` más alto gana | `fb_dr_goals` |
| `goals_ts` | `bigint` | unix ms del último guardado manual | `fb_dr_goals_ts` |
| `steps_streak` | `jsonb` | max `count`, luego `lastDate` | `fb_streak_steps` |
| **T2 — Identidad** ||||
| `aira_uid` | `text` | Primer write gana — **nunca sobreescribir** | `aira_uid` |
| `display_name` | `text` | `prefs_ts` más alto | `fb_display_name` |
| `bio` | `jsonb` | `prefs_ts` más alto | `fb_bio` (+ `fb_sex`) |
| **T2 — Logros y puntos** ||||
| `achievements` | `jsonb` | Unión (OR) — nunca se pierde un logro | `fb_ach` |
| `ach_stats` | `jsonb` | Max por campo numérico | `fb_ach_stats` |
| `atlas_pts` | `int` | Max acumulado | `fb_atlas_pts` |
| `atlas_last_award` | `text` | Acompañante de `atlas_pts` | `fb_atlas_last_award` |
| `records` | `jsonb` | Max por campo numérico | `fb_records` |
| **T2 — Avatar** ||||
| `avatar_frame` | `text` | `prefs_ts` más alto | `fb_avatar_frame` |
| `avatar_unlocked` | `jsonb` | Unión (OR) — nunca se pierde un frame | `fb_avatar_unlocked` |
| `nebula_days` | `jsonb` | Unión de arrays de fechas | `fb_nebula_days` |
| **T2 — Preferencias UI** ||||
| `lang` | `text` | `prefs_ts` más alto | `fb_lang` |
| `theme` | `text` | `prefs_ts` más alto | `fb_t` |
| `seen_tour` | `boolean` | OR — una vez visto, siempre visto | `fb_seen_tour` |
| `welcomed` | `boolean` | OR | `fb_welcomed` |
| `notif_pref` | `boolean` | `prefs_ts` más alto | `fb_notif` |
| `prefs_ts` | `bigint` | Timestamp compartido para lang/theme/bio/name/notif/avatar_frame/cycle_on | `fb_prefs_ts` |
| **T2 — Salud sensible** ||||
| `cycle_on` | `boolean` | `prefs_ts` más alto | `fb_cycle_on` |
| `cycle_data` | `jsonb` | Meta: `prefs_ts`; Log: merge por fecha-key | `fb_cycle` + `fb_cyc_log` |
| **T3 — Futuro (schema listo, sin implementar)** ||||
| `widget_layout` | `jsonb` | `prefs_ts` más alto | `fb_wm` + `fb_wm_order` + `fb_wm_size` |
| `health_ranges` | `jsonb` | `prefs_ts` más alto | `hrv_base_range` + `spo2_avg_range` |
| `updated_at` | `timestamptz` | Auto-trigger | — |

#### Detalle de campos `jsonb`

```
goals:          { stp: number, cal: number, act: number }
steps_streak:   { count: number, lastDate: "YYYY-MM-DD", goal: number }
bio:            { age: number, weight: number, height: number, sex: "male"|"female"|"", activity: number }
achievements:   { [achievementId]: true }
ach_stats:      { maxStreak: number, stepsMax: number, calStreakMax: number, actMinHits: number,
                  tripleStreakMax: number, anyRingStreakMax: number, themeDays: {[theme]: number} }
records:        { maxSteps: number, maxStepsDate: "YYYY-MM-DD", bestStreak: number,
                  peakRecovery: number, peakRecoveryDate: "YYYY-MM-DD", totalActiveDays: number }
avatar_unlocked:{ [frameId]: true }
nebula_days:    ["YYYY-MM-DD", ...]  ← sorted, unique
cycle_data:     { meta: { len, period, last, ... }, log: { "YYYY-MM-DD": { flow, sex, sx } } }
widget_layout:  { order: [...], size: { [widgetId]: "sm"|"md"|"lg" }, state: {...} }
health_ranges:  { hrv_days: number, spo2_days: number }
```

---

### Tablas de infraestructura (no tocar en features de usuario)

| Tabla | Estado | Descripción |
|---|---|---|
| `push_subscriptions` | Activa | Tokens Web Push por dispositivo — device-specific, no sync |
| `subscriptions` | Activa | Suscripciones Stripe Pro — gestionada por webhooks |
| `app_streaks` | Activa | Ver arriba |
| `app_user_prefs` | Activa | Ver arriba |
| `user_preferences` | **MUERTA** | Reemplazada por `app_user_prefs`. RLS rota (usa UUID), nunca usada por la app |
| `fitbit_sessions` | Sin usar | Flujo OAuth client-side no la necesita |
| `fitbit_cache` | Sin usar | API Fitbit se apaga sep 2026 |
| `metrics_history` | Sin usar | Candidata futura para sync de `fb_activity_history` (IndexedDB) |

---

## API Routes de sync

### `GET /api/streak?email=<email>`
Devuelve `{ date, count }` para la racha de apertura.

### `POST /api/streak`
Body: `{ email, date, count }`. Upserta solo si es más reciente o mayor.

### `GET /api/user/prefs?email=<email>`
Devuelve la fila completa de `app_user_prefs` (o `{}` si no existe aún).

### `POST /api/user/prefs`
Body: subset de campos de `app_user_prefs` + `email`.  
Aplica la estrategia de merge de cada campo antes de upsert. Nunca hace un reemplazo bruto — siempre merge.

**Campos y sus reglas de merge en el POST:**

| Campo | Regla |
|---|---|
| `goals` + `goals_ts` | Solo actualiza si `incoming.goals_ts > existing.goals_ts` |
| `steps_streak` | Solo si `incoming.count > existing.count` (o misma fecha + mayor count) |
| `aira_uid` | Solo si `existing.aira_uid` está vacío (primer write gana) |
| `lang`, `theme`, `bio`, `display_name`, `notif_pref`, `avatar_frame`, `cycle_on`, `cycle_data` | Solo si `incoming.prefs_ts > existing.prefs_ts` |
| `achievements`, `avatar_unlocked` | `{ ...existing, ...incoming }` — unión total |
| `nebula_days` | `Array.from(new Set([...existing, ...incoming])).sort()` |
| `ach_stats` | `Math.max(existing[k], incoming[k])` para cada campo numérico |
| `atlas_pts` | `Math.max(existing, incoming)` |
| `records` | `Math.max(existing[k], incoming[k])` para `maxSteps`, `bestStreak`, `peakRecovery`, `totalActiveDays` |
| `seen_tour`, `welcomed` | `existing OR incoming` |

---

## Qué NO se sincroniza (y por qué)

| Key | Razón |
|---|---|
| `fb_tok`, `fb_rt`, `fb_pkce_v` | Auth tokens — siempre device-specific |
| `fb_pro` | Derivado de Stripe server-side (`/api/stripe/status`) |
| `fb_provider` | Determinado por el flujo de login |
| `fb_pub`, `_pendingSubscribe` | Tokens Web Push — device-specific |
| `fb_activity_history` | 30 días de datos que vienen de la API — se reconstruye |
| `fb_personal_records` | Derivado de IndexedDB — se recalcula desde historial |
| `fb_snap`, `fb_tab` | Estado UI efímero |
| `fb_prev_day_goal`, `fb_today_goal_track`, `fb_baseline_cal` | Estado del algoritmo adaptativo — se deriva localmente |
| `fb_checkin_*`, `fb_checkin_prompted_*` | Check-in del día — device-specific |
| `fb_streak_anim_date`, `fb_last_open_date` | Timing de animaciones — device-specific |
| Flags de migración (`*_clean_*`, `*_backfilled`) | Siempre device-specific |
| `fb_avatar` (base64) | Demasiado grande para Supabase DB — usar Supabase Storage en T3 |
| `fb_sw.*` (IndexedDB) | Bridge SW↔app, solo runtime |

---

## Cola offline

Si `POST /api/user/prefs` falla (sin internet), el write se encola en `fb_sync_queue` (localStorage).  
Al siguiente arranque de la app, `_supabasePrefsRead()` intenta un flush de la cola antes de leer.  
La cola tiene un máximo de 10 items para evitar crecimiento ilimitado; se mantiene solo el último write por campo.

---

## IndexedDB

| DB | Store | Contenido | Sync |
|---|---|---|---|
| `fb_history` | `daily` | 90 días de datos biométricos (RHR, sueño, pasos) | No sync — viene de API. La tabla `metrics_history` de Supabase está lista para T3. |
| `fb_sw` | `config`, `streak` | Bridge de comunicación Service Worker ↔ app | Nunca — solo runtime |

---

## Seguridad

- **RLS:** todas las tablas tienen RLS habilitado. Las routes usan service role key y validan email server-side — no hay acceso anónimo directo.
- **`cycle_data`:** contiene datos de salud sensibles (ciclo menstrual). Para cumplimiento GDPR, evaluar cifrar el payload con una clave derivada del email antes de guardar en Supabase. Marcado para revisión legal antes de lanzar la feature en producción.
- **`aira_uid`:** identificador Pro del usuario. La regla "primer write gana" asegura que una vez asignado no pueda ser sobreescrito por otro dispositivo.
