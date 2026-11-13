# 3D Craft & Visual Grammar (`references/craft-3d.md`)

An Anatomy Three.js figure explains a technical system by turning it into a tangible, precision-machined bench-top apparatus rendered in an orthographic isometric projection with quantized cel shading, inverted-hull silhouettes, and sharp crease lines.

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

Never invent custom colors on solid meshes. Assign every part to one of the six semantic ramps according to its role in the explanation:

| Ramp | Visual Weight | Role in the Apparatus | Examples |
| :--- | :--- | :--- | :--- |
| `lo` | Receding dark neutral | Heavy datum bedplate, rear endplate, cast exhaust manifold, ignition coil box, rubber boots, foot pads | `base.plate`, `rear.plate`, `coil.box`, `plug.*.boot` |
| `mid` | Structural body neutral | Main cutaway housing, bearing pedestals, intake manifold, gauge post, spark hex nuts, tie rods | `stator.housing`, `pedestal.*`, `gauge.post` |
| `hi` | Crisp light neutral | Primary shafts, control knob drum, gauge bezel, ceramic insulators, timing pulley, flange plates | `shaft.main`, `knob.drum`, `gauge.bezel`, `plug.*.insulator` |
| `lit` | Saturated accent (Amber/Blue) | **The Hero Subject** — the single moving assembly the viewer's eye should lock onto first | `rotor.body`, `rotor.apexSeal.*` |
| `brass` | Warm machined brass | Precision reaction/internal gears, eccentric bearing journal, capillary tubes, specification plaque | `rear.statGear`, `rotor.internalGear`, `shaft.journal`, `base.plaque` |
| `copper` | Warm copper/bronze | High-voltage coil towers, primary spark cable, exhaust heat collar | `coil.tower.*`, `cable.spark.leading`, `stator.exhaust.collar` |

### Outline & Crease Hierarchy
- **`outline: "hi"` (`outlineWidth: 0.018–0.020`)**: Use on the hero subject (`rotor.body`), primary housing (`stator.housing`), and main shaft (`shaft.main`).
- **`outline: "mid"` (`outlineWidth: 0.014–0.017`)**: Use on sub-assemblies (pedestals, manifolds, gears, knob, gauge bezel).
- **`outline: "lo"` (`outlineWidth: 0.010–0.014`)**: Use on the baseplate, feet, ruler, and thin tubes/tie rods.
- **`noCrease: true`**: Always set on smooth curved tubes (`reg.tube` sets this automatically) and thin tie rods so tessellation facets never draw false interior lines.

---

## 3. Physical Parts Vocabulary

Every figure should read as a complete bench-top instrument composed of five physical layers:

1. **Instrument Bedplate (`base.mjs`)**:
   - Beveled heavy slab (`buildSlabGeometry` with `radius: 0.26, bevel: true, bevelSize: 0.025, bevelThickness: 0.025`).
   - Remember that `ExtrudeGeometry` adds `bevelThickness` to both top and bottom along the extrusion axis (`Y`). Always set `topSurfaceY = BASE_Y + BASE_H + bevelThickness` (`-2.12 + 0.24 + 0.025 = -1.855`) so parts mounted at `topSurfaceY` rest flush on the top face rather than sinking into the bevel.
   - Four turned corner feet (`collar` + `pad`) with counterbored socket screws (`makeScrewDetail`) on the top corners above each foot.
   - Dual inset perimeter grooves (`makePlanOutline`), a graduated ruler strip (`makeRulerTicks`), and a riveted `brass` plaque (`base.plaque`) with an engraved specification tag.

2. **Load-Bearing Structure (`structure.mjs`)**:
   - Flanged pedestals (`pedestal.rear`, `pedestal.front`) bolted to the bedplate with 4 socket screws each, tapered web columns, and cylindrical bearing saddles.
   - Cutaway housing (`stator.housing`) with water-jacket passages, perimeter cooling fin loops (`THREE.LineLoop`), and perimeter tie rods (`stator.tieRod.*`) + hex nuts (`tieBolts.nut.*`).
   - Radially outward-pointing intake/exhaust manifolds with flanged ports and dark bore circles (`kit.dotMaterials.dot`).

3. **Hero Moving Subject (`subject.mjs`)**:
   - High-contrast `lit` body (`rotor.body`) with machined lightening pockets, combustion bathtub depressions on each flank, dual face oil-seal grooves, and `lit` apex seal bars (`rotor.apexSeal.*`).
   - Precision `brass` internal gear (`rotor.internalGear`) meshing visibly with the stationary `brass` phasing gear (`rear.statGear`).

4. **Domain-Authentic Operator Controls, Telemetry & Direct 3D Manipulation (`mechanism.mjs`)**:
   - **Never copy another figure's controls or instruments.** Choose physical hardware that genuinely belongs to the machine being explained:
     - *Rotary / throttle / micrometer*: knurled drum (`makeKnurlLines`), Vernier micrometer barrel, or stepped cam detent.
     - *2-axis directional / cyclic*: gimballed control stick with spherical boot (`cyclic.stick` + `cyclic.grip`), X/Y cross-slide stage, or tilting cradle.
     - *Pitch / travel / valve*: notched quadrant lever with graduated degree arc (`collective.quadrant`), rack-and-pinion slide, or screw-jack handwheel.
     - *Telemetry readout*: curved blade-pitch protractor arc (`pitchScale.arc`), fluid manometer column, linear vernier gauge, or Bourdon pressure dial (use a pressure gauge **only** when pressure is actually being measured).
   - **Direct 3D Manipulation (`reg.interactable`)**: Always ask what the reader expects to grab directly on screen. Register the primary moving control element (`swash.assembly`, `cyclic.group`, `collective.group`, sliding carriage, etc.) with `reg.interactable` so dragging it in 3D drives `setParam(...)` immediately — including while rotation is paused.
   - Smooth 3D `CatmullRomCurve3` conduits, pushrods, or cables (`reg.tube`) connecting registered 3D port anchors.
   - Coaxial drive shafts, gears, and front-side shrouds (`cutawayHide: true` when `features.cutaway` is `true`).

5. **Confined Physical Medium Shader (`shader.mjs`)**:
   - Custom GLSL shader (`THREE.ShaderMaterial`) restricted strictly to the active physical medium (gas, fluid, plasma, rotor wake) inside the active zone.
   - Solid metal parts must **always** use `kit.createAnatomyPart`; never apply a custom plasma/glow shader to solid metal geometry.

6. **When to Enable or Disable View Modes (`SPEC.features`)**:
   - `explode: true` — use **only** for enclosed concentric assemblies with stacked axial layers (engines, transmissions, multi-layer valves) where separating layers reveals hidden internal fit.
   - `explode: false` — use for open-frame mechanisms, articulated linkages, swashplates, or optical/fluid benches where separating parts disconnects joints without adding clarity. Hides the `APART` button and `<kbd>E</kbd> apart` hint automatically.
   - `cutaway: true` — use when a casing conceals moving internals; set `false` when the apparatus is naturally open.

---

## 4. 3D Anti-Patterns to Avoid

- **Cloning Stock Controls & Gauges Across Unrelated Machines**: Never copy a Wankel engine's knurled RPM knob, hydraulic manifold box, or tall Bourdon pressure dial onto an unrelated figure (such as a helicopter swashplate or optical interferometer). Design bespoke controls, levers, and telemetry indicators that physically drive and measure the actual domain variables.
- **Passive-Only Figures When Direct 3D Dragging Fits**: If the reader sees a swashplate, lever, carriage, or lens mirror, they expect to drag it directly in 3D and see the linked blades/beams respond — even when time/RPM is paused.
- **Forced Exploded Views on Open Linkages**: Do not invent arbitrary explode vectors for open ball-joint linkages or rods that look broken when pulled apart; set `features.explode = false`.
- **Floating or Sunken Parts**: Never guess Y heights. Derive every base-mounted Y coordinate from `SPEC.topSurfaceY` and register `mountOn: "base.plate"` so `audit3d.mjs` verifies contact to within `[0, 0.08]` world units.
- **Inward-Pointing Manifolds**: In Three.js right-handed coordinates, rotating around `+Z` by a positive angle tilts a `+Y` cylinder toward `-X` (counter-clockwise in XY). Always check `inspect-ortho.png` (`FRONT` and `TOP` panels) to confirm manifolds point radially outward from the housing.
- **Taut Diagonal Rods & T-Bone Port Kinks**: Never connect two differently oriented ports (for example, an upward `+Y` coil tower and a horizontal `+X` spark plug boot) by interpolating waypoints monotonically along the straight chord between anchors. That produces a stiff diagonal stick that T-bones into the side of the connector boot and cuts across neighboring ports. Always pass `{ dir: [dx, dy, dz] }` on `reg.anchor()` so `reg.tube()` inserts coaxial `leadOut`/`leadIn` tangent handles, and place open 3D arch waypoints outside the target port (`length/chord >= 1.12`) so the cable rises out of its source port, drapes smoothly in 3D, and turns coaxially into the target boot without 90° T-bone kinks or 180° planar hairpin folds.
- **Front Shaft Parts Blocking the Cutaway**: Always mark front-side shaft counterweights and pulleys with `cutawayHide: true` so the default cutaway view (`cutaway: true, explode: 0`) gives an unobstructed view of the internal gearing and subject.
