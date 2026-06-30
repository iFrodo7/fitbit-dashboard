const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ── Genera los assets de marca que referencia public/landing.html ─────────────
// (og-image, twitter-card y los logos PNG). Fuente única: el mismo monograma
// "A" + anillo biométrico del icono de la app. Sin marca "Fitbit".
const socialDir = path.join(__dirname, '..', 'public', 'brand', 'social', 'png');
const logosDir  = path.join(__dirname, '..', 'public', 'brand', 'logos', 'png');
fs.mkdirSync(socialDir, { recursive: true });
fs.mkdirSync(logosDir, { recursive: true });

// Defs compartidos (mismo gradiente cian→verde y glow del icono de la app).
const defs = `
  <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#020810"/>
    <stop offset="100%" stop-color="#0a1828"/>
  </linearGradient>
  <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#00f5ff"/>
    <stop offset="100%" stop-color="#00ff88"/>
  </linearGradient>
  <linearGradient id="wordmark" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#00f5ff"/>
    <stop offset="100%" stop-color="#7b2fff"/>
  </linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

// Marca (anillo + monograma "A") centrada en una caja de 512×512, escalable.
function mark(cx, cy, scale) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="256" r="180" fill="none" stroke="rgba(0,245,255,0.1)" stroke-width="20"/>
    <circle cx="256" cy="256" r="180" fill="none" stroke="url(#ring)" stroke-width="20" stroke-linecap="round" stroke-dasharray="850 1131" transform="rotate(-90 256 256)" filter="url(#glow)" opacity="0.95"/>
    <g filter="url(#glow)" fill="none" stroke="url(#ring)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
      <path d="M188 346 L256 176 L324 346"/>
      <path d="M214 282 H298"/>
    </g>
  </g>`;
}

// ── OG / Twitter card (1200×630) ──────────────────────────────────────────────
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>${defs}
    <radialGradient id="halo" cx="28%" cy="50%" r="55%">
      <stop offset="0%" stop-color="rgba(0,245,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(0,245,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  ${mark(320, 315, 0.78)}
  <text x="560" y="300" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="150" font-weight="900" letter-spacing="6" fill="url(#wordmark)">AIRA</text>
  <text x="563" y="368" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="34" font-weight="600" letter-spacing="1" fill="rgba(255,255,255,0.92)">Tu salud, analizada por IA</text>
  <text x="563" y="416" font-family="'Courier New', monospace" font-size="22" font-weight="400" letter-spacing="2" fill="rgba(0,245,255,0.75)">RECOVERY · SUEÑO · FRECUENCIA CARDÍACA</text>
</svg>`;

// ── Logos PNG (las rutas que pide el <head> de landing.html) ──────────────────
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  ${mark(256, 256, 1)}
</svg>`;

async function generate() {
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(socialDir, 'og-image.png'));
  console.log('✓ brand/social/png/og-image.png (1200×630)');
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(socialDir, 'twitter-card.png'));
  console.log('✓ brand/social/png/twitter-card.png (1200×630)');
  await sharp(Buffer.from(logoSvg)).resize(32, 32).png().toFile(path.join(logosDir, 'aira-icon-32.png'));
  console.log('✓ brand/logos/png/aira-icon-32.png');
  await sharp(Buffer.from(logoSvg)).resize(192, 192).png().toFile(path.join(logosDir, 'aira-icon-192.png'));
  console.log('✓ brand/logos/png/aira-icon-192.png');
  console.log('\n✅ Listo! Assets de marca generados en public/brand/');
}

generate().catch(console.error);
