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

// Helper so initialTheta = 0.65 maps to prog = 4.35 (Layer 5/14 active outer wall print)
const INITIAL_THETA = 0.65;
const INITIAL_PROG = 4.35;
const thetaForProg = (p) => INITIAL_THETA - (p - INITIAL_PROG) * TAU;

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
  DECK_Y: -1.47,         // Top surface of chamber floor / electronics bay ceiling
  DECK_H: 0.08,          // Chamber floor slab thickness (-1.55 .. -1.47)
  BAY_FLOOR_Y: -2.21,    // Top surface of lower electronics bay bottom pan
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
  NOZZLE_TIP_Y: 1.35,
  EXTRUDER_RATIO: 53 / 9,

  // Z-Axis 3-Lead-Screw Bed & Textured PEI Plate (256 x 256 mm)
  BED_CX: 0.0,
  BED_CZ: 0.18,          // Shifted slightly +Z to clear rear purge chute
  PLATE_SIZE: 2.56,
  PLATE_T: 0.024,
  HEATBED_SIZE: 2.62,
  HEATBED_T: 0.06,
  BED_FRAME_T: 0.06,
  BED_TOP_Y0: 1.335,     // PEI top surface at layer 0 (raft + bands build up to NOZZLE_TIP_Y)
  SCREW_R_RAD: 0.042,
  SCREW_Y0: -1.47,
  SCREW_Y1: 1.44,
  SCREW_FL: [-1.58, 0.96],
  SCREW_FR: [1.58, 0.96],
  SCREW_R: [0.0, -1.58],
  Z_MOTOR_POS: [-1.28, -2.02, -1.36],
  Z_BELT_Y: -1.94,

  // Printed Subject (14-band twisted geometric vase)
  N_BANDS: 14,
  BAND_H: 0.048,
  RAFT_H: 0.014,
  PART_HALF: 0.46,
  PART_TAPER: 0.007,
  PART_TWIST: 0.075,

  // Rear-left Purge Chute & Wiper Park Station
  PARK_POS: [-1.02, -1.28], // [xt, zc] clear of heatbed (z <= -1.13) and motor A (x >= -1.29)

  features: {
    explode: false,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: false
  },

  interactionHint: "Drag toolhead, PEI bed, or A/B pulleys",

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
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.94, pan: [0.0, 0.04] },
    { id: "corexy", label: "COREXY", elev: 62, azim: -18, zoom: 1.45, pan: [0.0, -0.32] },
    { id: "toolhead", label: "TOOLHEAD", elev: 18, azim: -14, zoom: 2.15, pan: [0.0, -0.82] },
    { id: "zdrive", label: "Z-BAY", elev: 14, azim: -44, zoom: 1.42, pan: [0.0, 0.95] },
    { id: "top", label: "TOP", elev: 88, azim: 0, zoom: 1.15, pan: [0.0, 0.0] }
  ],

  initialTheta: INITIAL_THETA,
  initialRpm: 200,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.94,
  initialPanY: 0.04,
  minVertSpan: 7.4,
  minHorizSpan: 8.6,

  auditPoses: [
    {
      name: "rest mid-print (band 5 outer wall)",
      theta: thetaForProg(4.35),
      explode: 0,
      params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 }
    },
    {
      name: "first layer start (band 0)",
      theta: thetaForProg(0.25),
      explode: 0,
      params: { rpm: 120, nozzleT: 220, fan: 0, layerH: 0.20 }
    },
    {
      name: "mid-print infill pass (band 7)",
      theta: thetaForProg(7.78),
      explode: 0,
      params: { rpm: 350, nozzleT: 240, fan: 90, layerH: 0.20 }
    },
    {
      name: "upper vase layer (band 12)",
      theta: thetaForProg(12.42),
      explode: 0,
      params: { rpm: 500, nozzleT: 260, fan: 100, layerH: 0.24 }
    },
    {
      name: "purge chute park trigger",
      theta: thetaForProg(5.20),
      explode: 0,
      params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 },
      triggers: { park: 1.0, retract: 0.0 }
    }
  ],

  drivePoses: [
    {
      label: "1. LAYER 1 · PEI HIGH",
      pose: { theta: thetaForProg(0.35), cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 120, nozzleT: 220, fan: 20, layerH: 0.20 } }
    },
    {
      label: "2. BAND 5 · OUTER WALL",
      pose: { theta: thetaForProg(4.35), cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 220, nozzleT: 220, fan: 80, layerH: 0.20 } }
    },
    {
      label: "3. BAND 8 · 380 mm/s INFILL",
      pose: { theta: thetaForProg(7.82), cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 380, nozzleT: 235, fan: 95, layerH: 0.20 } }
    },
    {
      label: "4. 500 mm/s MAX FLOW",
      pose: { theta: thetaForProg(11.40), cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 500, nozzleT: 255, fan: 100, layerH: 0.28 } }
    },
    {
      label: "5. PURGE CHUTE WIPE",
      pose: { theta: thetaForProg(6.20), cutaway: true, shader: true, trigger: "park", hud: true, theme: "light", params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 } }
    },
    {
      label: "6. CUTAWAY OFF · GLASS",
      pose: { theta: thetaForProg(6.35), cutaway: false, shader: true, hud: true, theme: "light", params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 } }
    },
    {
      label: "7. DARK · 300°C HOTEND",
      pose: { theta: thetaForProg(9.35), cutaway: true, shader: true, hud: true, theme: "dark", params: { rpm: 300, nozzleT: 300, fan: 100, layerH: 0.20 } }
    },
    {
      label: "8. BLUEPRINT COREXY",
      pose: { theta: thetaForProg(5.35), cutaway: true, shader: true, hud: true, theme: "blueprint", params: { rpm: 240, nozzleT: 220, fan: 80, layerH: 0.20 } }
    }
  ]
};

export const ANCHORS = {
  deckCenter: [0.0, SPEC.DECK_Y, 0.0],
  motorAMount: [-SPEC.MOTOR_X, 1.88, SPEC.MOTOR_Z],
  motorBMount: [SPEC.MOTOR_X, 1.88, SPEC.MOTOR_Z],
  zMotorMount: [SPEC.Z_MOTOR_POS[0], SPEC.Z_BELT_Y, SPEC.Z_MOTOR_POS[2]],
  screwFLBase: [SPEC.SCREW_FL[0], SPEC.DECK_Y, SPEC.SCREW_FL[1]],
  screwFRBase: [SPEC.SCREW_FR[0], SPEC.DECK_Y, SPEC.SCREW_FR[1]],
  screwRBase: [SPEC.SCREW_R[0], SPEC.DECK_Y, SPEC.SCREW_R[1]],
  auxFanPort: [-1.71, 1.44, 0.14],
  purgeChuteTop: [SPEC.PARK_POS[0], 1.27, -1.35],
  spoolHubRear: [0.58, 0.35, -2.24],
  filamentInletRear: [0.0, 2.02, -2.05],
  frontScreenMount: [-1.05, -1.65, SPEC.HALF_D + 0.04],
  plaqueCenter: [1.05, -1.65, SPEC.HALF_D + 0.025]
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
  const prog = (SPEC.initialTheta - theta) / TAU + INITIAL_PROG;
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
  const xt = clamp(lerp(xtPrint, SPEC.PARK_POS[0], parkEnv), -1.12, 0.85);
  const zc = clamp(lerp(zcPrint, SPEC.PARK_POS[1], parkEnv), -1.32, 0.90);

  if (parkEnv > 0.15) {
    mode = "PURGE CHUTE WIPE";
    extruding = parkEnv > 0.55;
  } else if (retractEnv > 0.15) {
    mode = "RETRACTING · 9:53";
    extruding = false;
  }

  // CoreXY differential motor angles (radians)
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
    readout: `X${xMm} Y${yMm} Z${st.realZmm} · ${Math.round(st.speed)}mm/s · ${st.volumetricFlow.toFixed(1)}mm³/s · ${Math.round(st.nozzleT)}°C`,
    phase: `L${Math.min(SPEC.N_BANDS, st.k + 1)}/${SPEC.N_BANDS} (${Math.round(st.progressPct)}%) · ${st.mode}`
  };
}
