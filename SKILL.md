---
name: anatomy-threejs
description: Build crafted, interactive isometric 3D technical figures in Three.js and GLSL that explain a technical concept, engine, algorithm, physical apparatus, or system as a tangible 3D object, cutaway rig, self-contained enclosure, cross-section diorama, or free-space mechanism. Features four-tone quantized cel shading with top-face bias, optical glass and multi-channel semantic ramps, inverted-hull silhouettes, sharp crease lines, a 5-theme framed card with camera bookmarks and live telemetry readout, diegetic 2D-in-3D screens, dynamic 3D cross-section slicing, pluggable simulation paradigms (continuous, sequence, timeline, sandbox + idle tours), spring-eased kinematics, direct 3D part manipulation, bespoke controls, and an automated 3D spatial & visual verification pipeline. Use whenever someone wants an interactive 3D technical diagram, an isometric Three.js figure, a "Linear-style" or "Anatomy-style" 3D explainer, or a mechanism visualization with real-time WebGL shaders.
---

# Anatomy Three.js — Interactive 3D Technical Figures

Build interactive isometric 3D technical illustrations in Three.js + GLSL. **The object is the explanation**: every figure makes a mechanism, algorithm, architecture, or natural phenomenon tangible in true 3D—whether as a beveled bench-top test rig, a structural launch gantry, a cutaway self-contained cabinet/device, a sliced diorama block, or a free-space orbital assembly—complete with directly draggable 3D controls, domain-authentic instruments or diegetic displays, live cross-section slicing, and confined GLSL medium shaders.

Instead of writing a 1,500-line monolithic HTML file and guessing 3D coordinates in your head, you first align with the user on the physical metaphor, archetype, and interactions (**Stage 0**), then build every figure in **six isolated stages** inside `figures/<slug>/`, backed by the immutable `kit/` engine and verified at every step by a two-tier **3D Spatial + Orthographic Visual Harness**.

---

## Directory Layout

```text
anatomy-threejs/
├── SKILL.md                    # Stage 0 brief + 6-stage workflow & agent entrypoint
├── kit/                        # IMMUTABLE ENGINE — import from here; never edit per figure
│   ├── shaders.mjs             # 5 themes, 4-tone cel + optical glass + semantic channel ramps + section clipping
│   ├── primitives.mjs          # Axis-aware slabs, cylinders, gears, enclosures, datum grids/gimbals, screws, ticks
│   ├── registry.mjs            # Recorder3D: .group(), .part(), .screen(), .anchor(), .tube(), .interactable(), .tag()
│   ├── audit3d.mjs             # Headless Node 3D spatial & model audit (collisions, floating, bore, tubes, tone modes)
│   ├── runtime.mjs             # Ortho rig, raycasted drag, sim modes, burst/settle, idle tours, section slicer, camera views
│   ├── bundle.mjs              # Compiles figure modules into a single self-contained HTML file
│   └── shell.html              # Responsive card chrome, 5 themes, camera view pills, trigger buttons, feature-aware controls
├── scripts/
│   ├── inspect.mjs             # Headless Chrome (CDP) 2x2 orthographic blueprint & joint overlay
│   ├── drive.mjs               # Interactive contact sheet + hero stills + mobile 390px verify
│   └── chrome-port.mjs         # Zero-dependency WebSocket + PNG stitcher for headless Chrome
├── references/
│   ├── craft-3d.md             # Coordinate system, archetypes, sim & tone modes, bespoke controls, anti-patterns
│   ├── kit-3d.md               # API reference for Recorder3D, primitives, shaders, runtime helpers, and SPEC config
│   └── verify-3d.md            # How to interpret and fix [COLLISION], [FLOATING], [TUBE KINK], [TONE], and ortho views
└── figures/
    └── <slug>/                 # Your workspace for a figure (e.g. figures/wankel-engine/)
        ├── model.mjs           # Stage 1: Pure math, dimensions, SPEC (archetype, simulationMode, toneMode, controls, triggers, views), ANCHORS
        ├── base.mjs            # Stage 2: Base/grounding layer chosen by archetype (bench plate, gantry pad, cabinet floor, section tray, or datum grid/gimbal)
        ├── structure.mjs       # Stage 3: Load-bearing frame/housing, ports, fasteners, optional clippable cutaway shells
        ├── subject.mjs         # Stage 4: Moving core assembly or main focal channels (hierarchies, optical glass, channel ramps)
        ├── mechanism.mjs       # Stage 5: Bespoke controls, instruments, diegetic screens, 3D interactables, tubes, updateKinematics(), optional tourAt()
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

## Stage 0 — Metaphor Exploration, Apparatus & Interaction Brief (Align Before Building)

Before creating files or writing Stage 1 code, explore the best physical realization and propose a concise **Brief** to the user (skip waiting only if the user explicitly asks to build immediately without questions):

1. **Metaphor Exploration (for abstract, software, biological, or creative prompts)**:
   - Pitch **2–3 distinct physical metaphors** that realize the concept tangibly in 3D before locking `SPEC` (for example, TCP congestion control as *a sluice-gate pipeline with feedback manometers* vs *a packet conveyor cabinet with optical buffer tubes*; or a B-tree as *a tiered mechanical sorting tower* vs *a cabinet of sliding brass drawers*). When the prompt already names a specific machine (like a Wankel engine), skip generic alternatives and confirm the exact mechanical architecture.
2. **Base / Mounting Archetype (`SPEC.archetype`) & Tone Mode (`SPEC.toneMode`)**:
   - Choose the archetype that fits the subject instead of defaulting blindly to a tabletop slab:
     - `"bench"` *(default)*: Beveled datum bedplate on 4 turned feet with front ruler and brass plaque (ideal for rotary engines, gearboxes, precision instruments).
     - `"gantry"` / `"test-stand"`: Vertical launch stand, flame trench, or structural frame carrying suspended thrust/load rigs.
     - `"cabinet"` / `"enclosure"`: Self-contained industrial, musical, consumer, or optical body (`buildEnclosureBoxGeometry` — arcade cabinet, synthesizer, camera body, pin-tumbler lock, CPU rack) where the outer casing itself grounds the figure.
     - `"section"` / `"diorama"`: Sliced architectural, geological, optical, or wave-tank block where terrain/chamber cross-sections form the base (`makeDatumGrid`).
     - `"free-space"`: Orbital spacecraft, satellites, molecular assemblies, or zero-g mechanisms suspended over a minimal `makeGimbalDatumRing` or `makeDatumGrid`.
   - Choose `SPEC.toneMode`:
     - `"single-lit"` *(default)*: One primary hero sub-assembly in `stage: "subject"` owns `ramp: "lit"`.
     - `"multi-channel"`: Permits `"lit"`, `"glass"`, and semantic channel ramps (`"intake"`/`"channelA"`, `"comp"`/`"channelB"`, `"comb"`/`"channelC"`, `"exhaust"`/`"channelD"`) across multiple stages for multi-flow, optical, or computing diagrams.
3. **Simulation Paradigm (`SPEC.simulationMode`) & Direct 3D Interaction**:
   - Choose how time and user input drive the apparatus:
     - `"continuous"` *(default)*: Driven continuously by `RPM` / `theta` shaft loop (`CRANK` + `SLOW` active).
     - `"sequence"`: Event- and state-driven stepped machine (`SPEC.steps` + `STEP` button, `SPEC.triggers` buttons armed via `burst()`/`settle()`, no forced RPM slider). Ideal for locks, algorithms, staging, or state machines.
     - `"timeline"`: Scrubbable `0..1` timeline curve (`TIME` slider) for multi-phase stories or trajectories.
     - `"sandbox"`: Rests quietly until the user drags 3D parts directly (`reg.interactable`) or fires impulse buttons (`PLUCK`, `DROP`, `PULSE`).
   - Optionally specify a scripted idle tour (`tourAt(clock, state)` or `SPEC.tour`) that demonstrates the apparatus automatically after ~1.6–3.6s of inactivity and yields immediately on user input.
4. **Domain Controls, Section Slicing, Screens & Camera Views**:
   - Pick bespoke `SPEC.controls` sliders, `SPEC.triggers`, optional `SPEC.section` (live 3D `THREE.Plane` cross-section slicer on `clippable: true` shells), optional `reg.screen()` diegetic 2D-in-3D displays, and `SPEC.cameraViews` bookmarks (`1`–`9` keys + top pills).
   - Enable `SPEC.features` flags (`explode`, `cutaway`, `shader`, `crank`, `slow`) **only** when they genuinely clarify this apparatus.

**Stage 0 Gate**: User confirms or refines the brief (or explicitly instructed an immediate non-interactive build).

---

## The Six-Stage Workflow

Execute these stages in order. Each stage ends with a **Verification Gate** — run the command, fix any errors, and visually inspect the rendered PNG with your file-reading tool before moving to the next stage.

### Stage 1 — Model & Kinematics (`model.mjs` + `build.mjs`)

Translate the agreed brief into a pure physical math module before touching Three.js:
1. Encode the **Physical Metaphor** in `figures/<slug>/model.mjs`:
   - `SPEC.archetype`: `"bench"` | `"gantry"` | `"cabinet"` | `"section"` | `"free-space"`.
   - `SPEC.simulationMode`: `"continuous"` | `"sequence"` | `"timeline"` | `"sandbox"`.
   - `SPEC.toneMode`: `"single-lit"` | `"multi-channel"`.
   - `SPEC.features`: `{ explode, cutaway, shader, crank, slow, section, timeline }` matching Stage 0.
   - `SPEC.interactionHint`: Short hint shown in the bottom-left corner telling the user what 3D parts/actions they can interact with directly.
   - `SPEC.controls` / `SPEC.triggers` / `SPEC.steps`: Domain-specific sliders (`{ id, label, min, max, step, initial, title }`), one-shot impulse triggers (`{ id, label, rise, fall, title }`), and/or sequence steps (`{ id, label, theta, params }`).
   - `SPEC.section`: Optional live 3D slicing plane `{ axis: "x"|"y"|"z", min, max, initial, label, invert? }`.
   - `SPEC.cameraViews`: Optional array of `{ id, label, elev, azim, zoom, pan }` bookmarks rendered as top pills and mapped to digit keys `1`–`9`.
   - `SPEC.auditPoses` & `SPEC.drivePoses`: Domain-representative poses (extreme control angles, paused manipulation, cutaway/section/theme checks) used by `--audit` and `scripts/drive.mjs`.
   - `SPEC` dimensions (`isoElevDeg: 30`, `isoAzimDeg: -36`, `initialZoom`, `initialPanY`, `minVertSpan`, `minHorizSpan`, plus archetype-specific dimensions such as `BASE_W`/`BASE_D`/`BASE_H`/`topSurfaceY` for `"bench"`).
   - `ANCHORS`: Named `[x, y, z]` mounting coordinates.
   - Pure state & kinematic functions (zero Three.js imports) and `formatReadout(state)` returning `{ readout, phase }` strings.
2. Scaffold `figures/<slug>/build.mjs` and adjust title, subtitle, initial readout, and legend.

**Stage 1 Gate**:
```bash
node figures/<slug>/build.mjs --test-model
```
Pass criteria: Exits `0` with all anchors finite, `SPEC` enums valid, and `formatReadout` verified cleanly.

---

### Stage 2 — The Base (`base.mjs`)

Build the grounding layer appropriate for `SPEC.archetype`:
- **`"bench"` *(default bench-top rig)***: `makeHaloMesh` ground shadow, beveled `buildSlabGeometry(BASE_W, BASE_D, BASE_H, { radius: 0.26, bevel: true, bevelSize: 0.025, bevelThickness: 0.025 })` at `ramp: "lo"`, `mountOn: "ground"` with `topSurfaceY = BASE_Y + BASE_H + 0.025`, 4 turned corner feet, inset `makePlanOutline`, graduated `base.ruler`, and front-apron `brass` plaque (`reg.tag("tag-plate", ...)`).
- **`"gantry"` / `"test-stand"`**: Flame trench pad, concrete pier apron, or base hold-down ring + blast deflector deck (`makeDatumGrid` optional beneath).
- **`"cabinet"` / `"enclosure"`**: Rubberized leveling pads + recessed chassis floor / `buildEnclosureBoxGeometry` mounting rails or lower plinth.
- **`"section"` / `"diorama"`**: Clean bedrock/terrain/tank floor slab or sliced tray rim (`makeDatumGrid` reference lines underneath).
- **`"free-space"`**: Minimal non-intrusive spatial reference (`makeGimbalDatumRing` and/or `makeDatumGrid`) with an ultra-subtle ground anchor dot/halo so orbiting orbital/molecular machines feel unencumbered.
In every archetype, register Stage 2 mounting anchors via `reg.anchor(...)` so Stages 3 and 5 snap directly without hardcoded coordinates.

**Stage 2 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base --ortho --out figures/<slug>/dist/inspect-base.png
```
Read `inspect-base.png` to verify grounding elements sit cleanly and any front-apron plaque/datum lines are unobstructed.

---

### Stage 3 — The Structure (`structure.mjs`)

Build stationary housings, frames, optical chambers, ports/manifolds, and fasteners:
1. Mount load-bearing columns, chassis walls (`buildEnclosureBoxGeometry`), optical benches, or cutaway housings onto Stage 2 anchors.
2. Orient cutaway windows toward `+Z` (or use `clippable: true` paired with `SPEC.section` so the user can slice smoothly through housings, shields, or enclosures with live cross-hatched cut faces!). Use `cutawayHide: true` on outer shells that should hide when `Cutaway (C)` is active.
3. Use `ramp: "glass"` cleanly for transparent vacuum chambers, gauge tubes, optical lenses, or specimen domes where seeing internal flow matters.
4. Register 3D port/terminal anchors with outward normals (`{ dir: [dx, dy, dz] }`) for downstream tubes, and set `explode: [ex, ey, ez]` vectors **only** when `SPEC.features.explode` is `true`.

**Stage 3 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base,structure --ortho --out figures/<slug>/dist/inspect-structure.png
```
Read `inspect-structure.png` (`TOP`, `FRONT`, `RIGHT`, `CANONICAL ISO`): verify ports point outward, frames/walls touch cleanly without clipping, and nothing floats.

---

### Stage 4 — The Subject (`subject.mjs`)

Build the hero internal assembly or primary working channels that command visual focus:
1. In `"single-lit"` mode, assign `ramp: "hi"` to the primary structural body, `ramp: "lit"` to active working elements in stage `"subject"`, and `ramp: "brass"` / `"copper"` to precision bearings and conductors. In `"multi-channel"` mode (`SPEC.toneMode: "multi-channel"`), color-code distinct semantic flows or stages with `"intake"`/`"channelA"`, `"comp"`/`"channelB"`, `"comb"`/`"channelC"`, `"exhaust"`/`"channelD"`, `"lit"`, and `"glass"`.
2. Create nested kinematic groups (`orbit -> spin`, `azimuth -> flap -> pitch`, gimbal stacks) so hierarchical motion composes cleanly without Euler gimbal lock.
3. Pass `insideBoreOf` and `boreClearanceFn` on parts moving inside a bore so `audit3d.mjs` mathematically verifies zero wall penetration at every audited pose.
4. Add machined pockets, seals, bevels, or surface seams so motion reads clearly.

**Stage 4 Gate**:
```bash
node figures/<slug>/build.mjs --audit
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate subject --ortho --out figures/<slug>/dist/inspect-subject.png
```
Read `inspect-subject.png` to confirm the subject's silhouette, bevels, and joints read clearly from every angle.

---

### Stage 5 — Mechanism, Bespoke Controls, Screens & Direct 3D Interaction (`mechanism.mjs`)

Connect the subject to domain-authentic operator controls, telemetry instruments or diegetic screens, direct 3D drag, and routing:
1. **Build domain-authentic controls** at their `ANCHORS` from Stage 0/1 (2-axis cyclic stick, quadrant lever, vernier slide, tumbler key, oscilloscope CRT face, etc.). Never copy another figure's controls unless truly appropriate.
2. **Mount telemetry indicators or diegetic 3D screens**: Use mechanical dials/arcs OR `reg.screen(id, { width, height, resolution, draw })` to project live waveforms, pressure-volume loops, buffer graphs, or packet queues right inside the 3D scene.
3. **Register direct 3D manipulation** with `reg.interactable(targetId, { cursor, hint, onDrag })` so the user can drag 3D assemblies directly in the viewport via `setParam(...)`, `fireTrigger(...)`, or `applyStep(...)`, even when animation is paused.
4. **Route all pipes and cables** using `reg.tube(id, fromAnchorId, waypoints, toAnchorId, opts)` with smooth 3D arch waypoints (`length / chord >= 1.12`) and coaxial `dir` normals.
5. Implement `export function updateKinematics(reg, state)` driven by `state.theta`, `state.params` (`state.<controlId>`), `state.triggers` / `state.triggerAges` (backed by `burst()`, `settle()`, `smooth()` from `kit/runtime.mjs`), `state.timeline`, `state.stepIndex`, `state.section`, and `state.shaderEnv`. Optionally export `tourAt(clock, state)` for a gentle idle demonstration tour.

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
