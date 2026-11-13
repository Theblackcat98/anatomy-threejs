# Anatomy Three.js (`anatomy-threejs`)

An agent skill and modular CAD/verification engine for building crafted, interactive isometric **3D technical figures in Three.js and GLSL**.

Inspired by [Ryan's `anatomy` SVG skill](https://skills.wheresryan.sh/anatomy), `anatomy-threejs` explains technical concepts (engines, instruments, algorithms, fluid/optical rigs) as physical bench-top instruments rendered in an orthographic isometric projection with:
- **Four-tone + top-cap quantized cel shading** (`lo`, `mid`, `hi`, `lit`, `brass`, `copper` ramps across 5 themes: `Light`, `Paper`, `Dark`, `Blueprint`, `Sepia`)
- **Backface inverted-hull silhouettes** and **`THREE.EdgesGeometry` crease lines**
- **Confined GLSL physical medium shaders** (combustion gas, plasma, fluid, optical beams) strictly masked to the active cavity
- **Spring-eased kinematics**, axial **exploded view (`E`)**, **cutaway toggle (`C`)**, direct 3D **orbit / pan / zoom**, and **`Shift`+drag mechanical cranking**

---

## Why a 6-Stage Pipeline + 3D Audit?

Asking an LLM to write a 1,500-line monolithic Three.js HTML file in one shot causes **spatial blindness**: parts float above the bedplate, manifolds point inward or clip through the baseplate, internal seals penetrate housing walls, and instruments get hidden behind the housing at the canonical isometric camera angle.

`anatomy-threejs` solves this with two mechanisms:
1. **Immutable Engine (`kit/`) + 6-Stage Modular CAD (`figures/<slug>/`)**: The camera rig, cel shaders, spring physics, card chrome, and bundler live once in `kit/`. Each figure is built across six small, focused ES modules (`model.mjs`, `base.mjs`, `structure.mjs`, `subject.mjs`, `mechanism.mjs`, `shader.mjs`).
2. **Two-Tier 3D Spatial + Orthographic Visual Verification**:
   - **Tier 1 (`--audit`)**: Runs in pure Node.js in ~350 ms using `kit/audit3d.mjs` to check bounding-box grounding (`[FLOATING]`), triangle-in-voxel mesh intersections (`[COLLISION]`), analytical inner-bore clearance, and `CatmullRomCurve3` tube kinks (`[TUBE KINK]`) across 5 kinematic poses before launching a browser.
   - **Tier 2 (`scripts/inspect.mjs` & `scripts/drive.mjs`)**: Launches headless Chrome via zero-dependency CDP (`scripts/chrome-port.mjs`) to capture a **2×2 Orthographic Blueprint Quad** (`FRONT`, `RIGHT`, `TOP`, `CANONICAL ISO`), an **18-point Zoomed Joint Contact Sheet**, an **8-State Interactive Drive Sheet**, and a **390px Mobile Viewport check**.

---

## Quick Start

```bash
# Install dependencies (Three.js for headless Node 3D geometry auditing & bundling)
npm install

# 1. Run Stage 1 pure kinematic & anchor test
node figures/wankel-engine/build.mjs --test-model

# 2. Run headless Node 3D spatial audit (72 parts, 3 tubes, 18 joints, 5 poses)
node figures/wankel-engine/build.mjs --audit

# 3. Compile self-contained single-file HTML bundle
node figures/wankel-engine/build.mjs

# 4. Capture 2x2 Orthographic Blueprint Quad & Zoomed Joint Contact Sheet
node scripts/inspect.mjs figures/wankel-engine/dist/wankel-engine.html --ortho figures/wankel-engine/dist/inspect-ortho.png
node scripts/inspect.mjs figures/wankel-engine/dist/wankel-engine.html --joints figures/wankel-engine/dist/inspect-joints.png

# 5. Run full 8-state interactive drive & 390px mobile verification
node scripts/drive.mjs figures/wankel-engine/dist/wankel-engine.html figures/wankel-engine/dist/
```

---

## Repository Structure

- [`SKILL.md`](SKILL.md) — The 6-stage agent workflow and verification gates.
- [`references/craft-3d.md`](references/craft-3d.md) — 3D coordinate system, isometric projection math, 4-tone cel hierarchy, parts vocabulary, and anti-patterns.
- [`references/kit-3d.md`](references/kit-3d.md) — Complete API reference for `Recorder3D`, `kit/primitives.mjs`, `kit/shaders.mjs`, and `kit/bundle.mjs`.
- [`references/verify-3d.md`](references/verify-3d.md) — Guide to diagnosing and fixing `--audit`, `inspect.mjs`, and `drive.mjs` findings.
- [`kit/`](kit/) — Immutable Three.js Anatomy engine (`shaders.mjs`, `primitives.mjs`, `registry.mjs`, `audit3d.mjs`, `runtime.mjs`, `bundle.mjs`, `shell.html`).
- [`scripts/`](scripts/) — Zero-dependency headless Chrome (CDP) visual inspection and driving tools (`inspect.mjs`, `drive.mjs`, `chrome-port.mjs`).
- [`figures/wankel-engine/`](figures/wankel-engine/) — Reference 6-stage implementation of the Wankel Rotary Engine (`13B · R 105 · e 15 · 34:51`).
