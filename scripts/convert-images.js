const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.argv[2] || path.join(__dirname, '..', 'public');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function hasCommand(cmd) {
  try {
    const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    return res.status === 0 || res.status === null || res.status === undefined;
  } catch (e) {
    return false;
  }
}

const haveCwebp = hasCommand('cwebp');
const haveAvifenc = hasCommand('avifenc');

if (!haveCwebp && !haveAvifenc) {
  console.log('No conversion tools found (cwebp or avifenc). Skipping conversion.');
  console.log('To enable automatic conversion, install cwebp (from libwebp) and avifenc (libavif).');
  process.exit(0);
}

let converted = 0;

walk(root, (file) => {
  if (!/\.(jpe?g|png)$/i.test(file)) return;
  const dir = path.dirname(file);
  const base = file.replace(/\.(jpe?g|png)$/i, '');
  const webp = base + '.webp';
  const avif = base + '.avif';

  try {
    if (haveCwebp) {
      // quality 80
      const out = spawnSync('cwebp', ['-q', '80', file, '-o', webp], { stdio: 'inherit' });
      if (out.status === 0) converted++;
    }
  } catch (e) {
    // ignore individual errors
  }

  try {
    if (haveAvifenc) {
      // avifenc options: balance speed vs quality
      const out = spawnSync('avifenc', ['--min', '0', '--max', '40', file, avif], { stdio: 'inherit' });
      if (out.status === 0) converted++;
    }
  } catch (e) {
    // ignore
  }
});

console.log(`Image conversion complete. Converted ~${converted} files (if tools present).`);
process.exit(0);
