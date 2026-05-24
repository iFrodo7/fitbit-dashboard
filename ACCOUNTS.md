# 🔐 Cuentas y servicios de AIRA

> **Inventario** de las cuentas y servicios que necesita la app. Última actualización: **2026-05-24**.

> ⚠️ **REGLA DE SEGURIDAD — lee esto:** Este archivo NO guarda secretos. Un repo de Git, aunque sea privado, **no es una caja fuerte**: el historial queda para siempre y si el repo se hiciera público se filtraría todo. Aquí solo van **emails, IDs y nombres de servicio** (no sensibles). Los **secretos** (contraseñas, *client secrets*, API keys, tokens) van en un **gestor de contraseñas** (1Password / Bitwarden) o en las **variables de entorno de Vercel** — nunca aquí.

---

## Personas / acceso

| Persona | Rol | GitHub |
|---|---|---|
| Diego Castillo | Owner | `@iFrodo7` |
| Jorge Contreras | Colaborador | `@Jorge-Contreras06` |

---

## Servicios

### GitHub
- **Repo:** `iFrodo7/fitbit-dashboard` (privado — solo Diego + Jorge)
- **Owner:** `@iFrodo7` · **Colaborador:** `@Jorge-Contreras06`

### Google Cloud — Google Health API (migración Fitbit, ver `MIGRATION.md`)
- **Cuenta dueña:** `airabiometric@gmail.com`
- **Proyecto:** AIRA · **ID:** `aira-497323` · **Nº:** `147327076393`
- **API habilitada:** `health.googleapis.com`
- **Cliente OAuth "AIRA Web" (tipo: Aplicación web):**
  - **Client ID:** `147327076393-n6i71gic3n57fbcv8eqro9ph4h6ugggr.apps.googleusercontent.com`
  - **Client secret:** 🔒 *en gestor de contraseñas, NO aquí* (probablemente no se use: flujo PKCE)
  - **Orígenes JS:** `https://fitbit-dashboard-zeta.vercel.app`
  - **Redirecciones:** `https://fitbit-dashboard-zeta.vercel.app/app.html` y `.../`
- **Usuarios de prueba:** `airabiometric@gmail.com`, `diegocastil39@gmail.com`
  - (Diego conecta su **Fitbit Air** con `diegocastil39@gmail.com`)
- **Estado:** modo "Prueba". Verificación de scopes restringidos = pendiente (Fase 5).

### Vercel (hosting)
- **Cuenta:** `ifrodo7` (`diegocastillov@hotmail.com`)
- **Proyecto:** `fitbit-dashboard` · **Team:** `i-frodo7-s-projects`
- **Dominio producción:** `https://fitbit-dashboard-zeta.vercel.app`
- **Secretos (variables de entorno, en Vercel — NO aquí):**
  - `GEMINI_API_KEY` (coach IA)
  - Claves VAPID de Web Push (notificaciones)

### Google AI Studio — Gemini (coach IA)
- **Cuenta:** *TBD (definir cuál)*
- **API key:** 🔒 vive como `GEMINI_API_KEY` en Vercel, NO aquí
- Obtener gratis en aistudio.google.com (sin tarjeta)

### Fitbit / Google (datos de los usuarios finales)
- **Hoy:** Fitbit Web API (OAuth por usuario) — **se apaga sep 2026**
- **Destino:** Google Health API (ver `MIGRATION.md`)
- Tokens de cada usuario → en **su propio dispositivo** (local-first), nunca en servidor

---

## Pendientes (cuentas a crear cuando toque)

| Servicio | Para qué | Costo |
|---|---|---|
| Apple Developer Program | Publicar en App Store | $99/año |
| Google Play Console | Publicar en Android | $25 una vez |
| Stripe o RevenueCat | Cobros de suscripción | % por transacción |

---

## ¿Dónde van los secretos? (recordatorio)

- **Contraseñas de cuentas** (Google, Vercel, Apple…) → gestor de contraseñas compartido (1Password / Bitwarden).
- **Client secret de OAuth, API keys, tokens** → variables de entorno de Vercel o gestor de contraseñas.
- **Nunca** en este archivo, ni en ningún archivo del repo, ni en `public/` (el cliente es visible para todos).
