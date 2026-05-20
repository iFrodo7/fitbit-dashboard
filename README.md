# Fitbit Air Dashboard

Panel biométrico personal con **4 temas visuales** (Minecraft, Halo, Naruto, Futuristic) y datos reales de Fitbit. PWA instalable en el móvil y accesible vía web. Pensado para competir visual y funcionalmente con Whoop / Oura / Apple Fitness.

![themes](public/icons/icon-192.png)

## ✨ Features

- **Recovery Score** (0–100) estilo Whoop: duración + eficiencia + calidad de sueño + FC en reposo
- **Hipnograma** de etapas de sueño estilo Oura (deep / REM / light / awake)
- **Historial** 7d / 30d / 90d con gráficos SVG (Recovery, FC reposo, sueño por noche) + caché en IndexedDB
- **4 temas** con identidad visual fuerte, cambiables en caliente
- **Bilingüe** ES / EN
- **PWA**: instalable, offline-capable, pull-to-refresh, install prompt
- **Notificaciones**: opt-in, locales (RHR fuera de tu baseline, recordatorios) + server push (Web Push/VAPID)
- **Touch gestures**: swipe entre tabs, long-press en métricas para ver su explicación
- **Onboarding**: tour de primera vez + tooltips por métrica
- **App nativa** iOS/Android vía Capacitor (scaffolding listo)

## 🏗️ Arquitectura

El frontend vivo es **`public/app.html`** — una SPA en JS vanilla (~2400 líneas) con OAuth client-side, IndexedDB y gráficos SVG. Next.js sirve esa SPA y aporta las **API routes** (`app/api/*`) que son la base del backend (server push, futuro histórico en nube).

```
public/app.html          ← el único frontend (SPA, OAuth, IndexedDB, charts SVG)
public/{sw.js,manifest}  ← PWA
app/api/*                ← API routes Next (push, fitbit proxy, auth, prefs)
lib/{push,fitbit,supabase}.ts
supabase/migrations/     ← schema SQL (Supabase)
capacitor.config.ts      ← app nativa
```

> Ver **`CLAUDE.md`** para la referencia técnica completa y **`HANDOFF.md`** para el estado actual y próximos pasos.

## 🚀 Quickstart

```bash
source ~/.nvm/nvm.sh   # nvm
nvm use                # Node 20+
npm install
npm run dev            # http://localhost:3000  (redirige a /app.html)
```

La app arranca en modo **demo** (sin login). Para datos reales: botón **Conectar** → ingresa tu Client ID de una app "Personal" de [dev.fitbit.com](https://dev.fitbit.com/apps/new) (OAuth client-side, sin secret).

## 📦 Stack

Next.js 15 · TypeScript · Tailwind · Supabase · Fitbit OAuth 2.0 · Capacitor · Web Push

## 📚 Docs

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Referencia técnica (sistemas de app.html, endpoints, convenciones) |
| `HANDOFF.md` | Estado actual, qué falta, cómo continuar |
| `PUSH.md` | Server push — ✅ ya desplegado; guía VAPID/deploy/cron para rotar o reproducir |
| `CAPACITOR.md` | Build nativo iOS/Android |

## 🧪 Scripts

```bash
npm run dev         # dev server
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run cap:sync    # sincronizar web → nativo (Capacitor)
npm run db:push     # aplicar migraciones Supabase
```

## 📍 Estado

Sprints 2–4 completos a nivel de código. Server push (#4) **desplegado y activo en producción** (https://fitbit-dashboard-zeta.vercel.app, ver `PUSH.md`). Pendiente solo de infra: build nativo Capacitor (#8, ver `CAPACITOR.md`).

---

Hecho por [@iFrodo7](https://github.com/iFrodo7) · 🤖 con [Claude Code](https://claude.com/claude-code)
