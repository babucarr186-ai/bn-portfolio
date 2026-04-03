import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const files = [
  'public/products/airpods/airpods-2nd-gen-1.jpg',
  'public/products/airpods/airpods-2nd-gen-2.jpg',
  'public/products/airpods/airpods-2nd-gen-3.jpg',
];

function createBrightnessSampler(data, info) {
  const { width, channels } = info;
  const sampleStep = Math.max(1, Math.floor(width / 64));

  return (y) => {
    let total = 0;
    let count = 0;

    for (let x = 0; x < width; x += sampleStep) {
      const index = (y * width + x) * channels;
      total += (data[index] + data[index + 1] + data[index + 2]) / 3;
      count += 1;
    }

    return total / count;
  };
}

function hasBrightnessRun({ startY, direction, height, brightnessForRow, threshold }) {
  for (let offset = 1; offset <= 8; offset += 1) {
    const y = startY + offset * direction;
    if (y < 0 || y >= height) return false;
    if (brightnessForRow(y) <= threshold) return false;
  }

  return true;
}

function hasDarkRun({ startY, height, brightnessForRow, threshold, runLength = 24 }) {
  for (let offset = 0; offset < runLength; offset += 1) {
    const y = startY + offset;
    if (y >= height) return true;
    if (brightnessForRow(y) > threshold) return false;
  }

  return true;
}

async function cropFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const { data, info } = await sharp(absolutePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const brightnessForRow = createBrightnessSampler(data, info);
  const threshold = 28;

  let top = 0;
  for (let y = 0; y < height; y += 1) {
    if (brightnessForRow(y) > threshold && hasBrightnessRun({ startY: y, direction: 1, height, brightnessForRow, threshold })) {
      top = y;
      break;
    }
  }

  let bottom = height - 1;
  for (let y = Math.min(height - 1, top + Math.floor(height * 0.35)); y < height; y += 1) {
    if (hasDarkRun({ startY: y, height, brightnessForRow, threshold })) {
      bottom = Math.max(top + 1, y - 1);
      break;
    }
  }

  const cropHeight = Math.max(1, bottom - top + 1);
  const tempPath = `${absolutePath}.tmp.jpg`;

  await sharp(absolutePath)
    .extract({ left: 0, top, width, height: cropHeight })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(tempPath);

  await fs.rename(tempPath, absolutePath);
  return { relativePath, top, bottom, cropHeight };
}

for (const file of files) {
  const result = await cropFile(file);
  console.log(`${result.relativePath}: top=${result.top}, bottom=${result.bottom}, height=${result.cropHeight}`);
}