# Fitbit Air Dashboard

Panel biométrico personal con 4 temas visuales y datos reales de Fitbit.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL + RLS)
- **Auth**: OAuth 2.0 de Fitbit — flujo client-side para app tipo "Personal"
- **Hosting objetivo**: Vercel

## Cómo arrancar

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd /Users/dcv/fitbit-dashboard
npm run dev
# → http://localhost:3000
```

El servidor redirige `/` → `/app.html` (el prototipo funcional).

## Arquitectura

```
public/app.html          ← Prototipo completo funcionando (OAuth client-side)
app/                     ← Futuro dashboard Next.js con Supabase
  api/auth/              ← OAuth server-side (alternativa con backend)
  api/fitbit/            ← Proxy a Fitbit API con caché
  dashboard/             ← Dashboard React con SWR polling
lib/
  fitbit/auth.ts         ← Token exchange y refresh automático
  fitbit/client.ts       ← API client con caché en Supabase
  themes/index.ts        ← 4 temas: minecraft | halo | naruto | futuristic
  i18n/{es,en}.ts        ← Traducciones ES/EN
supabase/migrations/     ← Schema SQL con RLS
```

## Flujo OAuth actual (public/app.html)

El prototipo usa **OAuth Authorization Code sin client secret** (Fitbit "Personal" apps).
El usuario ingresa su propio Client ID → Fitbit redirige al mismo HTML → intercambio de token en browser.
Tokens guardados en `localStorage`. Sin backend requerido.

## Temas disponibles

| ID | Nombre | Fuente | Acento |
|---|---|---|---|
| `mc` | Minecraft | VT323 | Verde #6aff3a |
| `halo` | Halo VISR | Oxanium | Azul #4ab8ff |
| `naruto` | Naruto | Permanent Marker | Naranja #ff4500 |
| `fut` | Futuristic | Rajdhani | Cyan #00f5ff |

## Variables de entorno

Ver `.env.example`. Las credenciales reales van en `.env.local` (no va a git).

## Pendiente / próximos pasos

- [ ] Subir a GitHub y conectar con Vercel para deploy automático
- [ ] Configurar Supabase con el schema de `supabase/migrations/001_initial.sql`
- [ ] Migrar el dashboard de `/app.html` a los componentes React de `app/dashboard/`
- [ ] Añadir página de historial (`app/dashboard/history/`)
