import { dirname, join, resolve } from "node:path";
import { withHeadlessPage } from "./chrome-port.mjs";

function usage() {
  console.log(`Anatomy 3D — Crank Cycle, Explode, Cutaway & Theme Verification Driver

Usage:
  node scripts/drive.mjs <path/to/figure.html> [--out <dir>]
`);
}

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
  usage();
  process.exit(argv.length ? 0 : 1);
}

const htmlPath = resolve(argv[0]);
const outIdx = argv.indexOf("--out");
const outDir = outIdx !== -1 ? resolve(argv[outIdx + 1]) : dirname(htmlPath);

await withHeadlessPage(htmlPath, { width: 1440, height: 940, scale: 1.5 }, async (page) => {
  const { send, evaluate, sleep, captureBase64, saveBase64Png, tileImages, problems } = page;

  const summary = await evaluate(`window.__ANATOMY_DEBUG__.getSummary()`);
  console.log(
    `driving ${htmlPath} · ${summary.parts} parts · ${summary.tubes} tubes · ${summary.joints.length} joints`
  );

  // 1. Capture Full Hero Stills (Light, Dark, and Exploded when enabled)
  await evaluate(`window.__ANATOMY_DEBUG__.setOrthoView("iso")`);
  await evaluate(`window.__ANATOMY_DEBUG__.setPose({ theta: 0.65, explode: 0, cutaway: true, shader: true, hud: true, theme: "light" })`);
  await sleep(80);
  const heroLight = saveBase64Png(join(outDir, "hero-light.png"), await captureBase64(".wrapper", null, 1));
  console.log(`saved ${heroLight}`);

  if (summary.features?.explode !== false) {
    await evaluate(`window.__ANATOMY_DEBUG__.setPose({ theta: 0.65, explode: 1, cutaway: true, shader: true, hud: true, theme: "light" })`);
    await sleep(80);
    const heroExploded = saveBase64Png(join(outDir, "hero-exploded.png"), await captureBase64(".wrapper", null, 1));
    console.log(`saved ${heroExploded}`);
  }

  await evaluate(`window.__ANATOMY_DEBUG__.setPose({ theta: 0.65, explode: 0, cutaway: true, shader: true, hud: true, theme: "dark" })`);
  await sleep(80);
  const heroDark = saveBase64Png(join(outDir, "hero-dark.png"), await captureBase64(".wrapper", null, 1));
  console.log(`saved ${heroDark}`);

  // 2. Build Interactive Motion, Feature & Theme Contact Sheet (inspect-drive.png)
  const defaultStates = [
    { label: "1. θ = 0° (INTAKE)",       pose: { theta: 0,              explode: 0, cutaway: true,  shader: true, hud: true, theme: "light" } },
    { label: "2. θ = 90° (COMPRESSION)", pose: { theta: Math.PI * 0.5,  explode: 0, cutaway: true,  shader: true, hud: true, theme: "light" } },
    { label: "3. θ = 180° (IGNITION)",   pose: { theta: Math.PI,        explode: 0, cutaway: true,  shader: true, hud: true, theme: "light" } },
    { label: "4. θ = 270° (EXHAUST)",    pose: { theta: Math.PI * 1.5,  explode: 0, cutaway: true,  shader: true, hud: true, theme: "light" } },
    { label: "5. EXPLODED (E = 1)",      pose: { theta: 0.65,           explode: 1, cutaway: true,  shader: true, hud: true, theme: "light" } },
    { label: "6. CUTAWAY OFF (C = 0)",   pose: { theta: 0.65,           explode: 0, cutaway: false, shader: true, hud: true, theme: "light" } },
    { label: "7. DARK THEME",            pose: { theta: 0.65,           explode: 0, cutaway: true,  shader: true, hud: true, theme: "dark" } },
    { label: "8. BLUEPRINT THEME",       pose: { theta: 0.65,           explode: 0, cutaway: true,  shader: true, hud: true, theme: "blueprint" } }
  ];
  const states =
    Array.isArray(summary.drivePoses) && summary.drivePoses.length > 0
      ? summary.drivePoses
      : defaultStates.filter((s) => summary.features?.explode !== false || !s.pose.explode);

  const tiles = [];
  for (const s of states) {
    await evaluate(`window.__ANATOMY_DEBUG__.setOrthoView(${JSON.stringify(s.view || "iso")})`);
    await evaluate(`window.__ANATOMY_DEBUG__.setPose(${JSON.stringify(s.pose)})`);
    await sleep(60);
    const readout = await evaluate(`(document.getElementById("readout") || {}).textContent || ""`);
    const phase = await evaluate(`(document.getElementById("phase-corner") || {}).textContent || ""`);
    const b64 = await captureBase64(".wrapper", null, 0.45);
    tiles.push({ label: s.label, sublabel: `${phase} · ${readout.trim()}`, base64: b64 });
  }

  const sheetB64 = await tileImages(tiles, 2);
  const driveSheetPath = saveBase64Png(join(outDir, "inspect-drive.png"), sheetB64);
  console.log(`saved 8-state drive sheet: ${driveSheetPath}`);

  // 3. Verify Mobile Responsive Viewport (390x844)
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await evaluate(`window.dispatchEvent(new Event("resize"))`);
  await evaluate(`window.__ANATOMY_DEBUG__.setOrthoView("iso")`);
  await evaluate(`window.__ANATOMY_DEBUG__.setPose({ theta: 0.65, explode: 0, cutaway: true, shader: true, hud: true, theme: "light" })`);
  await sleep(100);
  const mobilePath = saveBase64Png(join(outDir, "mobile-390.png"), await captureBase64(".wrapper", null, 1));
  const scrollsSideways = await evaluate(`document.documentElement.scrollWidth > innerWidth + 1`);
  console.log(`saved mobile viewport (390px): ${mobilePath} · scrolls sideways: ${scrollsSideways ? "YES" : "no"}`);

  console.log(problems.length ? problems.join("\n") : "console: clean");
  if (problems.length > 0 || scrollsSideways) process.exit(1);
});
