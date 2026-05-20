# 🤝 Handoff — Fitbit Air Dashboard

> **Para el próximo desarrollador y su Claude.** Lee esto **primero**, luego `CLAUDE.md` (visión técnica) y luego los issues abiertos en GitHub.

---

## 📦 Estado actual (2026-05-19)

**Rama principal:** `main`
**Ramas activas (stacked, mergear en orden):**
1. `feature/pwa-mobile-ready`  — PR [#10](https://github.com/iFrodo7/fitbit-dashboard/pull/10) → `main`
2. `feature/history-trends`    — PR [#11](https://github.com/iFrodo7/fitbit-dashboard/pull/11) → `feature/pwa-mobile-ready`
3. `feature/sprint-3-ux`       — PR [#13](https://github.com/iFrodo7/fitbit-dashboard/pull/13) → `feature/history-trends`
4. `feature/push-notifications`— PR [#14](https://github.com/iFrodo7/fitbit-dashboard/pull/14) → `feature/sprint-3-ux`
5. `feature/touch-gestures`    — PR [#15](https://github.com/iFrodo7/fitbit-dashboard/pull/15) → `feature/push-notifications` *(incluye fix bug #12, fix coma en pasos, y fix i18n completo)*
6. `feature/capacitor-native`  — PR [#16](https://github.com/iFrodo7/fitbit-dashboard/pull/16) → `feature/touch-gestures`

**Estrategia de merge recomendada:**
1. Review + squash merge **#10** → `main`
2. Cuando #10 se merge, GitHub recalcula la base de #11 automáticamente
3. Review + squash merge **#11** → `main`
4. Igual con **#13** → `main`
5. Igual con **#14** → `main`
6. Igual con **#15** → `main`
7. Igual con **#16** → `main`
8. Sprint 2 cerrado; Sprint 3 casi (solo server push, #4); Sprint 4 avanzado (#7 done, #8 scaffolding done)

---

## ✅ Progreso de los sprints (estado al 2026-05-19)

### Sprint 2 — Funcionalidad Real (milestone #1)
| # | Item | Estado | PR |
|---|---|---|---|
| #1 | Recovery Score con datos reales de Fitbit | ✅ done | #10 |
| #2 | Sleep Stages Timeline — hipnograma | ✅ done | #10 |
| #3 | Historial 7d/30d/90d con SVG charts | ✅ done | #11 |

**Sprint 2 está completo** una vez que #10 y #11 se mergeen.

### Sprint 3 — Premium UX (milestone #2)
| # | Item | Estado | PR |
|---|---|---|---|
| #4 | Push Notifications | 🟡 client-side done, server push pending | #14 |
| #5 | Skeleton loaders premium | ✅ done | #13 |
| #6 | Onboarding flow + tooltips | ✅ done | #13 |

**Pendiente Sprint 3:** Solo la **segunda fase de #4** (server push). Lo client-side ya está vivo:
campana de opt-in en el header, permisos, notificaciones locales disparadas por
polling (alerta RHR fuera de rango, marca de sync), y listeners `push`/`message`/
`notificationclick` en `sw.js`. Falta el backend (Vercel + `web-push` + VAPID) para
alertas con la app **cerrada**. Ver issue #4 (tiene comentario con el estado).

### Sprint 4 — Diferenciación (milestone #3)
| # | Item | Estado | PR |
|---|---|---|---|
| #7 | Touch gestures — swipe + long-press | ✅ done | #15 |
| #8 | Capacitor — app nativa | 🟡 JS scaffolding done, native build pending | #16 |
| #9 | Limpieza arquitectura (ex-"migración Next.js") | ✅ done | merge directo |

**#8:** todo el lado JS está listo (config, deps, entry, scripts, OAuth deeplink). Falta `npx cap add ios/android` + build en Xcode/Android Studio + registrar el scheme `fitbitair`. Guía completa en **`CAPACITOR.md`**.

**#9:** replanteado (con OK del owner) de "migrar app.html → React" a **eliminar código muerto**. Borrado el dashboard React paralelo (`app/dashboard`, `app/demo`, `components/`, `lib/hooks`, `lib/i18n`, `lib/themes`, `lib/supabase/client.ts`, `lib/analytics/scores.ts`). Conservadas las API routes (`app/api/*`) + deps como base de backend futuro. **Ya no hay arquitectura dual.** `npm run typecheck` pasa.

### Bugs
- **#12 [P2]** Top-level `let`/`const` TDZ abort — ✅ **RESUELTO** en #15. Causa raíz: `if (theme) selectTheme(theme)` corría antes de que `const THEME_COLORS` estuviera declarado. Fix: auto-init movida a un bloque BOOT al final del script. Ya **puedes volver a usar `let`/`const` top-level** siempre que estén declarados antes del bloque BOOT.

---

## 🗂️ Estructura GitHub

- **Labels** (17): `sprint:2/3/4`, `area:pwa/analytics/sleep/history/ui-ux/fitbit-api/nextjs-migration`, `type:feature/bug/chore/docs`, `priority:p1/p2/p3`
- **Milestones**: Sprint 2 (15-jun-2026), Sprint 3 (15-jul-2026), Sprint 4 (31-ago-2026)
- **Convención de commits**: `feat(sprint-N): título corto`, `fix: ...`, `chore: ...`, `docs: ...`
- **Convención de ramas**: `feature/<slug>`, `fix/<slug>`. Una rama por issue salvo paquetes pequeños.
- **Merge strategy**: squash merge a `main` (el usuario lo prefiere para historial limpio)

---

## 🛠️ Setup para nueva sesión

```bash
git clone https://github.com/iFrodo7/fitbit-dashboard.git
cd fitbit-dashboard
source ~/.nvm/nvm.sh
nvm use                 # Node 20+
npm install
npm run dev             # http://localhost:3000
```

Si quieres ver el último estado funcional sin esperar a que los PRs mergeen:
```bash
git checkout feature/sprint-3-ux   # incluye todo lo de #10 + #11 + #13
```

---

## 🧠 Contexto crítico que tu Claude debe saber

### Arquitectura (ya NO es dual — limpiada en #9)
- **`public/app.html`** ← El único frontend (~2400 líneas, SPA pura, OAuth client-side, IndexedDB cache). **Todo el desarrollo ocurre acá.**
- **`app/api/*`** ← API routes Next.js (server-side OAuth + proxy Fitbit + preferencias). Existen pero `app.html` no las consume todavía; son la base para el backend futuro (server push #4, histórico en nube).
- `app/page.tsx` solo redirige `/` → `/app.html`.

### Sistema de temas (4 mundos)
| ID | Nombre | Font | Acento |
|---|---|---|---|
| `mc` | Minecraft | VT323 | Verde `#6aff3a` |
| `halo` | Halo VISR | Oxanium | Azul `#4ab8ff` |
| `naruto` | Naruto | Permanent Marker | Naranja `#ff4500` |
| `fut` | Futuristic | Rajdhani | Cyan `#00f5ff` |

**Regla:** cualquier feature nuevo debe usar `var(--ta)`, `var(--ta2)`, `var(--tneg)`, `var(--sub)`, `var(--bg)`, `var(--bdr)`, `var(--tx)` — **nunca hard-codear colores**. Los temas mapean estas vars en `applyTheme()`.

### Datos demo vs reales
- Por defecto la app muestra datos demo (RHR=68, sueño 7h12m). Si no hay token, todo es demo.
- OAuth real funciona client-side sin secret (Fitbit "Personal" app).
- Tokens guardados en `localStorage` con keys `fb_tok` y `fb_rt`.

### Polling
- `pollFast()` — cardio + actividad cada 15-120s (configurable con `chgI`)
- `pollSlow()` — sueño detallado + recovery cada 5min
- `body.is-syncing` se activa durante poll (úsalo para shimmer / pulsos)

### Cache de historial
- IndexedDB DB: `fb_history`, store: `daily`, keyed por `date` (YYYY-MM-DD)
- Cada record contiene: `rhr, deep, rem, light, wake, minutesAsleep, timeInBed, eff, recovery, _complete`
- `_complete: true` significa que ese día ya no se re-fetcheará (sólo "hoy" se refresca)

---

## 🐛 Bugs conocidos — **leer antes de tocar `public/app.html`**

### ✅ #12 — Top-level `let`/`const` TDZ abort — **RESUELTO** (PR #15)

**Era:** un `Cannot access 'X' before initialization` que abortaba el script a mitad de ejecución, dejando todo el state top-level posterior sin inicializar. Solo se manifestaba con un tema guardado en localStorage.

**Causa raíz (no era hoisting):** `if (theme) selectTheme(theme)` se ejecutaba a ~línea 1714. `selectTheme` → `updateThemeColor` → lee `const THEME_COLORS`, declarado ~200 líneas más abajo (~1922). Acceder a un `const` antes de su línea de declaración = TDZ throw. Ese throw abortaba todo lo que venía después (por eso `_rsData`, `_histRange`, `_tourIdx` quedaban muertos).

**Fix:** la auto-init de tema se movió a un bloque `// BOOT` al **final del script**, después de todas las definiciones. Ahora el script corre completo.

**Implicación para ti:** ya **puedes usar `let`/`const` top-level normalmente**, siempre que la declaración esté antes del bloque BOOT (que es lo último). Los `window._foo` existentes (`_rsData`, `_histRange`, `_histDB`, `_histFetching`, `_tourIdx`, `_notifState`, `_swipeNavInit`) funcionan bien y no es urgente migrarlos, pero ya no son obligatorios.

**Lección general:** nunca invoques una función al top-level que dependa de `const`/`let` declarados más abajo. Mantén toda invocación de arranque en el bloque BOOT final.

### 🟡 Otros bugs vivos
2. **Service Worker no se activa al primer load** — necesita reload manual una vez. Workaround: pasa por `/app.html` dos veces, ya queda.
3. **Theme color en iOS Safari** funciona en standalone mode (PWA instalada), no en tab.
4. **Capacitor no está instalado** — requerido para App Store/Play Store (#8).
5. **Service Worker puede cachear el HTML en dev** — si haces cambios CSS/JS y no se ven, abre DevTools → Application → Clear storage. En producción no es problema.
6. **Install prompt** solo aparece en Chrome desktop/Android. iOS Safari requiere instrucciones manuales ("Compartir → Añadir a pantalla de inicio").

---

## 🎁 Features añadidos en esta sesión — qué considerar al continuar

### Recovery Score (vivo en pantalla principal)
- `renderRecoveryScore(data)` acepta `{ minutesAsleep, timeInBed, deep, rem, rhr }`
- Merge incremental via `window._rsData`
- Llamado desde `loadReal()` y `pollSlow()`
- Si añades nuevos polls que traen RHR o sleep, **acuérdate de llamar `renderRecoveryScore` con los nuevos datos**

### Hipnograma (en card "Análisis de Sueño")
- `renderHypnogram(main)` espera `main.levels.data[]` con `{ level, seconds }`
- Soporta niveles modernos (`deep/rem/light/wake`) y clásicos (`asleep/restless/awake`)
- Se llama desde `loadReal()` y `pollSlow()`

### Historial (`#hview` overlay, accesible desde bottom-nav)
- `renderHistory()` es el entry point
- IndexedDB cache en `fb_history.daily`
- Charts SVG vanilla, theme-aware vía CSS vars
- Range switcher: `setHistoryRange(7|30|90)`
- **Atención al rate limit de Fitbit (150 req/h)**: el cache evita re-pedir días marcados `_complete`

### Skeletons (auto en `.lov` overlay)
- 5-card grid con shimmer durante OAuth handshake
- Clases reutilizables: `.lskel-card`, `.v-skel` (inline value), `body.is-syncing` (sutil pulse)

### Onboarding tooltips (`?` badges)
- Sistema centralizado: `showOnb('recovery'|'strain'|'sleep'|'hrv'|'rhr'|'steps')`
- Contenido en `T[lang].onb[key]` — para añadir métrica nueva, añade ambos idiomas
- Tour automático en primer login: `T[lang].tour[]` (4 pasos editable)
- `localStorage.fb_seen_tour` controla el auto-show

### Notificaciones (campana en header)
- `toggleNotifications()` maneja el opt-in de permiso; preferencia en `localStorage.fb_notif`
- `showLocalNotification(title, body, tag, url)` enruta vía `navigator.serviceWorker.controller.postMessage({type:'SHOW_NOTIFICATION'})`, fallback a `new Notification()`
- Triggers en `loadReal()`: `notifCheckRHR(rhr)` (alerta si RHR ≥ base+12, cooldown 2h) y `notifMarkSync()`
- Estado en `window._notifState` (NO usar `let` por bug #12)
- `sw.js` tiene listeners `push` / `message` / `notificationclick` (cache bumped a v2 — fuerza update del SW)
- **Para añadir un nuevo tipo de alerta:** crea una función `notifCheckXxx()` y llámala desde el poll relevante. Respeta cooldowns para no spamear.
- **Server push (app cerrada)** todavía NO existe — requiere backend, ver #4

---

## 🎯 Recomendación para tu próxima sesión

### Si tienes 30 min
- Hacer review de PR #10 / #11 / #13 y mergear en orden
- Probar el flujo completo en mobile

### Si tienes 2 h
- Completar la **segunda fase de #4** (server push): Vercel API route + `web-push` + VAPID, para alertas con la app cerrada. El cliente ya está listo.
- O probar en device real el swipe/long-press de #7 y pulir thresholds.

### Si tienes una tarde
- Completar el **build nativo de #8** en una Mac con Xcode/Android Studio (ver `CAPACITOR.md`), o construir el **backend de #4** (Vercel + web-push + VAPID) reutilizando las `app/api/*` que quedaron.

---

## 💡 Tips para tu Claude

Al empezar tu sesión, pega esto **exactamente**:

```
Lee HANDOFF.md y CLAUDE.md primero. Estoy continuando el desarrollo
de Fitbit Air Dashboard.

Estado: Sprint 2 done, Sprint 3 casi done (solo falta server push de #4),
Sprint 4 arrancado (#7 touch gestures done). Bug #12 ya está resuelto.
5 PRs stacked esperando review: #10 → #11 → #13 → #14 → #15.

Quiero trabajar en: [DESCRIBE TU OBJETIVO]
```

### Comandos útiles
- `npm run dev` — Servidor en :3000
- `node scripts/generate-icons.js` — Regenerar iconos PWA
- Para verificar PWA: usa Lighthouse en Chrome DevTools
- `gh pr list` — Ver PRs abiertos (requiere `gh auth login`)
- `gh issue list --milestone "Sprint 3 — Premium UX"` — Filtrar por milestone

### Cosas que NO debes hacer
- ❌ Invocar funciones de arranque al top-level que dependan de `const`/`let` declarados más abajo (causó el bug #12). Pon toda la init en el bloque `// BOOT` al final del script.
- ❌ Hard-codear colores. Usa CSS vars (`var(--ta)`, etc.).
- ❌ Romper paridad ES/EN. Si añades un string nuevo en `T.es`, añádelo también en `T.en`.
- ❌ Olvidar `applyThemeText` cuando añades labels nuevos por tema.
- ❌ Mergear sin antes pasar por la **lista de test plan** del PR.

---

## 📞 Contacto
- Repo: https://github.com/iFrodo7/fitbit-dashboard
- Owner: Diego Castillo (`@iFrodo7`)
- Stack: Next.js 15 + TypeScript + Tailwind + Supabase + Fitbit OAuth
- Última actualización del handoff: **2026-05-19** (Sprint 2 + Sprint 3 parcial)
