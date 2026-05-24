# 🍏 AIRA — Guía de publicación en App Store (iOS)

> Runbook completo para llevar AIRA a la App Store. La app web/PWA y el shell de
> Capacitor ya están listos; aquí está **todo lo que falta**, en orden, con qué
> puede hacer Claude y qué requiere **tu intervención** (cuenta Apple, Xcode, revisión).
> Última actualización: **2026-05-24**.

---

## 0. Resumen de estado

| Pieza | Estado |
|---|---|
| App web optimizada (PWA) | ✅ Lista |
| Rebrand a **AIRA** (sin marca "Fitbit" en el nombre) | ✅ Hecho |
| Capacitor configurado (`appId: com.ifrodo.aira`, `appName: AIRA`) | ✅ Hecho |
| Código OAuth nativo por deeplink (`aira://callback`) | ✅ Hecho |
| Política de privacidad pública | ✅ `/privacy.html` (en Vercel) |
| Proyecto `ios/` generado | ❌ Requiere Xcode + CocoaPods |
| Cuenta Apple Developer | ❌ **Tú** ($99/año) |
| Ficha App Store Connect + capturas + revisión | ❌ **Tú** (te guío) |

---

## 1. Requisitos previos (instalar UNA vez)

> ⚠️ Sin esto no se puede generar ni compilar el proyecto iOS.

1. **Xcode** (≈7 GB) — Mac App Store → "Xcode" → Instalar. Luego ábrelo una vez para aceptar la licencia.
   ```bash
   sudo xcodebuild -license accept
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
2. **CocoaPods** (gestor de dependencias nativas):
   ```bash
   brew install cocoapods      # recomendado
   # o:  sudo gem install cocoapods
   ```
3. **Apple Developer Program** — [developer.apple.com/programs](https://developer.apple.com/programs/) → Enroll ($99 USD/año). La aprobación tarda **24–48 h**. Necesario para firmar y subir.

Verifica:
```bash
xcodebuild -version    # debe imprimir Xcode 15+
pod --version          # 1.1x+
```

---

## 2. Generar el proyecto iOS

```bash
cd /Users/dcv/fitbit-dashboard
source ~/.nvm/nvm.sh && nvm use
npm install
npm run cap:add:ios     # crea ios/ + corre pod install
npm run cap:sync        # copia public/ dentro del proyecto nativo
```
> Cada vez que cambies algo en `public/`, corre `npm run cap:sync` antes de recompilar.

---

## 3. Configurar el proyecto nativo (en Xcode)

Abre con `npm run cap:ios`. Luego:

### 3.1 URL scheme para OAuth (OBLIGATORIO)
`ios/App/App/Info.plist` → añade dentro del `<dict>` raíz:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>aira</string></array>
  </dict>
</array>
```

### 3.2 Textos de permiso de privacidad (evitan rechazo)
En el mismo `Info.plist`, añade los que apliquen (cadena en español):
```xml
<key>NSUserTrackingUsageDescription</key>
<string>AIRA no rastrea tu actividad entre apps.</string>
```
> AIRA no usa cámara, micrófono, contactos ni ubicación → no añadas esos permisos
> (pedir permisos que no usas es causa de rechazo).

### 3.3 Fitbit — registrar el redirect nativo
En [dev.fitbit.com](https://dev.fitbit.com) → tu app → **Redirect URL**: añade
`aira://callback` (además de la URL web de Vercel). La app sigue siendo tipo
**Personal** (sin secret).

### 3.4 Firma (Signing & Capabilities)
- Selecciona tu **Team** (tu Apple Developer).
- Bundle Identifier: `com.ifrodo.aira` (debe coincidir con `capacitor.config.ts`).
- Deja "Automatically manage signing" activado para el primer release.
- Capability **Push Notifications** solo si activarás push server-side (hoy opcional).

### 3.5 Iconos
Capacitor toma los iconos del proyecto. Opción recomendada — generar el set iOS:
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --ios   # usa public/icons/icon.svg como fuente
```
> El icono **no debe** incluir la palabra ni el logo de "Fitbit".

---

## 4. App Store Connect (ficha de la app)

En [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps → +**:

| Campo | Valor sugerido |
|---|---|
| **Name** | `AIRA` (si está tomado: `AIRA — Biometrics`) |
| **Subtitle** | `Recovery, sueño y coach IA` |
| **Bundle ID** | `com.ifrodo.aira` |
| **Primary category** | Health & Fitness |
| **Privacy Policy URL** | `https://<tu-dominio-vercel>/privacy.html` |
| **Support URL** | repo o landing |
| **Age rating** | completar cuestionario (sin contenido sensible) |

### 4.1 Privacy Nutrition Labels (App Privacy)
Declara con honestidad:
- **Health & Fitness data** → *Used for App Functionality*, **not linked** to identity, **not used for tracking**.
- **Identifiers / Contact / Location** → *No recopilados*.
- "Data is not used to track you."

### 4.2 Capturas de pantalla (obligatorias)
Necesitas al menos el set de **6.7"** (iPhone 15/16 Pro Max, 1290×2796) y **6.5"**.
Genera desde el simulador de Xcode o tu iPhone:
- Home (anillo de recovery), Stats, **Historial (gráficas nuevas)**, Coach AIRA, Perfil.
- Tip: usa modo DEMO (datos sintéticos) para capturas limpias y consistentes.

---

## 5. Compilar, archivar y subir

En Xcode:
1. Selecciona destino **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. Cuando termine: **Distribute App → App Store Connect → Upload**.
4. En App Store Connect, asigna el build a la versión, completa metadatos y
   **Submit for Review**.

CLI alternativa (avanzado): `xcodebuild -workspace ios/App/App.xcworkspace -scheme App archive`.

---

## 6. ⚠️ Riesgos de rechazo y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| **4.2 Funcionalidad mínima** ("solo es una web") | Resaltar lo nativo: deeplink OAuth, notificaciones, offline (PWA/SW), haptics, splash. En las notas de revisión, explica el valor: análisis IA, recovery score, hipnograma. |
| **Marca "Fitbit"** | Nombre = **AIRA** (✅). En textos solo uso descriptivo ("se conecta con tu Fitbit"). Icono sin logo Fitbit. Disclaimer "no afiliado" en privacy. |
| **Datos de salud sin política** | `/privacy.html` publicado + nutrition labels correctos (✅). |
| **Login requerido sin demo** | La app abre en **modo DEMO** sin login → el revisor puede evaluarla sin cuenta Fitbit. Aun así, deja credenciales/notas en "App Review Information". |
| **Permisos no usados** | No declarar cámara/ubicación/etc. (✅). |
| **Términos de Fitbit** | Confirma que tu app Fitbit permite distribución; para "Personal" hay límite de usuarios. Si crece, solicita acceso ampliado en dev.fitbit.com. |

---

## 7. Pendientes que requieren tu acción (checklist)

- [ ] Instalar Xcode + CocoaPods (§1)
- [ ] Enrolarte en Apple Developer Program (§1)
- [ ] Reemplazar el email de contacto en `public/privacy.html` (hoy `privacy@aira.app` es placeholder)
- [ ] `npm run cap:add:ios` (§2)
- [ ] Info.plist: URL scheme `aira` + permisos (§3)
- [ ] Registrar `aira://callback` en dev.fitbit.com (§3.3)
- [ ] Generar iconos iOS (§3.5)
- [ ] Crear ficha en App Store Connect + privacy URL (§4)
- [ ] Capturas 6.7" y 6.5" (§4.2)
- [ ] Archive → Upload → Submit (§5)

> Cuando tengas Xcode + cuenta listos, dime y te acompaño en cada paso de §2–§5.
