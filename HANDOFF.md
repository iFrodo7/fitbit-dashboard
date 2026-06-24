# 🤝 Handoff — Fitbit Air Dashboard

> **Para el próximo desarrollador y su Claude.** Lee esto **primero**, luego `CLAUDE.md` (referencia técnica). Última actualización: **2026-05-30 (sesión 2 — rings + AIRA narrative)**.

> **🚨 MIGRACIÓN INMINENTE — Fitbit Web API → Google Health API (sep 2026).** Toda la app depende del Fitbit Web API, que **se apaga en septiembre 2026**. **HECHO:** la capa de datos ya está blindada con un adaptador (`FitbitSource` / `HS` en `public/app.html`) — todas las llamadas pasan por `HS`, cero URLs hardcodeadas. **PENDIENTE:** escribir `GoogleHealthSource` (misma forma) + iniciar la verificación OAuth de Google (gratis pero lenta → **empezar YA**). Sobrevivir cuesta **~$0** (local-first exime del assessment pagado). **Runbook completo y checklist: `MIGRATION.md`.**

> **⚙️ CONFIGURA TU GIT ANTES DE COMMITEAR (el repo es privado).** Vercel **bloquea** el deploy si el email del autor del commit no corresponde a una cuenta de GitHub real. Pon tu correo de GitHub (idealmente el `noreply`) una sola vez:
> ```
> git config user.email "TU-ID+TU-USUARIO@users.noreply.github.com"
> git config user.name "Tu Nombre"
> ```
> Lo encuentras en GitHub → Settings → Emails. Si ves un deploy en estado `BLOCKED`, casi siempre es esto.

---

## 📍 Estado actual

- **Todo el código está en `main` y desplegado.** 0 PRs abiertos, una sola rama (`main`).
- **Producción (PWA):** **https://fitbit-dashboard-zeta.vercel.app** → redirige a `/app.html`.
  - Instalar en móvil: iPhone Safari → Compartir → *Añadir a pantalla de inicio*; Android Chrome → ⋮ → *Instalar app*.
- Cada merge a `main` auto-despliega a Vercel (producción).
- **Bug #12 RESUELTO** — ya se puede usar `let`/`const` top-level (declarados antes del bloque `// BOOT` final). Mantén invocaciones de arranque en BOOT.

## ✅ Qué está construido (sesión 2026-05-30 #2 — Daily Rings + AIRA Narrative)

| Área | Qué |
|---|---|
| **Daily Progress Rings** | 5 rings circulares SVG en `#mcex` (reemplazan ENERGY/PROCESSOR y las barras temáticas de todos los temas). Orden: Recovery · Calorías · Pasos · Min Act. · Sueño. Colores fijos por métrica (cyan/naranja/verde/ámbar/morado) — consistentes en todos los temas como los Activity Rings de Apple. |
| **Animación de rings** | `animateDailyRings()`: resetea arcos a vacío + rellena con stagger de 110ms por ring + tip dot en el endpoint al terminar. Se dispara en: carga inicial (vía `_drAnimDone` flag en `updateScores()`), cambio de tab a Home (`navigate('home')`), cambio de tema (`renderDailyRings()`). |
| **Actualización en vivo** | `updateDailyRings()` ahora también mueve los arcos visualmente (transición 0.9s) cuando `_drAnimDone=true`, para reflejar datos que llegan tarde (sleep via `pollSlow`, steps/cal via `pollFast`). |
| **Data sync corregido** | 4 bugs de datos: (1) leía `#cal-act` en vez de `#calv`; (2) `pollFast` no llamaba `updateDailyRings()`; (3) `pollFastGoogle` tampoco; (4) `pollSlow`/`pollSlowGoogle` actualizaban barras de sueño pero nunca seteaban `window._lastSleepPct`. Todos corregidos. |
| **Racha diaria** | `getDailyStreak()`: contador `{ date, count }` en localStorage (`fb_streak`). Badge `🔥 N DÍAS` en el header de los rings. |
| **Metas de rings** | Recovery ≥100pts, Calorías 500 kcal activas (`#calv`), Pasos 10,000 (`#stepsv`), Min. Activos 30 min (cardio+peak HR zones), Sueño 8h=100%. |
| **Escala desktop** | Grid `.mg` ampliado de 236px→272px. `@media(min-width:900px)` escala SVGs de 58px→44px para que los 5 rings quepan en la card narrow de desktop. |
| **AIRA Narrative** | `genAiraMsg()`: mensaje contextual bajo el nombre del usuario. 9 pools de estado (peak/peak_great/peak_stress/peak_sleep/high/high_stress/high_sleep/mid/mid_stress/mid_sleep/low/low_stress/floor + demo) × ES/EN. 4 voces temáticas: shinobi=chakra, voxel=gaming, neonnoir=netrunner, bloom=wellness (fut usa la voz default de AIRA). Modifiers: stress >65, sleepPct <50, sleepPct ≥75. Rotación diaria (`day % pool.length`). Fade-in con `.live` class. Llamado desde `updateScores()` + `setLang()`. |
| **`.wsrow` oculto** | `display:none` en CSS — los rings reemplazan ESFUERZO/RESP/SUEÑO visualmente. Los elementos siguen en DOM (los scripts que los actualizan no se rompen). |

**Funciones clave añadidas:**
- `renderDailyRings()` — inyecta HTML en `#mcex`, resetea `_drAnimDone`
- `updateDailyRings()` — sincroniza valores + mueve arcos si ya animados
- `animateDailyRings()` — reset + rellena con stagger
- `getDailyStreak()` — racha diaria en localStorage
- `genAiraMsg()` — mensaje narrativo AIRA por estado y tema

## ✅ Qué está construido (sesión 2026-05-30, UI Polish — Apple level)

| Área | Qué |
|---|---|
| **Design tokens** | `:root` con escala 8px (`--sp-1..8`), radios (`--r-xs..full`), motion (`--dur-fast/base/slow`), easing (`--ease-spring/out/std/settle`), `color-scheme:dark`. Fuente única para todas las animaciones. |
| **`transition:all` → 0** | 17 ocurrencias en CSS + 2 en JS inline eliminadas. Todas reemplazadas por propiedades específicas → elimina repaints completos en hover/active. |
| **`cubic-bezier` raw → 0** | Todos los valores de easing tokenizados. Los únicos `cubic-bezier` restantes son las definiciones en `:root`. |
| **`contain:layout`** | `.card` y `.vc` — aisla repaint de cada tarjeta del DOM. `#hview`/`#sview`/`#pview` con `contain:layout paint`. |
| **Apple touch feel** | `scale(0.97/0.96)` spring-back solo en touch (`@media hover:none`). Bottom nav: indicador dot con `--ease-spring`. Pull-to-refresh: pop-in spring. Drawer widget manager: sube con `--ease-spring`. |
| **Font smoothing** | `-webkit-font-smoothing:antialiased` + `moz-osx-font-smoothing:grayscale` + `text-rendering:optimizeLegibility` en `body`. Texto nativo en iOS/Mac. |
| **Tipografía** | Floor mínimo 9-10px (eran 7-8px). `font-optical-sizing:auto` en `.rnum`/`.vval`/`.snum`. `.clbl` letter-spacing 3px→2px. |
| **Simetría de layout** | Header y main alineados a 20px horizontal. Mobile parity (12→14px). Gaps `.vg`/`.rcs` a 12px (8px grid). |
| **Landscape safe areas** | `env(safe-area-inset-left/right)` en header, main y bottom nav vía `@supports(padding:max(0px))`. |
| **ARIA tablist completo** | `<nav role="tablist">`, `role="tab" aria-selected aria-controls` en botones, `role="tabpanel" aria-labelledby` en paneles. `navigate()` actualiza `aria-selected` en cada cambio de tab. |
| **`:focus-visible`** | Anillo universal con `var(--ta)` — solo visible en keyboard nav. |
| **`prefers-reduced-motion`** | Kill-switch global `* { animation-duration:0.01ms }` — antes solo cubría jiggle mode. |
| **Fuentes** | `Oxanium` y `Electrolize` eliminadas (no se usaban, ~60KB menos). Font preconnect para Google Fonts. |
| **SW cache** | Bumped a `v14`. |
| **Dead CSS** | `#wm-btn`/`#wm-btn:hover` eliminadas (elemento no existe en HTML). |
| **Scrollbar** | 4px thin WebKit + Firefox `scrollbar-width:thin`. |

## ✅ Qué está construido (sesión 2026-05-29, Widget System v2)

| Área | Qué |
|---|---|
| **Shinobi easter eggs** | Shuriken CSS spinners en `.vc` cards, kunai blade, makimono scroll tag (巻), scratch effect en labels, chip de rango dinámico (Aprendiz→Genin→Chunin→Jonin→Kage). |
| **Reorder biométrico** | Home: HR › HRV › Estrés › Cal › SpO₂ › Temp. Col3: Sueño primero, HR Chart segundo. Stats: Recovery › Sueño › HR Zonas › Cuerpo › Fitness. |
| **Jiggle mode (edición widgets)** | Long-press 500ms → modo edición estilo iPhone. Badge `×` frosted-glass top-left para eliminar. Botón LISTO flotante. El `?` ya NO se dispara durante jiggle. |
| **Drag & drop reorder** | En jiggle mode, arrastra widgets (touch y mouse). Ghost semitransparente + slot punteado de destino. Orden persiste en `localStorage (fb_wm_order)`. |
| **Resize widgets** | Badge `⊞/⊡` bottom-right alterna entre 1 columna y 2 columnas (`grid-column: span 2`). Tamaños persisten en `localStorage (fb_wm_size)`. |
| **Tarjeta + AGREGAR** | Siempre visible al final del grid. Abre el drawer del manager para reactivar widgets ocultos. |
| **Grid proporcional** | `align-items:stretch` + `min-height:110px` + `display:flex/column` en `.vc`. Sin espacios muertos. |
| **Widgets enriquecidos** | HRV: barra zona + dot animado + sub-métricas. SpO2: barra 90–100% + dot. Temp: barra 35–38°C + dot. Steps: distancia, pisos, min. activos, racha. Sleep: barra score, hora inicio/fin, eficiencia, despertares. HR Chart: mínimo, promedio, pico, rango. |
| **Botón ? en todos los widgets** | SpO2 y Temp tenían el `?` faltante — agregado con contenido onboarding en ES/EN. |
| **Headers sin encime** | `.vtrd` y `.xarrow` (position:absolute) movidos al `.vc-head` flex. `.xarrow-inline` reemplaza al absoluto. Ya ningún elemento flota sobre el contenido. |

## ✅ Qué está construido (sesión 2026-05-24, History v2)

| Área | Qué |
|---|---|
| **History — Análisis AIRA** | Tarjeta de análisis automático al final de History. Interpreta **las 4 métricas graficadas** (recovery, FC reposo, sueño, pasos) en lenguaje claro + tendencia (↑/↓/→) + **recomendación global**. 100% local (sin llamada API). Strings `hv_ca_*` en ES/EN. |
| **History — gráficas rediseñadas** | Estética Apple Health: curvas suaves (Catmull-Rom `_hSmoothPath`), relleno con degradado, glow, último punto destacado, barras con tope redondeado (`_hRoundTop`), animaciones de entrada. Geometría compartida en `_HC`/`_hGeo()`. |
| **History — gráfica de Pasos** | Nueva (`_hRenderStepsBar`) con línea de meta 10k. `steps` ahora se cachea en IndexedDB (fetch añadido en `_hFetchRange` desde `activities/steps`). |
| **History — legibilidad** | Ejes con máx. 4 etiquetas sin solaparse (`_hTickIdx` + `_hFmtTick`), números más grandes y con contraste. Tooltips con clamping horizontal (`_hPlaceTT`) que ya no se cortan en los bordes; sueño muestra desglose por etapa. |
| **Cache-bust logo** | favicon `?v=10` + SW `CACHE_VERSION=fitbit-air-v10` (el icono AIRA "A" ya estaba desplegado; el "viejo" era caché de cliente / PWA instalada → requiere reinstalar). |

> ⚠️ **Doc fix:** la variable de color de texto es **`--txt`** (no `--tx`). Usar `var(--tx)` en SVG hace que `fill` caiga a **negro**. Hay usos legacy de `var(--tx)` en el código que conviene migrar a `--txt`.

## ✅ Qué está construido (sesión 2026-05-21, PRs #21–#30)

| Área | Qué |
|---|---|
| **Coach AIRA conversacional** | Chat en la tarjeta del coach → `app/api/coach`. Responde sobre tus datos. Gemini si hay key, si no fallback local. **Primera vez que `app.html` consume el backend.** |
| **AIRA Pro (suscripción, Fase 1)** | Menú comparativo Free/Pro en Perfil + paywall del coach (3/día free, ilimitado Pro) + allowlist devs. Sin pagos aún (botón = flag de prueba). |
| **Datos reales Fitbit/Google** | `loadHealthMetrics()` trae SpO₂, HRV (RMSSD), ritmo respiratorio. Scopes `respiratory_rate`+`cardio_fitness` añadidos. |
| **Stats** | Apartados **Fitness** y **Sueño** dedicados; badges de estado (HRV/SpO₂/Temp/Estrés); recovery con fuente única (anillo). |
| **History** | Flechas de tendencia por métrica (↑/↓/→). |
| **Profile** | Última sync + exportar datos (JSON). |
| **Emparejamiento un-toque** | OAuth PKCE con app compartida (sin cuenta de dev) + fallback manual. |
| **Mobile** | Safe-area para Dynamic Island (`--sat`) + touch optimizado (`touch-action`, long-press). |
| **Branding** | Coach = **AIRA** + logo SVG theme-aware. |

## 🔑 Activación pendiente (infra/decisión, NO código)

Todo lo de abajo está **codeado y dormido** — solo falta conectar la pieza externa:

1. **Coach IA real** → saca key gratis en [aistudio.google.com](https://aistudio.google.com) (sin tarjeta) → pégala como `GEMINI_API_KEY` en Vercel. (Sin key, el coach ya funciona con fallback local.)
2. **Emparejamiento un-toque** → registra UNA app Fitbit tipo **"Client"** + PKCE, redirect a la URL de Vercel, pega el Client ID en `const SHARED_CLIENT_ID` (`public/app.html`, hoy `''` → cae a flujo manual). Pide acceso **Intraday** para HR en vivo de todos.
3. **Cobros reales (Stripe)** → crea cuenta Stripe; ver "Fase 2" abajo.
4. **Pro gratis devs** → pega los 2 Fitbit user-ids en `const DEV_FITBIT_IDS` (`public/app.html`).

## 🔭 Próximos pasos sugeridos

- **Suscripción Fase 2:** Stripe Checkout → webhook → flag `pro` en Supabase; mover el conteo del coach a **server-side** en `/api/coach` (hoy es localStorage, evadible).
- **Valor Pro real:** construir el **primer tema premium** (drop mensual) y el **reporte semanal IA** (usa el push existente).
- **Datos reales — pendientes con device:** **temp de piel** (Fitbit la da RELATIVA Δ°C, no absoluta → requiere rediseñar la tarjeta) y **VO₂max** (viene como rango, sin tarjeta).
- **Build nativo (#8):** Xcode/Android Studio, ver `CAPACITOR.md`.
- **Importante:** Diego prueba la Fitbit real **a partir del 26 de mayo** — validar ahí los datos reales.

## 🛠️ Setup

```bash
git clone https://github.com/iFrodo7/fitbit-dashboard.git && cd fitbit-dashboard
source ~/.nvm/nvm.sh && nvm use   # Node 20+
npm install
npm run dev                       # http://localhost:3000
npm run typecheck                 # tsc --noEmit (correr antes de PR)
```

## 🧠 Contexto crítico

- **`public/app.html`** es el único frontend (~3500 líneas, SPA vanilla). Casi todo el trabajo ocurre acá.
- **6 temas** (`voxel`/`neonnoir`/`shinobi`/`fut`/`bloom`/`synth`): usa SIEMPRE CSS vars (`--ta`, `--ta2`, `--tpos`, `--tneg`, `--sub`, `--bg`, `--bg2`, `--bdr`, `--txt` ←texto, `--sat`) — nunca colores hard-coded. **OJO:** es `--txt`, no `--tx` (este último no existe → en SVG el `fill` se vuelve negro).
- **i18n ES/EN obligatorio**: si añades string en `T.es`, añádelo en `T.en`. Aplica con `setText`/`setHTML` en `applyText()`.
- **Coach key NUNCA en el cliente** — vive solo en `app/api/coach` (server). Es el patrón a seguir para cualquier integración con costo.
- **Recovery = una sola fuente**: el anillo (`window._lastRec` vía `calcScores`). Stats lo refleja. No reintroducir cálculos paralelos.
- **Pro:** `isPro()`, `coachQuotaLeft()/coachConsume()`, `renderProUI()`, `proAction()` en `app.html`.

## 🔁 Convenciones

- Ramas `feature/<slug>` o `fix/<slug>` desde `main`; **squash merge** a `main` (`gh pr merge N --squash --delete-branch`).
- Verificar en preview + `npm run typecheck` + consola sin errores antes de mergear.
- Commits: `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`.

## 📞 Contacto
Repo: https://github.com/iFrodo7/fitbit-dashboard · Owner: Diego Castillo (`@iFrodo7`) · Colaborador: `@Jorge-Contreras06`
