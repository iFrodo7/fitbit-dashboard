# 🤝 Handoff — Fitbit Air Dashboard

> **Para el siguiente desarrollador y su Claude.** Este documento contiene todo el contexto necesario para continuar el proyecto sin perder momentum.

---

## 📦 Estado actual

**Rama activa:** `feature/pwa-mobile-ready` (pusheada a origin, lista para PR)
**Rama main:** Contiene todas las mejoras visuales hasta theme-specific bars

### Lo que se acaba de completar (esta sesión):
- ✅ PWA básica funcional (manifest, service worker, iconos)
- ✅ Bottom navigation mobile responsive
- ✅ Theme-color dinámico sincronizado con el tema activo
- ✅ Safe-area-insets para iPhone notch / home indicator
- ✅ Haptic feedback en navegación
- ✅ Banner DEMO ya no se superpone con contenido en mobile

### Archivos nuevos creados:
```
public/manifest.json              ← PWA manifest
public/sw.js                      ← Service worker (cache strategies)
public/icons/icon-{32..512}.png   ← Iconos generados
public/icons/icon.svg             ← Source SVG
scripts/generate-icons.js         ← Regenerar iconos (npm: sharp)
```

---

## 🎯 Próximos pasos sugeridos (en orden de prioridad)

### Sprint 2 — Funcionalidad Real
1. **Integrar `lib/analytics/scores.ts`** (existe pero NO se usa)
   - Calcular Recovery Score / Strain real
   - Renderizar en el banner principal del dashboard
   - Conectar con datos del polling de Fitbit
   - Archivo: `/lib/analytics/scores.ts:1-229`

2. **Historial / Tendencias** (la app solo muestra "hoy")
   - Crear nueva ruta `/app/dashboard/history/`
   - Gráficos 7d/30d/90d para HRV, RHR, sueño, recovery
   - Usar Recharts (ya viable en Next.js) o Chart.js para SPA
   - Considera IndexedDB para cache local

3. **Sleep Stages Timeline**
   - Hipnograma estilo Oura (Deep/REM/Light/Awake)
   - Datos están en `FitbitSleep.sleep[].levels` (ver `lib/fitbit/types.ts:26`)

### Sprint 3 — Premium UX
4. **Push Notifications** (PWA ya soporta)
   - Solicitar permiso al usuario
   - Service worker ya está montado en `/public/sw.js` — solo falta agregar el listener `'push'`
   - Backend para FCM/APN: usar Vercel + Web Push API

5. **Skeleton loaders** (los actuales son básicos)
   - Mejorar `components/dashboard/MetricCard.tsx` loading state
   - Animaciones de shimmer por tema

6. **Onboarding flow** para primera vez
   - Tutorial guiado en OAuth de Fitbit
   - Tooltip system para explicar métricas

### Sprint 4 — Diferenciación
7. **Touch gestures** (swipe entre cards/tabs)
   - Considera Hammer.js o implementación nativa con TouchEvents
   - Conectar con `navigate()` en `public/app.html:1330`

8. **Capacitor para app nativa real** (si quieres distribución en App Store)
   - `npm install @capacitor/core @capacitor/cli`
   - Wrap PWA en webview nativo

9. **Migración progresiva a Next.js**
   - `public/app.html` es 1700+ líneas monolíticas
   - Migrar pieza por pieza a `app/dashboard/*`
   - Los componentes ya existen pero están muertos: `components/dashboard/{MetricCard,RecoveryBanner}.tsx`

---

## 🛠️ Setup para nueva sesión

### 1. Clonar y arrancar
```bash
git clone https://github.com/iFrodo7/fitbit-dashboard.git
cd fitbit-dashboard
source ~/.nvm/nvm.sh   # nvm es requerido
nvm use                # o instalar Node 20+
npm install
npm run dev            # http://localhost:3000
```

### 2. Branches activas
- `main` — Producción (theme-specific bars + visual overhaul)
- `feature/pwa-mobile-ready` — PWA + bottom nav (último trabajo, pending PR review)

### 3. Verificar PWA
- Chrome DevTools → Application → Manifest (debería mostrar todos los iconos)
- Application → Service Workers (debe estar activo)
- Lighthouse → PWA score (objetivo: 100)

---

## 🧠 Contexto crítico que tu Claude debe saber

### Arquitectura dual confusa
La app tiene **DOS implementaciones paralelas**:
- `public/app.html` ← **El que está vivo** (1700+ líneas, SPA pura, OAuth funcional)
- `app/dashboard/*` ← Next.js App Router (vacío, redirige a app.html)

**Decisión pendiente:** Migrar app.html → Next.js, o mantener como está. Discútelo con el usuario antes de empezar.

### Datos demo vs reales
- Por defecto la app muestra datos demo (RHR=68, sueño 7h12m)
- OAuth real funciona client-side sin secret (Fitbit "Personal" app)
- Tokens guardados en `localStorage`

### Sistema de temas
4 temas con identidad fuerte:
- `mc` Minecraft (VT323, pixelado, verde #6aff3a)
- `halo` Halo VISR (Oxanium, militar, azul #4ab8ff)
- `naruto` Naruto (Permanent Marker, naranja #ff4500)
- `fut` Futuristic (Rajdhani, neon cyan #00f5ff)

Cada tema tiene barras HEALTH/XP únicas (ver `public/app.html:430+`)

### Polling
- `pollFast()` — Datos cardio cada 15-120s (configurable)
- `pollSlow()` — Sueño detallado cada 10min
- No hay caché — implementar IndexedDB es alto valor

---

## 🐛 Issues conocidos

1. **Service Worker no se activa al primer load** — necesita reload manual una vez
2. **Theme color en iOS Safari** funciona en standalone mode, no en tab
3. **Capacitor no está instalado** — requerido para App Store/Play Store
4. **No hay TypeScript types** para el código de `public/app.html` (es JS vanilla)
5. **`/lib/analytics/scores.ts` no se ejecuta** — código muerto hasta que se conecte al HTML

---

## 💡 Tips para tu Claude

Al empezar tu sesión, pega esto:

```
Lee HANDOFF.md y CLAUDE.md primero. Estoy continuando el desarrollo
de Fitbit Air Dashboard. La sesión anterior dejó la rama
feature/pwa-mobile-ready lista para review.

Quiero trabajar en: [DESCRIBE TU OBJETIVO ESPECÍFICO DEL SPRINT 2/3/4]
```

### Comandos útiles que el Claude anterior usó:
- `npm run dev` — Servidor en :3000
- `node scripts/generate-icons.js` — Regenerar iconos PWA
- Para verificar PWA: usa Lighthouse en Chrome DevTools

---

## 📞 Contacto
- Repo: https://github.com/iFrodo7/fitbit-dashboard
- Última actualización: 2026-05-19
- Stack: Next.js 15 + TypeScript + Tailwind + Supabase + Fitbit OAuth

---

## ✅ Pull Request pendiente

URL para crear PR:
https://github.com/iFrodo7/fitbit-dashboard/pull/new/feature/pwa-mobile-ready

**Recomendación:** Revisar y hacer squash merge a `main` antes de empezar Sprint 2.
