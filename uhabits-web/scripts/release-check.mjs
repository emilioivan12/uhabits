import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const manifestPath = path.join(distDir, "manifest.webmanifest");
const serviceWorkerPath = path.join(distDir, "sw.js");
const indexPath = path.join(distDir, "index.html");

const REQUIRED_FILES = [manifestPath, serviceWorkerPath, indexPath];
const MAX_JS_BUNDLE_BYTES = 400_000;
const MAX_CSS_BUNDLE_BYTES = 12_000;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

for (const filePath of REQUIRED_FILES) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing required build artifact: ${path.relative(process.cwd(), filePath)}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const manifestRaw = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(manifestRaw);

if (manifest.display !== "standalone") {
  fail(`Manifest display must be "standalone" but is "${manifest.display}"`);
}

if (manifest.start_url !== "/") {
  fail(`Manifest start_url must be "/" but is "${manifest.start_url}"`);
}

const iconSizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes));
if (!iconSizes.has("192x192") || !iconSizes.has("512x512")) {
  fail("Manifest must include 192x192 and 512x512 icons");
}

const assetsDir = path.join(distDir, "assets");
const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const jsAssets = assetFiles.filter((file) => file.endsWith(".js") && file.startsWith("index-"));
const cssAssets = assetFiles.filter((file) => file.endsWith(".css") && file.startsWith("index-"));

if (jsAssets.length === 0) {
  fail("No main JS asset found in dist/assets");
}

if (cssAssets.length === 0) {
  fail("No main CSS asset found in dist/assets");
}

for (const file of jsAssets) {
  const bytes = fs.statSync(path.join(assetsDir, file)).size;
  if (bytes > MAX_JS_BUNDLE_BYTES) {
    fail(`JS bundle budget exceeded (${file}: ${bytes} > ${MAX_JS_BUNDLE_BYTES})`);
  } else {
    console.log(`✓ JS bundle OK (${file}: ${bytes} bytes)`);
  }
}

for (const file of cssAssets) {
  const bytes = fs.statSync(path.join(assetsDir, file)).size;
  if (bytes > MAX_CSS_BUNDLE_BYTES) {
    fail(`CSS bundle budget exceeded (${file}: ${bytes} > ${MAX_CSS_BUNDLE_BYTES})`);
  } else {
    console.log(`✓ CSS bundle OK (${file}: ${bytes} bytes)`);
  }
}

if (!process.exitCode) {
  console.log("✓ Release checks passed (PWA artifacts + bundle budgets)");
}
