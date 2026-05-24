# 🤝 Handoff — Fitbit Air Dashboard

> **Para el próximo desarrollador y su Claude.** Lee esto **primero**, luego `CLAUDE.md` (referencia técnica). Última actualización: **2026-05-24**.

> **🚨 MIGRACIÓN INMINENTE — Fitbit Web API → Google Health API (sep 2026).** Toda la app depende del Fitbit Web API, que **se apaga en septiembre 2026**. **HECHO:** la capa de datos ya está blindada con un adaptador (`FitbitSource` / `HS` en `public/app.html`) — todas las llamadas pasan por `HS`, cero URLs hardcodeadas. **PENDIENTE:** escribir `GoogleHealthSource` (misma forma) + iniciar la verificación OAuth de Google (gratis pero lenta → **empezar YA**). Sobrevivir cuesta **~$0** (local-first exime del assessment pagado). **Runbook completo y checklist: `MIGRATION.md`.**

---

## 📍 Estado actual

- **Todo el código está en `main` y desplegado.** 0 PRs abiertos, una sola rama (`main`).
- **Producción (PWA):** **https://fitbit-dashboard-zeta.vercel.app** → redirige a `/app.html`.
  - Instalar en móvil: iPhone Safari → Compartir → *Añadir a pantalla de inicio*; Android Chrome → ⋮ → *Instalar app*.
- Cada merge a `main` auto-despliega a Vercel (producción).
- **Bug #12 RESUELTO** — ya se puede usar `let`/`const` top-level (declarados antes del bloque `// BOOT` final). Mantén invocaciones de arranque en BOOT.

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
- **4 temas** (`mc`/`halo`/`naruto`/`fut`): usa SIEMPRE CSS vars (`--ta`, `--ta2`, `--tpos`, `--tneg`, `--sub`, `--bg`, `--bg2`, `--bdr`, `--txt` ←texto, `--sat`) — nunca colores hard-coded. **OJO:** es `--txt`, no `--tx` (este último no existe → en SVG el `fill` se vuelve negro).
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
