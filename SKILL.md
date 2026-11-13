---
name: anatomy-threejs
description: Build crafted, interactive isometric 3D technical figures in Three.js and GLSL that explain a technical concept, engine, algorithm, or system as a physical bench-top instrument, cutaway rig, or mechanical assembly. Features four-tone quantized cel shading with top-face bias, inverted-hull silhouettes, sharp crease lines, a 5-theme framed card with live telemetry readout, spring-eased kinematics, direct 3D part manipulation, bespoke physical controls, optional cutaway and exploded views, and an automated 3D spatial & visual verification pipeline. Use whenever someone wants an interactive 3D technical diagram, an isometric Three.js figure, a "Linear-style" or "Anatomy-style" 3D explainer, or a physical mechanism visualization with real-time WebGL shaders.
---

# Anatomy Three.js — Interactive 3D Technical Figures

Build interactive isometric 3D technical illustrations in Three.js + GLSL. Every figure explains a technical idea as a physical bench-top instrument or cutaway test rig you could set on a desk: a heavy beveled bedplate on turned feet, domain-authentic housings and linkages, a hero internal rotor or moving subject, directly draggable 3D controls and instruments built specifically for that machine, and a custom GLSL shader restricted strictly to the physical medium (fire, plasma, fluid, downwash, beam) inside the machine.

Instead of writing a 1,500-line monolithic HTML file and guessing 3D coordinates in your head, you first align with the user on the apparatus and interactions (**Stage 0**), then build every figure in **six isolated stages** inside `figures/<slug>/`, backed by the immutable `kit/` engine and verified at every step by a two-tier **3D Spatial + Orthographic Visual Harness**.

---

## Directory Layout

```text
anatomy-threejs/
├── SKILL.md                    # Stage 0 brief + 6-stage workflow & agent entrypoint
├── kit/                        # IMMUTABLE ENGINE — import from here; never edit per figure
│   ├── shaders.mjs             # 5 themes, 4-tone + top-cap cel shader, inverted hull, creases
│   ├── primitives.mjs          # Axis-aware slabs, cylinders, gears, screws, knurls, ticks
│   ├── registry.mjs            # Recorder3D: .group(), .part(), .anchor(), .tube(), .interactable(), .tag()
│   ├── audit3d.mjs             # Headless Node 3D spatial audit (collisions, floating, bore, tubes)
│   ├── runtime.mjs             # Orthographic rig, raycasted 3D drag, custom controls, springs, __ANATOMY_DEBUG__
│   ├── bundle.mjs              # Compiles figure modules into a single self-contained HTML file
│   └── shell.html              # Responsive card chrome, 5-theme CSS variables, feature-aware controls
├── scripts/
│   ├── inspect.mjs             # Headless Chrome (CDP) 2x2 orthographic blueprint & joint overlay
│   ├── drive.mjs               # Interactive contact sheet + hero stills + mobile 390px verify
│   └── chrome-port.mjs         # Zero-dependency WebSocket + PNG stitcher for headless Chrome
├── references/
│   ├── craft-3d.md             # 3D coordinate system, tone hierarchy, bespoke controls, anti-patterns
│   ├── kit-3d.md               # API reference for Recorder3D, primitives, shaders, and runtime
│   └── verify-3d.md            # How to interpret and fix [COLLISION], [FLOATING], [TUBE KINK], and ortho views
└── figures/
    └── <slug>/                 # Your workspace for a figure (e.g. figures/wankel-engine/)
        ├── model.mjs           # Stage 1: Pure math, dimensions, SPEC.features, SPEC.controls, anchors
        ├── base.mjs            # Stage 2: Bedplate, feet, halo, ruler, brass plaque
        ├── structure.mjs       # Stage 3: Pedestals, frame/housing, ports, fasteners
        ├── subject.mjs         # Stage 4: Moving core assembly (rotor, blades, seals, gears)
        ├── mechanism.mjs       # Stage 5: Bespoke controls, instruments, 3D interactables, tubes, updateKinematics()
        ├── shader.mjs          # Stage 6: Custom GLSL shader confined to the active physical medium
        ├── build.mjs           # CLI entry: --test-model, --audit, and full HTML bundle
        └── dist/
            └── <slug>.html     # Compiled self-contained interactive figure
```

> **Rule 1 — Never rewrite `kit/`**: The Three.js camera, cel shaders, raycast drag handler, spring solver, DOM chrome, and debug harness live in `kit/`. Your figure files only define domain math, 3D parts, kinematics, interactables, and the custom medium shader.
>
> **Rule 2 — Read the references before writing geometry**:
> - Read [`references/craft-3d.md`](references/craft-3d.md) before Stage 0/1 to design the physical rig, bespoke controls, feature flags, tone hierarchy, and 3D coordinate frame.
> - Read [`references/kit-3d.md`](references/kit-3d.md) before Stage 2 for the exact signatures of `Recorder3D` and `kit/primitives.mjs`.
> - Read [`references/verify-3d.md`](references/verify-3d.md) whenever `--audit`, `inspect.mjs`, or `drive.mjs` reports a problem.

---

## Stage 0 — Apparatus & Interaction Brief (Align Before Building)

Before creating files or writing Stage 1 code, propose a concise **Apparatus & Interaction Brief** to the user and align on what the machine does and how the reader plays with it (skip waiting only if the user explicitly says to build immediately without questions):

1. **Bench-Top Apparatus & Hero Subject**: Name the physical mechanism and what single assembly carries the `lit` accent.
2. **Direct 3D Manipulation (`reg.interactable`)**: Identify which 3D assemblies or controls the reader can grab and drag directly in the viewport (e.g., dragging a swashplate to tilt/lift it and watch rotor blades feather, sliding a vernier carriage, pulling a linkage lever), including while rotation/simulation is paused.
3. **Domain-Authentic Controls & Telemetry (`SPEC.controls`)**: Choose bench hardware and control-bar sliders that belong to *this* machine (e.g., 2-axis cyclic stick, collective pitch quadrant, protractor arc, micrometer drum, vernier scale, manometer tube). Never copy another figure's rotary knob, Bourdon pressure gauge, or hydraulic box unless the subject genuinely uses that exact instrument.
4. **View Modes (`SPEC.features`)**: Decide explicitly which optional modes earn their place:
   - `explode`: Enable (`true`) **only** for enclosed concentric machines with stacked axial layers (e.g., engines, gearboxes, pumps). Set `explode: false` for open mechanical linkages, swashplates, optical benches, or surface rigs where separating parts breaks linkage geometry and adds clutter.
   - `cutaway`: Enable (`true`) when an outer casing conceals moving internals; set `false` for open-frame mechanisms.
   - `shader`: Enable (`true`) when a confined physical medium (combustion gas, rotor wake, beam, fluid flow) clarifies the mechanism.

**Stage 0 Gate**: User confirms or refines the brief (or explicitly instructed an immediate non-interactive build).

---

## The Six-Stage Workflow

Execute these stages in order. Each stage ends with a **Verification Gate** — run the command, fix any errors, and visually inspect the rendered PNG with your file-reading tool before moving to the next stage.

### Stage 1 — Model & Kinematics (`model.mjs` + `build.mjs`)

Translate the agreed brief into a pure physical math module before touching Three.js:
1. Encode the **Physical Metaphor** in `figures/<slug>/model.mjs`:
   - `SPEC.features`: `{ explode: boolean, cutaway: boolean, shader: boolean, crank: boolean }` matching Stage 0.
   - `SPEC.interactionHint`: Short hint shown in the bottom-left corner telling the user what 3D parts they can drag directly (e.g., `"Drag swashplate, stick, or collective lever"`).
   - `SPEC.controls`: Array of domain-specific slider controls (`{ id, label, min, max, step, initial, title }`). `runtime.mjs` renders these in the control bar, smooths them with springs, and passes them into `updateKinematics` and `formatReadout`.
   - `SPEC.auditPoses` & `SPEC.drivePoses`: Domain-representative poses (extreme control angles, paused manipulation, cutaway/theme checks) used by `--audit` and `scripts/drive.mjs`. Omit exploded poses when `features.explode === false`.
   - `SPEC`: All critical dimensions (`BASE_W`, `BASE_D`, `BASE_H`, `BASE_Y`, `topSurfaceY`, `isoElevDeg: 30`, `isoAzimDeg: -36`, `initialZoom`, `initialPanY`, `minVertSpan`, `minHorizSpan`).
   - `ANCHORS`: Named `[x, y, z]` mounting coordinates on the bedplate (`plaqueCenter`, `rulerCenter`, and your figure's bespoke control/instrument anchors). Remember that in canonical isometric (`30° elev, -36° azim`), the **`+Z` edge is the front apron** and **`-X, +Z` / `+X, +Z` are the unobstructed front corners**.
   - Pure state & kinematic functions (zero Three.js imports) driven by `theta` and the live `params` from `SPEC.controls`.
   - `formatReadout({ theta, effectiveRpm, params })` returning `{ readout, phase }` strings for the telemetry bar.
2. Scaffold `figures/<slug>/build.mjs` (reference `figures/wankel-engine/build.mjs` or `figures/helicopter-swashplate/build.mjs`) and adjust title, subtitle, initial readout, and legend.

**Stage 1 Gate**:
```bash
node figures/<slug>/build.mjs --test-model
```
Pass criteria: Exits `0` with all anchors finite and readout/state verified across a full $0 \dots 6\pi$ cycle.

---

### Stage 2 — The Base (`base.mjs`)

Build the heavy datum bedplate that grounds the entire instrument:
1. Create `base.group` (`stage: "base"`).
2. Add the soft ground shadow (`makeHaloMesh`) at `BASE_Y - 0.24`.
3. Add `base.plate` using `buildSlabGeometry(BASE_W, BASE_D, BASE_H, { radius: 0.26, bevel: true, bevelSize: 0.025, bevelThickness: 0.025 })` with `ramp: "lo"`, `mountOn: "ground"`. Note that `topSurfaceY = BASE_Y + BASE_H + 0.025` accounts for the top bevel thickness so parts mounted at `topSurfaceY` sit flush on the top face without sinking in.
4. Register all bedplate mounting anchors via `reg.anchor(id, x, y, z, baseGroup)` so Stages 3 and 5 snap directly to `base.plate`.
5. Add inset perimeter grooves (`makePlanOutline`), 4 turned corner feet (`base.foot.collar.i` + `base.foot.pad.i`) with top counterbore screws (`makeScrewDetail`), a graduated scale (`base.ruler` + `makeRulerTicks`), and a riveted `brass` specification plaque (`base.plaque`) on the visible front apron (`+Z`) with an engraved tag (`reg.tag("tag-plate", ...)`).

**Stage 2 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base --ortho --out figures/<slug>/dist/inspect-base.png
```
Read `inspect-base.png` to verify the feet sit cleanly underneath the bedplate and the brass plaque + ruler are unobstructed on the front apron.

---

### Stage 3 — The Structure (`structure.mjs`)

Build the stationary load-bearing supports, main frame or cutaway housing, ports/manifolds, and fasteners:
1. Mount support pedestals or gearboxes onto `base.plate` with flanged bases, bolt details, tapered columns, and bearing saddles.
2. Build the main housing or frame (`ramp: "mid"`, `outline: "hi"`). Leave the front (`+Z`) open or fitted with a cutaway cover (`cutawayHide: true`) so interior mechanisms remain completely visible from the canonical isometric camera when `features.cutaway` is enabled.
3. Add domain-authentic ports, actuator housings, or stationary brackets pointing outward cleanly. Register 3D port/terminal anchors with their local outward port normals (`reg.anchor("plug.leading.tip", 0, 0.68, 0, spGroup, { dir: [0, 1, 0] })`) inside each local sub-group so Stage 5 tubes snap to their exact world positions and exit/enter coaxially.
4. Set `explode: [ex, ey, ez]` vectors on removable sub-groups **only** when `SPEC.features.explode` is `true` and the apparatus has enclosed concentric layers meant to separate axially.

**Stage 3 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base,structure --ortho --out figures/<slug>/dist/inspect-structure.png
```
Read `inspect-structure.png` (`TOP`, `FRONT`, `RIGHT`, `CANONICAL ISO`): verify ports point outward, pedestals touch both the bedplate and housing without clipping, and nothing floats.

---

### Stage 4 — The Subject (`subject.mjs`)

Build the hero internal assembly that commands visual focus:
1. Assign `ramp: "hi"` to the primary moving body (e.g., rotor body, hub yoke), `ramp: "lit"` to active working elements (`rotor.apexSeal.i`, `blade.airfoil.*`), and `ramp: "brass"` to precision gearing and pivots.
2. Create nested kinematic groups (`orbit -> spin`, or `azimuth -> flap -> pitch`) so hierarchical motion composes cleanly without Euler gimbal lock.
3. Pass `insideBoreOf` and `boreClearanceFn` on parts moving inside a bore so `audit3d.mjs` mathematically verifies zero wall penetration at every audited pose.
4. Add machined pockets, face grooves, spar seams, or bolt patterns so motion is unmistakable.

**Stage 4 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate subject --ortho --out figures/<slug>/dist/inspect-subject.png
```
Read `inspect-subject.png` to confirm the subject's silhouette, bevels, and joints read clearly from every angle.

---

### Stage 5 — Mechanism, Bespoke Controls & Direct 3D Interaction (`mechanism.mjs`)

Connect the subject to domain-authentic operator controls, telemetry instruments, direct 3D drag interaction, and routing:
1. **Build domain-authentic controls** at their `ANCHORS` from Stage 0/1 (for example: a 2-axis gimbal cyclic stick, a notched collective pitch quadrant lever, a vernier leadscrew, or a knurled throttle drum). Never copy another figure's knurled knob or manifold block when the machine calls for its own control hardware.
2. **Build domain-authentic telemetry** (for example: a curved blade-pitch protractor arc, linear travel scale, manometer column, or dial gauge) positioned forward in `+Z` or clear of the main silhouette in `CANONICAL ISO`.
3. **Register direct 3D manipulation** with `reg.interactable(targetId, { cursor, hint, onDrag })` on the primary mechanism and/or physical levers so the user can drag 3D parts directly in the viewport via `setParam(...)`, even when rotation is paused (`RPM = 0` or `PAUSED`).
4. **Route all pipes and cables** using `reg.tube(id, fromAnchorId, waypoints, toAnchorId, opts)`:
   - Query `reg.getAnchorWorldPos(anchorId)` and `reg.getAnchorWorldDir(anchorId)` to build smooth 3D arch waypoints (`length / chord >= 1.12`) that sweep clear of adjacent parts and enter coaxially along each port's outward normal.
5. Build the drive train and articulated linkages. Pass `cutawayHide: true` on front-side housing covers or shrouds that conceal the internal mechanism at rest when `features.cutaway` is `true`.
6. Implement `export function updateKinematics(reg, state)` to drive all kinematic groups, linkages, physical controls, telemetry needles, and shader uniforms from `state.theta`, `state.params` (`state.<controlId>`), and `state.shaderEnv`.

**Stage 5 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --ortho --out figures/<slug>/dist/inspect-ortho.png
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --joints --out figures/<slug>/dist/inspect-joints.png
```
Read **both** `inspect-ortho.png` and `inspect-joints.png`:
- In `inspect-ortho.png`, verify all 4 panels (`TOP`, `FRONT`, `RIGHT`, `CANONICAL ISO`) show clean silhouettes, smooth cable arches, and unobstructed controls/scales.
- In `inspect-joints.png`, verify green anchor dots land squarely on their physical joints/ports and engraved HUD tags sit over their plaques/scales.

---

### Stage 6 — Physical Medium Shader & Final Drive (`shader.mjs`)

Add the custom GLSL shader for the active physical medium (when `features.shader` is `true`) and run the full interactive drive test:
1. Write `figures/<slug>/shader.mjs` exporting `buildShader(reg, kit)` and reacting to `kit.onThemeChange(...)` across all 5 themes (`light`, `paper`, `dark`, `blueprint`, `sepia`).
2. Mount the shader mesh inside the active physical zone with `transparent: true, depthWrite: false`, binding `uEnvelope` to `state.shaderEnv` (`I` key / `SHADER` button).
3. Restrict fragment alpha (`alpha > 0`) strictly to the active physical medium region so the shader fades to zero smoothly before any quad edge or solid wall.
4. Run the final build and verification suite:
```bash
node figures/<slug>/build.mjs
node scripts/drive.mjs figures/<slug>/dist/<slug>.html --out figures/<slug>/dist/
```
Read `figures/<slug>/dist/inspect-drive.png`, `hero-light.png`, `hero-dark.png` (plus `hero-exploded.png` if `features.explode` is `true`), and `mobile-390.png`:
- Confirm `console: clean` and `scrolls sideways: no`.
- Check every panel of `inspect-drive.png` (populated from `SPEC.drivePoses` or the default poses): verify that manipulating each domain control visibly moves the mechanism, physical control hardware, and telemetry indicator, and that hidden disabled features (`APART`, `CUTAWAY`, `SHADER`) do not appear in the UI.
- Check `mobile-390.png` to confirm the header, telemetry bar, and footer controls stack cleanly at `390px` width without overlapping the 3D figure.
