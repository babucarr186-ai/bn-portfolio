import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const input = path.join(publicDir, 'logo.jpeg');
const outDir = path.join(publicDir, 'icons');

async function generate() {
  await fs.mkdir(outDir, { recursive: true });

  const targets = [
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' },
  ];

  for (const t of targets) {
    const outPath = path.join(outDir, t.file);
    await sharp(input)
      .resize(t.size, t.size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
  }

  console.log('Generated PWA icons in public/icons/');
}

generate().catch((err) => {
  console.error('Failed generating PWA icons:', err);
  process.exitCode = 1;
});
