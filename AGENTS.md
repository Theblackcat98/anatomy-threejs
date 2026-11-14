# AGENTS.md — `anatomy-threejs` Repository Guide

## What This Repository Is

`anatomy-threejs` is an agent skill (`SKILL.md` + `references/`) paired with a shared, immutable Three.js + GLSL engine (`kit/`) and verification harness (`scripts/`) for authoring interactive cel-shaded isometric 3D technical figures where **the object is the explanation**.

Each figure lives cleanly inside `figures/<slug>/` as six isolated modules (`model.mjs`, `base.mjs`, `structure.mjs`, `subject.mjs`, `mechanism.mjs`, `shader.mjs`) compiled by `build.mjs` into a self-contained HTML artifact (`figures/<slug>/dist/<slug>.html`).

## Active Experimentation & Skill Evolution

We are actively creating, iterating on, and stress-testing diverse 3D figures in this repository to ensure the skill works reliably across mechanical, aerospace, and optical domains without regressions or visual clichés.

Current reference & experimental figures under `figures/`:
- `wankel-engine` — Epitrochoid rotary combustion test rig (`continuous` mode, `bench` bedplate, internal gearing, 4-stroke GLSL chamber shader).
- `helicopter-swashplate` — Open articulated rotor hub & CCPM swashplate linkage (`continuous` mode, `explode: false`, 3D draggable swashplate/cyclic/collective controls, rotor-disc wake shader).
- `rs25-engine` — Cryogenic staged-combustion rocket test stand (`gantry` rig, gimbaled 2-axis TVC actuators, supersonic Mach-diamond plume shader).
- `lens-50mm-f14` — Double-Gauss `7E/6G` unit-focusing prime camera lens (`sandbox` mode, `multi-channel` optical glass, 9-blade iris diaphragm, diegetic MTF50/DoF monitor, marginal ray shader).
- `zoom-lens-24-70` — Four-group parfocal `24–70mm f/2.8` zoom lens (`sandbox` mode, `multi-channel` cam barrel & linear guide rods, G2/G3 cam-locus screen, parfocal ray shader).

### Key Findings Encoded in the Skill
1. **Six-Stage CAD + Two-Tier Audits Prevent Spatial Blindness**: Building monolithically causes floating parts, inward manifolds, and clipped bores. Every stage gates on `kit/audit3d.mjs` (`--test-model`, `--audit`) and headless Chrome CDP renders (`scripts/inspect.mjs`, `scripts/drive.mjs`), visually verified by reading the PNG outputs.
2. **Coaxial Port-Normal Tube Routing**: Flexible conduits and cables use outward `{ dir: [dx, dy, dz] }` port normals, `leadOut`/`leadIn` handles, and natural slack arches (`length/chord >= 1.08`) checked for tangency, kinks, and solid intersections.
3. **Bespoke Controls, Screens, and Direct 3D Drag**: Every figure builds domain-authentic hardware, `reg.screen` diegetic canvas telemetry where helpful, and `reg.interactable` drag handlers instead of reusing generic knobs.
4. **The Bottom Plate with Four Feet Is Not Always Necessary**: Heavy beveled tabletop slabs (`base.plate` + `base.foot.*`) work for classic benchtop test rigs, but self-contained instruments—such as camera lenses on support rails, cylindrical optics, enclosures, and orbital rigs—look cleaner and fill the viewport better without a bottom plate, using compact rail/bridge outriggers over `makeHaloMesh` and `makeDatumGrid` instead.

## Ground Rules for Agents Working Here

1. **Follow [`SKILL.md`](SKILL.md)** and read [`references/craft-3d.md`](references/craft-3d.md), [`references/kit-3d.md`](references/kit-3d.md), and [`references/verify-3d.md`](references/verify-3d.md) before authoring geometry.
2. **Keep `kit/` figure-agnostic**: Never put figure-specific geometry, hacks, or coordinates into `kit/`. Only generalize `kit/` when fixing a genuine skill-level engine/harness capability.
3. **Always run the full verification loop after changes**:
   - `node figures/<slug>/build.mjs --test-model`
   - `node figures/<slug>/build.mjs --audit`
   - `node scripts/inspect.mjs figures/<slug>/dist/<slug>.html --ortho --joints`
   - `node scripts/drive.mjs figures/<slug>/dist/<slug>.html`
   - Inspect all generated PNGs (`inspect-ortho.png`, `inspect-joints.png`, `hero-*.png`, `inspect-drive.png`, `mobile-390.png`) directly with your file-reading tool before finishing.
4. **Add or verify npm scripts in `package.json`** (`build:<slug>`, `test:<slug>`, `audit:<slug>`, `inspect:<slug>`, `drive:<slug>`) when introducing a new experimental figure.
