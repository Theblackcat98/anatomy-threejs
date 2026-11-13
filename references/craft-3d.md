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
  1. **Cutaway Window faces `+Z`**: The main housing (`stator.housing`) lies in the `XY` plane extruded along `Z`, with its open cutaway face at `+Z` so the interior bore and hero subject are completely visible.
  2. **Front Apron is `+Z`**: Place operator controls (`knobMount`), graduated scales (`rulerCenter`), and brass specification plaques (`plaqueCenter`) along the front apron (`z > +0.9`) where nothing occludes them.
  3. **Left-Side Instruments need `+Z` bias**: Because `-0.588 z` shifts negative-`z` objects rightward behind the housing in `CANONICAL ISO`, mount left-side instruments (like the Bourdon gauge at `x < -2.2`) at positive `z` (`z \approx +0.5 \dots +0.7`) and on a tall post so the dial face stands completely clear to the left of the housing silhouette.
  4. **Framing**: Set `initialZoom` (`~0.95`) and `initialPanY` (`+0.18 \dots +0.24`) in `model.mjs` so all four corner feet of the bedplate and the top manifold have comfortable breathing room inside `#figure-card`.

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

4. **Operator Controls, Telemetry & Routing (`mechanism.mjs`)**:
   - Knurled bench control knob (`knob.drum` + `makeKnurlLines`) with a top pointer line that rotates as RPM/input changes.
   - Secondary telemetry instrument (`gauge.bezel` + radial dial ticks + `gauge.needle`) driven in real time by the chamber state.
   - Smooth 3D `CatmullRomCurve3` tubes/cables (`reg.tube`) connecting registered 3D port anchors.
   - Coaxial drive shaft (`shaft.main`), eccentric journal (`shaft.journal` with oil hole), counterweights, and front timing pulley (`cutawayHide: true` so it hides in cutaway view and appears when Cutaway is off or Exploded is active).

5. **Confined Physical Medium Shader (`shader.mjs`)**:
   - Custom GLSL shader (`THREE.ShaderMaterial`) restricted strictly to the active physical medium (gas, fluid, plasma) inside the bore.
   - Solid metal parts must **always** use `kit.createAnatomyPart`; never apply a custom plasma/glow shader to solid metal geometry.

---

## 4. 3D Anti-Patterns to Avoid

- **Floating or Sunken Parts**: Never guess Y heights. Derive every base-mounted Y coordinate from `SPEC.topSurfaceY` and register `mountOn: "base.plate"` so `audit3d.mjs` verifies contact to within `[0, 0.08]` world units.
- **Inward-Pointing Manifolds**: In Three.js right-handed coordinates, rotating around `+Z` by a positive angle tilts a `+Y` cylinder toward `-X` (counter-clockwise in XY). Always check `inspect-ortho.png` (`FRONT` and `TOP` panels) to confirm manifolds point radially outward from the housing.
- **Hairpin Kinks in Tubes**: Never place a tube waypoint past its target anchor so the spline has to double back. Compute waypoints by interpolating monotonically between `fromAnchor` and `toAnchor` world coordinates (`reg.getAnchorWorldPos(id)`).
- **Front Shaft Parts Blocking the Cutaway**: Always mark front-side shaft counterweights and pulleys with `cutawayHide: true` so the default cutaway view (`cutaway: true, explode: 0`) gives an unobstructed view of the internal gearing and subject.
