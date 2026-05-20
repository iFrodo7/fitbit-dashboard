# 🔔 Server Push — setup (#4 fase 2)

> ✅ **DESPLEGADO Y ACTIVO (2026-05-20).** Server push funcionando en producción,
> verificado con **app cerrada** en iPhone (iOS 18.7, vía APNs) y en Chromium (FCM).
> - Producción: **https://fitbit-dashboard-zeta.vercel.app**
> - VAPID + `PUSH_ADMIN_SECRET` + `CRON_SECRET` + Supabase: configurados en Vercel (Production).
> - Migraciones `001` + `002` aplicadas a Supabase (tabla `push_subscriptions` con RLS).
> - Cron diario registrado en Vercel: `/api/push/cron-daily` → `0 8 * * *`.
>
> Lo de abajo es la guía original de setup (útil para reproducir en otro entorno o rotar llaves).

---

## Qué hay implementado

- `lib/push.ts` — config VAPID + helper `sendPush()` (limpia subs revocadas 404/410)
- `app/api/push/vapid-public-key` — GET, devuelve la public key (503 si no hay VAPID)
- `app/api/push/subscribe` — POST guarda subscription, DELETE da de baja
- `app/api/push/send` — POST broadcast (protegido por `x-push-secret`)
- `supabase/migrations/002_push_subscriptions.sql` — tabla `push_subscriptions`
- Cliente (`public/app.html`): `subscribeWebPush()` / `unsubscribeWebPush()` enganchados
  al toggle de la campana. Degradan en silencio si el backend no tiene VAPID.
- `public/sw.js` ya tiene el listener `push` (de la fase 1)

## Setup (una vez)

```bash
# 1. Generar llaves VAPID
npx web-push generate-vapid-keys
```

Pon el resultado en `.env.local` y en las env de Vercel:
```
VAPID_PUBLIC_KEY=BG....
VAPID_PRIVATE_KEY=....
VAPID_SUBJECT=mailto:tu@email.com
PUSH_ADMIN_SECRET=<openssl rand -hex 24>
```

```bash
# 2. Aplicar la migración a Supabase
npm run db:push     # o aplica supabase/migrations/002_push_subscriptions.sql a mano
```

```bash
# 3. Deploy a Vercel (las env deben estar configuradas en el proyecto)
```

Tras esto, al activar la campana en la app, el cliente:
1. hace GET `/api/push/vapid-public-key` (ahora 200)
2. `pushManager.subscribe(...)` con esa key
3. POST la subscription a `/api/push/subscribe` → se guarda en Supabase

## Enviar una notificación

Manual:
```bash
curl -X POST https://tu-app.vercel.app/api/push/send \
  -H "x-push-secret: $PUSH_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buenos días","body":"Tu Recovery de hoy está listo","url":"/app.html"}'
```

### Vercel Cron (recordatorio diario) — YA implementado
- `vercel.json` ya define el cron a las 08:00: `{ "crons": [{ "path": "/api/push/cron-daily", "schedule": "0 8 * * *" }] }`
- `app/api/push/cron-daily/route.ts` ya existe: valida `Authorization: Bearer $CRON_SECRET`
  y hace broadcast de un recordatorio de sync.
- Solo falta poner **`CRON_SECRET`** en las env de Vercel (Vercel lo inyecta en el header
  automáticamente cuando dispara el cron). Cambia el texto del recordatorio en ese archivo
  si quieres. Para más triggers (alerta RHR server-side, etc.) duplica el patrón.

## Notas
- La app es **personal** → el broadcast a todas las subs es aceptable. Si algún día hay
  multi-usuario, filtra por `user_id` (la columna ya existe; se llena si hay cookie `fbd_session`).
- iOS: el web push requiere iOS 16.4+ y la PWA **instalada** (añadida a pantalla de inicio).
  En la app nativa Capacitor (#8) el push va por APNs, no por Web Push — es otro camino.
