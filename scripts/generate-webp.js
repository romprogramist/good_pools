const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOTS = [
  path.join(__dirname, '..', 'uploads'),
  path.join(__dirname, '..', 'public', 'images')
];
const IMG_RE = /\.(png|jpe?g)$/i;
const QUALITY = 90;

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (IMG_RE.test(e.name)) out.push(full);
  }
}

async function main() {
  const files = [];
  for (const root of ROOTS) walk(root, files);
  console.log('Found ' + files.length + ' source images');

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let bytesSaved = 0;

  for (const src of files) {
    const dst = src.replace(IMG_RE, '.webp');
    try {
      if (fs.existsSync(dst)) { skipped++; continue; }
      await sharp(src).webp({ quality: QUALITY }).toFile(dst);
      const srcSize = fs.statSync(src).size;
      const dstSize = fs.statSync(dst).size;
      bytesSaved += (srcSize - dstSize);
      created++;
      process.stdout.write('.');
    } catch (e) {
      failed++;
      console.log('\nFAIL ' + src + ': ' + e.message);
    }
  }

  console.log('');
  console.log('Created: ' + created);
  console.log('Skipped: ' + skipped);
  console.log('Failed:  ' + failed);
  console.log('Saved:   ' + (bytesSaved / 1024 / 1024).toFixed(2) + ' MB');
}

main().catch(function (e) { console.error(e); process.exit(1); });
