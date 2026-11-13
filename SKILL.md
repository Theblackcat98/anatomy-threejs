---
name: anatomy-threejs
description: Build crafted, interactive isometric 3D technical figures in Three.js and GLSL that explain a technical concept, engine, algorithm, or system as a physical bench-top instrument, cutaway rig, or mechanical assembly. Features four-tone quantized cel shading with top-face bias, inverted-hull silhouettes, sharp crease lines, a 5-theme framed card with live telemetry readout, spring-eased kinematics, exploded view, and an automated 3D spatial & visual verification pipeline. Use whenever someone wants an interactive 3D technical diagram, an isometric Three.js figure, a "Linear-style" or "Anatomy-style" 3D explainer, or a physical mechanism visualization with real-time WebGL shaders.
---

# Anatomy Three.js — Interactive 3D Technical Figures

Build interactive isometric 3D technical illustrations in Three.js + GLSL. Every figure explains a technical idea as a physical bench-top instrument or cutaway test rig you could set on a desk: a heavy beveled bedplate on turned feet, cast or machined structural housings, a hero internal rotor or moving subject, brass and copper fittings, a tactile control knob, a live reading gauge, and a custom GLSL shader restricted strictly to the physical medium (fire, plasma, fluid, beam) inside the machine.

Instead of writing a 1,500-line monolithic HTML file and guessing 3D coordinates in your head, you build every figure in **six isolated stages** inside `figures/<slug>/`, backed by the immutable `kit/` engine and verified at every step by a two-tier **3D Spatial + Orthographic Visual Harness**.

---

## Directory Layout

```text
anatomy-threejs/
├── SKILL.md                    # This 6-stage workflow & agent entrypoint
├── kit/                        # IMMUTABLE ENGINE — import from here; never edit per figure
│   ├── shaders.mjs             # 5 themes, 4-tone + top-cap cel shader, inverted hull, creases
│   ├── primitives.mjs          # Axis-aware slabs, cylinders, gears, screws, knurls, ticks
│   ├── registry.mjs            # Recorder3D: .group(), .part(), .anchor(), .tube(), .detail(), .tag()
│   ├── audit3d.mjs             # Headless Node 3D spatial audit (collisions, floating, bore, tubes)
│   ├── runtime.mjs             # Orthographic rig, spring physics, pointer/orbit/scrub, __ANATOMY_DEBUG__
│   ├── bundle.mjs              # Compiles figure modules into a single self-contained HTML file
│   └── shell.html              # Responsive card chrome, 5-theme CSS variables, pill buttons
├── scripts/
│   ├── inspect.mjs             # Headless Chrome (CDP) 2x2 orthographic blueprint & joint overlay
│   ├── drive.mjs               # 6-state interactive contact sheet + hero + mobile 390px verify
│   └── chrome-port.mjs         # Zero-dependency WebSocket + PNG stitcher for headless Chrome
├── references/
│   ├── craft-3d.md             # 3D coordinate system, tone hierarchy, parts vocabulary, anti-patterns
│   ├── kit-3d.md               # API reference for Recorder3D, primitives, shaders, and runtime
│   └── verify-3d.md            # How to interpret and fix [COLLISION], [FLOATING], [TUBE KINK], and ortho views
└── figures/
    └── <slug>/                 # Your workspace for a figure (e.g. figures/wankel-engine/)
        ├── model.mjs           # Stage 1: Pure math, dimensions, anchor table, readout formatter
        ├── base.mjs            # Stage 2: Bedplate, feet, halo, ruler, brass plaque
        ├── structure.mjs       # Stage 3: Pedestals, cutaway housing, manifolds, flanges, bolts
        ├── subject.mjs         # Stage 4: Moving core assembly (rotor, seals, gears)
        ├── mechanism.mjs       # Stage 5: Control knob, gauge, tubes/cables, shaft, updateKinematics()
        ├── shader.mjs          # Stage 6: Custom GLSL shader confined to the active physical medium
        ├── build.mjs           # CLI entry: --test-model, --audit, and full HTML bundle
        └── dist/
            └── <slug>.html     # Compiled self-contained interactive figure
```

> **Rule 1 — Never rewrite `kit/`**: The Three.js camera, cel shaders, spring solver, DOM chrome, and debug harness live in `kit/`. Your figure files only define domain math, 3D parts, kinematics, and the custom medium shader.
>
> **Rule 2 — Read the references before writing geometry**:
> - Read [`references/craft-3d.md`](references/craft-3d.md) before Stage 1 to design the physical rig, tone hierarchy, and 3D coordinate frame.
> - Read [`references/kit-3d.md`](references/kit-3d.md) before Stage 2 for the exact signatures of `Recorder3D` and `kit/primitives.mjs`.
> - Read [`references/verify-3d.md`](references/verify-3d.md) whenever `--audit`, `inspect.mjs`, or `drive.mjs` reports a problem.

---

## The Six-Stage Workflow

Execute these stages in order. Each stage ends with a **Verification Gate** — run the command, fix any errors, and visually inspect the rendered PNG with your file-reading tool before moving to the next stage.

### Stage 1 — Model & Kinematics (`model.mjs` + `build.mjs`)

Translate the user's concept into a physical bench-top apparatus before touching Three.js:
1. Choose the **Physical Metaphor**:
   - **Subject**: What is the central moving or measured element (`hi`/`lit` ramp)?
   - **Housing / Cutaway**: What structural body encloses or supports it (`mid`/`lo` ramp) and where is the cutaway window facing `+Z`?
   - **Operator Control**: What physical knob, lever, or plunger on the front apron (`+Z`) drives the primary parameter?
   - **Telemetry Instrument**: What secondary dial gauge, manometer, or scale visibly responds to the internal state?
   - **Shader Medium**: What non-solid phenomenon (combustion gas, plasma arc, fluid stream, laser beam) lives inside the chamber?
2. Write `figures/<slug>/model.mjs` exporting:
   - `SPEC`: All critical dimensions (`BASE_W`, `BASE_D`, `BASE_H`, `BASE_Y`, `topSurfaceY`, `isoElevDeg: 30`, `isoAzimDeg: -36`, `initialZoom`, `initialPanY`, `minVertSpan`, `minHorizSpan`).
   - `ANCHORS`: Named `[x, y, z]` coordinates on the bedplate (`pedestalRear`, `pedestalFront`, `plaqueCenter`, `rulerCenter`, `knobMount`, `gaugeMount`, etc.). Remember that in canonical isometric (`30° elev, -36° azim`), the **`+Z` edge is the front apron** and **`-X, +Z` / `+X, +Z` are the unobstructed front corners**.
   - Pure state & kinematic functions (e.g., `getChamberState(theta)`, profile generators, `boreClearanceFn(x, y, z)`) with zero Three.js imports.
   - `formatReadout({ theta, effectiveRpm })` returning `{ readout, phase }` strings for the top-right monospace telemetry bar.
3. Scaffold `figures/<slug>/build.mjs` (copy from `figures/wankel-engine/build.mjs` and adjust title, subtitle, control label, and `testModel()` assertions).

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
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base --ortho figures/<slug>/dist/inspect-base.png
```
Read `inspect-base.png` to verify the feet sit cleanly underneath the bedplate and the brass plaque + ruler are unobstructed on the front apron.

---

### Stage 3 — The Structure (`structure.mjs`)

Build the stationary load-bearing supports, main cutaway housing, ports/manifolds, fasteners, and endplates:
1. Mount support pedestals (`pedestal.rear`, `pedestal.front`) onto `base.plate` with flanged bases, bolt details, tapered columns, and bearing saddles.
2. Build the main housing (`stator.housing`, `ramp: "mid"`, `outline: "hi"`). Leave the front (`+Z`) open or fitted with a cutaway cover ring (`front.cover`) so the interior bore is completely visible from the canonical isometric camera.
3. Add intake/exhaust manifolds, flanged ports, or stationary fittings pointing **radially outward** from the housing. Register 3D port/terminal anchors (`reg.anchor("plug.leading.tip", ...)`, `reg.anchor("stator.pressure.port", ...)`) inside each local sub-group so Stage 5 tubes snap to their exact world positions automatically.
4. Configure axial `explode: [ex, ey, ez]` vectors on removable structural sub-groups (`rear.group`, `front.group`, `tieBolts.group`).

**Stage 3 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base,structure --ortho figures/<slug>/dist/inspect-structure.png
```
Read `inspect-structure.png` (`TOP`, `FRONT`, `RIGHT`, `CANONICAL ISO`): verify manifolds point outward, pedestals touch both the bedplate and housing without clipping, and nothing floats.

---

### Stage 4 — The Subject (`subject.mjs`)

Build the hero internal assembly that commands visual focus:
1. Assign `ramp: "hi"` to the primary moving body (e.g., `rotor.body`), `ramp: "lit"` to active contact tips/seals (`rotor.apexSeal.i`), and `ramp: "brass"` to precision internal gearing (`rotor.internalGear`).
2. Create nested kinematic groups (`rotor.orbit` -> `rotor.spin`) so orbital translation and angular spin compose cleanly without Euler gimbal lock.
3. Pass `insideBoreOf: "stator.housing"` and `boreClearanceFn` on parts moving inside the housing bore so `audit3d.mjs` mathematically verifies that seals and flanks never penetrate the bore wall at any angle $\theta$.
4. Add machined pockets, face grooves, and oil holes so rotational motion is unmistakable.

**Stage 4 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate subject --ortho figures/<slug>/dist/inspect-subject.png
```
Read `inspect-subject.png` to confirm the subject's silhouette, bevels, and internal gear teeth read clearly from every angle.

---

### Stage 5 — Mechanism, Controls & Routing (`mechanism.mjs`)

Connect the subject to the operator controls, telemetry instruments, and fluid/electrical routing:
1. Build the operator control (`knob.boss`, `knob.drum` with `makeKnurlLines` and pointer line) at `ANCHORS.knobMount`.
2. Build the secondary instrument (`gauge.collar`, `gauge.post`, `gauge.bezel`, dial ticks, and `gauge.needle` group) at `ANCHORS.gaugeMount`. Place the gauge post forward in `+Z` and tall enough that the dial face stands completely clear of the housing silhouette in `CANONICAL ISO`.
3. Route all pipes and cables using `reg.tube(id, fromAnchorId, waypoints, toAnchorId, opts)`:
   - Never guess tube endpoints; always query `reg.getAnchorWorldPos(anchorId)` to compute smooth, monotonic intermediate waypoints.
   - Keep every bend angle under `65°` (`audit3d.mjs` will fail with `[TUBE KINK]` if a tube kinks sharply or doubles back).
4. Build the coaxial drive shaft, eccentric journals, counterweights, and front timing pulley. Pass `cutawayHide: true` on front-side shaft parts/groups (`shaft.frontWeight`, `shaft.pulleyGroup`) that would block the cutaway view of the subject at rest (`cutaway: true, explode: 0`), while revealing them when Cutaway is toggled off or Explode is active.
5. Implement `export function updateKinematics(reg, state)` to drive all groups (`rotor.orbit`, `rotor.spin`, `shaft.spin`, `knob.group`, `gauge.needle`, and shader uniforms) from `state.theta`, `state.rpm`, and `state.shaderEnv`.

**Stage 5 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --ortho figures/<slug>/dist/inspect-ortho.png
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --joints figures/<slug>/dist/inspect-joints.png
```
Read **both** `inspect-ortho.png` and `inspect-joints.png`:
- In `inspect-ortho.png`, verify all 4 panels (`TOP`, `FRONT`, `RIGHT`, `CANONICAL ISO`) show clean silhouettes, smooth tube arches, and unobstructed dial faces.
- In `inspect-joints.png`, verify green anchor dots and cyan tube paths land squarely on their ports and that engraved HUD tags sit over their physical plaques/bezels.

---

### Stage 6 — Physical Medium Shader & Final Drive (`shader.mjs`)

Add the custom GLSL shader for the active physical medium and run the full 6-state interactive drive test:
1. Write `figures/<slug>/shader.mjs` exporting `buildShader(reg, kit)` and `updateShaderPalette(reg, themePalette)`.
2. Mount the shader mesh (`chamber.shaderPlane`) inside the housing cavity (`z = 0.08`) with `transparent: true, depthWrite: false`.
3. Restrict fragment alpha (`alpha > 0`) strictly to the active physical medium region (e.g., inside the epitrochoid bore AND outside the rotor flank) so the shader never bleeds across solid metal walls or background paper.
4. Bind `uEnvelope` to `state.shaderEnv` so the `S` key (Shader toggle) smoothly fades the medium in and out, and update `uThemeBg` in `updateShaderPalette` across all 5 themes (`light`, `paper`, `dark`, `blueprint`, `sepia`).

**Stage 6 Gate**:
```bash
node figures/<slug>/build.mjs
node scripts/drive.mjs figures/<slug>/dist/<slug>.html figures/<slug>/dist/
```
Read `figures/<slug>/dist/inspect-drive.png`, `hero-light.png`, and `mobile-390.png`:
- Confirm `console: clean` and `scrolls sideways: no`.
- Check all 6 panels of `inspect-drive.png`:
  1. `REST · LIGHT · CUTAWAY ON`: Unobstructed interior view, balanced framing inside the card, tags aligned.
  2. `STEPPED θ = 2.40 rad`: Rotor, eccentric journal, timing pulley, and Bourdon needle all visibly advance; telemetry readout updates.
  3. `EXPLODED VIEW (E)`: Axial layers (`rear.group`, `subject`, `shaft.assembly`, `front.group`, `tieBolts.group`) separate cleanly along `Z` without clipping.
  4. `ISOMETRIC ORBIT (+38° AZIM)`: 3D depth, rear counterweight, and tube routing hold up from an alternate angle.
  5. `BLUEPRINT THEME (T)`: Clean white/cyan linework on blueprint blue; shader palette adapts cleanly.
  6. `DARK THEME · SHADER OFF (S)`: High-contrast dark mode; combustion shader cleanly extinguished (`uEnvelope = 0`).
- Check `mobile-390.png` to confirm the header, telemetry bar, and footer controls stack cleanly at `390px` width without overlapping the 3D figure.
