# AIRA — Brand Guidelines

> **App name:** AIRA — Biometric Dashboard  
> **Short name:** AIRA  
> **Tagline:** Biometric Dashboard  
> **Description:** Tu panel biométrico personal: recovery, sueño, frecuencia cardíaca y pasos con análisis de tu coach IA.

---

## Regenerar assets

```bash
cd /path/to/fitbit-dashboard
node brand/generate-brand-assets.js
```

Requiere `sharp` (ya incluido en `node_modules`).

---

## Estructura de la carpeta

```
brand/
├── generate-brand-assets.js   ← script que genera todos los PNGs desde SVG
├── README.md                  ← este documento
│
├── logos/
│   ├── aira-icon.svg                        — Ícono cuadrado (fondo oscuro, ángulos redondeados)
│   ├── aira-logo-primary.svg                — Logo apilado: ícono + AIRA + tagline
│   ├── aira-logo-horizontal.svg             — Logo horizontal: ícono izq + texto der
│   ├── aira-wordmark.svg                    — Solo tipografía
│   ├── aira-logo-white.svg                  — Blanco sobre fondo transparente
│   ├── aira-logo-black.svg                  — Negro sobre fondo transparente
│   │
│   ├── themes/
│   │   ├── aira-futuristic.svg / -icon-futuristic.svg
│   │   ├── aira-neon-noir.svg   / -icon-neon-noir.svg
│   │   ├── aira-shinobi.svg     / -icon-shinobi.svg
│   │   ├── aira-minecraft.svg   / -icon-minecraft.svg
│   │   └── aira-bloom.svg       / -icon-bloom.svg
│   │
│   └── png/                    ← PNGs exportados (generados)
│       ├── aira-icon-512.png / 256 / 192 / 128 / 64 / 32
│       ├── aira-logo-primary.png
│       ├── aira-logo-primary-transparent.png
│       ├── aira-logo-horizontal.png
│       ├── aira-logo-horizontal-transparent.png
│       ├── aira-wordmark.png
│       ├── aira-wordmark-transparent.png
│       ├── aira-logo-white.png
│       └── aira-logo-black.png
│
├── social/
│   ├── og-image.svg / twitter-card.svg      ← fuentes SVG
│   └── png/
│       ├── og-image.png       (1200×630 — meta og:image)
│       └── twitter-card.png   (1200×600 — Twitter/X summary_large_image)
│
└── colors/
    ├── aira-color-palette.svg
    └── png/
        └── aira-color-palette.png
```

---

## Paleta de colores

### Color primario de marca (tema Futuristic — default)

| Token          | Hex       | Uso                          |
|----------------|-----------|------------------------------|
| Accent 1       | `#00f5ff` | Texto de marca, icono, bordes activos |
| Accent 2       | `#7b2fff` | Gradientes, secundario       |
| Background     | `#020810` | Fondo principal              |
| Background 2   | `#0a1828` | Fondo cards / gradiente fin  |

### Los 5 temas

| ID           | Nombre       | Accent 1  | Accent 2  | Background |
|--------------|--------------|-----------|-----------|------------|
| `futuristic` | Futuristic   | `#00f5ff` | `#7b2fff` | `#020810`  |
| `neon-noir`  | Neon Noir    | `#ff2d78` | `#bd00ff` | `#0a0010`  |
| `shinobi`    | Shinobi      | `#7ab0d0` | `#c0d0e0` | `#0c1520`  |
| `minecraft`  | Minecraft    | `#6aff3a` | `#ffaa00` | `#0a1220`  |
| `bloom`      | Bloom        | `#e85c8a` | `#c47fb5` | `#1a0a10`  |

---

## Tipografía

| Uso               | Fuente                                     | Peso  |
|-------------------|--------------------------------------------|-------|
| Wordmark "AIRA"   | Helvetica Neue / Helvetica / Arial         | 700   |
| Tagline           | Helvetica Neue / Helvetica / Arial         | 300   |
| UI principal      | IBM Plex Mono (monospace)                  | 400   |
| Números / datos   | Rajdhani                                   | 400–600 |
| Tema Minecraft    | VT323 (pixel font)                         | 400   |
| Tema Shinobi      | Noto Serif JP + Permanent Marker           | varies|
| Tema Bloom        | Nunito                                     | 400   |

---

## El símbolo

El ícono de AIRA combina dos elementos:

1. **Anillo biométrico** — un arco incompleto (~75 % de círculo) que representa monitoreo continuo de salud. Siempre usa gradiente de Accent 1 → Accent 2.
2. **Monograma "A"** — dos trazos angulares con barra transversal, geométrico y limpio. Mismo gradiente que el anillo.

El fondo del ícono de app es siempre oscuro (`#020810` → `#0a1828`), con bordes redondeados (`rx="96"` en 512 px).

---

## Espaciado de protección (clear space)

Mantener alrededor del logo un espacio libre equivalente a **la altura de la letra "A"** del wordmark. No colocar texto, elementos gráficos ni imágenes dentro de esa zona.

---

## Usos correctos

- Usar el logo sobre fondos oscuros (#020810 o colores similares) con la versión de color.
- Usar `aira-logo-white.png` sobre fotografías oscuras o fondos de color.
- Usar `aira-logo-black.png` sobre fondos blancos o muy claros.
- En headers de sitio web: preferir `aira-logo-horizontal.png`.
- En app stores / icono de app: usar `aira-icon-512.png`.
- Para meta tags `og:image`: usar `social/png/og-image.png` (1200×630).

## Usos incorretos

- No modificar las proporciones del logo.
- No cambiar los colores del logo por colores no definidos en la paleta.
- No aplicar sombras, contornos o efectos adicionales al logo.
- No colocar el logo de color sobre fondos claros (usar la versión negra).
- No usar el logo sobre fondos de color saturado que compitan con el Accent.
- No rotar ni distorsionar el logo.

---

## Archivos para la página web

| Caso de uso                  | Archivo recomendado                                |
|------------------------------|----------------------------------------------------|
| Favicon 32×32                | `logos/png/aira-icon-32.png`                       |
| Favicon 192×192 (Android)    | `logos/png/aira-icon-192.png`                      |
| Apple Touch Icon             | `logos/png/aira-icon-192.png`                      |
| og:image / Twitter card      | `social/png/og-image.png`                          |
| Header del sitio             | `logos/png/aira-logo-horizontal-transparent.png`   |
| Footer / marca de agua       | `logos/png/aira-logo-white.png`                    |
| Sobre fondo blanco           | `logos/png/aira-logo-black.png`                    |
| Hero section                 | `logos/png/aira-logo-primary.png`                  |

---

*Todos los archivos SVG son la fuente de verdad. Los PNGs son exportaciones; si modificas los SVGs, regenera con `node brand/generate-brand-assets.js`.*
