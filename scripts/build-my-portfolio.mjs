import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = "C:\\Users\\17091\\Desktop\\照片墙";
const OUTPUT_DIR = "./public/artworks";
const MANIFEST_PATH = "./src/artworks/manifest.json";
const LONGEST_EDGE = 1600;
const JPEG_QUALITY = 85;
const IMAGE_EXTS = new Set([".jpg", ".jpeg"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source folder not found: ${SOURCE_DIR}`);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let removed = 0;
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (IMAGE_EXTS.has(path.extname(f).toLowerCase())) {
      fs.unlinkSync(path.join(OUTPUT_DIR, f));
      removed++;
    }
  }
  const staleManifest = path.join(OUTPUT_DIR, "manifest.json");
  if (fs.existsSync(staleManifest)) fs.unlinkSync(staleManifest);
  console.log(`Cleared ${removed} old images from ${OUTPUT_DIR}`);

  const files = fs
    .readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXTS.has(path.extname(d.name).toLowerCase()))
    .map((d) => d.name)
    .sort();

  console.log(`Found ${files.length} photos in ${SOURCE_DIR}\n`);

  const manifest = [];
  let failed = 0;

  for (const [i, file] of files.entries()) {
    const src = path.join(SOURCE_DIR, file);
    const outName = `${path.parse(file).name}.jpg`;
    const outPath = path.join(OUTPUT_DIR, outName);

    try {
      const image = sharp(src).rotate();
      const meta = await image.metadata();
      const info = await image
        .resize({ width: LONGEST_EDGE, height: LONGEST_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(outPath);

      manifest.push({
        url: `artworks/${outName}`,
        type: "image",
        title: path.parse(file).name,
        artist: "",
        year: "",
        link: "",
        width: info.width,
        height: info.height,
      });
      console.log(`[${i + 1}/${files.length}] ${file} (${meta.width}x${meta.height}) -> ${info.width}x${info.height}`);
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${files.length}] FAILED: ${file}`, err.message);
    }
    await sleep(10);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nDone! ${manifest.length} images -> ${MANIFEST_PATH}${failed ? ` (${failed} failed)` : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
