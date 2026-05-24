# Fitbit Air Dashboard

Panel biométrico personal con 4 temas visuales (Minecraft, Halo, Naruto, Futuristic) y datos reales de Fitbit. PWA instalable en mobile y accesible vía web.

> **🚨 MIGRACIÓN INMINENTE — lee `MIGRATION.md`:** El **Fitbit Web API se apaga en SEPTIEMBRE 2026** y TODA la app depende de él. Hay que migrar al **Google Health API**. La capa de datos **ya está blindada** con un adaptador único (`FitbitSource` / `HS` en `public/app.html`) → migrar = escribir `GoogleHealthSource` con la misma forma y cambiar `let HS = FitbitSource`. **Cualquier trabajo sobre datos/OAuth debe pasar por `HS`, nunca hardcodear URLs de Fitbit.** Fechas, costos (~$0) y checklist completo en **`MIGRATION.md`**.

> **⚠️ Antes de empezar:** Lee `HANDOFF.md` primero. Tiene el estado actual del sprint, PRs abiertos, bugs conocidos (#12 es crítico) y orden de merge. Este archivo es la **referencia técnica**; el handoff es la **lista de qué hacer ahora**.

---

## Stack

- **Frontend principal:** `public/app.html` — SPA monolítica (~2400 líneas, JS vanilla, CSS variables por tema)
- **Next.js 15:** App Router (TypeScript + Tailwind), por ahora solo sirve `app.html` y opcionalmente OAuth server-side
- **Base de datos:** Supabase (PostgreSQL + RLS) — opcional, solo si se usa el backend Next
- **Auth:** OAuth 2.0 de Fitbit, flujo *client-side* para apps tipo "Personal" (sin secret)
- **Cache local:** IndexedDB (`fb_history.daily`) + `localStorage` (tokens, preferencias)
- **Hosting objetivo:** Vercel (status del deploy: ver HANDOFF)

## Cómo arrancar

```bash
source ~/.nvm/nvm.sh   # nvm requerido
nvm use                # Node 20+
cd /path/to/fitbit-dashboard
npm install
npm run dev            # http://localhost:3000
```

El servidor redirige `/` → `/app.html` (el dashboard funcional).

## Arquitectura

### Lo que está vivo
```
public/app.html              ← El dashboard real (SPA, OAuth, IndexedDB, charts SVG)
public/manifest.json         ← PWA manifest
public/sw.js                 ← Service worker (cache strategies)
public/icons/                ← Iconos PWA generados (32 → 512)
scripts/generate-icons.js    ← Regenerar iconos desde icon.svg
```

### Backend Next.js (mínimo, server-side opcional)
El dashboard React paralelo se **eliminó en #9** (era código muerto que generaba
confusión). Lo que queda de Next es solo el shell que sirve la SPA + las API routes
que servirán de base para el backend futuro (server push de #4, histórico en nube):
```
app/
  page.tsx                   ← redirige / → /app.html
  layout.tsx, globals.css    ← shell Next mínimo
  api/auth/                  ← OAuth server-side (alternativa, aún no usada por app.html)
  api/fitbit/                ← Proxy a Fitbit API con caché en Supabase
  api/user/preferences/      ← Preferencias de usuario
lib/
  fitbit/auth.ts             ← Token exchange y refresh (usado por api/)
  fitbit/client.ts           ← API client con caché en Supabase (usado por api/)
  fitbit/types.ts            ← Tipos compartidos
  supabase/server.ts, types.ts ← Cliente Supabase server-side
supabase/migrations/         ← Schema SQL con RLS (no aplicado todavía)
capacitor.config.ts          ← Config app nativa (ver CAPACITOR.md)
```

> La arquitectura ya **NO es dual**: `public/app.html` es el único frontend.
> Las API routes existen pero `app.html` no las consume todavía (hace OAuth
> client-side). Son el punto de partida para cuando se construya el backend.

## Sistemas dentro de `public/app.html`

### 1. Temas (4 mundos)
| ID | Acento (`--ta`) | Secundario (`--ta2`) | Fuente |
|---|---|---|---|
| `mc` | `#6aff3a` verde | (varía) | VT323 |
| `halo` | `#4ab8ff` azul | teal | Oxanium |
| `naruto` | `#ff4500` naranja | (varía) | Permanent Marker |
| `fut` | `#00f5ff` cyan | púrpura | Rajdhani |

Cualquier feature nuevo debe usar las CSS vars (`--ta`, `--ta2`, `--tneg`, `--sub`, `--bg`, `--bdr`, `--tx`). Nunca hard-codear colores.

### 2. i18n (ES/EN)
Estructurado en `T = { es: {...}, en: {...} }` dentro de `<script>`. Aplicado vía `setLang('es'|'en')` → `setText(id, t.key)` para textContent y `setHTML(id, t.key)` para innerHTML.

**Regla:** si añades string en `T.es`, añádelo también en `T.en`. Misma estructura.

### 3. OAuth Fitbit (client-side)
- Tipo "Personal" → no requiere secret
- Usuario ingresa su Client ID → Fitbit redirige a la misma URL → intercambio de token en navegador
- Tokens en `localStorage`: `fb_tok` (access), `fb_rt` (refresh)
- `refreshTok()` rota automáticamente cuando una request devuelve 401

### 4. Polling
- `pollFast()` — cardio + actividad cada 15–120s (configurable con `chgI`)
- `pollSlow()` — sueño detallado + Recovery Score cada 5min
- `body.is-syncing` se activa durante poll (usar para shimmer/pulse en valores)
- Sin caché en memoria — todo va directo de la API a IndexedDB / DOM

### 5. Cache de historial (IndexedDB)
- DB: `fb_history`, store: `daily`, key: `date` (YYYY-MM-DD)
- Schema: `{ date, rhr, deep, rem, light, wake, minutesAsleep, timeInBed, eff, recovery, _complete }`
- `_complete: true` → ese día ya no se re-fetcha (solo "hoy" se refresca)
- Crítico para no agotar el rate limit de Fitbit (150 req/h)

### 6. Charts SVG vanilla (Historial)
- `_hLine(rows, key, opts)` → calcula pts + path
- `_hRenderLineSVG(svg, plot, cls)` → render line + área + grid + axis
- `_hRenderStackedBars(svg, rows)` → barras apiladas (sueño por etapa)
- Todos los colores via `var(--ta)`/`var(--ta2)`/etc. — automáticamente themed

### 7. Recovery Score / Strain / Sleep Performance
- Lógica portada de `lib/analytics/scores.ts` a vanilla JS dentro de app.html
- `calcRecoveryScore({ minutesAsleep, timeInBed, deep, rem, rhr })` → `{ score, level, color, breakdown }`
- `renderRecoveryScore(data)` merge incremental via `window._rsData`
- Llamado desde `loadReal()` y `pollSlow()`

### 8. Onboarding (tooltips + tour)
- `showOnb('recovery'|'strain'|'sleep'|'hrv'|'rhr'|'steps')` → bottom-sheet con explicación
- Contenido en `T[lang].onb[key]` — añadir métrica nueva = editar ambos idiomas
- `startTour()` recorre `T[lang].tour[]` (4 pasos)
- `localStorage.fb_seen_tour = '1'` previene re-show automático
- `maybeAutoTour()` se llama al final de `selectTheme()` en primer ingreso

### 9. Skeleton loaders
- `.lov` overlay con grid de 5 cards shimmer + texto "SINCRONIZANDO..."
- `showLoad()` / `hideLoad()` controlan visibilidad
- Clases utilitarias: `.v-skel` (inline value placeholder), `.lskel-card`, `body.is-syncing`

### 10. PWA
- Service worker en `/public/sw.js` (cache-first para assets, network-first para API)
- Manifest en `/public/manifest.json`
- Install prompt con banner sticky (auto-aparece en Chrome desktop/Android)
- Theme color dinámico sincronizado con `--bg` del tema activo
- Safe-area-insets para iPhone notch / home indicator

## Variables de entorno

Para el flujo *client-side puro* (modo actual): **ninguna requerida**. El Client ID de Fitbit se ingresa en la UI.

Para el flujo *Next.js / Supabase / Vercel*: ver `.env.example` (si existe) o el issue #9 cuando se aborde la migración.

## Convenciones de código

- Commits: `feat(sprint-N): título`, `fix:`, `chore:`, `docs:`
- Ramas: `feature/<slug>`, `fix/<slug>` — una por issue, salvo paquetes pequeños
- Squash merge a `main` (preferencia del owner para mantener historial limpio)
- "Closes #N" en commit/PR body auto-cierra el issue al mergear
- ES/EN paridad obligatoria
- CSS vars para colores, nunca hex hard-coded

## Bugs activos
Ver issues abiertos en GitHub o la sección "Bugs conocidos" del `HANDOFF.md`.

**Bug #12 es crítico para cualquier nuevo desarrollo en `public/app.html`** — top-level `let`/`const` queda en TDZ. Workaround: usar `window.*`. Léelo antes de añadir state nuevo.

## Reference rápida

| Endpoint Fitbit | Uso |
|---|---|
| `/1/user/-/profile.json` | nombre del usuario |
| `/1/user/-/activities/heart/date/{d}/1d/1min.json` | HR intraday |
| `/1/user/-/activities/heart/date/{start}/{end}.json` | RHR time-series (historial) |
| `/1/user/-/activities/date/{d}.json` | pasos, calorías, zonas |
| `/1.2/user/-/sleep/date/{d}.json` | sueño hoy + stages + levels |
| `/1.2/user/-/sleep/date/{start}/{end}.json` | sueño range (historial) |

| Tema | Test esperado |
|---|---|
| Visual | Cambio de tema → todos los componentes nuevos se repintan automáticamente |
| i18n | Toggle ES↔EN → todos los strings cambian sin recargar |
| OAuth | Conectar → primer pollFast trae datos reales en <3s |
| PWA | Lighthouse → score ≥95 |
| Mobile | Bottom nav + safe areas + pull-to-refresh funcionan en iPhone Safari |
