/**
 * Generates the PWA icon set as real PNG files.
 *
 * Why hand-rolled: an installable app needs genuine raster icons, and pulling a
 * canvas/image library in as a dependency just to draw one leaf is not worth
 * the supply-chain and bundle cost for a project this size. Everything below is
 * Node's own `zlib` plus a small PNG encoder, so the output is a real,
 * standards-compliant PNG.
 *
 * Run:  npm run icons
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type RGBA = [number, number, number, number];

const GREEN: RGBA = [0x2f, 0x6b, 0x4f, 255];
const LEAF: RGBA = [0xff, 0xff, 0xff, 255];
const WARM: RGBA = [0xe7, 0xb7, 0x5b, 255];
const TRANSPARENT: RGBA = [0, 0, 0, 0];

/* ------------------------------------------------------------------ *
 * PNG encoding
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width: number, height: number, pixels: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // colour type: RGBA
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // adaptive filtering
  ihdr.writeUInt8(0, 12); // no interlace

  // Each scanline is prefixed with its filter type byte (0 = None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */

function leafCoverage(x: number, y: number): number {
  // Lens-shaped leaf: intersection of two circles. Tips land on (0, 0) and
  // (0.75, 0.75) in this normalised space.
  const r = 0.75;
  const d1 = Math.hypot(x - 0, y - r);
  const d2 = Math.hypot(x - r, y - 0);
  return d1 <= r && d2 <= r ? 1 : 0;
}

function stemCoverage(x: number, y: number): number {
  // A short diagonal stem continuing the leaf downwards.
  const dx = x - 0.02;
  const dy = y - 0.02;
  const distance = Math.abs(dx - dy) / Math.SQRT2;
  const along = (dx + dy) / Math.SQRT2;
  if (along < -0.16 || along > 0.02) return 0;
  return distance <= 0.032 ? 1 : 0;
}

function roundedSquareCoverage(x: number, y: number, radius: number): number {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  if (x >= radius && x <= 1 - radius) return 1;
  if (y >= radius && y <= 1 - radius) return 1;
  return Math.hypot(x - cx, y - cy) <= radius ? 1 : 0;
}

interface RenderOptions {
  /** Full-bleed square (maskable icons must survive circular cropping). */
  maskable?: boolean;
  /** Draw the warm accent dot on the leaf. */
  accent?: boolean;
}

function renderIcon(size: number, options: RenderOptions = {}): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4; // 4x4 supersampling for smooth anti-aliased edges
  const cornerRadius = options.maskable ? 0 : 0.22;

  // Maskable icons keep the artwork inside the 80% safe zone.
  const artScale = options.maskable ? 0.56 : 0.62;
  const artOffset = (1 - artScale * 0.75) / 2 - artScale * 0.06;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;

          const background = options.maskable ? 1 : roundedSquareCoverage(x, y, cornerRadius);

          let colour: RGBA = TRANSPARENT;

          if (background > 0) {
            colour = GREEN;

            // Map into leaf space.
            const lx = (x - artOffset) / artScale;
            const ly = (y - artOffset) / artScale;

            if (leafCoverage(lx, ly) === 1 || stemCoverage(lx, ly) === 1) {
              colour = LEAF;
            }

            if (options.accent) {
              // Warm dot: a bright spot on the leaf, in brand accent.
              const dot = Math.hypot(lx - 0.34, ly - 0.34);
              if (leafCoverage(lx, ly) === 1 && dot <= 0.075) colour = WARM;
            }
          }

          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += colour[3];
        }
      }

      const total = samples * samples;
      const index = (py * size + px) * 4;
      pixels[index] = Math.round(r / total);
      pixels[index + 1] = Math.round(g / total);
      pixels[index + 2] = Math.round(b / total);
      pixels[index + 3] = Math.round(a / total);
    }
  }

  return encodePng(size, size, pixels);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const outputDir = path.join(process.cwd(), "public", "icons");
mkdirSync(outputDir, { recursive: true });

const outputs: { file: string; size: number; options: RenderOptions }[] = [
  { file: "icon-192.png", size: 192, options: {} },
  { file: "icon-512.png", size: 512, options: { accent: true } },
  { file: "icon-maskable-512.png", size: 512, options: { maskable: true, accent: true } },
  { file: "apple-touch-icon.png", size: 180, options: { accent: true } },
  { file: "favicon-32.png", size: 32, options: {} },
];

for (const output of outputs) {
  const png = renderIcon(output.size, output.options);
  writeFileSync(path.join(outputDir, output.file), png);
  console.log(`wrote public/icons/${output.file} (${png.length} bytes)`);
}
