# 🤝 Handoff — Fitbit Air Dashboard

> **Para el próximo desarrollador y su Claude.** Lee esto **primero**, luego `CLAUDE.md` (visión técnica) y luego los issues abiertos en GitHub.

---

## 📦 Estado actual (2026-05-19)

**Rama principal:** `main`
**Ramas activas (stacked, mergear en orden):**
1. `feature/pwa-mobile-ready` — PR [#10](https://github.com/iFrodo7/fitbit-dashboard/pull/10) → `main`
2. `feature/history-trends`   — PR [#11](https://github.com/iFrodo7/fitbit-dashboard/pull/11) → `feature/pwa-mobile-ready`
3. `feature/sprint-3-ux`      — PR [#13](https://github.com/iFrodo7/fitbit-dashboard/pull/13) → `feature/history-trends`

**Estrategia de merge recomendada:**
1. Review + squash merge **#10** → `main`
2. Cuando #10 se merge, GitHub recalcula la base de #11 automáticamente
3. Review + squash merge **#11** → `main`
4. Igual con **#13** → `main`
5. Sprint 2 y Sprint 3 cerrados

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
| #4 | Push Notifications | ⏳ pending | — |
| #5 | Skeleton loaders premium | ✅ done | #13 |
| #6 | Onboarding flow + tooltips | ✅ done | #13 |

**Pendiente Sprint 3:** Push Notifications (#4). Requiere backend con Vercel + `web-push` + VAPID. Ver issue #4 para detalle.

### Sprint 4 — Diferenciación (milestone #3)
- #7 Touch gestures — swipe entre cards
- #8 Capacitor — app nativa (TestFlight / Play Store)
- #9 Migración progresiva a Next.js

### Bugs abiertos
- **#12 [P2]** Top-level `let`/`const` queda en TDZ — script aborta silenciosamente. **LEE ESTO ANTES DE TOCAR app.html**. Ver sección "Bugs conocidos" abajo.

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

### Arquitectura dual confusa
- **`public/app.html`** ← El prototipo vivo (~2400 líneas, SPA pura, OAuth client-side, IndexedDB cache)
- **`app/dashboard/*`** ← Next.js App Router (vacío, redirige a app.html)

**Decisión pendiente:** Migrar app.html → Next.js (issue #9). Mientras tanto, **todo el trabajo sigue ocurriendo en `public/app.html`**.

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

### 🔴 #12 — Top-level `let`/`const` TDZ abort (P2, intermitente, ha bloqueado 3 features)

**Síntoma:** cualquier `let foo = X;` o `const bar = Y;` declarado al nivel superior del único `<script>` queda permanentemente en TDZ. Las funciones declaradas en el mismo bloque sí son llamables (hoisted) pero al ejecutarse leen el binding y lanzan:
```
Cannot access '_X' before initialization
```
**Pero `console.error` está vacío** — no logueas el error porque algo lo silencia.

**Workaround universal:** Usar `window._foo` en lugar de `let _foo`. Ejemplos en el código:
- `window._rsData` (Recovery Score state)
- `window._histRange`, `window._histDB`, `window._histFetching` (Historial)
- `window._tourIdx` (Onboarding tour)

**Cómo reproducir:** Añade `let _testVar = 42;` cerca del final de `<script>`, recarga, abre consola y haz `typeof window._testVar` → `'undefined'`. Pero `typeof renderHypnogram` → `'function'`.

**Qué falta:** Encontrar el IIFE / addEventListener / getElementById fallido entre `setLang(lang)` (~línea 1660) y el final del script que está silenciando el error y abortando la ejecución. Cuando lo arregles, podrás migrar los `window.*` de vuelta a `let`.

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

---

## 🎯 Recomendación para tu próxima sesión

### Si tienes 30 min
- Hacer review de PR #10 / #11 / #13 y mergear en orden
- Probar el flujo completo en mobile

### Si tienes 2 h
- **Arreglar #12** (el TDZ bug). Es el bug más urgente porque afecta a TODO futuro desarrollo en `public/app.html`. Estrategia: añadir `console.log` en cada función llamada al nivel superior hasta encontrar la que aborta silenciosamente.
- O empezar #4 (Push Notifications) con VAPID en Vercel — issue tiene todos los pasos.

### Si tienes una tarde
- Avanzar Sprint 4. Recomiendo arrancar por **#7 Touch gestures** (impacto inmediato visible en mobile, scope contenido).
- Luego #8 Capacitor (mucho más pesado, pero abre la puerta a App Store).

---

## 💡 Tips para tu Claude

Al empezar tu sesión, pega esto **exactamente**:

```
Lee HANDOFF.md y CLAUDE.md primero. Estoy continuando el desarrollo
de Fitbit Air Dashboard.

Estado: Sprint 2 done, Sprint 3 casi done (#4 push notifications pendiente),
Sprint 4 sin empezar. Bug crítico #12 sigue abierto.

Quiero trabajar en: [DESCRIBE TU OBJETIVO]
```

### Comandos útiles
- `npm run dev` — Servidor en :3000
- `node scripts/generate-icons.js` — Regenerar iconos PWA
- Para verificar PWA: usa Lighthouse en Chrome DevTools
- `gh pr list` — Ver PRs abiertos (requiere `gh auth login`)
- `gh issue list --milestone "Sprint 3 — Premium UX"` — Filtrar por milestone

### Cosas que NO debes hacer
- ❌ Añadir `let` o `const` al top-level del `<script>` en `public/app.html` (ver #12). Usa `window.*` hasta que #12 esté arreglado.
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
