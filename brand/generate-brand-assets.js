/**
 * AIRA Brand Asset Generator
 * Run from the project root:  node brand/generate-brand-assets.js
 *
 * Output directories (all created automatically):
 *   brand/logos/png/           - App icon (6 sizes) + logo variants
 *   brand/logos/themes/png/    - Per-theme logos + icons
 *   brand/social/png/          - OG image + Twitter card
 *   brand/colors/png/          - Color palette reference sheet
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const ROOT = __dirname;

// ── Ensure output directories exist ─────────────────────────────────────────
['logos/png', 'logos/themes', 'logos/themes/png', 'social/png', 'colors', 'colors/png']
  .forEach(d => fs.mkdirSync(path.join(ROOT, d), { recursive: true }));

// ── Theme definitions ────────────────────────────────────────────────────────
const THEMES = [
  { id: 'futuristic', name: 'Futuristic', c1: '#00f5ff', c2: '#7b2fff', bg1: '#020810', bg2: '#0a1828' },
  { id: 'neon-noir',  name: 'Neon Noir',  c1: '#ff2d78', c2: '#bd00ff', bg1: '#0a0010', bg2: '#120020' },
  { id: 'shinobi',    name: 'Shinobi',    c1: '#7ab0d0', c2: '#c0d0e0', bg1: '#0c1520', bg2: '#1a2030' },
  { id: 'minecraft',  name: 'Minecraft',  c1: '#6aff3a', c2: '#ffaa00', bg1: '#0a1220', bg2: '#182030' },
  { id: 'bloom',      name: 'Bloom',      c1: '#e85c8a', c2: '#c47fb5', bg1: '#1a0a10', bg2: '#280f1a' },
];
const DEF  = THEMES[0]; // Default (Futuristic) used for primary brand color
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── SVG building blocks ──────────────────────────────────────────────────────

const bgGrad = (id, c1, c2) =>
  `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"   stop-color="${c1}"/>
    <stop offset="100%" stop-color="${c2}"/>
  </linearGradient>`;

const ringGrad = (id, c1, c2) =>
  `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"   stop-color="${c1}"/>
    <stop offset="100%" stop-color="${c2}"/>
  </linearGradient>`;

const glowFilter = (id, std) =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="${std}" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

// The "A" monogram + biometric ring drawn on a 512×512 canvas.
// Wrap with: <g transform="translate(cx,cy) scale(s) translate(-256,-256)">
const iconBody = (c1, glowId = 'glow', gradId = 'ring') => `
    <circle cx="256" cy="256" r="180" fill="none" stroke="${c1}1a" stroke-width="20"/>
    <circle cx="256" cy="256" r="180" fill="none" stroke="url(#${gradId})" stroke-width="20"
            stroke-linecap="round" stroke-dasharray="850 1131"
            transform="rotate(-90 256 256)" filter="url(#${glowId})" opacity="0.95"/>
    <g filter="url(#${glowId})" fill="none" stroke="url(#${gradId})" stroke-width="34"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M188 346 L256 176 L324 346"/>
      <path d="M214 282 H298"/>
    </g>`;

const iconGroup = (cx, cy, scale, c1, glowId = 'glow', gradId = 'ring') =>
  `<g transform="translate(${cx},${cy}) scale(${scale}) translate(-256,-256)">${iconBody(c1, glowId, gradId)}\n  </g>`;

// ── SVG generators ───────────────────────────────────────────────────────────

// 1. App icon — 512×512, dark rounded-rect background
const iconSVG = ({ c1, c2, bg1, bg2 }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    ${bgGrad('bg', bg1, bg2)}
    ${ringGrad('ring', c1, c2)}
    ${glowFilter('glow', 8)}
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  ${iconGroup(256, 256, 1, c1)}
</svg>`;

// 2. Primary logo — 600×360, icon stacked above wordmark
const primaryLogoSVG = ({ c1, c2, bg1, bg2 }, transparent = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360">
  <defs>
    ${transparent ? '' : bgGrad('bg', bg1, bg2)}
    ${ringGrad('ring', c1, c2)}
    ${glowFilter('glow', 5)}
  </defs>
  ${transparent ? '' : '<rect width="600" height="360" fill="url(#bg)"/>'}
  ${iconGroup(300, 148, 0.3125, c1)}
  <text x="300" y="270" text-anchor="middle"
        font-family="${FONT}" font-weight="700" font-size="56" letter-spacing="14" fill="${c1}">AIRA</text>
  <text x="300" y="302" text-anchor="middle"
        font-family="${FONT}" font-weight="300" font-size="13" letter-spacing="5" fill="${c1}99">BIOMETRIC DASHBOARD</text>
</svg>`;

// 3. Horizontal logo — 720×160, icon left + text right
const horizontalLogoSVG = ({ c1, c2, bg1, bg2 }, transparent = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 160" width="720" height="160">
  <defs>
    ${transparent ? '' : bgGrad('bg', bg1, bg2)}
    ${ringGrad('ring', c1, c2)}
    ${glowFilter('glow', 3)}
  </defs>
  ${transparent ? '' : '<rect width="720" height="160" fill="url(#bg)"/>'}
  ${iconGroup(80, 80, 0.234375, c1)}
  <line x1="150" y1="38" x2="150" y2="122" stroke="${c1}33" stroke-width="1"/>
  <text x="174" y="78"
        font-family="${FONT}" font-weight="700" font-size="40" letter-spacing="10" fill="${c1}">AIRA</text>
  <text x="176" y="108"
        font-family="${FONT}" font-weight="300" font-size="12" letter-spacing="4" fill="${c1}80">BIOMETRIC DASHBOARD</text>
</svg>`;

// 4. Wordmark only — 360×80
const wordmarkSVG = ({ c1, bg1 }, transparent = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80" width="360" height="80">
  ${transparent ? '' : `<rect width="360" height="80" fill="${bg1}"/>`}
  <text x="20" y="50"
        font-family="${FONT}" font-weight="700" font-size="44" letter-spacing="12" fill="${c1}">AIRA</text>
  <text x="22" y="70"
        font-family="${FONT}" font-weight="300" font-size="11" letter-spacing="4" fill="${c1}80">BIOMETRIC DASHBOARD</text>
</svg>`;

// 5. White logo — transparent bg, white strokes (overlay on dark surfaces)
const whiteLogoSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360">
  <defs>${glowFilter('glow', 5)}</defs>
  <g transform="translate(300,148) scale(0.3125) translate(-256,-256)">
    <circle cx="256" cy="256" r="180" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="20"/>
    <circle cx="256" cy="256" r="180" fill="none" stroke="white" stroke-width="20"
            stroke-linecap="round" stroke-dasharray="850 1131"
            transform="rotate(-90 256 256)" filter="url(#glow)" opacity="0.9"/>
    <g filter="url(#glow)" fill="none" stroke="white" stroke-width="34"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M188 346 L256 176 L324 346"/>
      <path d="M214 282 H298"/>
    </g>
  </g>
  <text x="300" y="270" text-anchor="middle"
        font-family="${FONT}" font-weight="700" font-size="56" letter-spacing="14" fill="white">AIRA</text>
  <text x="300" y="302" text-anchor="middle"
        font-family="${FONT}" font-weight="300" font-size="13" letter-spacing="5" fill="rgba(255,255,255,0.6)">BIOMETRIC DASHBOARD</text>
</svg>`;

// 6. Black logo — transparent bg, dark strokes (overlay on light surfaces)
const blackLogoSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360">
  <g transform="translate(300,148) scale(0.3125) translate(-256,-256)">
    <circle cx="256" cy="256" r="180" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="20"/>
    <circle cx="256" cy="256" r="180" fill="none" stroke="#111111" stroke-width="20"
            stroke-linecap="round" stroke-dasharray="850 1131"
            transform="rotate(-90 256 256)" opacity="0.85"/>
    <g fill="none" stroke="#111111" stroke-width="34"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M188 346 L256 176 L324 346"/>
      <path d="M214 282 H298"/>
    </g>
  </g>
  <text x="300" y="270" text-anchor="middle"
        font-family="${FONT}" font-weight="700" font-size="56" letter-spacing="14" fill="#111111">AIRA</text>
  <text x="300" y="302" text-anchor="middle"
        font-family="${FONT}" font-weight="300" font-size="13" letter-spacing="5" fill="rgba(0,0,0,0.5)">BIOMETRIC DASHBOARD</text>
</svg>`;

// 7. Theme logo — 500×240, horizontal with theme badge
const themeLogoSVG = (t) => {
  const badgeW = t.name.length * 7.6 + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
  <defs>
    ${bgGrad('bg', t.bg1, t.bg2)}
    ${ringGrad('ring', t.c1, t.c2)}
    ${glowFilter('glow', 4)}
  </defs>
  <rect width="500" height="240" fill="url(#bg)" rx="12"/>
  ${iconGroup(90, 120, 0.195, t.c1)}
  <line x1="150" y1="65" x2="150" y2="175" stroke="${t.c1}33" stroke-width="1"/>
  <text x="174" y="112"
        font-family="${FONT}" font-weight="700" font-size="40" letter-spacing="10" fill="${t.c1}">AIRA</text>
  <text x="176" y="140"
        font-family="${FONT}" font-weight="300" font-size="12" letter-spacing="4" fill="${t.c1}99">BIOMETRIC DASHBOARD</text>
  <rect x="174" y="157" width="${badgeW}" height="22" rx="5"
        fill="${t.c1}22" stroke="${t.c1}55" stroke-width="1"/>
  <text x="184" y="172"
        font-family="${FONT}" font-weight="500" font-size="10" letter-spacing="2" fill="${t.c1}cc">${t.name.toUpperCase()}</text>
</svg>`;
};

// 8. OG Image — 1200×630 (also used for Twitter card)
const ogImageSVG = ({ c1, c2, bg1, bg2 }) => {
  const vLines = Array.from({ length: 13 }, (_, i) =>
    `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="630" stroke="${c1}" stroke-width="0.5" opacity="0.04"/>`
  ).join('\n    ');
  const hLines = Array.from({ length: 8 }, (_, i) =>
    `<line x1="0" y1="${i * 90}" x2="1200" y2="${i * 90}" stroke="${c1}" stroke-width="0.5" opacity="0.04"/>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    ${bgGrad('bg', bg1, bg2)}
    ${ringGrad('ring', c1, c2)}
    ${glowFilter('glow-lg', 16)}
    ${glowFilter('glow-sm', 6)}
    <linearGradient id="vignette" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%"   stop-color="${c1}" stop-opacity="0.14"/>
      <stop offset="70%"  stop-color="${c1}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative background rings -->
  <circle cx="1060" cy="70"  r="310" fill="none" stroke="${c1}" stroke-width="1" opacity="0.05"/>
  <circle cx="1060" cy="70"  r="220" fill="none" stroke="${c1}" stroke-width="1" opacity="0.08"/>
  <circle cx="140"  cy="570" r="210" fill="none" stroke="${c2}" stroke-width="1" opacity="0.06"/>
  <circle cx="140"  cy="570" r="140" fill="none" stroke="${c2}" stroke-width="1" opacity="0.04"/>

  <!-- Subtle grid -->
  ${vLines}
  ${hLines}

  <!-- Top accent glow -->
  <ellipse cx="600" cy="0" rx="460" ry="210" fill="url(#vignette)"/>

  <!-- Center icon (320×320) -->
  ${iconGroup(600, 268, 0.625, c1, 'glow-lg')}

  <!-- AIRA wordmark -->
  <text x="600" y="472" text-anchor="middle"
        font-family="${FONT}" font-weight="700" font-size="96" letter-spacing="24" fill="${c1}"
        filter="url(#glow-sm)">AIRA</text>

  <!-- Tagline -->
  <text x="600" y="518" text-anchor="middle"
        font-family="${FONT}" font-weight="300" font-size="20" letter-spacing="6" fill="${c1}aa">BIOMETRIC DASHBOARD</text>

  <!-- Metrics subtitle -->
  <text x="600" y="560" text-anchor="middle"
        font-family="${FONT}" font-weight="300" font-size="15" letter-spacing="3" fill="${c1}55">Recovery · Sleep · Heart Rate · Strain · Steps</text>

  <!-- Bottom accent line -->
  <rect x="545" y="594" width="110" height="2" rx="1" fill="${c1}" opacity="0.45"/>
</svg>`;
};

// 9. Color palette reference — 850×500
const colorPaletteSVG = () => {
  const W = 850, H = 500, PAD = 35;
  const colW = (W - PAD * 2) / THEMES.length;

  const cols = THEMES.map((t, i) => {
    const x  = PAD + i * colW;
    const cx = x + colW / 2;
    const rw = colW - 12;
    const rx = x + 6;
    return `
  <!-- ${t.name} column -->
  <rect x="${rx}" y="68"  width="${rw}" height="108" rx="8" fill="${t.c1}"/>
  <text x="${cx}" y="196" text-anchor="middle"
        font-family="${FONT}" font-size="11" fill="${t.c1}" letter-spacing="0.5" font-weight="600">${t.c1.toUpperCase()}</text>

  <rect x="${rx}" y="212" width="${rw}" height="68" rx="8" fill="${t.c2}"/>
  <text x="${cx}" y="298" text-anchor="middle"
        font-family="${FONT}" font-size="11" fill="${t.c2}" letter-spacing="0.5" font-weight="600">${t.c2.toUpperCase()}</text>

  <rect x="${rx}" y="314" width="${rw}" height="48" rx="8"
        fill="${t.bg1}" stroke="${t.c1}" stroke-width="1" stroke-opacity="0.35"/>
  <text x="${cx}" y="380" text-anchor="middle"
        font-family="${FONT}" font-size="10" fill="white" opacity="0.4" letter-spacing="0.5">${t.bg1.toUpperCase()}</text>

  <text x="${cx}" y="426" text-anchor="middle"
        font-family="${FONT}" font-size="11" fill="${t.c1}" letter-spacing="2" font-weight="600">${t.name.toUpperCase()}</text>
  <line x1="${rx}" y1="442" x2="${rx + rw}" y2="442" stroke="${t.c1}" stroke-width="2" stroke-opacity="0.5"/>
  <text x="${cx}" y="468" text-anchor="middle"
        font-family="${FONT}" font-size="10" fill="${t.c1}88" letter-spacing="0.5">Accent · Secondary · BG</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#020810"/>
  <text x="${W / 2}" y="42" text-anchor="middle"
        font-family="${FONT}" font-size="12" letter-spacing="5" font-weight="400" fill="white" opacity="0.3">AIRA — COLOR PALETTE</text>
  ${cols}
</svg>`;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const writeSVG = (rel, content) => {
  fs.writeFileSync(path.join(ROOT, rel), content, 'utf8');
  console.log(`  ✓  ${rel}`);
};

const writePNG = async (svgContent, relOut, w, h) => {
  await sharp(Buffer.from(svgContent)).resize(w, h).png().toFile(path.join(ROOT, relOut));
  console.log(`  ✓  ${relOut}`);
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── SVG sources ────────────────────────────────────────────────────────────
  console.log('\n📁 Writing SVG source files…');

  writeSVG('logos/aira-icon.svg',              iconSVG(DEF));
  writeSVG('logos/aira-logo-primary.svg',      primaryLogoSVG(DEF));
  writeSVG('logos/aira-logo-horizontal.svg',   horizontalLogoSVG(DEF));
  writeSVG('logos/aira-wordmark.svg',          wordmarkSVG(DEF));
  writeSVG('logos/aira-logo-white.svg',        whiteLogoSVG());
  writeSVG('logos/aira-logo-black.svg',        blackLogoSVG());

  THEMES.forEach(t => {
    writeSVG(`logos/themes/aira-${t.id}.svg`,      themeLogoSVG(t));
    writeSVG(`logos/themes/aira-icon-${t.id}.svg`, iconSVG(t));
  });

  writeSVG('social/og-image.svg',     ogImageSVG(DEF));
  writeSVG('social/twitter-card.svg', ogImageSVG(DEF));  // same design, same dimensions
  writeSVG('colors/aira-color-palette.svg', colorPaletteSVG());

  // ── PNG exports ────────────────────────────────────────────────────────────
  console.log('\n🖼  Generating PNGs…');

  // App icon at every standard size
  for (const size of [512, 256, 192, 128, 64, 32]) {
    await writePNG(iconSVG(DEF), `logos/png/aira-icon-${size}.png`, size, size);
  }

  // Primary logo variants
  await writePNG(primaryLogoSVG(DEF),        'logos/png/aira-logo-primary.png',             600, 360);
  await writePNG(primaryLogoSVG(DEF, true),  'logos/png/aira-logo-primary-transparent.png', 600, 360);
  await writePNG(horizontalLogoSVG(DEF),     'logos/png/aira-logo-horizontal.png',          720, 160);
  await writePNG(horizontalLogoSVG(DEF, true),'logos/png/aira-logo-horizontal-transparent.png', 720, 160);
  await writePNG(wordmarkSVG(DEF),           'logos/png/aira-wordmark.png',                 360,  80);
  await writePNG(wordmarkSVG(DEF, true),     'logos/png/aira-wordmark-transparent.png',     360,  80);
  await writePNG(whiteLogoSVG(),             'logos/png/aira-logo-white.png',               600, 360);
  await writePNG(blackLogoSVG(),             'logos/png/aira-logo-black.png',               600, 360);

  // Per-theme logos + icons
  for (const t of THEMES) {
    await writePNG(themeLogoSVG(t), `logos/themes/png/aira-${t.id}.png`,           500, 240);
    await writePNG(iconSVG(t),      `logos/themes/png/aira-icon-${t.id}-256.png`,  256, 256);
  }

  // Social assets
  await writePNG(ogImageSVG(DEF), 'social/png/og-image.png',     1200, 630);
  await writePNG(ogImageSVG(DEF), 'social/png/twitter-card.png', 1200, 600);

  // Color palette
  await writePNG(colorPaletteSVG(), 'colors/png/aira-color-palette.png', 850, 500);

  console.log('\n✅  All brand assets generated!\n');
  console.log('  brand/logos/png/          — App icon (6 sizes) + logo variants (PNG)');
  console.log('  brand/logos/themes/png/   — Per-theme logos + icons (PNG)');
  console.log('  brand/social/png/         — OG image + Twitter card (PNG)');
  console.log('  brand/colors/png/         — Color palette reference (PNG)');
  console.log('  brand/logos/**/*.svg      — All source SVGs for designers\n');
}

main().catch(err => { console.error(err); process.exit(1); });
