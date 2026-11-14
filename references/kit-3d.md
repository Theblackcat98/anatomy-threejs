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
Wraps a `THREE.BufferGeometry` in a 3-layer Anatomy mesh group (quantized cel-shaded fill + backface inverted-hull silhouette + `THREE.EdgesGeometry` crease lines, or custom Fresnel cel glass when `ramp: "glass"`) and registers it for collision and grounding audits.
```js
reg.part("stator.housing", housingGeo, {
  parent: statorGroup,
  pos: [0, 0, 0],
  rot: [0, 0, 0],
  ramp: "mid",               // 'lo' | 'mid' | 'hi' | 'lit' | 'brass' | 'copper' | 'glass' | 'intake'|'comp'|'comb'|'exhaust' | 'channelA..D'
  outline: "hi",             // 'lo' | 'mid' | 'hi' | 'lit'
  crease: "lo",              // 'faint' | 'lo' | 'mid' | 'hi'
  creaseAngle: 22,           // Threshold angle in degrees for THREE.EdgesGeometry (default 28)
  outlineWidth: 0.02,        // World-space inverted hull extrusion width (default 0.017; 0.009 for glass)
  topBias: 0.62,             // Upward-normal top-cap brightness blend (0..1)
  opacity: undefined,        // Optional custom glass opacity override when ramp === "glass"
  clippable: false,          // Set true so SPEC.section slicing plane clips solid, outline, and creases with cross-hatching
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

### `reg.screen(id, opts)`
Mounts a live 2D HTML5 `<canvas>` (`THREE.CanvasTexture`) panel inside a cel-shaded bezel part in the 3D scene and redraws it each frame:
```js
reg.screen("scope.crt", {
  parent: cabinetGroup,
  pos: [0, 0.35, 0.85],
  width: 1.4,
  height: 0.9,
  resolution: [256, 168],
  mountOn: "cabinet.shell",
  draw: (ctx, canvas, state, theme) => {
    ctx.fillStyle = theme.css.card;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw live waveforms, P-V loops, buffer queues, or state telemetry
  }
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

### `reg.interactable(targetId, opts)`
Registers a 3D group or part as directly draggable in the viewport via pointer raycasting (`runtime.mjs`). When the user hovers over its solid meshes, the cursor switches to `opts.cursor` (`"grab"` or `"move"`), and single-pointer dragging invokes `opts.onDrag` instead of orbiting the camera — even while rotation is paused.
```js
reg.interactable("swash.assembly", {
  cursor: "grab",
  hint: "Drag swashplate to tilt cyclic & lift collective",
  onDrag: ({ dx, dy, worldDx, worldDy, state, setParam }) => {
    setParam("collective", (state.params.collective ?? 8.5) - dy * 0.08);
    setParam("cyclicRoll", (state.params.cyclicRoll ?? 0) + dx * 0.14);
  }
});
```

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
- **`makeDatumGrid(width, depth, divisionsX = 8, divisionsZ = 6, y = 0, kit, toneKey = "faint")`**:
  Returns an orthographic blueprint datum grid (`THREE.Group`) with perimeter outline and center crosshair for `"free-space"`, `"section"`, or `"diorama"` archetypes.
- **`makeGimbalDatumRing(radius, y = 0, kit, toneKey = "lo")`**:
  Returns a graduated 360° equatorial ring + meridian arc (`THREE.Group`) for `"free-space"` or aerospace figures.
- **`buildEnclosureBoxGeometry(width, height, depth, wallThickness = 0.12, opts = { openTop: false, centerY: true })`**:
  Builds a watertight, hollow open-front cabinet/chassis `THREE.BufferGeometry` for `"cabinet"` / `"enclosure"` figures.

---

## 3. Shader & Theme Kit (`kit/shaders.mjs`)

`createShaderKit()` returns `kit`:
- `kit.THEMES`: Array of the 5 canonical themes (`light`, `paper`, `dark`, `blueprint`, `sepia`), each with `ramps` (`lo`, `mid`, `hi`, `lit`, `brass`, `copper`, plus auto-derived semantic channel ramps `intake`/`channelA`, `comp`/`channelB`, `comb`/`channelC`, `exhaust`/`channelD`), `channels`, and `glass`.
- `kit.createAnatomyPart(geometry, opts)`: Low-level factory called by `reg.part()`. Supports `ramp: "glass"` and `clippable: true`.
- `kit.createGlassMaterial(opts)`: Creates a translucent Fresnel cel-glass `THREE.ShaderMaterial`.
- `kit.setSectionPlane(planeOrNull)`: Enables/updates dynamic 3D world-space clipping with diagonal cross-hatched interior section faces across all `clippable: true` solids, outlines, and crease lines.
- `kit.lineMaterials`: `{ faint, lo, mid, hi, lit }` (`THREE.LineBasicMaterial`, automatically updated on theme switch).
- `kit.dotMaterials`: `{ dot, lit }` (`THREE.MeshBasicMaterial`, automatically updated on theme switch).
- `kit.onThemeChange(fn)`: Registers a callback `(theme) => void` invoked whenever the user or harness switches themes (used by `shader.mjs` and `reg.screen()`).

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
`buildAndVerifyFigure` runs `runModelAudit` when `--test-model` or `--audit` is passed, runs `runGeometryAudit` across `SPEC.auditPoses` (or the default poses, omitting `explode` when `SPEC.features.explode === false`) when `--audit` is passed, and compiles the `kit/` engine + your 6 stage `.mjs` files into `dist/<slug>.html`.

---

## 5. `SPEC` Declarative Configuration (`model.mjs`) & Runtime Helpers (`kit/runtime.mjs`)

`kit/runtime.mjs`, `kit/audit3d.mjs`, and `scripts/drive.mjs` read optional declarative fields on `SPEC`:
- **`SPEC.archetype`**: `"bench"` (default) | `"gantry"` | `"test-stand"` | `"cabinet"` | `"enclosure"` | `"section"` | `"diorama"` | `"free-space"`.
- **`SPEC.simulationMode`**: `"continuous"` (default, shaft RPM loop) | `"sequence"` (discrete `steps` & `triggers`) | `"timeline"` (0..1 scrub slider) | `"sandbox"` (at rest until 3D drag or impulse trigger).
- **`SPEC.toneMode`**: `"single-lit"` (default, `lit` confined to stage `"subject"`) | `"multi-channel"` (allows `lit`, `glass`, and channel ramps across stages).
- **`SPEC.features`**: `{ explode, cutaway, shader, crank, slow, rpm, section, timeline }`. Set `explode: false` to hide `APART` / `E`, exploded audit poses, and `hero-exploded.png`. In non-continuous simulation modes, `crank`, `slow`, and `rpm` default to `false` unless explicitly enabled.
- **`SPEC.interactionHint`**: String prepended to the bottom-left interaction bar (e.g., `"Drag swashplate, stick, or collective lever"`).
- **`SPEC.controls`**: Array of domain-specific sliders rendered in `#custom-sliders`, spring-smoothed in `runtime.mjs`, and passed to `updateKinematics` and `formatReadout` via `state.params` and top-level `state.<id>`:
  ```js
  controls: [
    { id: "collective", label: "COLL", min: 2, max: 14, step: 0.2, initial: 8.5, title: "Collective pitch (deg)" },
    { id: "rpm", label: "RPM", min: 0, max: 1600, step: 20, initial: 480, title: "Rotor drive RPM" }
  ]
  ```
- **`SPEC.triggers`**: Array of `{ id, label, title?, rise?, fall?, onTrigger? }` action buttons rendered in `#triggers-group`. Clicking fires `burst(age, rise, fall)` envelopes passed to `updateKinematics` / `formatReadout` as `state.triggers[id]` (`0..1`) and `state.triggerAges[id]` (seconds).
- **`SPEC.steps`**: Array of `{ id, label, theta?, timeline?, params? }` states cycled via an automatic `STEP` button in `#triggers-group`.
- **`SPEC.section`**: Optional `{ axis: "x"|"y"|"z", min, max, initial, label?, step?, invert?, alwaysActive? }` enabling `renderer.localClippingEnabled` and a live slicing plane slider over `clippable: true` parts.
- **`SPEC.cameraViews`**: Optional array of `{ id, label, elev, azim, zoom, pan }` rendered as top header pills and mapped to keys `1`–`9`.
- **`SPEC.tour` / `export function tourAt(clock, state)`**: Optional idle demonstration callback returning `{ explode?, cutaway?, shader?, rpm?, theta?, section?, cameraView?, trigger?, params? }`. Runs after ~1.6s idle on load and yields immediately on user input (resuming after ~3.6s idle).
- **Exported Motion Helpers (`kit/runtime.mjs`)**: Available both via ESM import and inside the compiled bundle:
  - `clamp01(x)`
  - `smooth(a, b, x)` — Hermite smoothstep on `[a, b]`
  - `burst(age, rise = 0.08, fall = 0.65)` — smooth one-shot pulse envelope for triggers
  - `settle(held, want, dt, seconds = 0.25, calm = 1)` — exponential settle toward a target
- **`SPEC.auditPoses`**: Optional array of `{ name, theta, explode, params, triggers? }` poses verified by `runGeometryAudit`.
- **`SPEC.drivePoses`**: Optional array of `{ label, view?, pose: { theta, explode, cutaway, shader, section?, cameraView?, trigger?, hud, theme, params } }` tiles captured by `scripts/drive.mjs` into `inspect-drive.png`.
- **Debug Harness (`window.__ANATOMY_DEBUG__`)**: Includes `setCamera`, `setOrthoView`, `setCameraView`, `setSection`, `fireTrigger`, `advanceStep`, `isolate`, `setPose`, `focusJoint`, `getJoints`, and `getSummary`.
