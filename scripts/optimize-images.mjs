import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const PRODUCTS_DIR = path.join(PUBLIC_DIR, 'products');

const MAX_BYTES = 300 * 1024;
const WIDTHS = [300, 600, 900, 1200];

const WEBP = {
  qualityStart: 82,
  qualityMin: 40,
  qualityStep: 6,
  effort: 4,
};

const JPEG = {
  qualityStart: 82,
  qualityMin: 45,
  qualityStep: 6,
  mozjpeg: true,
};

function isVariantFile(filePath) {
  // Matches `name-300.webp`, `name-900.jpg`, etc.
  return /-(300|600|900|1200)\.(webp|jpe?g|png)$/i.test(filePath);
}

function isSupportedInput(filePath) {
  return /\.(jpe?g|png|webp)$/i.test(filePath);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

function withoutExt(filePath) {
  return filePath.replace(/\.[^.]+$/, '');
}

function normalizeJpegExt(filePath) {
  return filePath.replace(/\.(jpeg)$/i, '.jpg');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function shouldSkip({ inputPath, outputPath }) {
  if (!(await fileExists(outputPath))) return false;
  const [inStat, outStat] = await Promise.all([fs.stat(inputPath), fs.stat(outputPath)]);
  if (outStat.mtimeMs < inStat.mtimeMs) return false;
  // If output is already small enough and newer, skip.
  if (outStat.size <= MAX_BYTES) return true;
  return false;
}

async function encodeWithBudget({ pipelineFactory, qualityStart, qualityMin, qualityStep }) {
  let quality = qualityStart;
  let last;

  // Try progressively lower quality until we fit the byte budget.
  while (quality >= qualityMin) {
    // pipelineFactory should return a fresh sharp pipeline each attempt.
    const pipeline = pipelineFactory(quality);
    const buffer = await pipeline.toBuffer();
    last = { buffer, quality, bytes: buffer.byteLength };
    if (buffer.byteLength <= MAX_BYTES) return last;
    quality -= qualityStep;
  }

  return last;
}

async function generateVariants(inputPath) {
  const rel = path.relative(PROJECT_ROOT, inputPath);
  const ext = path.extname(inputPath).toLowerCase();

  const image = sharp(inputPath, { failOn: 'none' });
  const meta = await image.metadata();

  const hasAlpha = Boolean(meta.hasAlpha);
  const fallbackExt = 'jpg';

  const baseNoExt = withoutExt(inputPath);

  const widthsToMake = WIDTHS.filter((w) => (typeof meta.width === 'number' ? w <= meta.width : true));
  if (!widthsToMake.length) return { rel, made: 0, skipped: 0, warnings: [] };

  let made = 0;
  let skipped = 0;
  const warnings = [];

  for (const width of widthsToMake) {
    const outWebp = `${baseNoExt}-${width}.webp`;
    const outFallbackRaw = `${baseNoExt}-${width}.${fallbackExt}`;
    const outFallback = fallbackExt === 'jpg' ? normalizeJpegExt(outFallbackRaw) : outFallbackRaw;

    // WebP
    if (await shouldSkip({ inputPath, outputPath: outWebp })) {
      skipped += 1;
    } else {
      const attempt = await encodeWithBudget({
        qualityStart: WEBP.qualityStart,
        qualityMin: WEBP.qualityMin,
        qualityStep: WEBP.qualityStep,
        pipelineFactory: (quality) =>
          sharp(inputPath, { failOn: 'none' })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality, effort: WEBP.effort }),
      });

      if (attempt?.buffer) {
        await fs.writeFile(outWebp, attempt.buffer);
        made += 1;
        if (attempt.bytes > MAX_BYTES) {
          warnings.push(`WARN webp >300KB: ${path.relative(PROJECT_ROOT, outWebp)} (${Math.round(attempt.bytes / 1024)}KB @ q=${attempt.quality})`);
        }
      }
    }

    // Fallback (jpg)
    if (await shouldSkip({ inputPath, outputPath: outFallback })) {
      skipped += 1;
    } else {
      const attempt = await encodeWithBudget({
        qualityStart: JPEG.qualityStart,
        qualityMin: JPEG.qualityMin,
        qualityStep: JPEG.qualityStep,
        pipelineFactory: (quality) => {
          let pipeline = sharp(inputPath, { failOn: 'none' }).rotate().resize({ width, withoutEnlargement: true });
          // Preserve the current visual look for transparent PNGs by flattening on white.
          if (hasAlpha) pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
          return pipeline.jpeg({ quality, mozjpeg: JPEG.mozjpeg, chromaSubsampling: '4:2:0' });
        },
      });

      if (attempt?.buffer) {
        await fs.writeFile(outFallback, attempt.buffer);
        made += 1;
        if (attempt.bytes > MAX_BYTES) {
          warnings.push(
            `WARN jpg >300KB: ${path.relative(PROJECT_ROOT, outFallback)} (${Math.round(attempt.bytes / 1024)}KB @ q=${attempt.quality})`,
          );
        }
      }
    }
  }

  return { rel, made, skipped, warnings };
}

async function main() {
  const started = Date.now();

  let inputFiles;
  try {
    inputFiles = await walk(PRODUCTS_DIR);
  } catch (e) {
    console.error(`No products directory found at: ${PRODUCTS_DIR}`);
    console.error(e);
    process.exitCode = 1;
    return;
  }

  const inputs = inputFiles
    .filter((p) => isSupportedInput(p))
    .filter((p) => !isVariantFile(p));

  if (!inputs.length) {
    console.log('No product images found to optimize.');
    return;
  }

  // Simple concurrency pool.
  const concurrency = Math.max(1, Math.min(4, Number(process.env.IMG_CONCURRENCY || 4)));
  let index = 0;

  let totalMade = 0;
  let totalSkipped = 0;
  const allWarnings = [];

  async function worker() {
    while (true) {
      const i = index++;
      if (i >= inputs.length) return;
      const inputPath = inputs[i];
      try {
        const result = await generateVariants(inputPath);
        totalMade += result.made;
        totalSkipped += result.skipped;
        allWarnings.push(...result.warnings);
      } catch (e) {
        console.error(`Failed optimizing: ${path.relative(PROJECT_ROOT, inputPath)}`);
        console.error(e);
        process.exitCode = 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const tookMs = Date.now() - started;
  console.log(`Optimized product images: ${inputs.length} inputs, ${totalMade} outputs written, ${totalSkipped} outputs skipped (${(tookMs / 1000).toFixed(1)}s).`);

  if (allWarnings.length) {
    console.warn(`\n${allWarnings.length} warnings (files over 300KB):`);
    for (const w of allWarnings.slice(0, 80)) console.warn(w);
    if (allWarnings.length > 80) console.warn(`...and ${allWarnings.length - 80} more`);
  }
}

await main();
