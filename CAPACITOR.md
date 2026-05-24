# 📱 Capacitor — Build nativo iOS / Android

> Empaqueta la PWA (`public/app.html`) en una app nativa para App Store / Play Store.
> Este documento es el **siguiente paso** del issue #8. La parte JS ya está scaffoldeada;
> falta lo que requiere Xcode / Android Studio (que no se puede hacer sin esas SDKs).

---

## Estado actual (lo que ya está hecho)

- ✅ Dependencias instaladas: `@capacitor/core`, `cli`, `ios`, `android`, `app`, `browser`, `haptics`, `splash-screen`
- ✅ `capacitor.config.ts` — appId `com.ifrodo.aira`, `webDir: 'public'`
- ✅ `public/index.html` — entry que redirige a `app.html` (Capacitor carga `index.html` por defecto)
- ✅ Scripts npm: `cap:sync`, `cap:ios`, `cap:android`, `cap:add:ios`, `cap:add:android`
- ✅ Detección de entorno nativo + flujo OAuth por deeplink en `app.html`
  (`isNativeApp()`, `getRedirectUri()`, `initCapacitor()`)
- ✅ `/ios` y `/android` en `.gitignore`

## Lo que falta (requiere Mac con Xcode y/o Android Studio)

```bash
source ~/.nvm/nvm.sh

# 1. Añadir las plataformas nativas (descarga templates + crea /ios y /android)
npm run cap:add:ios       # requiere Xcode + CocoaPods
npm run cap:add:android   # requiere Android Studio + JDK 17

# 2. Sincronizar el web (public/) dentro de los proyectos nativos
npm run cap:sync

# 3. Abrir en el IDE nativo para build / run / firmar
npm run cap:ios           # abre Xcode
npm run cap:android       # abre Android Studio
```

Cada vez que cambies algo en `public/`, corre `npm run cap:sync` antes de rebuildear.

---

## 🔑 CRÍTICO — OAuth en nativo (deeplink)

El flujo OAuth web usa `redirect_uri = location.href` (la URL de la página). En un
build nativo la URL es `capacitor://localhost/...` o `https://localhost/...`, que
**Fitbit NO acepta** como redirect URI. Por eso `app.html` ya cambia a un **custom
URL scheme** cuando detecta entorno nativo:

- `NATIVE_REDIR = 'aira://callback'`
- `startOAuth()` abre la URL de autorización en el navegador del sistema (`Browser.open`)
- `initCapacitor()` registra `App.addListener('appUrlOpen', …)` que captura
  `aira://callback?code=…`, cierra el browser y llama `handleOAuth(code)`

### Falta registrar el scheme en los proyectos nativos:

**iOS** — en `ios/App/App/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>aira</string></array>
  </dict>
</array>
```

**Android** — en `android/app/src/main/AndroidManifest.xml`, dentro de la `<activity>`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="aira" android:host="callback" />
</intent-filter>
```

**En el portal de Fitbit** (dev.fitbit.com → tu app):
- Añade `aira://callback` como **Redirect URL** (además de la URL web existente).
- La app sigue siendo tipo "Personal" → sin secret.

> ⚠️ Sin estos 3 registros, el login OAuth fallará en el build nativo. El código JS
> ya está listo; esto es config de plataforma.

---

## 🎨 Recomendado tras el primer build

- **Iconos / splash:** usa [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):
  `npx @capacitor/assets generate` con un `assets/icon.png` (1024×1024) y `assets/splash.png`.
- **Haptics nativos:** en iOS `navigator.vibrate` no funciona. Considera enrutar los
  taps por `window.Capacitor.Plugins.Haptics` cuando `isNativeApp()` (mejora real de feel).
  Hay muchas llamadas `navigator.vibrate` en `app.html`; envuélvelas en un helper.
- **Status bar / safe areas:** ya hay `viewport-fit=cover` y `env(safe-area-inset-*)`.
  Verifica en notch real; ajusta `@capacitor/status-bar` si hace falta.
- **Service worker:** en webview nativo el SW puede comportarse distinto. El cache
  estático sigue útil, pero las notificaciones server-push necesitan FCM/APNs nativo
  (distinto del Web Push del navegador — ver issue #4).

---

## Distribución

- **iOS:** build en Xcode → Archive → subir a App Store Connect → TestFlight (test interno).
- **Android:** Build → Generate Signed Bundle (.aab) → Play Console → Internal testing.
- Bump de versión: en `capacitor.config.ts` no; se hace en cada proyecto nativo
  (Xcode `CFBundleShortVersionString` / Android `versionName` + `versionCode`).
