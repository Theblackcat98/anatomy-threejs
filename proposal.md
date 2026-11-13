To replicate the `anatomy` workflow with this \*\*Three.js + GLSL\*\* engine in an agentic environment (Claude Code, Cursor, Codex, OpenCode, etc.), you need to solve the core difference between 2D SVG and 3D WebGL:



\* \*\*What Three.js gives you for free:\*\* You no longer need the 2D painter’s-algorithm depth sorter (`depth order` audits disappear because the WebGL Z-buffer handles occlusion automatically at every angle).

\* \*\*What an LLM agent still struggles with in 3D:\*\* Coordinate orientation bugs (e.g., `CylinderGeometry` is Y-up while `ExtrudeGeometry` is Z-extruded), floating parts that miss their mounting surface by `0.05` units, parts that clip through each other during rotation, and `TubeGeometry` cables that pass through solid walls.



If an agent writes a 1,500-line HTML file in one shot, it cannot catch those spatial bugs. To make the agent build and refine \*\*incrementally\*\*, you structure the project around \*\*four pillars\*\*:



1\. \*\*Modular Assembly Files\*\* (so the agent edits 100-line files, not a 1,500-line monolith).

2\. \*\*A Scene Registry (`reg.part` / `reg.tube`)\*\* that wraps Three.js meshes with semantic metadata.

3\. \*\*A Headless Node.js 3D Geometry Auditor (`--audit`)\*\* that checks collisions, grounding, and cable endpoints in pure math before opening a browser.

4\. \*\*A Multi-Angle \& Joint-Crop Visual Harness (`inspect.mjs`)\*\* that renders isolated parts and zoomed-in joint crops for the agent’s vision tool.



\---



\### 1. Project \& Skill Architecture



Instead of having the agent edit the final HTML directly, separate the \*\*immutable style kit\*\* from the \*\*per-figure assemblies\*\*, and have a small `build.mjs` bundle them into the final standalone `.html` file:



```text

anatomy-3d/

├── SKILL.md                     # Agent instructions \& incremental loop rules

├── kit/                         # Immutable Three.js Anatomy engine (agent reads, never edits)

│   ├── shaders.mjs              # 4-tone + top-cap GLSL shader, outline shader, themes

│   ├── primitives.mjs           # Rounded boxes, extrusions, gears, screws, knurls, ticks

│   ├── registry.mjs             # Scene graph wrapper that records parts, joints \& bounds

│   ├── audit3d.mjs              # Node.js 3D bounding/OBB/raycast collision \& grounding checker

│   └── shell.html               # HTML/CSS template with mobile pan/pinch/orbit \& HUD toggles

├── scripts/

│   ├── inspect.mjs              # Playwright script: renders ISO + orthographic + joint crops

│   └── drive.mjs                # Steps crank angles \& explode states to verify motion

└── figures/

&#x20;   └── wankel-engine/

&#x20;       ├── build.mjs            # Compiles modules + shell.html -> dist/wankel-engine.html

&#x20;       ├── model.mjs            # Step 1: Pure math, true numbers, anchor coordinates

&#x20;       ├── base.mjs             # Step 2: Bedplate, feet, ruler, nameplate (tone: lo)

&#x20;       ├── structure.mjs        # Step 3: Pedestals, stator housing, ports, plugs (tone: mid)

&#x20;       ├── subject.mjs          # Step 4: The one lit part — Rotor \& apex seals (tone: lit)

&#x20;       ├── mechanism.mjs        # Step 5: E-shaft, gears, gauge, cables, knob (tone: hi/mid)

&#x20;       └── shader.mjs           # Step 6: World-space GLSL chamber shader

```



\---



\### 2. The Scene Registry (`kit/registry.mjs`)



In raw Three.js, `group.add(mesh)` loses the intent of \*what\* the part is and \*what\* it attaches to. Give the agent a `Recorder3D` API (similar to `anatomy`'s `recorder(P)`) so every part registers its semantic role, mounting rule, and collision group:



```javascript

// kit/registry.mjs

import \* as THREE from 'three';



export class Recorder3D {

&#x20; constructor(sceneRoot, kit) {

&#x20;   this.root = sceneRoot;

&#x20;   this.kit = kit;

&#x20;   this.parts = new Map();   // id -> { id, mesh, opts, worldBox }

&#x20;   this.tubes = \[];          // { id, curve, radius, from, to }

&#x20;   this.joints = new Map();  // id -> THREE.Vector3 (named anchor points)

&#x20; }



&#x20; // Register a named 3D anchor/port so other files can snap to it without guessing coordinates

&#x20; anchor(id, x, y, z, parentGroup = this.root) {

&#x20;   const obj = new THREE.Object3D();

&#x20;   obj.position.set(x, y, z);

&#x20;   parentGroup.add(obj);

&#x20;   this.joints.set(id, obj);

&#x20;   return obj;

&#x20; }



&#x20; // Create an Anatomy-styled 3D solid and register it for the 3D geometry audit

&#x20; part(id, geometry, opts = {}) {

&#x20;   const {

&#x20;     ramp = 'mid',          // 'lo' | 'mid' | 'hi' | 'lit' | 'brass' | 'copper'

&#x20;     outline = 'mid',

&#x20;     crease = 'faint',

&#x20;     parent = this.root,

&#x20;     pos = \[0, 0, 0],

&#x20;     rot = \[0, 0, 0],

&#x20;     mountOn = null,        // ID of part this must touch/rest on (or 'ground')

&#x20;     allowOverlap = \[],     // IDs of parts allowed to intersect (e.g. meshing gears, coaxial shafts)

&#x20;     explode = \[0, 0, 0],   // Axial offset vector when Explode (E) = 1

&#x20;     detail = false         // True for tiny screws/ticks (skips heavy collision checks)

&#x20;   } = opts;



&#x20;   const group = this.kit.createAnatomyPart(geometry, { ramp, outline, crease });

&#x20;   group.name = id;

&#x20;   group.position.set(...pos);

&#x20;   group.rotation.set(...rot);

&#x20;   group.userData = { id, mountOn, allowOverlap, explode, basePos: \[...pos], detail };



&#x20;   parent.add(group);

&#x20;   this.parts.set(id, { id, group, geometry, opts: group.userData });

&#x20;   return group;

&#x20; }



&#x20; // Route a 3D pipe/cable between two named anchors and check for kinks/collisions

&#x20; tube(id, anchorFromId, waypoints, anchorToId, opts = {}) {

&#x20;   const fromObj = this.joints.get(anchorFromId);

&#x20;   const toObj = this.joints.get(anchorToId);

&#x20;   if (!fromObj || !toObj) {

&#x20;     throw new Error(`Tube "${id}" references missing anchor: ${anchorFromId} -> ${anchorToId}`);

&#x20;   }

&#x20;   const pStart = fromObj.getWorldPosition(new THREE.Vector3());

&#x20;   const pEnd = toObj.getWorldPosition(new THREE.Vector3());

&#x20;   const pts = \[pStart, ...waypoints.map(p => new THREE.Vector3(...p)), pEnd];



&#x20;   const curve = new THREE.CatmullRomCurve3(pts);

&#x20;   const radius = opts.radius || 0.03;

&#x20;   const geo = new THREE.TubeGeometry(curve, 32, radius, 12, false);

&#x20;   const part = this.part(id, geo, { ...opts, allowOverlap: \[opts.fromPart, opts.toPart] });



&#x20;   this.tubes.push({ id, curve, radius, from: anchorFromId, to: anchorToId, opts });

&#x20;   return part;

&#x20; }

}

```



\*\*Why this helps the agent:\*\*

Instead of hardcoding magic numbers across files (like `new THREE.Vector3(2.02, -1.27, -0.52)` for a spark plug wire), `structure.mjs` registers `reg.anchor('plug.leading.tip', 0, 0.68, 0, leadingPlugGroup)`, and `mechanism.mjs` simply connects `'coil.tower.1'` to `'plug.leading.tip'`.



\---



\### 3. The Fast Node.js 3D Geometry Audit (`kit/audit3d.mjs`)



Because `THREE.Box3`, `THREE.Raycaster`, and matrix transforms are pure JavaScript math, they run in \*\*Node.js in \~150ms without a GPU or browser\*\*. When the agent runs `node build.mjs --audit`, the script steps the model through multiple crank angles (`theta = 0, π/2, π...`) and exploded states (`explode = 0, 1`) and checks four physical rules:



```javascript

// kit/audit3d.mjs

import \* as THREE from 'three';



export function runGeometryAudit(reg, stepModelFn) {

&#x20; const errors = \[];

&#x20; const poses = \[

&#x20;   { name: 'rest (θ=0)', theta: 0, explode: 0 },

&#x20;   { name: 'quarter (θ=90°)', theta: Math.PI \* 0.5, explode: 0 },

&#x20;   { name: 'half (θ=180°)', theta: Math.PI, explode: 0 },

&#x20;   { name: 'exploded', theta: 0, explode: 1 }

&#x20; ];



&#x20; for (const pose of poses) {

&#x20;   stepModelFn(pose.theta, pose.explode);

&#x20;   reg.root.updateMatrixWorld(true);



&#x20;   const boxes = new Map();

&#x20;   for (const \[id, item] of reg.parts) {

&#x20;     if (item.opts.detail) continue;

&#x20;     const box = new THREE.Box3().setFromObject(item.group);

&#x20;     boxes.set(id, box);

&#x20;   }



&#x20;   // 1. SUPPORT / FLOATING CHECK (Only in rest pose)

&#x20;   if (pose.explode === 0) {

&#x20;     for (const \[id, item] of reg.parts) {

&#x20;       const targetId = item.opts.mountOn;

&#x20;       if (!targetId || targetId === 'ground') continue;

&#x20;       const boxA = boxes.get(id);

&#x20;       const boxB = boxes.get(targetId);

&#x20;       if (boxA \&\& boxB) {

&#x20;         const expandedB = boxB.clone().expandByScalar(0.03); // 0.03 tolerance

&#x20;         if (!expandedB.intersectsBox(boxA)) {

&#x20;           const gap = boxA.distanceToPoint(boxB.getCenter(new THREE.Vector3())).toFixed(3);

&#x20;           errors.push(`\[FLOATING] "${id}" does not touch its mount "${targetId}" (gap \~${gap})`);

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;   }



&#x20;   // 2. SOLID INTERSECTION / CLIPPING CHECK

&#x20;   const ids = Array.from(boxes.keys());

&#x20;   for (let i = 0; i < ids.length; i++) {

&#x20;     for (let j = i + 1; j < ids.length; j++) {

&#x20;       const idA = ids\[i], idB = ids\[j];

&#x20;       const optsA = reg.parts.get(idA).opts;

&#x20;       const optsB = reg.parts.get(idB).opts;



&#x20;       if (

&#x20;         optsA.mountOn === idB || optsB.mountOn === idA ||

&#x20;         optsA.allowOverlap?.includes(idB) || optsB.allowOverlap?.includes(idA)

&#x20;       ) continue;



&#x20;       // Shrink AABB slightly by 0.015 so flush surfaces don't trigger false positives

&#x20;       const bA = boxes.get(idA).clone().expandByScalar(-0.015);

&#x20;       const bB = boxes.get(idB).clone().expandByScalar(-0.015);



&#x20;       if (bA.intersectsBox(bB)) {

&#x20;         const overlap = bA.intersect(bB);

&#x20;         const sz = overlap.getSize(new THREE.Vector3());

&#x20;         // Ignore tiny corner AABB grazing; flag real penetration

&#x20;         if (sz.x \* sz.y \* sz.z > 0.0008) {

&#x20;           errors.push(

&#x20;             `\[COLLISION in ${pose.name}] "${idA}" clips "${idB}" ` +

&#x20;             `(overlap ${sz.x.toFixed(2)}×${sz.y.toFixed(2)}×${sz.z.toFixed(2)})`

&#x20;           );

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;   }

&#x20; }



&#x20; // 3. TUBE / CABLE BEND RADIUS (KINK) CHECK

&#x20; for (const tube of reg.tubes) {

&#x20;   const pts = tube.curve.getPoints(40);

&#x20;   for (let i = 1; i < pts.length - 1; i++) {

&#x20;     const v1 = pts\[i].clone().sub(pts\[i - 1]).normalize();

&#x20;     const v2 = pts\[i + 1].clone().sub(pts\[i]).normalize();

&#x20;     const angleDeg = THREE.MathUtils.radToDeg(v1.angleTo(v2));

&#x20;     if (angleDeg > 42) {

&#x20;       errors.push(`\[TUBE KINK] "${tube.id}" bends too sharply (${angleDeg.toFixed(1)}° at segment ${i})`);

&#x20;       break;

&#x20;     }

&#x20;   }

&#x20; }



&#x20; return errors;

}

```



When the agent runs `node figures/wankel-engine/build.mjs --audit`, it gets actionable text feedback right in its terminal tool:

```text

✗ 2 problems found:

&#x20; \[FLOATING] "gauge.collar" does not touch its mount "base.plate" (y-gap: 0.080)

&#x20; \[COLLISION in quarter (θ=90°)] "rotor.body" clips "stator.housing" (overlap 0.06×0.12×0.68)

```

The agent can immediately fix the coordinate math in the small file where that part lives without needing to guess.



\---



\### 4. The Visual Inspection \& Joint-Crop Harness (`scripts/inspect.mjs`)



Text audits catch bounding-box bugs, but \*\*visual craft\*\* (whether gear teeth align, whether a cutout window frames the rotor nicely, whether knurling ribs look too dense) requires the agent's multimodal vision tool (`Read` on PNGs).



In your `shell.html`, expose a tiny global hook on `window.\_\_ANATOMY\_DEBUG\_\_`:

```javascript

window.\_\_ANATOMY\_DEBUG\_\_ = {

&#x20; setCamera(elevDeg, azimDeg, zoom = 1.0, targetVec = \[0, 0, 0]) { /\* ... \*/ },

&#x20; isolate(partIdsArray) { /\* hides all parts except partIdsArray \*/ },

&#x20; setPose(thetaRad, explodeFactor, themeId) { /\* ... \*/ },

&#x20; focusJoint(anchorId, zoom = 2.8) {

&#x20;   const p = reg.joints.get(anchorId).getWorldPosition(new THREE.Vector3());

&#x20;   // Pan orthographic camera directly to p and zoom in 2.8x!

&#x20; }

};

```



Then `scripts/inspect.mjs` uses Playwright to automatically generate a \*\*contact sheet\*\* for the agent after each edit:

1\. \*\*Orthographic Blueprint Quad (`dist/inspect-ortho.png`)\*\*: Renders `Front (0°, 0°)`, `Right (0°, 90°)`, `Top (90°, 0°)`, and `Canonical Iso (30°, -36°)` side-by-side. Looking at `Front` and `Top` makes any off-center shaft or floating bolt obvious to a vision model.

2\. \*\*Sub-Assembly Isolation (`node scripts/inspect.mjs --isolate subject`)\*\*: Hides the housing and baseplate so the agent can inspect just the Wankel rotor, its internal 51-tooth gear, and its apex seals in isolation.

3\. \*\*Zoomed Joint Crops (`node scripts/inspect.mjs --joints`)\*\*: Iterates over registered anchors (`plug.leading.tip`, `gear.mesh.point`, `gauge.dial`) and saves `400×400` 3× zoomed crops so the agent can verify that every line and cable resolves cleanly on a collar or flange.



\---



\### 5. The Incremental Process (`SKILL.md` Workflow)



Finally, encode the incremental workflow in your `SKILL.md` so the agent is forbidden from writing everything at once and instead works in \*\*6 small, verified commits/edits\*\*:



```markdown

\# Anatomy 3D — Agent Workflow



Never write a figure in a single file or a single pass. Follow these 6 incremental stages. Do not move to the next stage until the current stage's check passes with 0 errors.



\## Stage 1: Truth \& Anchors (`model.mjs`)

1\. Research or derive the real physical equations and dimensions (gear tooth counts, eccentricities, stroke lengths, pressure curves).

2\. Export `SPEC` constants, a pure `stepModel(state, dt)` function, and the key 3D coordinate anchors (`ANCHORS`).

3\. Verify: Run `node build.mjs --test-model` to assert that values stay bounded across a full cycle.



\## Stage 2: The Bench \& Base Assembly (`base.mjs` — `tone: "lo"`)

1\. Build only the heavy instrument bedplate, inset perimeter grooves, turned feet with collars, corner counterbore screws, ruler strip, and engraved spec plaque.

2\. Register mounting anchors (`base.top`, `cradle.rear.mount`, `cradle.front.mount`).

3\. Verify: Run `node build.mjs --audit` and `node ../../scripts/inspect.mjs --isolate base`. View `dist/inspect-base.png` to confirm feet sit under the plate and ticks/screws sit flush on `base.top`.



\## Stage 3: Primary Structure \& Housing (`structure.mjs` — `tone: "mid"`)

1\. Build the support pedestals, main stator housing, intake/exhaust manifolds, and port bosses mounted on the Stage 2 anchors.

2\. Register port anchors (`port.intake`, `port.exhaust`, `plug.1`, `plug.2`).

3\. Verify: Run `node build.mjs --audit` and inspect `dist/inspect-ortho.png` (Front, Top, Side, Iso) to confirm the housing is centered on the pedestals with 0 clipping.



\## Stage 4: The One Lit Subject (`subject.mjs` — `tone: "lit"`)

1\. Build the primary moving subject (the only assembly using `ramp: "lit"` and `outline: "lit"`).

2\. Include fine surface craft on the subject: seals, recesses, internal teeth, and pin dots.

3\. Verify: Run `node ../../scripts/inspect.mjs --isolate subject` to inspect the subject alone, then run `node build.mjs --audit` across 4 crank angles to prove the moving subject never clips the Stage 3 housing.



\## Stage 5: Mechanism, Gauges \& Routed Cables (`mechanism.mjs` — `tone: "hi" / "mid"`)

1\. Add the driving shafts, counterweights, degree timing dials, knurled bench knobs, live Bourdon gauges, and `reg.tube()` cables connecting port anchors.

2\. Verify: Run `node ../../scripts/inspect.mjs --joints` and inspect the zoomed crops of every cable termination and gear mesh. Fix any floating ends or sharp kinks.



\## Stage 6: In-Camera Shader \& Full Cycle Polish (`shader.mjs`)

1\. Add the world-space GLSL shader plane (for combustion, fluid, plasma, or field lines) driven by `model.mjs` envelopes.

2\. Run `node ../../scripts/drive.mjs` to capture Rest, Exploded (`E`), Cutaway (`C`), and Dark/Blueprint themes. Inspect the final contact sheet before finishing.

```



\### Why This Works So Well in Practice

1\. \*\*Small Edit Radius\*\*: When the agent wants to tweak the rotor's apex seals or fix a spark plug cable kink, it uses its `Edit` tool on a \*\*70-line file\*\* (`subject.mjs` or `mechanism.mjs`) instead of regenerating a 1,500-line HTML file.

2\. \*\*Deterministic Math + Vision Feedback\*\*: The Node.js `THREE.Box3` audit catches 3D coordinate mistakes in milliseconds, while the `--isolate` and `--joints` crops let the vision model critique its own 3D geometry the exact same way a CAD engineer checks front/side/iso views.

