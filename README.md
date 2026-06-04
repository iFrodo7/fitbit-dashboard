# Fitbit Air Dashboard

Panel biométrico personal con **5 temas visuales** (Minecraft, Neon Noir, Shinobi, Futuristic, Bloom) + **1 tema PRO** (Synthwave), datos reales vía **Google Health API** y un **coach de IA conversacional (AIRA)** exclusivo PRO. PWA instalable sin tienda de apps. Pensado para competir visual y funcionalmente con Whoop / Oura / Apple Fitness.

## 🔗 Links

| | |
|---|---|
| **App (producción)** | **[fitbit-dashboard-zeta.vercel.app](https://fitbit-dashboard-zeta.vercel.app)** |
| **Repositorio** | [github.com/iFrodo7/fitbit-dashboard](https://github.com/iFrodo7/fitbit-dashboard) |

## 📲 Instalar en el teléfono

La app es una PWA — sin tienda de apps:

- **iPhone (Safari):** abre el link → **Compartir** → **Añadir a pantalla de inicio**
- **Android (Chrome):** abre el link → menú **⋮** → **Instalar app**

Arranca en **modo demo** (sin login). Para datos reales → toca **Conectar con Google**.

## ✨ Features

### Coach AIRA ✦ PRO
- Análisis personalizado de tus métricas en tiempo real — recovery, sueño, entrenamiento, nutrición, HRV, estrés
- **Análisis cruzado**: recovery bajo + HRV bajo + sueño pobre = fatiga acumulada → consejo específico por zona (rojo/amarillo/verde)
- **Respuestas por músculo**: pregunta "qué entreno hoy — piernas" y recibe una rutina adaptada a tu estado real del día
- **Historial multi-turno**: recuerda los últimos 6 intercambios de la conversación
- **Tono adaptivo**: energético para entreno, calmado para sueño/recovery, empático para estrés
- **Off-topic con humor en personaje**: si preguntas fuera de salud, AIRA responde con un chiste fitness
- **Motor**: Gemini 2.5/2.0 Flash (con cascade automático) · fallback local inteligente sin necesidad de API key
- **Fix Gemini 2.5**: `thinkingBudget: 0` desactiva el modo "thinking" para respuestas completas en el coach

### Métricas y datos
- **Recovery Score** (0–100) estilo Whoop con etiquetas cualitativas (verde/amarillo/rojo)
- **Hipnograma** de sueño estilo Oura con timeline por etapa
- **FC intraday** + RHR · **HRV (RMSSD)** · **SpO₂** · **Ritmo respiratorio** · **Strain**
- **Zonas HR** (fat-burn / cardio / pico) con barras de intensidad y minutos activos
- **Etapas de sueño**: profundo, REM, ligero, despertares + eficiencia
- **Historial** 7d / 30d / 90d con gráficas SVG + flechas de tendencia · caché IndexedDB

### Google Health API (migración completada)
- Autenticación OAuth 2.0 con Google (token exchange server-side vía `/api/google/token`)
- **Fuente activa**: `FitbitSource` ↔ `GoogleHealthSource` — intercambiables con una línea
- Todos los endpoints implementados: HR intraday, RHR, steps, sleep, SpO₂, HRV, BR, active zone minutes, calories
- Polling rápido (30s) y lento (5min) ambos tienen implementación Google
- Historial de fechas desde Google Health API

### UI / Animaciones
- **Sistema de tokens completo** — escala 8px, motion tokens (`--dur-fast/base/slow`), easing tokens (`--ease-spring/out/std/settle`)
- **Zero `transition:all`** · **Zero `cubic-bezier` raw** fuera de las definiciones de tokens
- **Race condition en Daily Rings resuelta** — flag `_drAnimInProgress` bloquea `updateDailyRings()` durante stagger
- **Apple touch feel** — spring-back solo en touch, indicador de nav animado, pull-to-refresh con pop-in
- **`contain:layout`** en cards · **`contain:layout paint`** en overlays · `will-change` donde aplica
- **WCAG 2.1 AA** — tablist completo, `:focus-visible` universal, `prefers-reduced-motion` global

### Widget system
- **Long-press** → modo edición estilo iPhone (jiggle + badge ×)
- **Drag & drop** para reordenar (touch y mouse) — persiste entre sesiones
- **Resize** por widget (1 col / 2 col)
- **Tarjeta +** para reactivar widgets ocultos

### Plataforma
- **PWA** instalable · offline · pull-to-refresh · safe-area para Dynamic Island
- **Bilingüe** ES / EN con paridad total
- **Notificaciones** — push local + server push (Web Push / VAPID) · cron diario 08:00
- **App nativa** iOS/Android vía Capacitor (scaffolding listo — ver `CAPACITOR.md`)

## 🏗️ Arquitectura

```
public/app.html          ← único frontend (SPA vanilla, OAuth, IndexedDB, charts SVG, chat AIRA)
public/{sw.js,manifest}  ← PWA
app/api/coach/           ← proxy coach IA (Gemini + fallback local, key solo server-side)
app/api/google/token/    ← token exchange Google OAuth (añade client_secret server-side)
app/api/{push,fitbit,auth,user}/
lib/{push,fitbit,supabase}.ts
supabase/migrations/
capacitor.config.ts
```

### Capa de datos (`public/app.html`)

```js
const FitbitSource      = { id:'fitbit',  oauth:{...}, ep:{...} }  // Fitbit Web API
const GoogleHealthSource = { id:'google', oauth:{...}, ep:{...} }  // Google Health API v4
let HS = FitbitSource;  // ← fuente activa (restaurada desde localStorage.fb_provider)
```

Migrar a Google = ya está implementado. `localStorage.setItem('fb_provider','google')` activa el path Google completo.

> Ver `CLAUDE.md` (referencia técnica) y `HANDOFF.md` (estado de sprint + próximos pasos).
> Ver `MIGRATION.md` para el runbook completo de la migración Fitbit → Google (deadline: sep 2026).

## 🚀 Quickstart

```bash
source ~/.nvm/nvm.sh && nvm use   # Node 20+
npm install
npm run dev                        # http://localhost:3000  →  /app.html
npm run typecheck                  # tsc --noEmit (correr antes de cada PR)
```

## 🔌 Conectar tu Fitbit Air

El Fitbit Air sincroniza datos a través de **Google Health API**:

1. Configura el Fitbit Air en la **app Fitbit** (iOS/Android)
2. En Fitbit app → Settings → **Connected Apps** → activa sincronización con Google
3. Abre la app → toca **Conectar con Google** → autoriza los scopes de salud
4. Los datos aparecen en tiempo real (polling cada 30s / 5min para sueño)

## ⚙️ Variables de entorno

Todas en Vercel → Settings → Environment Variables.

| Variable | Requerida | Para qué |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | OAuth Google (mismo que en `GoogleHealthSource.clientId`) |
| `GOOGLE_CLIENT_SECRET` | ✅ | Token exchange server-side Google |
| `GEMINI_API_KEY` | Opcional | Coach IA real (sin key → fallback local) |
| `GEMINI_MODEL` | Opcional | Modelo (default `gemini-2.0-flash`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Opcional | Server push |
| Supabase vars | Opcional | Prefs en nube, webhooks |

## 📦 Stack

Next.js 15 · TypeScript · Tailwind · Supabase · Google Health API · Google OAuth 2.0 · Gemini API · Capacitor · Web Push

## 📚 Docs internas

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Referencia técnica (arquitectura, endpoints, convenciones de código) |
| `HANDOFF.md` | Estado del sprint, PRs, bugs conocidos, qué hacer ahora |
| `MIGRATION.md` | Runbook Fitbit → Google Health API (deadline sep 2026) |
| `PUSH.md` | Server push (VAPID, deploy, cron) |
| `CAPACITOR.md` | Build nativo iOS/Android |

## 🧪 Scripts

```bash
npm run dev         # servidor de desarrollo
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run cap:sync    # sincronizar web → nativo (Capacitor)
npm run db:push     # aplicar migraciones Supabase
```

## 📍 Estado (2026-06-04)

Todo el código en `main`, desplegado en Vercel. Sprint actual completado:

- ✅ **Google Health API** — integración completa auditada y corregida (active zone minutes, sleep efficiency/wakes, sub-métricas)
- ✅ **Coach AIRA** — fix Gemini 2.5 (respuestas completas), historial multi-turno, métricas enriquecidas, system prompt expert-level
- ✅ **Animaciones** — 11 bugs resueltos (race condition rings, z-index modales, conflictos CSS, tokenización completa)
- ✅ **Merge `fix/aira-critical-bugs`** (Jorge) — integrado con resolución de conflictos

**Pendiente de infra** (no de código): conectar Stripe para cobros PRO reales · build nativo (`CAPACITOR.md`) · verificación OAuth de Google Health scopes (gratis pero lenta — iniciar ya).

---

Hecho por [@iFrodo7](https://github.com/iFrodo7) · colaborador [@Jorge-Contreras06](https://github.com/Jorge-Contreras06) · 🤖 con [Claude Code](https://claude.com/claude-code)
