// usage: COMP_ID=<id> node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || path.resolve(".remotion-tmp");
fs.mkdirSync(TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME_PATH || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = process.env.SERVE_URL || await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const id = process.env.COMP_ID || "PisaShort";
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps: JSON.parse(process.env.PROPS || "{}") });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog, inputProps: JSON.parse(process.env.PROPS || "{}") });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
