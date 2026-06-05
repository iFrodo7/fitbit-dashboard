# AIRA — Biometric Dashboard

Panel biométrico personal con **Coach de IA**, **pagos PRO con Stripe**, **5 temas visuales gratuitos + 2 PRO** (Voxel, Synthwave), datos reales vía **Google Health API** y PWA instalable sin tienda de apps. Pensado para competir visual y funcionalmente con Whoop / Oura / Apple Fitness.

## 🔗 Links

| | |
|---|---|
| **Landing page** | **[fitbit-dashboard-zeta.vercel.app/landing.html](https://fitbit-dashboard-zeta.vercel.app/landing.html)** |
| **App (producción)** | **[fitbit-dashboard-zeta.vercel.app/app.html](https://fitbit-dashboard-zeta.vercel.app/app.html)** |
| **Repositorio** | [github.com/iFrodo7/fitbit-dashboard](https://github.com/iFrodo7/fitbit-dashboard) |

## 💳 AIRA PRO — $9.99/mes · 7 días gratis

| | FREE | PRO |
|---|---|---|
| Temas | Futuristic, Bloom, Neon Noir, Shinobi | + **Voxel** + **Synthwave** + futuros drops |
| Coach AIRA | ✗ | ✅ Ilimitado (Gemini 2.5) |
| Reporte semanal IA | ✗ | ✅ Automático cada semana |
| Alertas inteligentes | ✗ | ✅ Basadas en métricas |
| Historial | 7 días | ✅ Ilimitado |
| Strain adaptativo | Básico | ✅ Baseline personal + overclock dorado |
| Precio | $0 siempre | $9.99/mes · **7 días de prueba gratis** |

Pagos gestionados por **Stripe** (webhooks → Supabase `subscriptions`). Sin tarjeta cobrada durante los primeros 7 días.

## 📲 Instalar en el teléfono

La app es una PWA — sin tienda de apps:

- **iPhone (Safari):** abre el link → **Compartir** → **Añadir a pantalla de inicio**
- **Android (Chrome):** abre el link → menú **⋮** → **Instalar app**

Arranca en **modo demo** (sin login). Para datos reales → toca **Conectar con Google**.

## ✨ Features

### 💳 Stripe PRO (nuevo)
- Checkout con **7 días de prueba** sin cargo (`trial_period_days: 7`)
- Portal de gestión de suscripción (cancelar, cambiar plan)
- Webhooks: `checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_failed`
- Estado PRO validado server-side via `/api/stripe/status` → Supabase `subscriptions`

### Coach AIRA ✦ PRO
- Análisis personalizado de tus métricas en tiempo real — recovery, sueño, entrenamiento, HRV, estrés
- **Análisis cruzado**: recovery bajo + HRV bajo + sueño pobre = fatiga acumulada → consejo específico
- **Respuestas por músculo**: pregunta "qué entreno hoy — piernas" y recibe rutina adaptada a tu estado
- **Historial multi-turno**: recuerda los últimos 8 intercambios de la conversación
- **Rate limit**: Free 3/día · PRO 50/día por IP
- **Motor**: Gemini 2.5 Flash (`thinkingBudget: 0`) · fallback local inteligente
- Paywall con trial badge y botón "Comenzar prueba gratis"

### Métricas y datos
- **Recovery Score** (0–100) estilo Whoop con etiquetas cualitativas (verde/amarillo/rojo)
- **Hipnograma** de sueño con timeline por etapa
- **FC intraday** + RHR · **HRV (RMSSD)** · **SpO₂** · **Ritmo respiratorio** · **Strain**
- **Zonas HR** (fat-burn / cardio / pico) con barras de intensidad y minutos activos
- **Etapas de sueño**: profundo, REM, ligero, despertares + eficiencia
- **Historial** 7d / 30d / 90d con gráficas SVG + flechas de tendencia · caché IndexedDB

### Google Health API
- Autenticación OAuth 2.0 con Google (token exchange server-side)
- **Fuente activa**: `FitbitSource` ↔ `GoogleHealthSource` — intercambiables con una línea
- Todos los endpoints: HR intraday, RHR, steps, sleep, SpO₂, HRV, BR, active zone minutes, calories
- Polling rápido (30s) y lento (5min)

### UI / Animaciones
- **Sistema de tokens completo** — escala 8px, motion tokens, easing tokens
- **Zero `transition:all`** · **Zero `cubic-bezier` raw** fuera de definiciones de tokens
- **Apple touch feel** — spring-back en touch, pull-to-refresh, safe-area Dynamic Island
- **WCAG 2.1 AA** — tablist completo, `:focus-visible`, `prefers-reduced-motion`

### Plataforma
- **PWA** instalable · offline · pull-to-refresh · safe-area para Dynamic Island
- **Bilingüe** ES / EN con paridad total
- **Notificaciones** — push local + server push (Web Push / VAPID) · cron diario 08:00
- **App nativa** iOS/Android vía Capacitor (ver `CAPACITOR.md`)

## 🏗️ Arquitectura

```
public/
  app.html             ← único frontend (SPA vanilla, OAuth, IndexedDB, SVG charts, chat AIRA)
  landing.html         ← landing page marketing (FREE vs PRO, pricing, temas)
  sw.js / manifest.json ← PWA
  icons/               ← iconos PWA generados

app/api/
  stripe/
    checkout/          ← Stripe Checkout ($9.99/mes, trial 7d)
    portal/            ← Stripe billing portal (gestionar/cancelar)
    status/            ← valida PRO desde Supabase
    webhook/           ← eventos Stripe → Supabase subscriptions
  coach/               ← proxy Gemini (key server-side, rate limit)
  google/token/        ← token exchange Google OAuth
  push/                ← server push + cron diario

lib/
  stripe.ts            ← cliente Stripe
  push.ts              ← Web Push
  supabase/            ← clientes Supabase (server / service)

supabase/migrations/
  001_init.sql
  002_push.sql
  003_subscriptions.sql  ← tabla subscriptions (plan, status, stripe IDs, RLS)

brand/                 ← identidad visual completa
  logos/               ← SVG + PNG en todos los tamaños
  social/              ← og:image + Twitter card
  colors/              ← paleta de referencia
  generate-brand-assets.js

scripts/
  generate-icons.js    ← PWA icons desde SVG
```

### Capa de datos (`public/app.html`)

```js
const FitbitSource       = { id:'fitbit',  oauth:{...}, ep:{...} }
const GoogleHealthSource = { id:'google',  oauth:{...}, ep:{...} }
let HS = FitbitSource;  // ← fuente activa (restaurada desde localStorage.fb_provider)
```

`localStorage.setItem('fb_provider','google')` activa Google Health completo.

## 🚀 Quickstart

```bash
source ~/.nvm/nvm.sh && nvm use   # Node 20+
npm install
npm run dev                        # http://localhost:3000  →  /app.html
npm run typecheck                  # tsc --noEmit (correr antes de cada PR)
```

## 🔌 Conectar la cuenta

1. Abre la app → toca **Conectar con Google**
2. Autoriza los scopes de salud (Google Health API)
3. Los datos aparecen en tiempo real (polling cada 30s / 5min para sueño)

## ⚙️ Variables de entorno

Todas configuradas en Vercel → Settings → Environment Variables.

| Variable | Requerida | Para qué |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | OAuth Google login |
| `GOOGLE_CLIENT_SECRET` | ✅ | Token exchange server-side |
| `STRIPE_SECRET_KEY` | ✅ PRO | Checkout, portal, webhooks Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ PRO | Stripe frontend |
| `STRIPE_WEBHOOK_SECRET` | ✅ PRO | Verificar firma de webhooks |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL base (success/cancel redirects) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Leer/escribir subscriptions (service role) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Cliente Supabase frontend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Cliente Supabase frontend |
| `GEMINI_API_KEY` | Opcional | Coach IA real (sin key → fallback local) |
| `GEMINI_MODEL` | Opcional | Modelo (default `gemini-2.0-flash`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Opcional | Server push notifications |
| `PUSH_ADMIN_SECRET` | Opcional | Endpoint push admin |
| `CRON_SECRET` | Opcional | Cron diario 08:00 |

### Webhook de Stripe

Endpoint a registrar en [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks):
```
https://fitbit-dashboard-zeta.vercel.app/api/stripe/webhook
```
Eventos necesarios: `checkout.session.completed` · `customer.subscription.updated` · `customer.subscription.deleted` · `invoice.payment_failed`

## 📦 Stack

Next.js 15 · TypeScript · Tailwind · Supabase (PostgreSQL + RLS) · Google Health API · Google OAuth 2.0 · Gemini 2.5 Flash · Stripe · Web Push (VAPID) · Capacitor · Vercel

## 📚 Docs internas

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Referencia técnica (arquitectura, endpoints, convenciones) |
| `HANDOFF.md` | Estado del sprint, PRs abiertos, bugs conocidos, orden de trabajo |
| `MIGRATION.md` | Runbook Fitbit → Google Health API (deadline sep 2026) |
| `brand/README.md` | Guías de marca, paleta de colores, uso del logo |
| `PUSH.md` | Server push (VAPID, deploy, cron) |
| `CAPACITOR.md` | Build nativo iOS/Android |

## 🧪 Scripts

```bash
npm run dev               # servidor de desarrollo
npm run build             # next build
npm run typecheck         # tsc --noEmit
npm run cap:sync          # sincronizar web → nativo (Capacitor)
node brand/generate-brand-assets.js   # regenerar logos y assets de marca
node scripts/generate-icons.js        # regenerar iconos PWA
```

## 📍 Estado (2026-06-05)

Todo el código en `main`, desplegado en Vercel:

- ✅ **Stripe PRO** — checkout, portal, webhooks, DB `subscriptions` + 7 días trial
- ✅ **Landing page** — marketing completa en `/landing.html` con pricing FREE vs PRO
- ✅ **Brand assets** — logos SVG + PNG, paleta, OG image, guías de marca en `brand/`
- ✅ **Google Health API** — integración completa (active zone minutes, sleep, sub-métricas)
- ✅ **Coach AIRA** — Gemini 2.5, multi-turno, rate limit Free/PRO, paywall con trial
- ✅ **Temas PRO** — Voxel (pixel art) + Synthwave (retrowave 80s) bloqueados sin PRO
- ✅ **Animaciones** — 11 bugs resueltos, tokenización completa, race conditions corregidas

**Próximos pasos:**
- Conectar `STRIPE_PRO_PRICE_ID` si se quiere usar precio fijo (actualmente usa `price_data` inline)
- Aplicar migración `003_subscriptions.sql` en Supabase producción
- Verificar OAuth scopes de Google Health (proceso de revisión Google)
- Build nativo iOS/Android (`CAPACITOR.md`)

---

Hecho por [@iFrodo7](https://github.com/iFrodo7) · colaborador [@Jorge-Contreras06](https://github.com/Jorge-Contreras06) · 🤖 con [Claude Code](https://claude.com/claude-code)
