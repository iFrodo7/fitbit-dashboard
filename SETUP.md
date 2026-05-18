# Fitbit Air Dashboard — Setup

## Requisitos
- Node.js 20+
- Cuenta en [Supabase](https://supabase.com)
- App registrada en [Fitbit Developer](https://dev.fitbit.com/apps/new)
- Cuenta en [Vercel](https://vercel.com)

---

## 1. Fitbit Developer App

En https://dev.fitbit.com/apps/new configura:

| Campo | Valor |
|---|---|
| OAuth 2.0 Application Type | **Server** |
| Callback URL (dev) | `http://localhost:3000/api/auth/callback` |
| Callback URL (prod) | `https://tu-app.vercel.app/api/auth/callback` |
| Default Access Type | Read-Only |

Guarda el **Client ID** y **Client Secret**.

---

## 2. Supabase

1. Crea un proyecto nuevo en Supabase
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/001_initial.sql`
3. En **Project Settings → API** copia:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Variables de entorno

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

FITBIT_CLIENT_ID=ABC123
FITBIT_CLIENT_SECRET=def456
FITBIT_REDIRECT_URI=http://localhost:3000/api/auth/callback

NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Desarrollo local

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## 5. Deploy en Vercel

```bash
npm install -g vercel
vercel

# Añadir variables de entorno en Vercel Dashboard:
# Settings → Environment Variables → (pegar todas las del .env.local)

# Importante: actualizar FITBIT_REDIRECT_URI y NEXT_PUBLIC_APP_URL
# con la URL de producción de Vercel
```

O conecta el repo a Vercel desde la UI y configura las env vars en el dashboard.

---

## Arquitectura

```
app/
├── page.tsx                  # Login (/ → redirect si hay sesión)
├── dashboard/
│   ├── layout.tsx            # Carga prefs de Supabase, monta AppProviders
│   └── page.tsx              # Dashboard con polling SWR
└── api/
    ├── auth/fitbit/          # Inicia OAuth → redirect a Fitbit
    ├── auth/callback/        # Recibe code, guarda tokens en Supabase
    ├── auth/logout/          # Elimina cookie de sesión
    ├── fitbit/{activity,sleep,heart,profile}/  # Proxy + caché 15 min
    └── user/preferences/     # GET/PATCH tema e idioma

lib/
├── fitbit/auth.ts            # OAuth flow + token refresh automático
├── fitbit/client.ts          # API client con caché en Supabase
├── supabase/{client,server}  # Clientes browser y server
├── themes/index.ts           # 4 temas con sus clases Tailwind
├── i18n/{es,en}              # Traducciones ES/EN
└── hooks/useFitbitData.ts    # SWR hooks con polling cada 5 min
```

## Flujo de autenticación

```
Usuario → /api/auth/fitbit → Fitbit OAuth → /api/auth/callback
→ Supabase (guarda tokens) → Cookie httpOnly → /dashboard
```

## Rate limits de Fitbit

La API de Fitbit permite **150 requests/hora** por usuario.
El polling está configurado a 5 minutos (12 requests/hora por métrica).
El caché de Supabase evita requests redundantes.
