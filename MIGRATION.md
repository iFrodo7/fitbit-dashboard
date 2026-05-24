# 🚨 MIGRACIÓN INMINENTE — Fitbit Web API → Google Health API

> **Lee esto antes de tocar la capa de datos.** Toda la app depende del **Fitbit Web API**, que **Google apaga en SEPTIEMBRE 2026**. Si no migramos, AIRA deja de recibir datos y se muere sola. Última actualización: **2026-05-24**.

---

## TL;DR

- **Deadline real: septiembre 2026.** El Fitbit Web API se decomisiona y deja de sincronizar.
- **Reemplazo: Google Health API** (Google OAuth 2.0, proyecto en Google Cloud).
- **Ya está blindado:** todas las llamadas a Fitbit pasan por un adaptador único (`FitbitSource` / `HS`) en `public/app.html`. **Migrar = escribir un `GoogleHealthSource` con la misma forma** y cambiar una línea (`let HS = FitbitSource`).
- **Costo para sobrevivir: ~$0.** La arquitectura *local-first* (datos en el dispositivo, no en servidor propio) **exime del security assessment pagado** de Google.
- **No se puede probar a fondo hasta junio 2026** (cuando llega el Fitbit Air real para pruebas) + credenciales de Google Cloud.

---

## La amenaza y las fechas

| Cuándo | Qué pasa |
|---|---|
| **Ahora (may 2026)** | Ventana para empezar la integración nueva (la API tuvo *breaking changes* hasta fin de mayo). Arrancar el trámite de Google YA (es el cuello de botella). |
| **Junio 2026** | Llega el Fitbit real → probar datos reales + escribir `GoogleHealthSource`. |
| **Septiembre 2026** | **API viejo APAGADO.** Todo debe estar migrado antes. |

Además: **re-consentimiento obligatorio** — cada usuario tendrá que re-autorizar con Google (no hay migración silenciosa).

---

## Arquitectura de blindaje (YA HECHA — 2026-05-24)

En `public/app.html` existe un único objeto fuente. **Ningún otro lugar del código hardcodea URLs de proveedor.**

```js
const FitbitSource = {
  id: 'fitbit',
  oauth: { authorize, token, scope },   // OAuth del proveedor
  base: 'https://api.fitbit.com',
  ep: { profile, activities, heartIntraday, sleepToday, spo2, hrv, br,
        heartRange, sleepRange, stepsRange },  // builders de URL
};
let HS = FitbitSource;   // ← fuente activa
```

Todas las funciones de datos (`loadReal`, `pollFast`, `pollSlow`, `loadHealthMetrics`, `_hFetchRange`) y de OAuth (`startOAuthSimple`, `startOAuth`, `handleOAuth`, `refreshTok`) usan **solo** `HS.ep.*` y `HS.oauth.*`.

### Cómo migrar (cuando haya credenciales + Fitbit real)

1. Crear `const GoogleHealthSource = { id:'google', oauth:{...}, base:'https://health.googleapis.com/v4', ep:{...} }` con **la misma forma**.
2. Escribir un **traductor de respuestas**: el render hoy espera la **forma JSON de Fitbit** (`activities-heart-intraday.dataset`, `summary.stages`, etc.). Google devuelve `dataPoints` / `dailyRollup` → hay que mapear su respuesta a esa forma (o normalizar ambas).
3. Cambiar `let HS = FitbitSource` → `let HS = GoogleHealthSource`.
4. Probar en paralelo con el API viejo mientras siga vivo.

---

## Mapa de endpoints (viejo → nuevo)

| Fitbit Web API (hoy) | Google Health API (destino) |
|---|---|
| `https://www.fitbit.com/oauth2/authorize` | `https://accounts.google.com/o/oauth2/v2/auth` |
| `https://api.fitbit.com/oauth2/token` | `https://oauth2.googleapis.com/token` |
| `https://api.fitbit.com/1/...` | `https://health.googleapis.com/v4/users/me/dataTypes/{tipo}/dataPoints` (métodos `list` / `dailyRollup`) |
| Scopes Fitbit (`activity heartrate sleep profile ...`) | `https://www.googleapis.com/auth/googlehealth.activity_and_fitness`, `.health_metrics_and_measurements`, `.sleep`, `.profile` (`.readonly` disponible) |
| `profile.json` para el user id | `users.getIdentity` (mapea id viejo de Fitbit → id Google) |
| Token dura **8h** | Token dura **1h** → refrescar más seguido. Refresh token expira tras 6 meses sin uso. |
| App "Personal"/"Client" + PKCE | **Proyecto Google Cloud** + verificación OAuth |

> ⚠️ Algunos data types (HRV, SpO₂, temperatura, VO₂max) pueden **no estar disponibles** en el Google Health API hasta Q3 2026. Validar al migrar.

---

## Trámite de Google (GRATIS — empezar YA, tarda semanas)

1. Crear **proyecto en Google Cloud** y habilitar el **Google Health API**.
2. Configurar la **pantalla de consentimiento OAuth**:
   - Política de privacidad → **ya existe**: `public/privacy.html` (https://fitbit-dashboard-zeta.vercel.app/privacy.html).
   - Justificar cada scope solicitado. Posible video demo.
3. Solicitar la **verificación de scopes restringidos** (todos los de salud lo son). Es **gratis** pero lenta → es el cuello de botella, arrancar antes de junio.

---

## Costos

| Concepto | Costo |
|---|---|
| Proyecto Google Cloud + Google Health API (a esta escala) | **Gratis** |
| Verificación OAuth de scopes restringidos | **Gratis** |
| CASA security assessment | **$0 — EXENTO** por ser local-first (Google: *"si no almacenas ni transmites datos de scopes restringidos en servidores, no necesitas el security assessment"*) |

> 🔒 **Para MANTENER la exención ($0): no transmitir datos de salud por un servidor propio.** El coach (`/api/coach`) es el riesgo — manda datos del usuario al server para llegar a Gemini. Mantener los datos de salud **en el dispositivo** para no caer en el assessment pagado (~$500–1,000/año). Confirmar con Google durante la verificación.

Costos que sí llegan (no por la migración, sino por publicar/crecer): **Apple Developer $99/año** (App Store), Google Play $25 (una vez), Vercel Pro $20/mes (solo si comercial/alto tráfico), comisiones de Stripe/RevenueCat (solo al cobrar).

---

## Checklist de migración (junio 2026+)

- [ ] Proyecto Google Cloud + Google Health API habilitada
- [ ] Pantalla de consentimiento OAuth + verificación de scopes restringidos **iniciada** (cuanto antes)
- [ ] Escribir `GoogleHealthSource` (misma forma que `FitbitSource`)
- [ ] Traductor de respuestas Google → forma interna que espera el render
- [ ] Flujo de **re-consentimiento** para usuarios existentes (Google OAuth)
- [ ] Refresh de token adaptado a vida de 1h
- [ ] Probar con Fitbit real, en paralelo con el API viejo
- [ ] Cambiar `let HS = FitbitSource` → `GoogleHealthSource`
- [ ] Validar disponibilidad de cada métrica (HRV/SpO₂/temp pueden faltar hasta Q3 2026)
- [ ] Verificar que NO se transmiten datos de salud por servidor propio (mantener exención CASA)

---

## Estrategia a largo plazo (independencia)

Migrar a Google Health API te quita de Fitbit pero **te deja dependiente de Google**. El blindaje (capa de adaptador) permite, sin re-arquitectar, sumar después más fuentes como **otros adaptadores**:

- **Apple HealthKit** (iOS nativo vía Capacitor) — on-device, estable, abre Apple Watch.
- **Health Connect** (Android nativo vía Capacitor) — on-device, dirección estratégica de Google.
- **Aggregators** (Terra/Rook/etc.) — multi-wearable en una API, pero caros (~$399/mes) → solo cuando haya revenue.

Objetivo: que `HS` pueda ser cualquier fuente y la app no se entere → **nunca más rehén de un solo proveedor.**

---

## Referencias

- Google Health API — https://developers.google.com/health/about · https://developers.google.com/health/migration
- Verificación de scopes restringidos — https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- Anuncio Fitbit — https://community.fitbit.com/t5/Web-API-Development/Introducing-the-next-phase-of-the-Fitbit-Web-API/td-p/5821061
