const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// AIRA app icon — dark rounded tile + biometric ring + the AIRA "A" monogram
// (matches the in-app coach logo). Original mark; no Fitbit "F".
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020810"/>
      <stop offset="100%" stop-color="#0a1828"/>
    </linearGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#00ff88"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="rgba(0,245,255,0.1)" stroke-width="20"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="url(#ring)" stroke-width="20" stroke-linecap="round" stroke-dasharray="850 1131" transform="rotate(-90 256 256)" filter="url(#glow)" opacity="0.95"/>
  <g filter="url(#glow)" fill="none" stroke="url(#ring)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
    <path d="M188 346 L256 176 L324 346"/>
    <path d="M214 282 H298"/>
  </g>
</svg>`;

async function generate() {
  fs.writeFileSync(path.join(outDir, 'icon.svg'), svg);
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
    console.log(`✓ icon-${size}.png`);
  }
  console.log('\n✅ Done! Icons generated in public/icons/');
}

generate().catch(console.error);
