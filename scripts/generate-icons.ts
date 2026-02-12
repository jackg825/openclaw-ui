/**
 * Generate PWA icons from Material Symbols `smart_toy` (robot/AI) icon.
 * Run: npx tsx scripts/generate-icons.ts
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../packages/pwa-client/public/icons');

const BG_COLOR = '#0d1117';
const ICON_COLOR = '#ffffff';

// Material Symbols "smart_toy" (filled, weight 400) — viewBox 0 -960 960 960
const SMART_TOY_PATH =
  'M147-376q-45 0-76-31.21T40-483q0-44.58 31.21-75.79Q102.42-590 147-590v-123q0-24 18-42t42-18h166q0-45 31-76t76-31q45 0 76 31.21T587-773h166q24 0 42 18t18 42v123q45 0 76 31.21T920-483q0 44.58-31.21 75.79Q857.58-376 813-376v196q0 24-18 42t-42 18H207q-24 0-42-18t-18-42v-196Zm224.5-111.74q11.5-11.73 11.5-28.5 0-16.76-11.74-28.26-11.73-11.5-28.5-11.5-16.76 0-28.26 11.74-11.5 11.73-11.5 28.5 0 16.76 11.74 28.26 11.73 11.5 28.5 11.5 16.76 0 28.26-11.74Zm274 0q11.5-11.73 11.5-28.5 0-16.76-11.74-28.26-11.73-11.5-28.5-11.5-16.76 0-28.26 11.74-11.5 11.73-11.5 28.5 0 16.76 11.74 28.26 11.73 11.5 28.5 11.5 16.76 0 28.26-11.74ZM312-285h336v-60H312v60Z';

function buildSvg(size: number): string {
  // Add padding (12.5% each side → icon occupies 75% of canvas)
  const padding = size * 0.125;
  const iconSize = size * 0.75;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${BG_COLOR}"/>
  <g transform="translate(${padding},${padding}) scale(${iconSize / 960})">
    <g transform="translate(0, 960)">
      <path d="${SMART_TOY_PATH}" fill="${ICON_COLOR}"/>
    </g>
  </g>
</svg>`;
}

async function generate(size: number): Promise<void> {
  const svg = Buffer.from(buildSvg(size));
  const outPath = resolve(outDir, `icon-${size}.png`);
  await sharp(svg).png().toFile(outPath);
  console.log(`✓ ${outPath} (${size}×${size})`);
}

mkdirSync(outDir, { recursive: true });
await Promise.all([generate(192), generate(512)]);
console.log('Done.');
