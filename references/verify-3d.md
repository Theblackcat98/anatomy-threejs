# 3D Verification & Debugging Guide (`references/verify-3d.md`)

Three.js figures fail in two ways that are invisible in raw code:
1. **3D Spatial Errors** — parts floating in mid-air above the bedplate, manifolds clipping into the baseplate, internal seals penetrating the housing bore wall, or cables making sharp hairpin bends.
2. **2D Projection / Occlusion Errors** — an instrument or brass plaque that is valid in 3D space but hidden behind the housing at the canonical isometric camera angle (`30° elev, -36° azim`), or a front pulley whose tick marks stay visible in cutaway mode.

To catch both, Anatomy Three.js uses a **Two-Tier Verification Pipeline**.

---

## Tier 1: Headless Node 3D Spatial Audit (`kit/audit3d.mjs`)

Run the spatial audit in ~350 ms without launching a browser:
```bash
node figures/<slug>/build.mjs --audit
```

`runGeometryAudit()` instantiates your full Three.js scene in Node.js, steps `updateKinematics(reg, { theta })` across 5 poses (`0°, 72°, 144°, 216°, 288°`), updates all world matrices, and checks every registered part and tube.

### How to Fix Audit Errors

| Audit Tag | Meaning | How to Fix |
| :--- | :--- | :--- |
| `[TONE]` | No part uses `ramp: "lit"` or `"hi"`, or too few ramps are used. | Assign `ramp: "lit"` to the hero moving subject and use at least 3 distinct ramps (`lo`, `mid`, `hi`, `lit`, `brass`, `copper`). |
| `[UNMOUNTED]` | A non-detail part has no `mountOn` target. | Pass `mountOn: "<supportingPartId>"` (or `"ground"` for the bedplate/stator, or `"coaxial"` for the main shaft). |
| `[MOUNT]` | `mountOn` references a part ID that does not exist. | Check spelling of the target part ID in `reg.part(...)`. |
| `[FLOATING] A is floating X.XXX units away from mountOn target B` | The 3D bounding boxes of `A` and `B` have a surface gap `> 0.08` world units at pose $\theta$. | Derive `A`'s position from `SPEC.topSurfaceY` or a shared anchor rather than guessing coordinates. |
| `[COLLISION] A penetrates inner bore of B by X.XXX` | A vertex of `A` (which has `insideBoreOf: "B"` and `boreClearanceFn`) crossed outside the inner bore wall (`clearance < -0.015`). | Reduce `A`'s radial offset/width slightly or increase the bore clearance in `model.mjs`. |
| `[COLLISION] Unexpected 3D mesh overlap between "A" and "B"` | Triangles of `A` and `B` occupy the same `~0.03` world-space voxel cell inside their shrunk intersection volume. | If `A` and `B` are supposed to be separate (e.g., `stator.exhaust.flange` vs `base.plate`), adjust `BASE_Y` or part dimensions so they clear each other. If `A` and `B` intentionally intersect (e.g., coaxial shaft passing through a bearing saddle, or meshing gear teeth), add `"B"` to `A`'s `allowOverlap: [...]` list. |
| `[TUBE COLLISION] Tube "T" clips through interior of "P"` | Curve samples along `T` (`t \in [0.14, 0.86]`) pass deep inside part `P`'s bounding box. | Adjust the intermediate `waypoints` of `reg.tube("T", ...)` to arch around `P`, or add `"P"` to `allowOverlap` if `P` is a hollow flange/collar the tube passes through. |
| `[TUBE KINK]` | `"T" bends too sharply (XX.X° at segment i)` along uniform arc-length samples (`getSpacedPoints(48)` > `42°`). | The spline reverses too abruptly between control points or `leadIn` handle. Spread intermediate arch waypoints smoothly in 3D so they transition orthogonally into the port's `leadIn` handle without pinching into a hairpin fold. |
| `[TUBE TANGENT]` | `"T" exits/enters anchor at XX.X° off port axis (max 38°)`. | Register `{ dir: [dx, dy, dz] }` on both port anchors (`reg.anchor`) so `reg.tube` inserts coaxial `leadOut`/`leadIn` handles, and swing your arch waypoints outside the target port rather than cutting across the side of the boot (T-bone kink). |
| `[TUBE TAUT]` | `"T" is too taut/straight (length/chord ratio X.XXX < 1.08)`. | Flexible cables should never look like rigid straight rods. Add an outward/upward arch waypoint (`ratio >= 1.12`) so the cable drapes naturally (or pass `rigid: true` only for straight hard-line pipes). |
| `[TUBE TERMINAL] Tube "T" start/end is X.XXX units away from ...` | The anchor passed to `reg.tube` does not lie on or near `fromPart` / `toPart`. | Attach the anchor directly to the port/terminal `THREE.Group` via `reg.anchor(id, x, y, z, portGroup)`. |

---

## Tier 2: Headless Chrome Orthographic & Interactive Harness

Passing `--audit` guarantees 3D mathematical consistency, but you **must** also inspect the rendered 2D projections using `scripts/inspect.mjs` and `scripts/drive.mjs` and view the output PNGs with `read_file`.

### 1. Orthographic Blueprint Quad (`--ortho`)
```bash
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --ortho figures/<slug>/dist/inspect-ortho.png
```
Renders a 2×2 blueprint sheet (`2400×1640`) with four panels:
- **Top-Left — `FRONT (0°, 0°)` (`XY` elevation)**: Check vertical grounding on `base.plate`, pedestal heights, rotor centering inside the epitrochoid bore, and radial manifold angles.
- **Top-Right — `RIGHT (0°, -90°)` (`ZY` side)**: Check axial alignment along `Z`, endplate seating, spark plug angle, and spark cable arch from coil towers to plug boots.
- **Bottom-Left — `TOP (90°, 0°)` (`XZ` plan)**: Check footprint symmetry on the bedplate, corner screw placement, plaque and ruler layout on the `+Z` front apron, and gauge clearance.
- **Bottom-Right — `CANONICAL ISO (30°, -36°)`**: Check 3D composition, silhouette clarity, and ensure no label or dial face is occluded by the main housing.

You can combine `--ortho` with `--isolate <stage>` at Stages 2–4:
```bash
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --isolate base,structure --ortho figures/<slug>/dist/inspect-structure.png
```

### 2. Zoomed Joint & Port Sheet (`--joints`)
```bash
node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --joints figures/<slug>/dist/inspect-joints.png
```
Automatically iterates through every anchor registered via `reg.anchor(id, ...)`, centers and zooms the orthographic camera (`2.8×`) onto that 3D point, overlays a precision crosshair reticle, and stitches all crops into a contact sheet.
- **What to check**: Every crosshair should sit squarely on its physical feature (bolt flange, spark plug boot tip, coil tower top, gear pitch-circle tangent, pressure tap port, dial center).

### 3. Full Interactive Drive Sheet & Mobile Check (`scripts/drive.mjs`)
```bash
node scripts/drive.mjs figures/<slug>/dist/<slug>.html figures/<slug>/dist/
```
Programmatically exercises the compiled figure via `window.__ANATOMY_DEBUG__` and produces:
- `inspect-drive.png`: 8-panel contact sheet covering `θ = 0° (INTAKE)`, `θ = 90° (COMPRESSION)`, `θ = 180° (IGNITION)`, `θ = 270° (EXHAUST)`, `EXPLODED (E = 1)`, `CUTAWAY OFF (C = 0)`, `DARK THEME`, and `BLUEPRINT THEME`.
- `hero-light.png`, `hero-exploded.png`, `hero-dark.png`: High-resolution (`1400×920`) standalone captures.
- `mobile-390.png`: Renders at `390×844` mobile viewport and verifies `scrolls sideways: no` and `console: clean`.
