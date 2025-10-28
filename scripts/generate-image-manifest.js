const fs = require('fs');
const path = require('path');

// Scans a directory for jpg/png images and writes a manifest JSON mapping
// original -> { avif, webp } candidates. Intended to run after you place
// optimized images in the same directories (e.g., during CI or a local script).

const root = process.argv[2] || path.join(__dirname, '..', 'public');
const out = process.argv[3] || path.join(__dirname, '..', 'public', 'image-manifest.json');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

const manifest = {};

walk(root, (file) => {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (/\.(jpe?g|png)$/i.test(file)) {
    const base = file.replace(/\.(jpe?g|png)$/i, '');
    const avif = `${base}.avif`;
    const webp = `${base}.webp`;
    const avifExists = fs.existsSync(avif);
    const webpExists = fs.existsSync(webp);
    if (avifExists || webpExists) {
      manifest['/' + rel] = {
        avif: avifExists ? '/' + path.relative(root, avif).replace(/\\/g, '/') : null,
        webp: webpExists ? '/' + path.relative(root, webp).replace(/\\/g, '/') : null,
      };
    }
  }
});

fs.writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Image manifest written to', out);
