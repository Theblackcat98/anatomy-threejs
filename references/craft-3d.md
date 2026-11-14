# 3D Craft & Visual Grammar (`references/craft-3d.md`)

An Anatomy Three.js figure explains a technical system by turning it into a tangible, precision-built 3D object or apparatus rendered in an orthographic isometric projection with quantized cel shading, optical glass and semantic channel materials, inverted-hull silhouettes, and sharp crease lines.

---

## 0. Stage 0 Metaphor Exploration & Archetypes

Do not squeeze every prompt into a generic cast-iron tabletop plate with a single rotary knob. In Stage 0:
1. For abstract, algorithmic, software, biological, or open-ended prompts, propose **2–3 distinct physical metaphors** that translate the concept into concrete geometry and motion.
2. Select the matching **`SPEC.archetype`** for Stage 2 (`base.mjs`) and Stage 3 (`structure.mjs`):

| `SPEC.archetype` | Grounding Hardware (`base.mjs`) | Best Used For |
| :--- | :--- | :--- |
| `"bench"` *(default)* | Beveled `buildSlabGeometry` bedplate, 4 turned feet, perimeter groove, front ruler, `brass` plaque | Engines, gearboxes, turbines, laboratory test rigs |
| `"gantry"` / `"test-stand"` | Launch pad slab, flame trench/blast deck, or structural steel pier footings + optional `makeDatumGrid` | Static-fire rocket stands, cranes, wind tunnels, vertical rigs |
| `"cabinet"` / `"enclosure"` | Leveling feet + hollow front-cutaway shell (`buildEnclosureBoxGeometry`) | Synthesizers, CRT/oscilloscopes, pin-tumbler locks, cameras, racks |
| `"section"` / `"diorama"` | Terrain/masonry/fluid tank slab rim + `makeDatumGrid` underneath | Wave tanks, geological strata, optical paths, architecture |
| `"free-space"` | Minimal spatial reference (`makeGimbalDatumRing` and/or `makeDatumGrid`) | Satellites, orbital mechanics, zero-g mechanisms, molecular lattices |

3. Select **`SPEC.simulationMode`**:
   - `"continuous"`: Rotary/periodic loop driven by `RPM` / `theta` (`CRANK` + `SLOW` shown).
   - `"sequence"`: Discrete steps (`SPEC.steps` + `STEP` button) and one-shot events (`SPEC.triggers` + `burst()`/`settle()` envelopes). Hides `RPM` / `CRANK` / `SLOW` unless opted in.
   - `"timeline"`: Scrubbable `0..1` `TIME` curve (`theta = timeline * 2π`).
   - `"sandbox"`: Sits calmly at rest until the reader drags 3D parts directly or fires impulse triggers (`PLUCK`, `DROP`, `PULSE`).
4. Optionally provide **`tourAt(clock, state)`** (or `SPEC.tour`) to demonstrate the apparatus automatically while idle (`1.6s` on load, resuming `3.6s` after user input stops).
5. Optionally add **`SPEC.cameraViews`** bookmarks (rendered as header pill buttons + digit keys `1`–`9`) and **`SPEC.section`** (`{ axis, min, max, initial }` live 3D clipping plane on `clippable: true` shells).

---

## 1. The 3D Coordinate Frame & Canonical Isometric Camera

All geometry lives in a right-handed Three.js coordinate system (`+X` right, `+Y` up, `+Z` toward viewer) viewed through a true `THREE.OrthographicCamera`.

- **Canonical Isometric Pose**:
  - Elevation (`rotX`): `+30°` (`+0.5236 rad`) tilts the top (`+Y`) face toward the viewer.
  - Azimuth (`rotY`): `-36°` (`-0.6283 rad`) rotates the front (`+Z`) face slightly left and the right (`+X`) side slightly forward.
- **Screen-Space Projection at Canonical Iso (`rotX = 30°, rotY = -36°`)**:
  $$x_{\text{screen}} = 0.809\,x - 0.588\,z$$
  $$y_{\text{screen}} = 0.866\,y + 0.294\,x + 0.405\,z$$
  $$z_{\text{depth}} = 0.500\,y + 0.509\,x + 0.701\,z$$
- **Practical Placement Rules**:
  1. **Cutaway Window faces `+Z`**: When a machine has an enclosing housing (`features.cutaway: true`), orient its open cutaway face toward `+Z` so the interior bore and hero subject stay visible from the canonical isometric camera.
  2. **Front Apron is `+Z`**: Place primary operator controls (`cyclicMount`, `collectiveMount`, `knobMount`, etc.), graduated scales (`rulerCenter`), and brass specification plaques (`plaqueCenter`) along the front apron (`z > +0.8`) where nothing occludes them.
  3. **Left-Side Instruments need `+Z` bias**: Because `-0.588 z` shifts negative-`z` objects rightward behind the central apparatus in `CANONICAL ISO`, mount left-side instruments (`x < -1.4`) at positive `z` or clear radial separation so their scales and needles stand unobstructed.
  4. **Framing**: Set `initialZoom` (`~0.86–0.98`) and `initialPanY` in `model.mjs` so all four corner feet of the bedplate and the top of the assembly have comfortable breathing room inside `#figure-card`.

---

## 2. The Four-Tone + Top-Cap Cel Hierarchy

Every 3D part registered with `reg.part(id, geometry, { ramp, outline, crease })` uses `kit/shaders.mjs` to quantize diffuse lighting into four discrete flat bands (`c0` shadow, `c1` lower-mid, `c2` upper-mid, `c3` highlight) plus a warm top-cap blend (`cTop`) for upward-facing normals ($n_y > 0.35$).

Never invent ad-hoc inline colors on solid meshes. Assign parts from the curated theme ramps (which adapt coherently across all 5 themes):

| Ramp | Visual Weight | Role in the Apparatus | Examples |
| :--- | :--- | :--- | :--- |
| `lo` | Receding dark neutral | Datum plates, rear endplates, manifolds, coil/chassis boxes, rubber boots, foot pads | `base.plate`, `rear.plate`, `coil.box` |
| `mid` | Structural body neutral | Main cutaway housings, cabinets, pedestals, frames, valve bodies | `stator.housing`, `pedestal.*`, `cabinet.shell` |
| `hi` | Crisp light neutral | Primary shafts, sliding carriages, bezels, ceramic insulators, precision levers | `shaft.main`, `knob.drum`, `gauge.bezel` |
| `lit` | Saturated accent (Amber/Blue) | Primary hero working assembly (or primary active channel in `"multi-channel"` mode) | `rotor.body`, `rotor.apexSeal.*` |
| `brass` | Warm machined brass | Precision gears, pins, bearing journals, specification plaques | `rear.statGear`, `rotor.internalGear`, `base.plaque` |
| `copper` | Warm copper/bronze | Conductors, coils, heat exchangers, primary tubing | `coil.tower.*`, `cable.spark.leading` |
| `glass` | Translucent Fresnel cel glass | Optical lenses, vacuum chambers, viewing domes, fluid manometers | `chamber.dome`, `optic.prism` |
| `intake` / `channelA` | Semantic channel A solid ramp | Cool input/low-pressure/intake channel flow (theme-harmonized) | `pipe.intake`, `stage.decode` |
| `comp` / `channelB` | Semantic channel B solid ramp | Compression / second computational or thermodynamic stage | `valve.comp`, `stage.execute` |
| `comb` / `channelC` | Semantic channel C solid ramp | Ignition / high-energy / active state stage | `chamber.comb`, `stage.alu` |
| `exhaust` / `channelD` | Semantic channel D solid ramp | Exhaust / thermal rejection / output channel | `manifold.exhaust`, `stage.writeback` |

### `SPEC.toneMode`
- **`"single-lit"` *(default)***: Reserves `ramp: "lit"` for the hero assembly in `stage: "subject"` (plus optional `detail: true` accent needles/dots).
- **`"multi-channel"`**: Set on diagrams comparing simultaneous pipelines, fluid circuits, optical beams, or computational stages so `lit`, `glass`, and channel ramps (`intake`/`channelA..D`) can appear across `structure`, `subject`, and `mechanism`.

### Outline & Crease Hierarchy
- **`outline: "hi"` (`outlineWidth: 0.018–0.020`)**: Use on the hero subject (`rotor.body`), primary housing (`stator.housing`), and main shaft (`shaft.main`).
- **`outline: "mid"` (`outlineWidth: 0.014–0.017`)**: Use on sub-assemblies (pedestals, manifolds, gears, knob, gauge bezel).
- **`outline: "lo"` (`outlineWidth: 0.010–0.014`)**: Use on the baseplate, feet, ruler, and thin tubes/tie rods.
- **`noCrease: true`**: Always set on smooth curved tubes (`reg.tube` sets this automatically) and thin tie rods so tessellation facets never draw false interior lines.

---

## 3. Physical Parts Vocabulary

Compose each figure from clear physical layers matched to its `SPEC.archetype`:

1. **Base / Grounding Layer (`base.mjs`)**:
   - **`"bench"`**: Beveled heavy slab (`buildSlabGeometry` with `radius: 0.26, bevel: true, bevelSize: 0.025, bevelThickness: 0.025`, `topSurfaceY = BASE_Y + BASE_H + bevelThickness`), 4 turned corner feet + counterbored screws (`makeScrewDetail`), perimeter grooves (`makePlanOutline`), ruler (`makeRulerTicks`), and riveted `brass` plaque.
   - **`"gantry"` / `"test-stand"`**: Flame trench pad, concrete deck, hold-down ring, and structural baseplates.
   - **`"cabinet"` / `"enclosure"`**: Leveling feet + recessed chassis floor / `buildEnclosureBoxGeometry` mounting plinth.
   - **`"section"` / `"diorama"`**: Cutaway terrain/fluid tray rim + optional `makeDatumGrid`.
   - **`"free-space"`**: `makeGimbalDatumRing` and/or `makeDatumGrid` so orbital/molecular machines float cleanly without tabletop slab clutter.

2. **Load-Bearing Structure (`structure.mjs`)**:
   - Pedestals, frames, cabinet shells, optical chambers (`ramp: "glass"`), and cutaway housings.
   - Pass `cutawayHide: true` on removable front shells, and/or pass **`clippable: true`** alongside `SPEC.section` so users can slice smoothly through housings and inspect cross-hatched interior section cuts in real time.
   - Register port anchors with outward normals (`{ dir: [dx, dy, dz] }`) for downstream conduits.

3. **Hero Moving Subject (`subject.mjs`)**:
   - High-contrast hero bodies and multi-stage hierarchical kinematic groups (`orbit -> spin`, `azimuth -> flap -> pitch`, gimbal rings).
   - Pass `insideBoreOf` and `boreClearanceFn` for parts running inside bores so `audit3d.mjs` proves zero collision.

4. **Domain-Authentic Operator Controls, Screens, Triggers & Direct 3D Interaction (`mechanism.mjs`)**:
   - **Never clone unrelated stock controls.** Build hardware that genuinely drives the concept: rotary dials, 2-axis gimbal sticks, quadrant levers, sliding tumblers, wave plungers, or diegetic CRT/telemetry screens (`reg.screen`).
   - **Direct 3D Manipulation (`reg.interactable`)**: Always register key 3D levers, tumblers, rotors, or sliders so dragging them directly in the viewport drives `setParam(...)`, `fireTrigger(...)`, or `applyStep(...)`.
   - **Sequence / Sandbox Dynamics**: Use `burst(age, rise, fall)`, `settle(held, want, dt, seconds)`, and `smooth(a, b, x)` from `kit/runtime.mjs` with `SPEC.triggers` / `SPEC.steps`, plus optional `tourAt(clock, state)` for automatic idle showcase tours.

5. **Confined Physical Medium Shader (`shader.mjs`)**:
   - Custom GLSL shader (`THREE.ShaderMaterial`) restricted strictly to the active physical medium (gas, fluid, plasma, rotor wake, wave field) inside its containment boundary.

6. **When to Enable or Disable View Modes (`SPEC.features`)**:
   - `explode`: Enable **only** for enclosed concentric assemblies where pulling layers apart reveals hidden fit (`false` hides `APART` / `E`).
   - `cutaway`: Enable when an outer shell conceals moving internals; set `false` for open-frame mechanisms.
   - `crank` / `slow` / `rpm`: Auto-disabled in `"sequence"`, `"timeline"`, and `"sandbox"` modes unless explicitly opted in.

---

## 4. 3D Anti-Patterns to Avoid

- **Cloning Stock Controls & Gauges Across Unrelated Machines**: Never copy a Wankel engine's knurled RPM knob, hydraulic manifold box, or tall Bourdon pressure dial onto an unrelated figure (such as a helicopter swashplate or optical interferometer). Design bespoke controls, levers, and telemetry indicators that physically drive and measure the actual domain variables.
- **Passive-Only Figures When Direct 3D Dragging Fits**: If the reader sees a swashplate, lever, carriage, or lens mirror, they expect to drag it directly in 3D and see the linked blades/beams respond — even when time/RPM is paused.
- **Forced Exploded Views on Open Linkages**: Do not invent arbitrary explode vectors for open ball-joint linkages or rods that look broken when pulled apart; set `features.explode = false`.
- **Floating or Sunken Parts**: Never guess Y heights. Derive every base-mounted Y coordinate from `SPEC.topSurfaceY` and register `mountOn: "base.plate"` so `audit3d.mjs` verifies contact to within `[0, 0.08]` world units.
- **Inward-Pointing Manifolds**: In Three.js right-handed coordinates, rotating around `+Z` by a positive angle tilts a `+Y` cylinder toward `-X` (counter-clockwise in XY). Always check `inspect-ortho.png` (`FRONT` and `TOP` panels) to confirm manifolds point radially outward from the housing.
- **Taut Diagonal Rods & T-Bone Port Kinks**: Never connect two differently oriented ports (for example, an upward `+Y` coil tower and a horizontal `+X` spark plug boot) by interpolating waypoints monotonically along the straight chord between anchors. That produces a stiff diagonal stick that T-bones into the side of the connector boot and cuts across neighboring ports. Always pass `{ dir: [dx, dy, dz] }` on `reg.anchor()` so `reg.tube()` inserts coaxial `leadOut`/`leadIn` tangent handles, and place open 3D arch waypoints outside the target port (`length/chord >= 1.12`) so the cable rises out of its source port, drapes smoothly in 3D, and turns coaxially into the target boot without 90° T-bone kinks or 180° planar hairpin folds.
- **Front Shaft Parts Blocking the Cutaway**: Always mark front-side shaft counterweights and pulleys with `cutawayHide: true` so the default cutaway view (`cutaway: true, explode: 0`) gives an unobstructed view of the internal gearing and subject.
