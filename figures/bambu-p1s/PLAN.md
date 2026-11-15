# Implementation Plan — `bambu-p1s` (Bambu Lab P1S CoreXY 3D Printer)

> **Audience:** Implementing Agent.
> This document is your complete, self-contained engineering specification and stage-by-stage implementation guide for `figures/bambu-p1s/`.
> You do not need any external context beyond this file and the repository docs (`SKILL.md`, `references/craft-3d.md`, `references/kit-3d.md`, `references/verify-3d.md`).
> **Stage 0 is complete and approved.** Start directly at **Stage 1** and follow the verification gates strictly. **Never modify any file inside `kit/`.**

---

## 1. Core Mechanical Story ("The Object Is the Explanation")

A **Bambu Lab P1S** achieves high-speed Fused Deposition Modeling ($500\text{ mm/s}$ velocity, $20,000\text{ mm/s}^2$ acceleration) inside an enclosed thermal chamber through four coupled subsystems that must all be simultaneously legible in this 3D figure:

1. **Differential CoreXY Belt Kinematics (Upper Gantry):**
   - Two stationary NEMA 17 stepper motors (**Motor A** at rear-left, **Motor B** at rear-right) stay bolted to the rigid steel frame so the moving gantry never carries heavy XY motor mass.
   - Two stacked closed-loop GT2 timing belts (**Belt A** on the upper plane $y = 2.00$ rendered in semantic `intake` blue; **Belt B** on the lower plane $y = 1.94$ rendered in semantic `exhaust` red) route across 8 idler pulleys on the frame and sliding Y-carriages to clamp onto the toolhead.
   - Because both belts pull the toolhead differentially:
     $$\Delta x = \frac{1}{2}(\Delta a + \Delta b), \qquad \Delta y_{\text{printer}} = -\Delta z_{\text{world}} = \frac{1}{2}(\Delta a - \Delta b)$$
     $$\theta_A = \frac{\Delta x - \Delta z}{R_{\text{pulley}}}, \qquad \theta_B = \frac{\Delta x + \Delta z}{R_{\text{pulley}}}$$
     - **Pure X move ($\Delta z = 0$):** Motors A and B rotate in the **same direction** at equal speed.
     - **Pure Y move ($\Delta x = 0$):** Motors A and B rotate in **opposite directions** at equal speed.
     - **45° diagonal move ($\Delta x = \pm\Delta z$):** Only **one motor turns** while the other locks stationary.
2. **Ultralight Twin Carbon-Fiber X-Axis & 9:53 Direct-Drive Toolhead:**
   - The toolhead glides horizontally along **two hollow carbon-fiber X-rods** (`ramp: "comp"`) bridging the left and right steel Y-carriages.
   - Inside the cutaway toolhead housing: a **9:53 reduction dual-gear extruder** grips $1.75\text{ mm}$ filament from the flexible PTFE guide tube, drives it through a finned all-metal titanium/copper heatbreak cooled by an axial fan, melts it inside a **$300^\circ\text{C}$ ceramic heater block** (`ramp: "comb"`), and deposits a $0.42\text{ mm}$ bead onto the part while dual part-cooling blower ducts solidify the layer.
3. **Single-Motor 3-Lead-Screw Synchronized Z-Axis Bed:**
   - The gantry stays at a fixed height while the build platform drops layer by layer along **three vertical TR8×8 lead screws** (Front-Left, Front-Right, Rear-Center).
   - Underneath the chamber deck inside the lower electronics bay, a **single Z stepper motor** drives a closed timing belt loop that turns all three lead-screw pulleys in phase, keeping the removable golden **Textured PEI spring-steel build plate** (`ramp: "brass"`) dead-level.
4. **Closed-Loop Thermal Chamber & 4-Fan Airflow Ecosystem:**
   - Enclosed steel/polymer cabinet with a tempered glass front door and glass top lid (`ramp: "glass"`, hidden when `CUTAWAY` is active), a large **left-wall Auxiliary Part Cooling Blower** blasting cross-flow air sheet across the active layer, a **rear Chamber Exhaust Fan**, and a rear-left **Filament Purge & Wiper Chute** where the toolhead parks during the `PURGE / PARK` trigger.

---

## 2. Authentic Bambu Lab P1S Engineering Data

| Parameter | Real P1S Specification | Figure Representation (`1 unit = 100 mm`) |
| :--- | :--- | :--- |
| **Outer Chassis Dimensions** | $389 \times 389 \times 458\text{ mm}$ ($W \times D \times H$) | `CH_W = 3.89`, `CH_D = 3.89`, `CH_H = 4.58` |
| **Build Volume** | $256 \times 256 \times 256\text{ mm}^3$ | PEI plate $2.56 \times 2.56\text{ u}$ (`PLATE = 2.56`) |
| **Net Weight** | $12.95\text{ kg}$ | Engraved on front spec plaque |
| **XY Kinematics** | CoreXY, rear-mounted steppers, stacked GT2 belts | Upper Belt A (`intake` blue), Lower Belt B (`exhaust` red) |
| **X-Axis Guide** | Dual hollow carbon-fiber rods ($\varnothing 10\text{ mm}$) | Twin horizontal rods (`X_ROD_Y_UP = 1.80`, `X_ROD_Y_LO = 1.64`) |
| **Y-Axis Guide** | Dual hardened steel linear rods ($\varnothing 10\text{ mm}$) | Left/Right rods at $x = \pm 1.70$, $y = 1.84$ |
| **Z-Axis Drive** | 3 lead screws driven by 1 stepper via closed bottom belt | Screws at `FL (-1.62, 0.95)`, `FR (1.62, 0.95)`, `R (0, -1.62)` |
| **Extruder** | Direct-drive dual hardened-steel gears, **9:53** ratio | 9T pinion driving 53T spur gear + dual filament drive rollers |
| **Hotend** | All-metal, ceramic heater + integrated thermistor, $\le 300^\circ\text{C}$ | `comb` heater block + heatsink fins + `0.4 mm` brass nozzle |
| **Heatbed** | $\le 100^\circ\text{C}$, magnetic **Textured PEI** spring-steel sheet | `brass` PEI sheet (`2.56 × 2.56`) on `mid` aluminum heatbed |
| **Cooling Ecosystem** | Part fan + Hotend fan + Left Aux blower + Rear Chamber fan | All 4 modeled; GLSL shader visualizes Aux + Part cooling air |
| **Max Speed / Accel** | $500\text{ mm/s}$ / $20,000\text{ mm/s}^2$ | `rpm` control slider (`SPEED`, $40\text{–}500\text{ mm/s}$) |
| **Max Volumetric Flow** | $\approx 21\text{ mm}^3\text{/s}$ (standard PLA @ $220^\circ\text{C}$) | Computed live as $Q = v \cdot w_{\text{line}} \cdot h_{\text{layer}}$ |

---

## 3. Stage 0 Architecture & Declarative `SPEC` Decisions

- **Folder:** `figures/bambu-p1s/`
- **Compiled Output:** `figures/bambu-p1s/dist/bambu-p1s.html`
- **Archetype:** `SPEC.archetype = "cabinet"`
  - **No heavy tabletop bench slab (`base.plate`) with 4 turned bench feet.** The P1S is a self-contained enclosed cabinet (`3.89 × 3.89 × 4.58`) that grounds itself directly via 4 compact rubber isolation pads (`base.foot.fl/fr/rl/rr`, `mountOn: "ground"`) over a soft ground shadow (`makeHaloMesh`) and orthographic blueprint grid (`makeDatumGrid`).
- **Simulation Mode:** `SPEC.simulationMode = "continuous"`
  - Driven continuously by `state.theta` (the print-job progress angle) and a domain slider with `id: "rpm"`, `label: "SPEED"` ($40\text{–}500\text{ mm/s}$, initial $200\text{ mm/s}$). Using `id: "rpm"` lets `kit/runtime.mjs` automatically advance `state.theta` while supporting `CRANK` and `SLOW` modes out of the box.
- **Tone Mode:** `SPEC.toneMode = "multi-channel"`
  - Enables semantic color coding across stages:
    - `lit`: Growing 3D printed vase on the build plate, active filament strand, and extruder gear indicator (`stage: "subject"`).
    - `intake` (`channelA` blue): CoreXY Belt A loop, Motor A pulley, and Aux cooling blower nozzle.
    - `exhaust` (`channelD` red): CoreXY Belt B loop and Motor B pulley.
    - `comb` (`channelC` orange/red): Ceramic heater block & silicone sock on the hotend.
    - `comp` (`channelB` purple): Twin carbon-fiber X-axis rods & lower Z-synchronization belt.
    - `brass`: Textured PEI build plate, 3 Z lead screws, nozzle tip, and front specification plaque.
    - `copper`: Stepper motor stator coils, heatbreak throat, and filament spool hub.
    - `glass`: Tempered glass front door (`cutawayHide: true`) and glass top lid (`cutawayHide: true`).
    - `hi` / `mid` / `lo`: Steel frame posts, side/rear walls, Y linear rods, carriage blocks, toolhead shroud, and electronics bay deck.
- **Features:**
  ```js
  features: {
    explode: false,   // Open internal gantry + belted frame -> explode is disabled
    cutaway: true,    // Hides glass front door, glass top lid, right enclosure panel & right toolhead cover
    shader: true,     // Molten extrusion bead thermal trail + Aux/Part laminar cooling airflow shader
    crank: true,      // Scrub print progress manually
    slow: true,       // 1x, 1/5x, 1/20x, PAUSED
    section: false    // Cutaway already opens +Z front and +X right sides cleanly
  }
  ```

---

## 4. 3D Coordinate Frame, Hierarchy & Collision-Free Mounting Strategy

### 4.1 Coordinate Mapping
- `+X`: Printer Left $\to$ Right (`-1.945` to `+1.945`)
- `+Y`: Printer Bottom $\to$ Top (`FLOOR_Y = -2.35` to `CH_Y1 = +2.29`)
- `+Z`: Printer Rear $\to$ Front (`-1.945` rear panel to `+1.945` front glass door)

### 4.2 Parent-Child Kinematic Hierarchy (Why `--audit` Passes with Zero `[FLOATING]` or `[COLLISION]`)

`kit/audit3d.mjs` checks every non-detail part (`detail: false`) for:
1. `mountOn` contact (`dist <= 0.035` in `restPose`).
2. Solid triangle-voxel overlap (`> 0.015` penetration) across all poses in `SPEC.auditPoses`.

To guarantee that moving parts **never detach from their `mountOn` parent** at any print pose:

1. **Y-Gantry Group (`gantry.yGroup`, `stage: "subject"`, translates in $Z$ by `zc`):**
   - `gantry.yCarriage.L` (`pos: [-1.70, 1.84, 0]`, `mountOn: "struct.yRod.L"`) and `gantry.yCarriage.R` (`pos: [1.70, 1.84, 0]`, `mountOn: "struct.yRod.R"`).
   - Because `struct.yRod.L` and `struct.yRod.R` span $z \in [-1.52, +1.72]$ and `zc` stays inside $[-1.32, +0.90]$, both Y-carriages **always** wrap around and intersect their Y-rods at every pose!
   - `gantry.xRod.upper` (`pos: [0, 1.84, 0]`, `mountOn: "gantry.yCarriage.L"`, `allowOverlap: ["gantry.yCarriage.R", "subject.thCarriage"]`) and `gantry.xRod.lower` (`pos: [0, 1.66, 0]`, `mountOn: "gantry.yCarriage.L"`, `allowOverlap: ["gantry.yCarriage.R", "subject.thCarriage"]`) are children of `gantry.yGroup`, so they translate in $Z$ right along with the Y-carriages!
2. **Toolhead Group (`subject.toolhead`, child of `gantry.yGroup`, translates in local $X$ by `xt`):**
   - `subject.thCarriage` (`pos: [0, 1.75, 0]`, `mountOn: "gantry.xRod.upper"`, `allowOverlap: ["gantry.xRod.lower", "subject.thShroudRear", "subject.thShroudFront"]`) wraps around both X-rods. Because the X-rods span $x \in [-1.70, +1.70]$ inside `gantry.yGroup` and `xt` stays within $[-1.15, +0.85]$, `subject.thCarriage` **always** touches the X-rods!
   - Every other part on the toolhead (rear shroud, front cutaway shroud, extruder gears, heatsink, heater block, nozzle, cooling fan, blower duct) is a child of `subject.toolhead` and mounts onto `subject.thCarriage` (or a neighbor on the toolhead), moving as a rigid body!
3. **Z-Bed Assembly Group (`subject.bedGroup`, `stage: "subject"`, translates in $Y$ by `-bedDrop`):**
   - The three vertical TR8×8 lead screws (`mech.zScrew.fl`, `mech.zScrew.fr`, `mech.zScrew.r`) span vertically from $y = -1.47$ (`DECK_Y`) up to $y = +1.44$.
   - `subject.bedFrame` (the under-bed spider/support plate inside `subject.bedGroup`) sits at local $y = 1.27$ (world $y \in [0.57, 1.27]$ as `bedDrop` ranges from $0$ to $0.70$). Its three lead-screw nut bosses wrap around `mech.zScrew.r`, `mech.zScrew.fl`, and `mech.zScrew.fr` (`mountOn: "mech.zScrew.r"`, `allowOverlap: ["mech.zScrew.fl", "mech.zScrew.fr", "subject.heatbed"]`). Thus `subject.bedFrame` **always** intersects all three lead screws at every Z height!
   - `subject.heatbed` mounts on `subject.bedFrame`; `subject.peiPlate` (`ramp: "brass"`) mounts on `subject.heatbed`; `subject.print.raft` (`ramp: "lit"`) mounts on `subject.peiPlate`.
   - The 14 stacked vase bands (`subject.print.band.0` .. `subject.print.band.13`, `ramp: "lit"`) are children of `subject.bedGroup` with `detail: true` so they can scale smoothly from `0.001` to `1.0` as layers print without triggering AABB overlap checks between adjacent thin layers.
4. **Dynamic Belt Runs & Internal PTFE Arch (`detail: true`):**
   - Stretching CoreXY belt segments (`beltA.*`, `beltB.*`) and the flexing internal PTFE tube arch (`ptfe.dynamic`) use `detail: true` on `reg.part(...)` so they render with full cel-shaded fills and outlines while never causing false-positive box collisions as they stretch.
   - Two fixed-endpoint conduits (`tube.filament.feed` and `tube.umbilical.harness`) are registered via `reg.tube(...)` between stationary rear anchors with pre-verified waypoints so `reg.tubes` passes all 6 tube audits (`[TUBE KINK]`, `[TUBE TANGENT]`, `[TUBE TAUT]`, `[TUBE TERMINAL]`, `[TUBE COLLISION]`, tube-to-tube clearance).

---

## 5. Stage 1 — Pure Model & Bundler (`model.mjs` + `build.mjs`)

### 5.1 Complete `figures/bambu-p1s/model.mjs`

Create `figures/bambu-p1s/model.mjs` with zero Three.js imports. Use the exact structure below:

```js
const TAU = Math.PI * 2;

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function smooth(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export const SPEC = {
  archetype: "cabinet",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Outer P1S Cabinet Envelope (1 unit = 100 mm -> 389 x 389 x 458 mm)
  CH_W: 3.89,
  CH_D: 3.89,
  CH_H: 4.58,
  FLOOR_Y: -2.35,
  FOOT_H: 0.06,
  FOOT_R: 0.14,
  FOOT_INSET: 0.34,
  CH_Y0: -2.29,          // Bottom of chassis plinth (FLOOR_Y + FOOT_H)
  CH_Y1: 2.29,           // Top of glass lid
  HALF_W: 1.945,
  HALF_D: 1.945,
  POST_W: 0.16,          // Corner steel column width
  POST_OFFSET: 1.865,    // HALF_W - POST_W/2
  WALL_T: 0.06,
  DECK_Y: -1.47,         // Top surface of lower chamber floor / electronics bay ceiling
  DECK_H: 0.08,          // Chamber floor slab thickness (-1.55 .. -1.47)
  BAY_FLOOR_Y: -2.21,    // Top surface of lower electronics bay bottom pan (-2.29 + 0.08)
  TOP_RING_Y0: 2.07,     // Upper steel frame perimeter beam bottom
  TOP_RING_Y1: 2.23,     // Upper steel frame perimeter beam top
  LID_Y0: 2.23,          // Tempered glass top lid (2.23 .. 2.29)
  topSurfaceY: -1.47,    // Reference height for chamber-mounted components

  // CoreXY Gantry & Motion System
  Y_ROD_X: 1.70,
  Y_ROD_Y: 1.84,
  Y_ROD_R: 0.042,
  Y_ROD_Z0: -1.52,
  Y_ROD_Z1: 1.72,
  X_ROD_Y_UP: 1.84,
  X_ROD_Y_LO: 1.66,
  X_ROD_R: 0.036,
  X_ROD_SPAN: 3.40,      // Spans between x = -1.70 and x = +1.70
  BELT_A_Y: 2.00,        // Upper CoreXY belt plane (intake blue)
  BELT_B_Y: 1.93,        // Lower CoreXY belt plane (exhaust red)
  MOTOR_X: 1.48,
  MOTOR_Z: -1.68,
  PULLEY_R: 0.075,

  // Toolhead & Direct-Drive Extruder (9:53 reduction)
  TH_W: 0.48,
  TH_H: 0.58,
  TH_D: 0.46,
  NOZZLE_TIP_Y: 1.37,
  EXTRUDER_RATIO: 53 / 9,

  // Z-Axis 3-Lead-Screw Bed & Textured PEI Plate (256 x 256 mm)
  BED_CX: 0.0,
  BED_CZ: 0.14,          // Shifted slightly +Z to clear rear purge chute
  PLATE_SIZE: 2.56,
  PLATE_T: 0.024,
  HEATBED_SIZE: 2.62,
  HEATBED_T: 0.06,
  BED_FRAME_T: 0.06,
  BED_TOP_Y0: 1.36,      // PEI top surface at layer 0 (just below nozzle tip 1.37)
  SCREW_R_RAD: 0.042,
  SCREW_Y0: -1.47,
  SCREW_Y1: 1.44,
  SCREW_FL: [-1.58, 0.96],
  SCREW_FR: [1.58, 0.96],
  SCREW_R: [0.0, -1.58],
  Z_MOTOR_POS: [-1.28, -1.86, -1.36],
  Z_BELT_Y: -1.78,

  // Printed Subject (14-band twisted geometric vase)
  N_BANDS: 14,
  BAND_H: 0.048,
  PART_HALF: 0.46,
  PART_TAPER: 0.007,
  PART_TWIST: 0.075,

  // Rear-left Purge Chute & Wiper Park Station
  PARK_POS: [-1.12, -1.28], // [xt, zc]

  features: {
    explode: false,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: false
  },

  interactionHint: "Drag toolhead in X/Y, drag PEI bed in Z, or spin rear CoreXY motors",

  controls: [
    {
      id: "rpm",
      label: "SPEED",
      min: 40,
      max: 500,
      step: 10,
      initial: 200,
      title: "Toolhead print speed (mm/s, up to 500 mm/s P1S max)"
    },
    {
      id: "nozzleT",
      label: "NOZZLE",
      min: 180,
      max: 300,
      step: 5,
      initial: 220,
      title: "All-metal ceramic hotend temperature (°C)"
    },
    {
      id: "fan",
      label: "AUX FAN",
      min: 0,
      max: 100,
      step: 5,
      initial: 80,
      title: "Part + Auxiliary chamber cross-flow cooling fan power (%)"
    },
    {
      id: "layerH",
      label: "LAYER",
      min: 0.08,
      max: 0.28,
      step: 0.04,
      initial: 0.20,
      title: "Sliced layer thickness (mm)"
    }
  ],

  triggers: [
    {
      id: "park",
      label: "PURGE / PARK",
      rise: 0.12,
      fall: 1.10,
      title: "Slew toolhead to rear-left purge chute, wipe nozzle, and resume print"
    },
    {
      id: "retract",
      label: "RETRACT",
      rise: 0.08,
      fall: 0.65,
      title: "Reverse 9:53 dual-gear extruder to retract filament and relieve nozzle pressure"
    }
  ],

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.94, pan: [0.0, 0.08] },
    { id: "corexy", label: "COREXY BELTS", elev: 62, azim: -18, zoom: 1.16, pan: [0.0, -0.22] },
    { id: "toolhead", label: "9:53 TOOLHEAD", elev: 18, azim: -14, zoom: 1.65, pan: [0.0, -0.58] },
    { id: "zdrive", label: "3-SCREW Z BAY", elev: 14, azim: -44, zoom: 1.18, pan: [0.0, 0.62] },
    { id: "top", label: "TOP PLAN", elev: 88, azim: 0, zoom: 0.98, pan: [0.0, 0.0] }
  ],

  initialTheta: -TAU * 4.35, // Starts mid-print on Band 5 (36% complete) so vase is clearly visible!
  initialRpm: 200,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.94,
  initialPanY: 0.08,
  minVertSpan: 5.4,
  minHorizSpan: 6.8,

  auditPoses: [
    {
      name: "rest mid-print (band 5 outer wall)",
      theta: -TAU * 4.35,
      explode: 0,
      params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 }
    },
    {
      name: "first layer start (band 0)",
      theta: -TAU * 0.25,
      explode: 0,
      params: { rpm: 120, nozzleT: 220, fan: 0, layerH: 0.20 }
    },
    {
      name: "mid-print infill pass (band 7)",
      theta: -TAU * 7.78,
      explode: 0,
      params: { rpm: 350, nozzleT: 240, fan: 90, layerH: 0.20 }
    },
    {
      name: "upper vase layer (band 12)",
      theta: -TAU * 12.42,
      explode: 0,
      params: { rpm: 500, nozzleT: 260, fan: 100, layerH: 0.24 }
    },
    {
      name: "purge chute park trigger",
      theta: -TAU * 5.20,
      explode: 0,
      params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 },
      triggers: { park: 1.0, retract: 0.0 }
    }
  ],

  drivePoses: [
    {
      label: "1. LAYER 1 · PEI BED HIGH (220°C)",
      pose: { theta: -TAU * 0.35, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 120, nozzleT: 220, fan: 20, layerH: 0.20 } }
    },
    {
      label: "2. BAND 5 · OUTER WALL PERIMETER",
      pose: { theta: -TAU * 4.35, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 220, nozzleT: 220, fan: 80, layerH: 0.20 } }
    },
    {
      label: "3. BAND 8 · SPARSE INFILL (380 mm/s)",
      pose: { theta: -TAU * 7.82, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 380, nozzleT: 235, fan: 95, layerH: 0.20 } }
    },
    {
      label: "4. 500 mm/s MAX · FLOW LIMIT",
      pose: { theta: -TAU * 11.40, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 500, nozzleT: 255, fan: 100, layerH: 0.28 } }
    },
    {
      label: "5. PURGE CHUTE PARK & WIPE",
      pose: { theta: -TAU * 6.20, cutaway: true, shader: true, trigger: "park", hud: true, theme: "light", params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 } }
    },
    {
      label: "6. CUTAWAY OFF · GLASS ENCLOSURE",
      pose: { theta: -TAU * 6.35, cutaway: false, shader: true, hud: true, theme: "light", params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 } }
    },
    {
      label: "7. DARK THEME · 300°C HOTEND",
      pose: { theta: -TAU * 9.35, cutaway: true, shader: true, hud: true, theme: "dark", params: { rpm: 300, nozzleT: 300, fan: 100, layerH: 0.20 } }
    },
    {
      label: "8. BLUEPRINT THEME · COREXY PLAN",
      pose: { theta: -TAU * 5.35, cutaway: true, shader: true, hud: true, theme: "blueprint", params: { rpm: 240, nozzleT: 220, fan: 80, layerH: 0.20 } }
    }
  ]
};

export const ANCHORS = {
  deckCenter: [0.0, SPEC.DECK_Y, 0.0],
  motorAMount: [-SPEC.MOTOR_X, 1.68, SPEC.MOTOR_Z],
  motorBMount: [SPEC.MOTOR_X, 1.68, SPEC.MOTOR_Z],
  zMotorMount: [...SPEC.Z_MOTOR_POS],
  screwFLBase: [SPEC.SCREW_FL[0], SPEC.DECK_Y, SPEC.SCREW_FL[1]],
  screwFRBase: [SPEC.SCREW_FR[0], SPEC.DECK_Y, SPEC.SCREW_FR[1]],
  screwRBase: [SPEC.SCREW_R[0], SPEC.DECK_Y, SPEC.SCREW_R[1]],
  auxFanPort: [-1.76, 1.42, 0.14],
  purgeChuteTop: [SPEC.PARK_POS[0], 1.25, SPEC.PARK_POS[1]],
  spoolHubRear: [0.58, 0.35, -2.12],
  filamentInletRear: [0.0, 2.02, -2.02],
  frontScreenMount: [-1.12, -1.84, 1.98],
  plaqueCenter: [1.05, -1.88, 1.98]
};

const U_TRAVEL = 0.07;
const U_INFILL = 0.64;
const INFILL_PASSES = 5;

export function bandHalf(k) {
  return SPEC.PART_HALF - SPEC.PART_TAPER * k;
}

export function bandRot(k) {
  return SPEC.PART_TWIST * k;
}

function rot2(x, z, r) {
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [x * c - z * s, x * s + z * c];
}

function superSquare(t, s) {
  const a = TAU * t;
  const c = Math.cos(a);
  const si = Math.sin(a);
  return [
    s * Math.sign(c) * Math.pow(Math.abs(c), 0.36),
    s * Math.sign(si) * Math.pow(Math.abs(si), 0.36)
  ];
}

export function pathPoint(k, u) {
  const s = bandHalf(k);
  const r = bandRot(k);
  if (u < U_TRAVEL) {
    const prev = k > 0 ? pathPoint(k - 1, 0.999).p : rot2(...superSquare(0, s * 0.96), r);
    const next = rot2(...superSquare(0, s * 0.96), r);
    const f = smooth(0, 1, u / U_TRAVEL);
    return {
      p: [lerp(prev[0], next[0], f), lerp(prev[1], next[1], f)],
      mode: "LAYER Z-HOP",
      extruding: false
    };
  }
  if (u < U_INFILL) {
    const t = (u - U_TRAVEL) / (U_INFILL - U_TRAVEL);
    return {
      p: rot2(...superSquare(t, s * 0.96), r),
      mode: "OUTER WALL",
      extruding: true
    };
  }
  const w = ((u - U_INFILL) / (1 - U_INFILL)) * INFILL_PASSES;
  const i = Math.min(INFILL_PASSES - 1, Math.floor(w));
  const f = w - i;
  const span = 0.72 * s;
  const vOf = (j) => -span + (2 * span * j) / (INFILL_PASSES - 1);
  const v = lerp(vOf(Math.max(0, i - 1)), vOf(i), smooth(0, 0.14, f));
  const dir = i % 2 === 0 ? 1 : -1;
  const along = dir * span * (2 * clamp01((f - 0.14) / 0.86) - 1);
  const [lx, lz] = k % 2 === 0 ? [along, v] : [v, along];
  return {
    p: rot2(lx, lz, r),
    mode: "GYROID INFILL",
    extruding: true
  };
}

export function getPrintState(theta = SPEC.initialTheta, params = {}, triggers = {}) {
  const speed = clamp(params.rpm ?? 200, 40, 500);
  const nozzleT = clamp(params.nozzleT ?? 220, 180, 300);
  const fan = clamp(params.fan ?? 80, 0, 100);
  const layerH = clamp(params.layerH ?? 0.20, 0.08, 0.28);
  const parkEnv = clamp01(triggers.park ?? 0);
  const retractEnv = clamp01(triggers.retract ?? 0);

  const cycle = SPEC.N_BANDS + 1;
  const prog = -theta / TAU;
  const pc = ((prog % cycle) + cycle) % cycle;
  const k = Math.min(SPEC.N_BANDS, Math.floor(pc));
  const u = pc - k;

  let lx = 0;
  let lz = 0;
  let mode = "OUTER WALL";
  let extruding = true;
  let bandFill = 1.0;
  let bandsDone = k;
  let bedDrop = k * SPEC.BAND_H;

  if (k >= SPEC.N_BANDS) {
    const endPt = pathPoint(SPEC.N_BANDS - 1, 0.999).p;
    const f = smooth(0, 0.35, u);
    lx = lerp(endPt[0], SPEC.PARK_POS[0] - SPEC.BED_CX, f);
    lz = lerp(endPt[1], SPEC.PARK_POS[1] - SPEC.BED_CZ, f);
    mode = "PRINT COMPLETE";
    extruding = false;
    bandsDone = SPEC.N_BANDS;
    bandFill = 1.0;
    bedDrop = SPEC.N_BANDS * SPEC.BAND_H;
  } else {
    const pp = pathPoint(k, u);
    lx = pp.p[0];
    lz = pp.p[1];
    mode = pp.mode;
    extruding = pp.extruding;
    bandFill = clamp01((u - U_TRAVEL) / (1 - U_TRAVEL));
    const zHop = u < U_TRAVEL ? 0.025 * Math.sin(Math.PI * (u / U_TRAVEL)) : 0;
    bedDrop = (k + smooth(0, U_TRAVEL, u)) * SPEC.BAND_H + zHop;
  }

  // Blend toward rear-left purge chute when PURGE / PARK trigger is active
  const xtPrint = SPEC.BED_CX + lx;
  const zcPrint = SPEC.BED_CZ + lz;
  const xt = clamp(lerp(xtPrint, SPEC.PARK_POS[0], parkEnv), -1.15, 0.85);
  const zc = clamp(lerp(zcPrint, SPEC.PARK_POS[1], parkEnv), -1.32, 0.90);

  if (parkEnv > 0.15) {
    mode = "PURGE CHUTE WIPE";
    extruding = parkEnv > 0.55;
  } else if (retractEnv > 0.15) {
    mode = "RETRACTING · 9:53";
    extruding = false;
  }

  // CoreXY differential motor angles (radians)
  // Printer Y = -zc, so motorA = (xt - zc)/R, motorB = (xt + zc)/R
  const motorARad = (xt - zc) / SPEC.PULLEY_R;
  const motorBRad = (xt + zc) / SPEC.PULLEY_R;

  // Z-screw rotation angle (1 turn per 0.04 world units of bed drop)
  const zScrewRad = (bedDrop / 0.04) * TAU;
  const bedTopY = SPEC.BED_TOP_Y0 - bedDrop;

  // Volumetric flow rate Q = speed (mm/s) * line_width (0.42 mm) * layerH (mm)
  const rawFlow = speed * 0.42 * layerH;
  const flowLimit = 21.0 + (nozzleT - 220) * 0.12;
  const volumetricFlow = extruding ? rawFlow : 0.0;
  const isFlowLimited = extruding && rawFlow > flowLimit;
  if (isFlowLimited && parkEnv <= 0.15 && retractEnv <= 0.15) {
    mode = `${mode} · MAX FLOW`;
  }

  // Extruder 53T gear angle & 9T pinion angle
  const extProgress = k * (1 - U_TRAVEL) + Math.max(0, u - U_TRAVEL);
  const extruderGearRad = extProgress * 4.2 - retractEnv * 2.8;
  const extruderPinionRad = -extruderGearRad * SPEC.EXTRUDER_RATIO;
  const spoolRad = -extProgress * 0.55;

  const progressPct = clamp(((k + bandFill) / SPEC.N_BANDS) * 100, 0, 100);
  const realZmm = (bedDrop * 100).toFixed(1);

  return {
    xt,
    zc,
    lx,
    lz,
    k,
    u,
    bandsDone,
    bandFill,
    bedDrop,
    bedTopY,
    motorARad,
    motorBRad,
    zScrewRad,
    extruderGearRad,
    extruderPinionRad,
    spoolRad,
    speed,
    nozzleT,
    fan,
    layerH,
    volumetricFlow,
    flowLimit,
    isFlowLimited,
    extruding,
    parkEnv,
    retractEnv,
    progressPct,
    realZmm,
    mode
  };
}

export function formatReadout(state = {}) {
  const st = getPrintState(state.theta ?? SPEC.initialTheta, state.params || state, state.triggers || {});
  const xMm = ((st.xt + 1.28) * 100).toFixed(0);
  const yMm = ((1.28 - st.zc) * 100).toFixed(0);
  return {
    readout: `X ${xMm} Y ${yMm} Z ${st.realZmm}mm · ${Math.round(st.speed)} mm/s · Q ${st.volumetricFlow.toFixed(1)} mm³/s · ${Math.round(st.nozzleT)}°C / 65°C · FAN ${Math.round(st.fan)}%`,
    phase: `LAYER ${Math.min(SPEC.N_BANDS, st.k + 1)}/${SPEC.N_BANDS} (${Math.round(st.progressPct)}%) · ${st.mode}`
  };
}
```

### 5.2 Complete `figures/bambu-p1s/build.mjs`

Create `figures/bambu-p1s/build.mjs`:

```js
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndVerifyFigure } from "../../kit/bundle.mjs";
import * as model from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics, tourAt } from "./mechanism.mjs";
import { buildShader } from "./shader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

buildAndVerifyFigure({
  figureDir: HERE,
  outFile: join(HERE, "dist", "bambu-p1s.html"),
  meta: {
    title: "Anatomy · Bambu Lab P1S CoreXY 3D Printer (Three.js Isometric)",
    ariaLabel: "Interactive Bambu Lab P1S CoreXY 3D printer cutaway figure",
    figLabel: "Fig 09 · Bambu Lab P1S CoreXY",
    initialPhase: "LAYER 5/14 (36%) · OUTER WALL",
    initialReadout: "X 174 Y 114 Z 21.6mm · 200 mm/s · Q 16.8 mm³/s · 220°C / 65°C · FAN 80%",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">BAMBU LAB P1S · 256³ mm · 20 m/s²</div>`,
      `<div class="engraved-tag" id="tag-corexy">COREXY · A/B BELTS · 9:53 EXT</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Drag the carbon-rod toolhead in X/Y or the textured PEI bed in Z: two rear-mounted stepper motors drive stacked upper (blue) and lower (red) CoreXY timing belts differentially—turning together for X travel and opposite for Y—while one bottom motor synchronizes three Z lead screws and a 9:53 dual-gear extruder feeds a 300 °C ceramic hotend.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Extrusion &amp; Filament</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Belt A (ΔX+ΔY) &amp; Cooling Air</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-exh"></span>Belt B (ΔX−ΔY)</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>300°C Ceramic Hotend</span>`
    ].join("\n        ")
  },
  model,
  buildBase,
  buildStructure,
  buildSubject,
  buildMechanism,
  buildShader,
  updateKinematics,
  tourAt
});
```

### 5.3 Add Scripts to `package.json`

Add these 5 entries to `"scripts"` in `package.json`:
```json
"build:p1s": "node figures/bambu-p1s/build.mjs",
"test:p1s": "node figures/bambu-p1s/build.mjs --test-model",
"audit:p1s": "node figures/bambu-p1s/build.mjs --audit",
"inspect:p1s": "node scripts/inspect.mjs figures/bambu-p1s/dist/bambu-p1s.html",
"drive:p1s": "node scripts/drive.mjs figures/bambu-p1s/dist/bambu-p1s.html"
```

**Stage 1 Gate:** Run `node figures/bambu-p1s/build.mjs --test-model` and confirm `✓ Stage 1 model check passed · 13 anchors`.

---

## 6. Stage 2 — The Cabinet Base (`base.mjs`)

Build the self-contained P1S lower chassis plinth, 4 rubber isolation feet, electronics bay bottom pan, chamber floor deck (`DECK_Y = -1.47`), front lower apron bezel, and brass specification plaque.

### Exact Parts List for `figures/bambu-p1s/base.mjs`

1. **Ground Shadow & Blueprint Datum Grid (`reg.detail`):**
   - `base.halo`: `makeHaloMesh(4.40, 4.40, 0.36, [0, SPEC.FLOOR_Y + 0.002, 0], kit)`
   - `base.datumGrid`: `makeDatumGrid(4.90, 4.90, 10, 10, SPEC.FLOOR_Y + 0.004, kit, "faint")`
2. **4 Rubber Isolation Feet (`mountOn: "ground"`):**
   - Corner coordinates `(fx, fz)` at `[±(SPEC.HALF_W - SPEC.FOOT_INSET), ±(SPEC.HALF_D - SPEC.FOOT_INSET)]` = `[±1.605, ±1.605]`.
   - `base.foot.fl`, `base.foot.fr`, `base.foot.rl`, `base.foot.rr`: `buildCylinderGeometry(SPEC.FOOT_R, SPEC.FOOT_R * 0.88, SPEC.FOOT_H, { segments: 20, axis: "y" })` at `pos: [fx, SPEC.FLOOR_Y + SPEC.FOOT_H * 0.5, fz]`, `ramp: "lo"`, `outline: "lo"`, `mountOn: "ground"`.
3. **Lower Electronics Bay Bottom Pan (`base.bayFloor`):**
   - `buildSlabGeometry(SPEC.CH_W, SPEC.CH_D, 0.08, { radius: 0.14, bevel: true, bevelSize: 0.015, bevelThickness: 0.015 })`
   - Placed at `pos: [0, SPEC.CH_Y0 + 0.08, 0]` (`y = -2.21`).
   - `ramp: "lo"`, `outline: "mid"`, `mountOn: "base.foot.fl"`, `allowOverlap: ["base.foot.fr", "base.foot.rl", "base.foot.rr"]`.
4. **4 Lower Corner Plinth Risers (connecting `base.bayFloor` at $y = -2.21$ to `base.chamberDeck` at $y = -1.55$):**
   - Height `riserH = (-1.55) - (-2.21) = 0.66`, center $y = -1.88$.
   - `base.riser.fl`, `base.riser.fr`, `base.riser.rl`, `base.riser.rr` at `[±SPEC.POST_OFFSET, -1.88, ±SPEC.POST_OFFSET]`, `new THREE.BoxGeometry(SPEC.POST_W, 0.66, SPEC.POST_W)`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "base.bayFloor"`.
5. **Rear & Left Bay Side Skirts (leaving Front & Right open in cutaway so the Z-motor and 3-screw belt loop inside the bay are clearly visible!):**
   - `base.baySkirtRear`: `new THREE.BoxGeometry(SPEC.CH_W - 0.32, 0.66, SPEC.WALL_T)` at `[0, -1.88, -SPEC.HALF_D + SPEC.WALL_T * 0.5]`, `ramp: "lo"`, `mountOn: "base.bayFloor"`, `allowOverlap: ["base.riser.rl", "base.riser.rr", "base.chamberDeck"]`.
   - `base.baySkirtLeft`: `new THREE.BoxGeometry(SPEC.WALL_T, 0.66, SPEC.CH_D - 0.32)` at `[-SPEC.HALF_W + SPEC.WALL_T * 0.5, -1.88, 0]`, `ramp: "lo"`, `mountOn: "base.bayFloor"`, `allowOverlap: ["base.riser.fl", "base.riser.rl", "base.chamberDeck"]`.
   - `base.baySkirtRight`: Same on `+X` (`[SPEC.HALF_W - SPEC.WALL_T * 0.5, -1.88, 0]`), with `cutawayHide: true`, `mountOn: "base.bayFloor"`, `allowOverlap: ["base.riser.fr", "base.riser.rr", "base.chamberDeck"]`.
6. **Chamber Floor Deck (`base.chamberDeck`, top at `SPEC.DECK_Y = -1.47`):**
   - `buildSlabGeometry(SPEC.CH_W, SPEC.CH_D, SPEC.DECK_H, { radius: 0.14, bevel: false })` at `pos: [0, SPEC.DECK_Y, 0]` (spans $y \in [-1.55, -1.47]$).
   - `ramp: "mid"`, `outline: "mid"`, `mountOn: "base.riser.fl"`, `allowOverlap: ["base.riser.fr", "base.riser.rl", "base.riser.rr", "base.baySkirtRear", "base.baySkirtLeft", "base.baySkirtRight"]`.
   - Add `makePlanOutline(SPEC.CH_W - 0.36, SPEC.CH_D - 0.36, 0.10, SPEC.DECK_Y + 0.003, kit, "lo")` detail on top of the deck.
7. **Front Lower Bezel Bar & Engraved Brass Spec Plaque (`+Z` front apron):**
   - `base.frontBezel`: `new THREE.BoxGeometry(SPEC.CH_W - 0.32, 0.24, 0.08)` at `pos: [0, -1.59, SPEC.HALF_D - 0.02]`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["base.riser.fl", "base.riser.fr"]`.
   - `base.plaque`: `new THREE.BoxGeometry(1.18, 0.16, 0.03)` at `pos: [1.05, -1.59, SPEC.HALF_D + 0.025]`, `ramp: "brass"`, `outline: "mid"`, `mountOn: "base.frontBezel"`.
   - Register tag: `reg.tag("tag-plate", "BAMBU LAB P1S · 256³ mm · 20 m/s²", 1.05, -1.59, SPEC.HALF_D + 0.06)`.
   - Register Stage 2 anchors from `ANCHORS`: `deck.center`, `zMotor.mount`, `screw.fl.base`, `screw.fr.base`, `screw.r.base`, `front.screen.mount`.

**Stage 2 Gate:** Run `node figures/bambu-p1s/build.mjs --audit` and `node scripts/inspect.mjs figures/bambu-p1s/dist/bambu-p1s.html --isolate base --ortho --out figures/bambu-p1s/dist/inspect-base.png`. Read `inspect-base.png`.

---

## 7. Stage 3 — The Enclosure, Frame, Fans & Guides (`structure.mjs`)

Build the stationary P1S upper steel frame, enclosed walls, auxiliary blower fan, rear chamber exhaust fan, rear-left purge chute, Y-axis linear rods, rear stepper mounts, and cutaway glass door/lid.

### Exact Parts List for `figures/bambu-p1s/structure.mjs`

1. **4 Vertical Steel Corner Columns (from `DECK_Y = -1.47` to `TOP_RING_Y0 = 2.07`, height `3.54`, center $y = 0.30$):**
   - `struct.post.fl`, `struct.post.fr`, `struct.post.rl`, `struct.post.rr` at `[±SPEC.POST_OFFSET, 0.30, ±SPEC.POST_OFFSET]`.
   - Geometry: `new THREE.BoxGeometry(SPEC.POST_W, 3.54, SPEC.POST_W)`.
   - `ramp: "mid"`, `outline: "mid"`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["base.frontBezel"]`.
2. **Upper Steel Perimeter Frame Ring ($y \in [2.07, 2.23]$, height `0.16`, center $y = 2.15$):**
   - `struct.topBeam.rear`: `new THREE.BoxGeometry(SPEC.CH_W, 0.16, SPEC.POST_W)` at `[0, 2.15, -SPEC.POST_OFFSET]`, `ramp: "mid"`, `outline: "hi"`, `mountOn: "struct.post.rl"`, `allowOverlap: ["struct.post.rr"]`.
   - `struct.topBeam.front`: `new THREE.BoxGeometry(SPEC.CH_W, 0.16, SPEC.POST_W)` at `[0, 2.15, SPEC.POST_OFFSET]`, `ramp: "mid"`, `outline: "hi"`, `mountOn: "struct.post.fl"`, `allowOverlap: ["struct.post.fr"]`.
   - `struct.topBeam.left`: `new THREE.BoxGeometry(SPEC.POST_W, 0.16, SPEC.CH_D - SPEC.POST_W * 2)` at `[-SPEC.POST_OFFSET, 2.15, 0]`, `ramp: "mid"`, `outline: "hi"`, `mountOn: "struct.post.fl"`, `allowOverlap: ["struct.post.rl", "struct.topBeam.front", "struct.topBeam.rear"]`.
   - `struct.topBeam.right`: `new THREE.BoxGeometry(SPEC.POST_W, 0.16, SPEC.CH_D - SPEC.POST_W * 2)` at `[SPEC.POST_OFFSET, 2.15, 0]`, `ramp: "mid"`, `outline: "hi"`, `mountOn: "struct.post.fr"`, `allowOverlap: ["struct.post.rr", "struct.topBeam.front", "struct.topBeam.rear"]`.
   - Register tag: `reg.tag("tag-corexy", "COREXY · A/B BELTS · 9:53 EXT", 0.0, 2.15, SPEC.HALF_D + 0.04)`.
3. **Stationary Enclosure Panels (Rear, Left, Cutaway Right, Cutaway Glass Door & Glass Top Lid):**
   - `struct.wall.rear`: `new THREE.BoxGeometry(SPEC.CH_W - 0.32, 3.54, SPEC.WALL_T)` at `[0, 0.30, -SPEC.HALF_D + SPEC.WALL_T * 0.5]`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["struct.post.rl", "struct.post.rr", "struct.topBeam.rear"]`.
   - `struct.wall.left`: `new THREE.BoxGeometry(SPEC.WALL_T, 3.54, SPEC.CH_D - 0.32)` at `[-SPEC.HALF_W + SPEC.WALL_T * 0.5, 0.30, 0]`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["struct.post.fl", "struct.post.rl", "struct.topBeam.left"]`.
   - `struct.wall.right` (`cutawayHide: true`): `new THREE.BoxGeometry(SPEC.WALL_T, 3.54, SPEC.CH_D - 0.32)` at `[SPEC.HALF_W - SPEC.WALL_T * 0.5, 0.30, 0]`, `ramp: "mid"`, `outline: "mid"`, `cutawayHide: true`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["struct.post.fr", "struct.post.rr", "struct.topBeam.right"]`.
   - `struct.glass.door` (`ramp: "glass"`, `cutawayHide: true`): `new THREE.BoxGeometry(SPEC.CH_W - 0.36, 3.48, 0.04)` at `[0, 0.30, SPEC.HALF_D - 0.02]`, `ramp: "glass"`, `opacity: 0.28`, `cutawayHide: true`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["struct.post.fl", "struct.post.fr", "struct.topBeam.front", "base.frontBezel"]`.
   - `struct.door.handle` (`cutawayHide: true`): `new THREE.BoxGeometry(0.10, 0.64, 0.06)` at `[1.56, 0.45, SPEC.HALF_D + 0.03]`, `ramp: "hi"`, `cutawayHide: true`, `mountOn: "struct.glass.door"`.
   - `struct.glass.lid` (`ramp: "glass"`, `cutawayHide: true`): `buildSlabGeometry(SPEC.CH_W - 0.08, SPEC.CH_D - 0.08, 0.06, { radius: 0.12, bevel: false })` at `[0, SPEC.CH_Y1, 0]`, `ramp: "glass"`, `opacity: 0.28`, `cutawayHide: true`, `mountOn: "struct.topBeam.front"`, `allowOverlap: ["struct.topBeam.rear", "struct.topBeam.left", "struct.topBeam.right"]`.
   - `struct.lid.handle` (`cutawayHide: true`): `new THREE.BoxGeometry(0.90, 0.06, 0.14)` at `[0, SPEC.CH_Y1 + 0.03, 1.35]`, `ramp: "lo"`, `cutawayHide: true`, `mountOn: "struct.glass.lid"`.
4. **Left-Wall Auxiliary Part Cooling Blower Fan (`struct.auxFan.*`):**
   - Mounted on the inner face of `struct.wall.left` ($x = -1.915$), clear of the bed ($x \le -1.31$):
   - `struct.auxFan.scroll`: `buildCylinderGeometry(0.42, 0.42, 0.14, { segments: 24, axis: "x" })` at `pos: [-1.84, 0.96, 0.14]`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "struct.wall.left"`.
   - `struct.auxFan.duct`: `new THREE.BoxGeometry(0.14, 0.44, 0.88)` at `pos: [-1.84, 1.24, 0.14]`, `ramp: "intake"`, `outline: "mid"`, `mountOn: "struct.auxFan.scroll"`, `allowOverlap: ["struct.wall.left"]`.
   - `struct.auxFan.nozzle`: Horizontal slot lip `new THREE.BoxGeometry(0.16, 0.08, 0.92)` at `pos: [-1.79, 1.44, 0.14]`, `ramp: "hi"`, `outline: "mid"`, `mountOn: "struct.auxFan.duct"`, `allowOverlap: ["struct.wall.left"]`.
   - Register anchor `reg.anchor("aux.fan.nozzle", -1.71, 1.44, 0.14, structGroup, { dir: [1, 0, 0] })`.
5. **Rear-Wall Chamber Exhaust Fan & Purge Chute (`struct.chamberFan`, `struct.purgeChute`):**
   - `struct.chamberFan`: `new THREE.BoxGeometry(0.68, 0.68, 0.12)` at `pos: [-0.88, 1.42, -1.86]`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "struct.wall.rear"` (with `makeRingLine(0.28, 24, kit, "lo")` fan grille detail on its `+Z` face).
   - `struct.purgeChute`: Vertical chute column extending from `base.chamberDeck` ($y = -1.47$) up to $y = 1.25$ at rear-left `pos: [SPEC.PARK_POS[0], -0.11, -1.68]`, `new THREE.BoxGeometry(0.34, 2.72, 0.36)`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "base.chamberDeck"`, `allowOverlap: ["struct.wall.rear"]`.
   - `struct.purgeWiper`: Silicone nozzle wiper lip on top of chute `new THREE.BoxGeometry(0.38, 0.06, 0.42)` at `pos: [SPEC.PARK_POS[0], 1.25, -1.66]`, `ramp: "hi"`, `outline: "mid"`, `mountOn: "struct.purgeChute"`, `allowOverlap: ["struct.wall.rear"]`.
6. **Y-Axis Hardened Steel Linear Guide Rods & Rear CoreXY Motor Brackets:**
   - `struct.yBracket.fl`, `struct.yBracket.fr`, `struct.yBracket.rl`, `struct.yBracket.rr`: 4 end blocks `new THREE.BoxGeometry(0.22, 0.22, 0.18)` at `[±SPEC.Y_ROD_X, SPEC.Y_ROD_Y, -1.56]` and `[±SPEC.Y_ROD_X, SPEC.Y_ROD_Y, 1.74]`, `ramp: "mid"`, `mountOn` the respective corner post (`struct.post.fl/fr/rl/rr`) or rear/left wall (`allowOverlap` with posts/walls).
     - Note: Make sure `struct.yBracket.*` touches `struct.post.*`: since `POST_OFFSET = 1.865` and `POST_W = 0.16`, the inner X face of the corner posts is at $|x| = 1.785$. Giving `struct.yBracket.*` width `0.30` centered at $x = \pm 1.72$ (`|x| ∈ [1.57, 1.87]`) and $z = -1.72$ / $+1.74$ guarantees direct contact with `struct.post.fl/fr/rl/rr`!
   - `struct.yRod.L` and `struct.yRod.R`: `buildCylinderGeometry(SPEC.Y_ROD_R, SPEC.Y_ROD_R, 3.46, { segments: 20, axis: "z" })` at `pos: [±SPEC.Y_ROD_X, SPEC.Y_ROD_Y, 0.01]`, `ramp: "hi"`, `outline: "mid"`, `noCrease: true`, `mountOn: "struct.yBracket.rl"` (and `"struct.yBracket.rr"`), `allowOverlap: ["struct.yBracket.fl", "struct.yBracket.fr"]`.
   - `struct.motorDeck.A` and `struct.motorDeck.B`: Rear corner motor mounting plates `new THREE.BoxGeometry(0.56, 0.10, 0.52)` at `pos: [±SPEC.MOTOR_X, 1.88, SPEC.MOTOR_Z]`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "struct.post.rl"` (and `"struct.post.rr"`), `allowOverlap: ["struct.wall.rear", "struct.yBracket.rl", "struct.yBracket.rr"]`.
7. **Rear Filament Pass-Through Fitting & Lower Bay Umbilical Port (`for Stage 5 reg.tube`):**
   - `struct.inletFitting`: `buildCylinderGeometry(0.08, 0.08, 0.22, { segments: 16, axis: "z" })` at `pos: [0.0, 2.02, -1.94]`, `ramp: "hi"`, `outline: "mid"`, `mountOn: "struct.wall.rear"`, `allowOverlap: ["struct.topBeam.rear"]`.
     - Register anchor `reg.anchor("inlet.outer", 0.0, 2.02, -2.05, structGroup, { dir: [0, 0, -1] })`.
     - Register anchor `reg.anchor("inlet.inner", 0.0, 2.02, -1.83, structGroup, { dir: [0, 0, 1] })`.
   - `struct.bayPort`: `buildCylinderGeometry(0.08, 0.08, 0.16, { segments: 16, axis: "z" })` at `pos: [-1.18, -1.88, -1.96]`, `ramp: "mid"`, `mountOn: "base.baySkirtRear"`.
     - Register anchor `reg.anchor("bay.umbilical.out", -1.18, -1.88, -2.04, structGroup, { dir: [0, 0, -1] })`.
   - `struct.upperJunction`: `new THREE.BoxGeometry(0.28, 0.24, 0.14)` at `pos: [-1.18, 1.52, -1.96]`, `ramp: "mid"`, `mountOn: "struct.wall.rear"`.
     - Register anchor `reg.anchor("gantry.junction.in", -1.18, 1.40, -2.02, structGroup, { dir: [0, -1, -0.2] })`.

**Stage 3 Gate:** Run `node figures/bambu-p1s/build.mjs --audit` and `node scripts/inspect.mjs figures/bambu-p1s/dist/bambu-p1s.html --isolate base,structure --ortho --out figures/bambu-p1s/dist/inspect-structure.png`. Read `inspect-structure.png`.

---

## 8. Stage 4 — The Moving Subject (`subject.mjs`)

Build the three moving hero assemblies in `stage: "subject"`:
1. **`gantry.yGroup`** (translates in $Z$ by `st.zc`): Left & right Y-carriages + twin carbon-fiber X-rods.
2. **`subject.toolhead`** (child of `gantry.yGroup`, translates in local $X$ by `st.xt`): Cutaway direct-drive toolhead with 9:53 dual hardened-steel extruder gears, finned heatsink, axial fan, `comb` ceramic heater block, brass nozzle, and part-cooling blower + dual-tip air duct.
3. **`subject.bedGroup`** (translates in $Y$ by `-st.bedDrop`): Cantilevered 3-screw bed frame, aluminum heatbed, `brass` Textured PEI build plate, and the 14-band twisted geometric vase (`ramp: "lit"`).

### Exact Parts List for `figures/bambu-p1s/subject.mjs`

1. **Y-Gantry Group (`const yGroup = reg.group("gantry.yGroup", { pos: [0, 0, initSt.zc], stage: "subject" })`):**
   - `gantry.yCarriage.L`: `new THREE.BoxGeometry(0.26, 0.42, 0.36)` at `pos: [-SPEC.Y_ROD_X, 1.82, 0]`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "struct.yRod.L"`.
   - `gantry.yCarriage.R`: `new THREE.BoxGeometry(0.26, 0.42, 0.36)` at `pos: [SPEC.Y_ROD_X, 1.82, 0]`, `ramp: "mid"`, `outline: "mid"`, `mountOn: "struct.yRod.R"`.
   - `gantry.xRod.upper`: `buildCylinderGeometry(SPEC.X_ROD_R, SPEC.X_ROD_R, SPEC.X_ROD_SPAN, { segments: 20, axis: "x" })` at `pos: [0, SPEC.X_ROD_Y_UP, 0]`, `ramp: "comp"`, `outline: "mid"`, `noCrease: true`, `mountOn: "gantry.yCarriage.L"`, `allowOverlap: ["gantry.yCarriage.R", "subject.thCarriage"]`.
   - `gantry.xRod.lower`: `buildCylinderGeometry(SPEC.X_ROD_R, SPEC.X_ROD_R, SPEC.X_ROD_SPAN, { segments: 20, axis: "x" })` at `pos: [0, SPEC.X_ROD_Y_LO, 0]`, `ramp: "comp"`, `outline: "mid"`, `noCrease: true`, `mountOn: "gantry.yCarriage.L"`, `allowOverlap: ["gantry.yCarriage.R", "subject.thCarriage"]`.
   - Add 4 idler pulley pins on the Y-carriages (`gantry.yIdler.LA`, `gantry.yIdler.LB` at `[-1.50, 1.98, ±0.11]` and `gantry.yIdler.RA`, `gantry.yIdler.RB` at `[1.50, 1.95, ±0.11]`, `buildCylinderGeometry(0.065, 0.065, 0.08, { segments: 16, axis: "y" })`, `ramp: "brass"`, `mountOn: "gantry.yCarriage.L"` / `"gantry.yCarriage.R"`).

2. **Toolhead Group (`const thGroup = reg.group("subject.toolhead", { parent: yGroup, pos: [initSt.xt, 0, 0], stage: "subject" })`):**
   - `subject.thCarriage`: Carbon-rod bearing block `new THREE.BoxGeometry(0.46, 0.34, 0.24)` at `pos: [0, 1.75, 0]`, `ramp: "lo"`, `outline: "hi"`, `mountOn: "gantry.xRod.upper"`, `allowOverlap: ["gantry.xRod.lower"]`.
   - `subject.thBackplate`: Upper rear structural spine `new THREE.BoxGeometry(0.48, 0.56, 0.14)` at `pos: [0, 1.82, -0.14]`, `ramp: "mid"`, `outline: "hi"`, `mountOn: "subject.thCarriage"`, `allowOverlap: ["gantry.xRod.upper", "gantry.xRod.lower"]`.
   - `subject.thFrontCover` (`cutawayHide: true`): Removable front magnetic toolhead shroud `new THREE.BoxGeometry(0.48, 0.56, 0.22)` at `pos: [0, 1.82, 0.16]`, `ramp: "hi"`, `outline: "hi"`, `cutawayHide: true`, `mountOn: "subject.thCarriage"`, `allowOverlap: ["subject.thBackplate", "subject.extGearLarge", "subject.extPinion", "subject.heatsink", "subject.partDuct"]`.
   - **9:53 Dual-Gear Direct-Drive Extruder (visible inside cutaway toolhead at $y \in [1.82, 2.06]$):**
     - `subject.extGearGroup`: `reg.group("subject.extGearGroup", { parent: thGroup, pos: [-0.08, 1.94, 0.11], stage: "subject" })`
       - `subject.extGearLarge`: `buildExternalGearGeometry(0.14, 24, 0.022, 0.06, 0.35)` at `[0, 0, 0]`, `ramp: "brass"`, `outline: "mid"`, `mountOn: "subject.thCarriage"`, `allowOverlap: ["subject.thBackplate", "subject.extPinion"]`.
     - `subject.extPinionGroup`: `reg.group("subject.extPinionGroup", { parent: thGroup, pos: [0.11, 1.98, 0.11], stage: "subject" })`
       - `subject.extPinion`: `buildExternalGearGeometry(0.055, 10, 0.018, 0.06, 0.30)` at `[0, 0, 0]`, `ramp: "copper"`, `outline: "mid"`, `mountOn: "subject.extGearLarge"`, `allowOverlap: ["subject.thCarriage", "subject.thBackplate"]`.
     - `subject.filamentStrand`: Active filament rod entering top of extruder `buildCylinderGeometry(0.022, 0.022, 0.36, { segments: 12, axis: "y" })` at `pos: [0, 2.02, 0.06]`, `ramp: "lit"`, `outline: "lit"`, `mountOn: "subject.thCarriage"`, `allowOverlap: ["subject.extGearLarge", "subject.extPinion", "subject.thBackplate", "subject.thFrontCover"]`.
   - **All-Metal Hotend, Heatsink & 300 °C Ceramic Heater ($y \in [1.37, 1.72]$):**
     - `subject.heatsink`: Finned cooling block `new THREE.BoxGeometry(0.22, 0.16, 0.18)` at `pos: [0, 1.56, 0.06]`, `ramp: "hi"`, `outline: "mid"`, `mountOn: "subject.thCarriage"`, `allowOverlap: ["subject.thBackplate"]`.
     - `subject.heaterBlock` (`ramp: "comb"`): Ceramic heater + silicone sock `new THREE.BoxGeometry(0.16, 0.10, 0.16)` at `pos: [0, 1.44, 0.06]`, `ramp: "comb"`, `outline: "hi"`, `mountOn: "subject.heatsink"`.
     - `subject.nozzleTip` (`ramp: "brass"`): Conical $0.4\text{ mm}$ nozzle `buildCylinderGeometry(0.045, 0.014, 0.06, { segments: 16, axis: "y" })` at `pos: [0, 1.38, 0.06]`, `ramp: "brass"`, `outline: "mid"`, `mountOn: "subject.heaterBlock"` (bottom tip sits at $y = 1.35$, 0.01 below `NOZZLE_TIP_Y`).
     - `subject.partDuct`: Dual-fang part-cooling air duct wrapping around the heater block `new THREE.BoxGeometry(0.38, 0.10, 0.24)` at `pos: [0, 1.45, -0.06]`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "subject.heatsink"`, `allowOverlap: ["subject.thBackplate", "subject.heaterBlock"]`.

3. **Z-Bed & Growing 3D Printed Vase (`const bedGroup = reg.group("subject.bedGroup", { pos: [0, -initSt.bedDrop, 0], stage: "subject" })`):**
   - First, register the 3 vertical TR8×8 lead screws in `subject.mjs` (or `structure.mjs` — putting them in `structure.mjs` or `subject.mjs` before `bedGroup` so `mountOn: "mech.zScrew.r"` exists when `subject.mjs` is audited at Stage 4!).
     - **IMPORTANT STAGE 4 GATE RULE:** Because Stage 4 runs `--audit` before Stage 5 (`mechanism.mjs`) is populated, place the 3 vertical lead screws (`struct.zScrew.fl`, `struct.zScrew.fr`, `struct.zScrew.r`) inside `structure.mjs` (or inside a rotating group in `structure.mjs` updated in `mechanism.mjs`)! That way `subject.bedFrame` can set `mountOn: "struct.zScrew.r"` and pass `node figures/bambu-p1s/build.mjs --audit` at Stage 4!
     - Let's verify their exact coordinates in `structure.mjs`:
       - `struct.zScrew.fl`, `struct.zScrew.fr`, `struct.zScrew.r`: `buildCylinderGeometry(SPEC.SCREW_R_RAD, SPEC.SCREW_R_RAD, 2.91, { segments: 18, axis: "y" })` inside groups `struct.zScrewGroup.fl/fr/r` at `[sx, 0, sz]` with cylinder at `pos: [0, -0.015, 0]` (spanning $y \in [-1.47, +1.44]$), `ramp: "brass"`, `outline: "lo"`, `noCrease: true`, `mountOn: "base.chamberDeck"`.
   - Inside `bedGroup` (`pos: [0, -initSt.bedDrop, 0]`):
     - `subject.bedFrame`: Under-bed support carrier `buildSlabGeometry(3.32, 2.76, SPEC.BED_FRAME_T, { radius: 0.16, bevel: false })` at `pos: [0, 1.276, -0.26]` (spans $x \in [-1.66, +1.66]$, $z \in [-1.64, +1.12]$, $y \in [1.216, 1.276]$ at `bedDrop = 0`, so it directly encompasses all three lead screws at `(±1.58, 0.96)` and `(0, -1.58)`!).
       - `ramp: "lo"`, `outline: "mid"`, `mountOn: "struct.zScrew.r"`, `allowOverlap: ["struct.zScrew.fl", "struct.zScrew.fr", "subject.heatbed"]`.
     - `subject.heatbed`: Aluminum heated bed `buildSlabGeometry(SPEC.HEATBED_SIZE, SPEC.HEATBED_SIZE, SPEC.HEATBED_T, { radius: 0.12, bevel: false })` at `pos: [SPEC.BED_CX, 1.336, SPEC.BED_CZ]` (spans $y \in [1.276, 1.336]$), `ramp: "mid"`, `outline: "mid"`, `mountOn: "subject.bedFrame"`, `allowOverlap: ["struct.zScrew.fl", "struct.zScrew.fr", "struct.zScrew.r"]`.
     - `subject.peiPlate` (`ramp: "brass"`): Golden Textured PEI spring-steel build plate `buildSlabGeometry(SPEC.PLATE_SIZE, SPEC.PLATE_SIZE, SPEC.PLATE_T, { radius: 0.10, bevel: true, bevelSize: 0.006, bevelThickness: 0.006 })` at `pos: [SPEC.BED_CX, SPEC.BED_TOP_Y0, SPEC.BED_CZ]` (top surface at $y = 1.36$), `ramp: "brass"`, `outline: "hi"`, `mountOn: "subject.heatbed"`.
     - Add front alignment lip and PEI calibration grid lines on `subject.peiPlate` (`makeDatumGrid(2.36, 2.36, 6, 6, SPEC.BED_TOP_Y0 + 0.008, kit, "lo")` at `[SPEC.BED_CX, 0, SPEC.BED_CZ]`).
   - **The Growing 3D Printed Vase (`subject.print.raft` + `subject.print.band.0..13`, all `ramp: "lit"`, `outline: "lit"`):**
     - `subject.print.raft`: First-layer adhesion brim/base `buildSlabGeometry(SPEC.PART_HALF * 2.12, SPEC.PART_HALF * 2.12, 0.024, { radius: 0.16, bevel: false })` at `pos: [SPEC.BED_CX, SPEC.BED_TOP_Y0 + 0.024, SPEC.BED_CZ]`, `ramp: "lit"`, `outline: "lit"`, `mountOn: "subject.peiPlate"`, `allowOverlap: ["subject.nozzleTip", "subject.heaterBlock"]`.
     - Loop `k = 0 .. SPEC.N_BANDS - 1` (`14` bands):
       - Width & depth `w = bandHalf(k) * 2`.
       - Geometry: `buildSlabGeometry(w, w, SPEC.BAND_H, { radius: 0.14, bevel: true, bevelSize: 0.006, bevelThickness: 0.004, centerY: false })`.
       - Placed at `pos: [SPEC.BED_CX, SPEC.BED_TOP_Y0 + 0.024 + (k + 1) * SPEC.BAND_H, SPEC.BED_CZ]`, `rot: [0, bandRot(k), 0]`.
       - `ramp: "lit"`, `outline: "lit"`, `detail: true` (so scaling/hiding bands dynamically as `theta` changes never causes AABB audit collisions with neighboring bands or the nozzle tip).

**Stage 4 Gate:** Run `node figures/bambu-p1s/build.mjs --audit` and `node scripts/inspect.mjs figures/bambu-p1s/dist/bambu-p1s.html --isolate subject --ortho --out figures/bambu-p1s/dist/inspect-subject.png`. Read `inspect-subject.png`.

---

## 9. Stage 5 — CoreXY Belts, Z-Belt Loop, Tubes, Screen & Direct 3D Drag (`mechanism.mjs`)

Connect all drives, belts, tubes, diegetic telemetry screen, physical control pod, and direct 3D interactions.

### 9.1 CoreXY Stepper Motors A & B + Stacked Belt Loops (`intake` Blue & `exhaust` Red)
1. **Rear NEMA 17 Stepper Motors (`mech.motorA`, `mech.motorB`):**
   - Mounted under `struct.motorDeck.A` and `struct.motorDeck.B` at `[±SPEC.MOTOR_X, 1.63, SPEC.MOTOR_Z]`:
   - `mech.motorA.body` & `mech.motorB.body`: `new THREE.BoxGeometry(0.38, 0.40, 0.38)`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "struct.motorDeck.A"` (and `"struct.motorDeck.B"`), `allowOverlap: ["struct.post.rl", "struct.post.rr", "struct.wall.rear"]`.
   - `mech.motorA.coil` & `mech.motorB.coil`: Copper stator band `buildCylinderGeometry(0.18, 0.18, 0.18, { segments: 20, axis: "y" })` at `[±SPEC.MOTOR_X, 1.63, SPEC.MOTOR_Z]`, `ramp: "copper"`, `mountOn: "mech.motorA.body"` / `"mech.motorB.body"`.
   - Rotating pulley groups `mech.pulleyGroup.A` at `[-SPEC.MOTOR_X, SPEC.BELT_A_Y, SPEC.MOTOR_Z]` and `mech.pulleyGroup.B` at `[SPEC.MOTOR_X, SPEC.BELT_B_Y, SPEC.MOTOR_Z]`:
     - `mech.pulley.A`: `buildExternalGearGeometry(SPEC.PULLEY_R, 16, 0.016, 0.08, 0.35)` rotated `rot: [Math.PI / 2, 0, 0]`, `ramp: "intake"`, `outline: "mid"`, `mountOn: "struct.motorDeck.A"`.
     - `mech.pulley.B`: `buildExternalGearGeometry(SPEC.PULLEY_R, 16, 0.016, 0.08, 0.35)` rotated `rot: [Math.PI / 2, 0, 0]`, `ramp: "exhaust"`, `outline: "mid"`, `mountOn: "struct.motorDeck.B"`.
2. **Stacked CoreXY Belt Runs (`detail: true` so stretching segments never trigger AABB collisions):**
   - **Belt A (`ramp: "intake"`, height $y = 2.00$):**
     - `mech.beltA.leftRun`: Along left Y-rail ($x = -1.50$, spanning $z \in [-1.68, +1.70]$).
     - `mech.beltA.rightRun`: Along right Y-rail ($x = +1.50$, spanning $z \in [-1.68, +1.70]$).
     - `mech.beltA.rearSpan`: Rear return span ($z = -1.72$, spanning $x \in [-1.48, +1.48]$).
     - `mech.beltA.xSpan`: Dynamic cross-span inside `gantry.yGroup` at $y = 2.00, z = +0.09$, spanning $x \in [-1.50, +1.50]$ across the toolhead clamps!
   - **Belt B (`ramp: "exhaust"`, height $y = 1.93$):**
     - `mech.beltB.leftRun`: Along left Y-rail ($x = -1.42$, spanning $z \in [-1.68, +1.70]$).
     - `mech.beltB.rightRun`: Along right Y-rail ($x = +1.42$, spanning $z \in [-1.68, +1.70]$).
     - `mech.beltB.frontSpan`: Front return span ($z = +1.72$, spanning $x \in [-1.42, +1.42]$).
     - `mech.beltB.xSpan`: Dynamic cross-span inside `gantry.yGroup` at $y = 1.93, z = -0.09$, spanning $x \in [-1.50, +1.50]$ across the toolhead clamps!

### 9.2 Lower Bay Single-Motor 3-Screw Z-Belt Drive
1. **Z Stepper Motor (`mech.zMotor`):**
   - Mounted on `base.bayFloor` at `pos: [-1.28, -2.01, -1.36]`, `new THREE.BoxGeometry(0.38, 0.40, 0.38)`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "base.bayFloor"`.
   - `mech.zMotor.pulley`: `buildCylinderGeometry(0.09, 0.09, 0.10, { segments: 18, axis: "y" })` at `[-1.28, SPEC.Z_BELT_Y, -1.36]`, `ramp: "copper"`, `mountOn: "mech.zMotor"`.
2. **3 Lead-Screw Lower Driven Pulleys (`mech.zPulley.fl`, `mech.zPulley.fr`, `mech.zPulley.r`):**
   - Placed at `[SPEC.SCREW_FL[0], SPEC.Z_BELT_Y, SPEC.SCREW_FL[1]]`, `[SPEC.SCREW_FR[0], SPEC.Z_BELT_Y, SPEC.SCREW_FR[1]]`, and `[SPEC.SCREW_R[0], SPEC.Z_BELT_Y, SPEC.SCREW_R[1]]`.
   - `buildCylinderGeometry(0.12, 0.12, 0.10, { segments: 20, axis: "y" })`, `ramp: "brass"`, `mountOn: "struct.zScrew.fl"` / `"struct.zScrew.fr"` / `"struct.zScrew.r"`, `allowOverlap: ["base.chamberDeck", "base.bayFloor"]`.
3. **Closed Triangular Z-Timing Belt Loop (`ramp: "comp"`, `detail: true`):**
   - Build 3 belt segments connecting `FL -> FR`, `FR -> R`, and `R -> Z_MOTOR -> FL` at $y = \text{SPEC.Z\_BELT\_Y}$ ($-1.78$) so the viewer clearly sees the single belt driving all three lead screws under the chamber deck.

### 9.3 Rear Filament Spool Holder + Pre-Verified `reg.tube` Conduits + Dynamic Internal PTFE Arch
1. **Rear Spool Bracket & Filament Spool (`mech.spoolBracket`, `mech.spoolReel`):**
   - `mech.spoolBracket`: `new THREE.BoxGeometry(0.18, 0.18, 0.36)` at `pos: [0.58, 0.35, -2.10]`, `ramp: "mid"`, `mountOn: "struct.wall.rear"`.
   - `mech.spoolGroup`: `reg.group("mech.spoolGroup", { parent: mechGroup, pos: [0.58, 0.35, -2.24], stage: "mechanism" })`.
   - `mech.spoolReel`: `buildCylinderGeometry(0.62, 0.62, 0.22, { segments: 28, axis: "z" })` at `[0, 0, 0]`, `ramp: "lo"`, `outline: "mid"`, `mountOn: "mech.spoolBracket"`.
   - `mech.spoolFilament`: Wound filament core `buildCylinderGeometry(0.52, 0.52, 0.18, { segments: 24, axis: "z" })` at `[0, 0, 0]`, `ramp: "lit"`, `detail: true`, `mountOn: "mech.spoolReel"`.
   - `mech.spoolGuide`: Lower guide eye `buildCylinderGeometry(0.06, 0.06, 0.12, { segments: 14, axis: "y" })` at `pos: [0.22, 0.86, -2.10]`, `ramp: "hi"`, `mountOn: "struct.wall.rear"`, `allowOverlap: ["mech.spoolReel"]`.
   - Register anchor: `reg.anchor("spool.guide.out", 0.22, 0.92, -2.10, mechGroup, { dir: [-0.15, 0.98, -0.10] })`.
2. **Audited Tube 1 — Rear Filament Feed (`tube.filament.feed`):**
   - Connects `"spool.guide.out"` (`[0.22, 0.92, -2.10]`, `dir: [-0.15, 0.98, -0.10]`) to `"inlet.outer"` (`[0.0, 2.02, -2.05]`, `dir: [0, 0, -1]`):
   ```js
   reg.tube(
     "tube.filament.feed",
     "spool.guide.out",
     [
       [0.16, 1.38, -2.28],
       [0.06, 1.84, -2.32]
     ],
     "inlet.outer",
     {
       parent: mechGroup,
       radius: 0.026,
       segments: 36,
       radialSegments: 10,
       leadOut: 0.16,
       leadIn: 0.16,
       ramp: "lit",
       outline: "lo",
       fromPart: "mech.spoolGuide",
       toPart: "struct.inletFitting",
       allowOverlap: ["struct.wall.rear", "struct.topBeam.rear", "mech.spoolReel"]
     }
   );
   ```
   *(Pre-verified: `length/chord = 1.15 >= 1.08`, max segment bend `19.4° <= 42°`, port tangency `< 14° <= 38°`, clear of rear wall at $z = -2.28$.)*
3. **Audited Tube 2 — Rear Umbilical Harness (`tube.umbilical.harness`):**
   - Connects `"bay.umbilical.out"` (`[-1.18, -1.88, -2.04]`, `dir: [0, 0, -1]`) to `"gantry.junction.in"` (`[-1.18, 1.40, -2.02]`, `dir: [0, -1, -0.2]`):
   ```js
   reg.tube(
     "tube.umbilical.harness",
     "bay.umbilical.out",
     [
       [-1.34, -1.10, -2.42],
       [-1.40, 0.15, -2.46],
       [-1.28, 0.95, -2.24]
     ],
     "gantry.junction.in",
     {
       parent: mechGroup,
       radius: 0.032,
       segments: 40,
       radialSegments: 10,
       leadOut: 0.18,
       leadIn: 0.18,
       ramp: "lo",
       outline: "lo",
       fromPart: "struct.bayPort",
       toPart: "struct.upperJunction",
       allowOverlap: ["base.baySkirtRear", "base.chamberDeck", "struct.wall.rear", "struct.chamberFan", "struct.purgeChute"]
     }
   );
   ```
   *(Pre-verified: `length/chord = 1.13 >= 1.08`, max segment bend `16.8° <= 42°`, zero overlap with `tube.filament.feed` since $\Delta x > 1.3$ units.)*
4. **Dynamic Internal PTFE Bowden Tube (`mech.ptfe.dynamic`):**
   - Created with `kit.createAnatomyPart(ptfeGeo, { ramp: "hi", outline: "lo", noCrease: true })` and registered via `reg.detail("mech.ptfe.dynamic", ptfeGroup, { parent: mechGroup, stage: "mechanism" })`.
   - Write a helper `updatePtfeCurve(ptfeGroup, xt, zc)` called inside `updateKinematics` that builds a 5-point `CatmullRomCurve3` from `[0.0, 2.02, -1.82]` (`inlet.inner`), through `[xt * 0.35, 2.18, -1.15]` and `[xt * 0.75, 2.22, (zc - 1.15) * 0.5]`, down into `[xt, 2.18, zc + 0.06]` and `[xt, 2.08, zc + 0.06]` (top of toolhead extruder), updating `solid.geometry` and `outline.geometry` so the PTFE tube flexes smoothly in real time as the toolhead moves!

### 9.4 Diegetic 3D Telemetry Screen (`reg.screen`) & Front Control Pod
1. **Front-Left Bezel Diegetic Screen (`p1s.screen`):**
   - Mounted on `base.frontBezel` at `pos: [-1.05, -1.58, SPEC.HALF_D + 0.05]`, `rot: [-0.18, 0, 0]`, `width: 1.12`, `height: 0.54`, `resolution: [280, 136]`, `mountOn: "base.frontBezel"`.
   - In `draw(ctx, canvas, state, theme)`:
     - Fill dark card background (`theme.isDark ? "#0f172a" : "#18181b"`).
     - Draw **CoreXY Motor A vs Motor B live phase bars & velocity vector** (`dA = dX - dZ` in blue `#38bdf8`, `dB = dX + dZ` in red `#f87171`).
     - Draw **Nozzle Temperature (`220°C / 300°C`)**, **Bed Temperature (`65°C`)**, **Volumetric Flow (`Q mm³/s`) bar** with warning color when `isFlowLimited` is true, and **Layer Progress (`k/14`)**.
2. **Front-Right Control Dial Pod (`mech.speedDial`):**
   - Mounted on `base.frontBezel` at `pos: [0.12, -1.59, SPEC.HALF_D + 0.05]`, `buildCylinderGeometry(0.14, 0.14, 0.08, { segments: 20, axis: "z" })`, `ramp: "hi"`, `outline: "mid"`, `mountOn: "base.frontBezel"` (rotates with `state.params.rpm`).

### 9.5 Direct 3D Manipulation (`reg.interactable`)
Register 4 responsive 3D drag handlers in `mechanism.mjs`:
1. **`subject.toolhead`:** Dragging the toolhead scrubs print progress `state.theta -= (dx - dy * 0.5) * 0.035` so the user can directly push the toolhead along its toolpath and watch CoreXY belts A & B and motors A & B respond!
2. **`subject.bedGroup`:** Dragging the PEI build plate vertically (`dy`) scrubs `state.theta -= dy * 0.06` to raise/lower the 3-screw Z platform and grow/ungrow the printed vase layers!
3. **`mech.pulleyGroup.A` (and `mech.pulleyGroup.B`):** Dragging the rear CoreXY steppers turns the belts and advances `state.theta -= dx * 0.04`.
4. **`mech.speedDial`:** Dragging the front bezel control dial adjusts `setParam("rpm", (state.params.rpm ?? 200) + (dx - dy) * 1.5)`.

### 9.6 `updateKinematics(reg, state)` & `tourAt(clock, state)`
- In `updateKinematics(reg, state)`:
  1. Compute `const st = getPrintState(state.theta, state.params || state, state.triggers || {});`
  2. Set `yGroup.position.z = st.zc` and `thGroup.position.x = st.xt`.
  3. Set `bedGroup.position.y = -st.bedDrop`.
  4. Rotate `mech.pulleyGroup.A.rotation.y = st.motorARad`, `mech.pulleyGroup.B.rotation.y = st.motorBRad`.
  5. Rotate `struct.zScrewGroup.fl/fr/r` and `mech.zPulley.fl/fr/r` around `Y` by `st.zScrewRad`.
  6. Rotate `subject.extGearGroup.rotation.z = st.extruderGearRad`, `subject.extPinionGroup.rotation.z = st.extruderPinionRad`, and `mech.spoolGroup.rotation.z = st.spoolRad`.
  7. Update the 14 printed vase bands (`subject.print.band.0..13`):
     - For `i < st.k`: `band.visible = true; band.scale.set(1, 1, 1);`
     - For `i === st.k`: `band.visible = st.bandFill > 0.02; const s = Math.max(0.05, st.bandFill); band.scale.set(1, s, 1);`
     - For `i > st.k`: `band.visible = false;`
  8. Call `updatePtfeCurve(...)` to flex `mech.ptfe.dynamic` to `(st.xt, st.zc)`.
  9. Update shader uniforms on `reg` (see Stage 6).
- Export `tourAt(clock)` to cycle smoothly through mid-print perimeter, high-speed infill, purge-chute park trigger, and cutaway toggle during idle mode.

**Stage 5 Gate:**
```bash
node figures/bambu-p1s/build.mjs --audit
node scripts/inspect.mjs figures/bambu-p1s/dist/bambu-p1s.html --ortho --out figures/bambu-p1s/dist/inspect-ortho.png
node scripts/inspect.mjs figures/bambu-p1s/dist/bambu-p1s.html --joints --out figures/bambu-p1s/dist/inspect-joints.png
```
Read both `inspect-ortho.png` and `inspect-joints.png` to confirm clean orthographic alignment and unobstructed tags.

---

## 10. Stage 6 — Active Physical Medium Shader (`shader.mjs`)

Build `figures/bambu-p1s/shader.mjs` exporting `buildShader(reg, kit)`.

### What the GLSL Shader Renders
Confine the shader strictly to two active physical media inside the build chamber (`transparent: true, depthWrite: false, side: THREE.DoubleSide`):
1. **Horizontal Active-Layer Extrusion & Auxiliary Cross-Flow Cooling Plane (`p1s.layerShaderPlane`):**
   - Mounted at $y = \text{SPEC.NOZZLE\_TIP\_Y} - 0.012$ ($y = 1.358$, right at the active nozzle deposition plane above the top layer of the vase!), centered over the build plate `[SPEC.BED_CX, 1.358, SPEC.BED_CZ]` with size `2.48 × 2.48` (`PlaneGeometry(2.48, 2.48)` rotated `rot: [-Math.PI / 2, 0, 0]`).
   - **Molten Polymer Deposition Bead & Thermal Wake:** Around the live toolhead nozzle coordinates `(uNozzleX, uNozzleZ)`, render a bright thermal hotspot (`uColComb` orange/white, scaled by `(uNozzleT - 180) / 120` and `uExtruding`) plus a glowing freshly-laid perimeter/infill bead ring at radius `uBandHalf` that cools smoothly from `uColComb` (molten orange) to `uColLit` (solidifying amber) behind the moving nozzle!
   - **Auxiliary Left-Wall Blower + Toolhead Part-Cooling Laminar Airflow Waves:** Streaming from the left Aux Fan nozzle ($x = -1.24$ edge of the plate) across the part toward $+X$, render soft animated laminar streamlines in `uColIntake` (cool blue) whose velocity and opacity scale with `uFanNorm` (`fan / 100`), fading smoothly to zero (`alpha = 0`) before the edges of the PEI plate (`rNorm > 0.92` or `abs(x) > 1.15`).
2. **Vertical Hotend Melt-Zone & Part-Cooling Jet Cone (`p1s.nozzleShaderPlane`, child of `subject.toolhead`):**
   - Crossed vertical planes (`0°` and `90°` around Y, size `0.52 × 0.36`) centered under the nozzle tip `[0, 1.38, 0.06]`, showing the converging blue part-cooling air jets from `subject.partDuct` meeting the glowing `uColComb` melt zone right at the nozzle orifice.

### Required Theme & Envelope Bindings
- React to `kit.onThemeChange((theme) => ...)` across all 5 themes (`light`, `paper`, `dark`, `blueprint`, `sepia`), updating `uIsDark`, `uColIntake`, `uColComb`, and `uColLit`.
- Multiply final fragment alpha by `uEnvelope` (`state.shaderEnv`, toggled by `I` / `SHADER` button) and `discard` whenever `alpha < 0.004`.

**Stage 6 Final Gate:**
```bash
node figures/bambu-p1s/build.mjs
node scripts/drive.mjs figures/bambu-p1s/dist/bambu-p1s.html --out figures/bambu-p1s/dist/
```
Read all generated PNGs (`inspect-drive.png`, `hero-light.png`, `hero-dark.png`, `mobile-390.png`) with `read_file`:
- Verify `0 problems` in `--audit`.
- Verify `console: clean` and `scrolls sideways: no`.
- Verify all 8 panels in `inspect-drive.png` show distinct states (Layer 1 high bed, Band 5 outer wall, Band 8 infill, 500 mm/s max flow, Purge chute park, Cutaway off with glass door/lid visible, Dark theme, Blueprint theme).

---

## 11. Exact Reference Code for Stage 5 & Stage 6 Helpers

To prevent Three.js coordinate or geometry-update bugs, use these exact implementations for the dynamic CoreXY belts, dynamic PTFE tube, diegetic OLED screen, and GLSL shader.

### 11.1 Dynamic CoreXY Belt Cross-Spans & PTFE Bowden Tube (`mechanism.mjs`)

```js
// Helper to create a dynamic PTFE tube detail group in buildMechanism(reg, kit):
const initSt = getPrintState(SPEC.initialTheta);
const ptfeCurve = makePtfeCurve(initSt.xt, initSt.zc);
const ptfeGeo = new THREE.TubeGeometry(ptfeCurve, 28, 0.024, 10, false);
const ptfePartGroup = kit.createAnatomyPart(ptfeGeo, {
  ramp: "hi",
  outline: "lo",
  noCrease: true,
  outlineWidth: 0.011
});
ptfePartGroup.name = "mech.ptfe.dynamic";
reg.detail("mech.ptfe.dynamic", ptfePartGroup, { parent: mechGroup, stage: "mechanism" });

// Helper function used both at build time and inside updateKinematics(reg, state):
function makePtfeCurve(xt, zc) {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.0, 2.02, -1.83),
      new THREE.Vector3(xt * 0.35, 2.16, -1.18),
      new THREE.Vector3(xt * 0.72, 2.20, (zc - 1.10) * 0.48),
      new THREE.Vector3(xt, 2.17, zc + 0.06),
      new THREE.Vector3(xt, 2.07, zc + 0.06)
    ],
    false,
    "centripetal"
  );
}

function updatePtfeMesh(ptfeGroup, xt, zc) {
  if (!ptfeGroup) return;
  const nextGeo = new THREE.TubeGeometry(makePtfeCurve(xt, zc), 28, 0.024, 10, false);
  const solid = ptfeGroup.getObjectByName("solid");
  const outline = ptfeGroup.getObjectByName("outline");
  if (solid) {
    if (solid.geometry) solid.geometry.dispose();
    solid.geometry = nextGeo;
  }
  if (outline) {
    outline.geometry = nextGeo;
  }
}
```

### 11.2 Diegetic Front-Bezel Screen (`drawP1SScreen` in `mechanism.mjs`)

```js
function drawP1SScreen(ctx, canvas, state, theme) {
  const st = getPrintState(state.theta ?? SPEC.initialTheta, state.params || state, state.triggers || {});
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = theme.isDark ? "#0b1120" : "#141821";
  ctx.fillRect(0, 0, W, H);

  // Top Header Bar
  ctx.fillStyle = st.isFlowLimited ? "#f97316" : "#38bdf8";
  ctx.font = "bold 12px monospace";
  ctx.fillText(`BAMBU P1S · ${st.mode}`, 10, 18);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`${Math.round(st.progressPct)}%`, W - 42, 18);

  // CoreXY Motor A (Blue) & Motor B (Red) Differential Phase Bars
  const aNorm = ((Math.sin(st.motorARad) + 1) * 0.5);
  const bNorm = ((Math.sin(st.motorBRad) + 1) * 0.5);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.fillText(`MOT A (ΔX+ΔY)`, 10, 38);
  ctx.fillStyle = "rgba(56,189,248,0.2)";
  ctx.fillRect(102, 29, 166, 10);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(102, 29, Math.max(8, aNorm * 166), 10);

  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`MOT B (ΔX-ΔY)`, 10, 54);
  ctx.fillStyle = "rgba(248,113,113,0.2)";
  ctx.fillRect(102, 45, 166, 10);
  ctx.fillStyle = "#f87171";
  ctx.fillRect(102, 45, Math.max(8, bNorm * 166), 10);

  // Hotend Temperature & Volumetric Flow Rate Q
  ctx.fillStyle = "#fb923c";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`NOZ ${Math.round(st.nozzleT)}°C / BED 65°C`, 10, 76);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`FAN ${Math.round(st.fan)}%`, 192, 76);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "10px monospace";
  ctx.fillText(`FLOW ${st.volumetricFlow.toFixed(1)} / ${st.flowLimit.toFixed(0)} mm³/s`, 10, 96);
  ctx.fillStyle = "rgba(148,163,184,0.22)";
  ctx.fillRect(10, 102, W - 20, 10);
  ctx.fillStyle = st.isFlowLimited ? "#ef4444" : "#f59e0b";
  ctx.fillRect(10, 102, Math.min(1, st.volumetricFlow / 28) * (W - 20), 10);

  // Layer Progress Bar
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(10, H - 10, (st.progressPct / 100) * (W - 20), 5);
}
```

### 11.3 Complete `figures/bambu-p1s/shader.mjs` Template

```js
import * as THREE from "three";
import { SPEC, getPrintState, bandHalf } from "./model.mjs";

export function buildShader(reg, kit) {
  const theme = kit.currentTheme;
  const initSt = getPrintState(SPEC.initialTheta);

  const layerShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0.0 },
      uNozzleX: { value: initSt.lx },
      uNozzleZ: { value: initSt.lz },
      uBandHalf: { value: bandHalf(initSt.k) },
      uTempNorm: { value: (initSt.nozzleT - 180) / 120 },
      uFanNorm: { value: initSt.fan / 100 },
      uExtruding: { value: initSt.extruding ? 1.0 : 0.0 },
      uEnvelope: { value: 1.0 },
      uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
      uColIntake: { value: new THREE.Color(theme.channels.intake) },
      uColComb: { value: new THREE.Color(theme.channels.comb) },
      uColLit: { value: new THREE.Color(theme.css.lit) }
    },
    vertexShader: `
      varying vec2 vPlaneXY;
      void main() {
        vPlaneXY = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uNozzleX;
      uniform float uNozzleZ;
      uniform float uBandHalf;
      uniform float uTempNorm;
      uniform float uFanNorm;
      uniform float uExtruding;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComb;
      uniform vec3 uColLit;

      varying vec2 vPlaneXY;

      void main() {
        if (uEnvelope < 0.002) discard;

        // Plane is rotated -90 deg around X, so local (x, y) maps to bed-local (x, -z)
        float lx = vPlaneXY.x;
        float lz = -vPlaneXY.y;

        // Smooth boundary fade well inside the 2.48 x 2.48 PEI plate
        float edgeMask = (1.0 - smoothstep(0.95, 1.18, abs(lx))) * (1.0 - smoothstep(0.95, 1.18, abs(lz)));
        if (edgeMask < 0.004) discard;

        // 1. Molten Nozzle Deposition Hotspot
        float dNoz = length(vec2(lx - uNozzleX, lz - uNozzleZ));
        float meltSpot = exp(-pow(dNoz / 0.11, 2.0)) * (0.55 + 0.45 * uTempNorm) * (0.35 + 0.65 * uExtruding);

        // 2. Freshly Extruded Perimeter Thermal Ring on Top Layer
        float pDist = pow(pow(abs(lx), 3.0) + pow(abs(lz), 3.0), 1.0 / 3.0);
        float beadRing = exp(-pow((pDist - uBandHalf * 0.94) / 0.042, 2.0)) * 0.48 * uExtruding;

        // 3. Auxiliary Left-Wall Blower Cross-Flow Streamlines (+X direction)
        float streamWave = 0.5 + 0.5 * sin(lz * 18.0 + sin(lx * 5.0 - uTime * 8.0) * 1.4);
        float pulseX = 0.55 + 0.45 * sin(lx * 10.0 - uTime * 11.0);
        float auxPlume = streamWave * pulseX * exp(-pow(lz / 0.72, 2.0)) * (1.0 - smoothstep(-1.10, 0.95, lx) * 0.55) * uFanNorm * 0.42;

        float thermalWeight = clamp(meltSpot + beadRing, 0.0, 1.0);
        vec3 hotCol = mix(uColLit, uColComb, clamp(meltSpot * 1.2 + uTempNorm * 0.35, 0.0, 1.0));
        vec3 col = mix(uColIntake, hotCol, smoothstep(0.05, 0.45, thermalWeight));

        float rawAlpha = (meltSpot * 0.85 + beadRing * 0.65 + auxPlume * 0.75) * edgeMask;
        float maxA = uIsDark > 0.5 ? 0.76 : 0.58;
        float alpha = clamp(rawAlpha * uEnvelope, 0.0, maxA);
        if (alpha < 0.004) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  kit.onThemeChange((nextTheme) => {
    layerShaderMat.uniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    layerShaderMat.uniforms.uColIntake.value.set(nextTheme.channels.intake);
    layerShaderMat.uniforms.uColComb.value.set(nextTheme.channels.comb);
    layerShaderMat.uniforms.uColLit.value.set(nextTheme.css.lit);
  });

  const shaderPlaneGeo = new THREE.PlaneGeometry(2.40, 2.40, 1, 1);
  shaderPlaneGeo.rotateX(-Math.PI / 2);
  const shaderMesh = new THREE.Mesh(shaderPlaneGeo, layerShaderMat);
  shaderMesh.position.set(SPEC.BED_CX, SPEC.NOZZLE_TIP_Y - 0.008, SPEC.BED_CZ);
  shaderMesh.name = "p1s.layerShader";
  shaderMesh.renderOrder = 10;

  reg.detail("p1s.layerShader", shaderMesh, { parent: reg.root, stage: "shader" });
  reg.root.userData.p1sShaderMat = layerShaderMat;
}
```
And at the end of `updateKinematics(reg, state)` in `mechanism.mjs`, update `reg.root.userData.p1sShaderMat.uniforms`:
```js
const shMat = reg.root.userData.p1sShaderMat;
if (shMat) {
  shMat.uniforms.uTime.value = state.simClock ?? -state.theta;
  shMat.uniforms.uNozzleX.value = st.lx;
  shMat.uniforms.uNozzleZ.value = st.lz;
  shMat.uniforms.uBandHalf.value = bandHalf(Math.min(SPEC.N_BANDS - 1, st.k));
  shMat.uniforms.uTempNorm.value = (st.nozzleT - 180) / 120;
  shMat.uniforms.uFanNorm.value = st.fan / 100;
  shMat.uniforms.uExtruding.value = st.extruding ? 1.0 : 0.0;
  shMat.uniforms.uEnvelope.value = state.shaderEnv ?? 1.0;
}
```

---

## 12. Quick Pitfall Reference for the Implementing Agent

1. **`buildSlabGeometry` vs `THREE.BoxGeometry` Y-Coordinate Difference:**
   - `buildSlabGeometry(w, d, h)` extrudes downward from `y = 0` to `y = -h` (plus `bevelThickness` on top and bottom when `bevel: true`). So placing a non-beveled slab at `pos: [0, Y_TOP, 0]` puts its top face at `Y_TOP` and its bottom face at `Y_TOP - h`.
   - `new THREE.BoxGeometry(w, h, d)` is centered at `y = 0`, spanning `[-h/2, +h/2]`.
   - Always check `dy` in `[FLOATING]` messages if any part is off by `h/2`.
2. **Never Leave a Non-Detail Part Without `mountOn`:**
   - Every `reg.part` with `detail: false` (default) must set `mountOn: "<partId>"` (or `"ground"` for the 4 rubber cabinet feet).
3. **Always Visual-Inspect PNGs at Every Stage Gate:**
   - Run `inspect.mjs` at Stages 2, 3, 4, 5 and `drive.mjs` at Stage 6, and inspect every generated PNG with `read_file` before concluding.
