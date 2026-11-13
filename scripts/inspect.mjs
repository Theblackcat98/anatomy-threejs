import { dirname, join, resolve } from "node:path";
import { withHeadlessPage } from "./chrome-port.mjs";

function usage() {
  console.log(`Anatomy 3D — Multi-Angle & Joint-Crop Visual Inspector

Usage:
  node scripts/inspect.mjs <path/to/figure.html> [options]

Options:
  --ortho                 Render 2x2 Orthographic Blueprint Quad: Front, Right, Top, Canonical Iso (default)
  --isolate <target>      Isolate a stage ('base', 'structure', 'subject', 'mechanism', 'shader') or part prefix
  --joints                Render zoomed 3x crops of every registered 3D joint/anchor in reg.joints
  --only <id1,id2,...>    Filter specific joint IDs when running --joints
  --out <path.png>        Custom output PNG path
  --theme <id>            Theme ('light', 'paper', 'dark', 'blueprint', 'sepia')
`);
}

function parseArgs(argv) {
  const opts = {
    target: null,
    ortho: false,
    isolate: null,
    joints: false,
    only: null,
    out: null,
    theme: "light"
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ortho") opts.ortho = true;
    else if (a === "--isolate") opts.isolate = argv[++i];
    else if (a === "--joints") opts.joints = true;
    else if (a === "--only") opts.only = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--theme") opts.theme = argv[++i];
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (!opts.target) opts.target = a;
  }
  if (!opts.isolate && !opts.joints) opts.ortho = true;
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.target) {
  usage();
  process.exit(opts.help ? 0 : 1);
}

const htmlPath = resolve(opts.target);
const outDir = dirname(htmlPath);

await withHeadlessPage(htmlPath, { width: 1200, height: 840, scale: 1.5 }, async (page) => {
  const { evaluate, sleep, getElementBox, captureBase64, saveBase64Png, tileImages, problems } = page;

  const hasDebug = await evaluate(`typeof window.__ANATOMY_DEBUG__ === "object"`);
  if (!hasDebug) {
    throw new Error(`Page ${htmlPath} does not expose window.__ANATOMY_DEBUG__`);
  }

  await evaluate(`window.__ANATOMY_DEBUG__.setPose({ theta: 0.65, explode: 0, hud: false, theme: ${JSON.stringify(opts.theme)} })`);
  await sleep(100);

  // 1. ISOLATION MODE (--isolate <stage|part>)
  if (opts.isolate) {
    await evaluate(`window.__ANATOMY_DEBUG__.isolate(${JSON.stringify(opts.isolate)})`);
    const views = [
      { key: "front", label: `FRONT (0°, 0°) · isolate: ${opts.isolate}` },
      { key: "right", label: `RIGHT (0°, -90°) · isolate: ${opts.isolate}` },
      { key: "top",   label: `TOP (90°, 0°) · isolate: ${opts.isolate}` },
      { key: "iso",   label: `CANONICAL ISO (30°, -36°) · isolate: ${opts.isolate}` }
    ];
    const tiles = [];
    for (const v of views) {
      await evaluate(`window.__ANATOMY_DEBUG__.setOrthoView(${JSON.stringify(v.key)})`);
      await sleep(60);
      const b64 = await captureBase64("#figure-card", null, 0.75);
      tiles.push({ label: v.label, base64: b64 });
    }
    const safeName = opts.isolate.replace(/[^a-z0-9_-]/gi, "-");
    const outFile = opts.out || join(outDir, `inspect-${safeName}.png`);
    const sheetB64 = await tileImages(tiles, 2);
    const saved = saveBase64Png(outFile, sheetB64);
    console.log(`saved isolated quad: ${saved}`);
    await evaluate(`window.__ANATOMY_DEBUG__.isolate("all")`);
  }

  // 2. ORTHOGRAPHIC BLUEPRINT QUAD (--ortho)
  if (opts.ortho) {
    await evaluate(`window.__ANATOMY_DEBUG__.isolate("all")`);
    const views = [
      { key: "front", label: "FRONT (0°, 0°)", sublabel: "XY elevation · check vertical grounding" },
      { key: "right", label: "RIGHT (0°, -90°)", sublabel: "ZY side · check axial alignment" },
      { key: "top",   label: "TOP (90°, 0°)", sublabel: "XZ plan · check symmetry & footprint" },
      { key: "iso",   label: "CANONICAL ISO (30°, -36°)", sublabel: "3D orthographic composition" }
    ];
    const tiles = [];
    for (const v of views) {
      await evaluate(`window.__ANATOMY_DEBUG__.setOrthoView(${JSON.stringify(v.key)})`);
      await sleep(60);
      const b64 = await captureBase64("#figure-card", null, 0.75);
      tiles.push({ label: v.label, sublabel: v.sublabel, base64: b64 });
    }
    const outFile = opts.out || join(outDir, "inspect-ortho.png");
    const sheetB64 = await tileImages(tiles, 2);
    const saved = saveBase64Png(outFile, sheetB64);
    console.log(`saved orthographic blueprint quad: ${saved}`);
  }

  // 3. ZOOMED JOINT CROPS (--joints)
  if (opts.joints) {
    await evaluate(`window.__ANATOMY_DEBUG__.isolate("all")`);
    let joints = await evaluate(`window.__ANATOMY_DEBUG__.getJoints()`);
    if (opts.only && opts.only.length > 0) {
      joints = joints.filter((j) => opts.only.includes(j.id));
    }
    const cardBox = await getElementBox("#figure-card");
    const cropSize = 360;
    const cropRegion = {
      x: Math.max(0, Math.round((cardBox.width - cropSize) * 0.5)),
      y: Math.max(0, Math.round((cardBox.height - cropSize) * 0.5)),
      width: cropSize,
      height: cropSize
    };

    const tiles = [];
    for (const j of joints) {
      await evaluate(`window.__ANATOMY_DEBUG__.focusJoint(${JSON.stringify(j.id)}, 2.8)`);
      await sleep(50);
      const b64 = await captureBase64("#figure-card", cropRegion, 1);
      tiles.push({
        label: j.id,
        sublabel: `[${j.world.join(", ")}]`,
        base64: b64
      });
    }
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(tiles.length))));
    const outFile = opts.out || join(outDir, "inspect-joints.png");
    const sheetB64 = await tileImages(tiles, cols, { crosshair: true });
    const saved = saveBase64Png(outFile, sheetB64);
    console.log(`saved ${tiles.length} zoomed joint crops: ${saved}`);
  }

  console.log(problems.length ? problems.join("\n") : "console: clean");
  if (problems.length > 0) process.exit(1);
});
