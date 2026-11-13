# `kit/` API Reference (`references/kit-3d.md`)

The `kit/` directory provides the immutable Three.js Anatomy engine. Import from `../../kit/...` inside `figures/<slug>/*.mjs`; never modify `kit/` for an individual figure.

---

## 1. `Recorder3D` (`kit/registry.mjs`)

Every stage function (`buildBase`, `buildStructure`, `buildSubject`, `buildMechanism`, `buildShader`) receives `(reg, kit)`. `reg` is an instance of `Recorder3D` that builds the Three.js scene graph while recording metadata for the 3D geometry audit (`kit/audit3d.mjs`) and the visual inspection harness (`window.__ANATOMY_DEBUG__`).

### `reg.group(id, opts)`
Creates and registers a named `THREE.Group` for assemblies, kinematic sub-trees, or exploded layers.
```js
const rotorOrbit = reg.group("rotor.orbit", {
  parent: reg.root,          // Parent Object3D (defaults to reg.root)
  pos: [0, 0, 0],            // Initial local position [x, y, z]
  rot: [0, 0, 0],            // Initial local Euler rotation [rx, ry, rz] (radians)
  explode: [0, 0, 0.36],     // Axial offset vector applied when Explode (E) = 1
  cutawayHide: false,        // If true, hides this group when Cutaway (C) = 1 and Explode = 0
  stage: "subject"           // Stage tag ('base' | 'structure' | 'subject' | 'mechanism' | 'shader')
});
```

### `reg.part(id, geometry, opts)`
Wraps a `THREE.BufferGeometry` in a 3-layer Anatomy mesh group (quantized cel-shaded fill + backface inverted-hull silhouette + `THREE.EdgesGeometry` crease lines) and registers it for collision and grounding audits.
```js
reg.part("stator.housing", housingGeo, {
  parent: statorGroup,
  pos: [0, 0, 0],
  rot: [0, 0, 0],
  ramp: "mid",               // 'lo' | 'mid' | 'hi' | 'lit' | 'brass' | 'copper'
  outline: "hi",             // 'lo' | 'mid' | 'hi' | 'lit'
  crease: "lo",              // 'faint' | 'lo' | 'mid' | 'hi'
  creaseAngle: 22,           // Threshold angle in degrees for THREE.EdgesGeometry (default 28)
  outlineWidth: 0.02,        // World-space inverted hull extrusion width (default 0.017)
  topBias: 0.62,             // Upward-normal top-cap brightness blend (0..1)
  noOutline: false,          // Set true to omit the inverted-hull outline mesh
  noCrease: false,           // Set true on smooth curved tubes/rods to omit interior facet lines
  mountOn: "ground",         // ID of supporting part, 'ground', or 'coaxial' (required for audit!)
  allowOverlap: [            // IDs of parts permitted to share volume (e.g. coaxial shafts, meshing gears)
    "rear.plate",
    "front.cover",
    "shaft.main"
  ],
  insideBoreOf: null,        // For internal parts (e.g. "stator.housing")
  boreClearanceFn: null,     // Optional (x, y, z) => signed radial clearance inside bore (>0 clear, <0 collision)
  explode: [0, 0, 0],        // Local offset vector when Explode (E) = 1
  detail: false,             // Set true on tiny fasteners/tie-rods to skip heavy triangle-voxel collision checks
  cutawayHide: false         // Set true on front-side parts that should hide when Cutaway (C) is active
});
```

### `reg.anchor(id, x, y, z, parentGroup, opts)` & `reg.getAnchorWorldPos(id)` / `reg.getAnchorWorldDir(id)`
Registers a named 3D port or mounting point inside `parentGroup` and queries its exact world-space `THREE.Vector3` position and optional outward port normal (`opts.dir = [dx, dy, dz]` in `parentGroup` local coordinates). Use anchors so downstream stages never hardcode magic coordinates from earlier stages.
```js
// In structure.mjs (inside spGroup, which has its own position and rotation):
reg.anchor("plug.leading.tip", 0, 0.68, 0, spGroup, { dir: [0, 1, 0] });

// In mechanism.mjs:
const plugTipWorld = reg.getAnchorWorldPos("plug.leading.tip");
const plugDirWorld = reg.getAnchorWorldDir("plug.leading.tip");
```

### `reg.tube(id, anchorFromId, waypoints, anchorToId, opts)`
Routes a centripetal `THREE.CatmullRomCurve3` + `THREE.TubeGeometry` between two registered anchors and registers it for bend-kink (`<= 42°` per arc-length step), port-axis tangency (`<= 38°`), natural slack (`length/chord >= 1.08`), tube-to-tube clearance, solid collision, and terminal-attachment audits. When either anchor carries a `dir` (or `opts.fromDir` / `opts.toDir` is passed), `reg.tube` automatically prepends/appends coaxial tangent handles at `leadOut` and `leadIn` (default `0.18`).
```js
reg.tube("cable.spark.leading", "coil.tower.0.top", waypoints, "plug.leading.tip", {
  parent: baseGroup,
  radius: 0.032,
  segments: 40,
  radialSegments: 12,
  leadOut: 0.18,
  leadIn: 0.22,
  // Optional overrides: fromDir, toDir, curveType: "centripetal", rigid: false
  ramp: "copper",
  outline: "lo",
  fromPart: "coil.tower.0",
  toPart: "plug.leading.boot",
  allowOverlap: ["coil.box", "stator.housing"]
});
```

### `reg.detail(id, object3d, opts)`
Attaches decorative line segments, ring loops, screw slots, or shadow halos (`THREE.Line`, `THREE.LineLoop`, `THREE.LineSegments`, `THREE.Mesh`) to a parent group and tags them with the current stage so `--isolate <stage>` includes them.

### `reg.tag(id, text, x, y, z)`
Registers an engraved monospace DOM label (`<div class="engraved-tag">`) projected every frame from the 3D world point `[x, y, z]`.

---

## 2. Geometry Primitives (`kit/primitives.mjs`)

All primitive builders in `kit/primitives.mjs` are centered and axis-aware:

- **`buildSlabGeometry(width, depth, height, opts)`**:
  Builds a rounded-corner horizontal bedplate slab (`X` width, `Z` depth, extruded along `Y`).
  - `opts`: `{ radius = 0.24, bevel = true, bevelSize = 0.025, bevelThickness = 0.025, bevelSegments = 2, curveSegments = 16 }`.
  - Note: When positioned at `[0, BASE_Y + BASE_H, 0]`, the top surface including the bevel sits at `topSurfaceY = BASE_Y + BASE_H + bevelThickness`.
- **`buildCylinderGeometry(rTop, rBottom, length, { segments = 28, axis = "y" })`**:
  Builds a cylinder aligned along `"x"`, `"y"`, or `"z"` without manual `.rotation.x = Math.PI / 2` boilerplate.
- **`buildExternalGearGeometry(pitchRadius, teeth, addendum, boreRadius, thickness)`**:
  Builds an extruded external involute-style spur gear centered in `XY` and extruded along `Z` (`[-thickness/2, +thickness/2]`).
- **`buildInternalGearRingGeometry(pitchRadius, teeth, addendum, outerRadius, thickness)`**:
  Builds an annular ring with internal gear teeth along its inner bore, centered in `XY` and extruded along `Z`.
- **`makePlanOutline(w, d, r, y, kit, tone = "faint")`**:
  Returns a `THREE.LineLoop` rounded-rectangle groove in the `XZ` plane at height `y`.
- **`makeRingLine(radius, segs, kit, tone = "lo")`**:
  Returns a `THREE.LineLoop` circle of radius `radius` in the `XY` plane.
- **`makeScrewDetail(x, y, z, radius, axis, kit)`**:
  Returns a `THREE.Group` with a circular head outline and slotted cross-line oriented along `"x"`, `"y"`, or `"z"`.
- **`makeKnurlLines(radius, y0, y1, count, kit, { tone = "lo", pointer = null })`**:
  Returns vertical knurl `THREE.LineSegments` around a cylinder of `radius` from `y0` to `y1`, plus an optional top radial pointer line `{ y, z0, z1 }`.
- **`makeRulerTicks(xCenter, width, zCenter, depth, y, totalTicks, majorEvery, kit)`**:
  Returns graduated minor and major tick `THREE.LineSegments` for a bench scale strip.
- **`makeHaloMesh(w, d, r, pos, kit)`**:
  Returns a translucent ground shadow mesh beneath the bedplate.

---

## 3. Shader & Theme Kit (`kit/shaders.mjs`)

`createShaderKit()` returns `kit`:
- `kit.THEMES`: Array of the 5 canonical themes (`light`, `paper`, `dark`, `blueprint`, `sepia`).
- `kit.createAnatomyPart(geometry, opts)`: Low-level factory called by `reg.part()`.
- `kit.lineMaterials`: `{ faint, lo, mid, hi, lit }` (`THREE.LineBasicMaterial`, automatically updated on theme switch).
- `kit.dotMaterials`: `{ dot, lit, halo }` (`THREE.MeshBasicMaterial`, automatically updated on theme switch).
- `kit.registerThemeListener(fn)`: Registers a callback `(theme) => void` invoked whenever the user or harness switches themes (used by `shader.mjs` to update GLSL uniforms).

---

## 4. Bundler (`kit/bundle.mjs`)

In `figures/<slug>/build.mjs`, call `buildAndVerifyFigure(config)` to wire `--test-model`, `--audit`, and standalone HTML bundling in one place:
```js
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndVerifyFigure } from "../../kit/bundle.mjs";
import * as model from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics } from "./mechanism.mjs";
import { buildShader } from "./shader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

buildAndVerifyFigure({
  figureDir: HERE,
  outFile: join(HERE, "dist", "wankel-engine.html"),
  meta: {
    title: "Anatomy · Wankel Rotary Engine (Three.js Isometric)",
    ariaLabel: "Interactive Wankel rotary engine test rig",
    figLabel: "Fig 04 · Wankel Rotary Engine",
    initialPhase: "CHAMBER A · INTAKE",
    initialReadout: "θ 000° · α 000° · 720 rpm · P 1.0 bar",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">13B · R 105 · e 15 · 34:51</div>`,
      `<div class="engraved-tag" id="tag-gauge">BAR</div>`
    ].join("\n        "),
    captionHtml: `<strong>The object is the explanation.</strong> ...`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Rotor (1/3 ω)</span>`
    ].join("\n        ")
  },
  model,
  buildBase,
  buildStructure,
  buildSubject,
  buildMechanism,
  buildShader,
  updateKinematics
});
```
`buildAndVerifyFigure` runs `runModelAudit` when `--test-model` or `--audit` is passed, runs `runGeometryAudit` across 5 poses when `--audit` is passed, and compiles the `kit/` engine + your 6 stage `.mjs` files into `dist/<slug>.html`.
