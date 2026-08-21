#!/usr/bin/env node
/**
 * Генерирует весь набор иконок из images/favicon.svg.
 * Запуск: node scripts/gen-favicon.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'images', 'favicon.svg');
const imagesDir = path.join(root, 'images');

const svg = fs.readFileSync(svgPath, 'utf8');
// Для apple-touch-icon углы не скругляем — iOS накладывает свою маску поверх.
const svgSquare = Buffer.from(svg.replace('rx="14" ry="14"', 'rx="0" ry="0"'));
const svgRounded = Buffer.from(svg);

// На 16-24px две волны сливаются в кашу: для мелких размеров — солнце крупнее и одна волна.
const svgSmall = Buffer.from(
  svg
    .replace('<circle cx="44" cy="20" r="9"', '<circle cx="42" cy="20" r="11"')
    .replace(
      /<g fill="none" stroke="#ffffff"[\s\S]*?<\/g>/,
      '<path d="M1 44q8-7.5 16 0t16 0 16 0 16 0" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>'
    )
);

const png = (src, size) =>
  sharp(src, { density: 384 }).resize(size, size, { fit: 'contain' }).png({ compressionLevel: 9 }).toBuffer();

// ICO-контейнер с PNG-энтри (поддерживается всеми актуальными браузерами).
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;

  entries.forEach(({ size, data }, i) => {
    const p = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, p);
    dir.writeUInt8(size >= 256 ? 0 : size, p + 1);
    dir.writeUInt8(0, p + 2);
    dir.writeUInt8(0, p + 3);
    dir.writeUInt16LE(1, p + 4);
    dir.writeUInt16LE(32, p + 6);
    dir.writeUInt32LE(data.length, p + 8);
    dir.writeUInt32LE(offset, p + 12);
    offset += data.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

(async () => {
  const targets = [
    { file: 'favicon-16.png', size: 16, src: svgSmall },
    { file: 'favicon-32.png', size: 32, src: svgSmall },
    { file: 'favicon-48.png', size: 48, src: svgRounded },
    { file: 'icon-192.png', size: 192, src: svgRounded },
    { file: 'icon-512.png', size: 512, src: svgRounded },
    { file: 'apple-touch-icon.png', size: 180, src: svgSquare },
  ];

  for (const t of targets) {
    const buf = await png(t.src, t.size);
    fs.writeFileSync(path.join(imagesDir, t.file), buf);
    console.log(`  ${t.file.padEnd(22)} ${String(buf.length).padStart(7)} b`);
  }

  const ico = buildIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await png(size <= 32 ? svgSmall : svgRounded, size) }))
    )
  );
  fs.writeFileSync(path.join(root, 'favicon.ico'), ico);
  console.log(`  favicon.ico            ${String(ico.length).padStart(7)} b  (16/32/48)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
