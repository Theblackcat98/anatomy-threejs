export const SPEC = {
  archetype: "bench",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Engine geometric constants (world units)
  crankY: -0.32,
  rThrow: 0.20,
  rodLength: 0.64,
  pistonRadius: 0.182,
  pistonLength: 0.18,
  boreRadius: 0.202,
  boreStartAbsX: 0.39,
  boreEndAbsX: 0.98,
  headOuterAbsX: 1.32,
  camAbsX: 1.38,
  camOffsetY: 0.145,

  // 6-cylinder Z spacing & boxer crank throws (Firing order: 1 - 6 - 2 - 4 - 3 - 5)
  // Left bank (-X): Cyl 1, 2, 3 (front +Z to rear -Z)
  // Right bank (+X): Cyl 4, 5, 6 (front +Z to rear -Z)
  cylinders: [
    { id: 1, bank: -1, z:  0.86, crankOffsetDeg: 0,   fireDeg: 0 },
    { id: 4, bank:  1, z:  0.68, crankOffsetDeg: 0,   fireDeg: 360 },
    { id: 2, bank: -1, z:  0.09, crankOffsetDeg: 240, fireDeg: 240 },
    { id: 5, bank:  1, z: -0.09, crankOffsetDeg: 240, fireDeg: 600 },
    { id: 3, bank: -1, z: -0.68, crankOffsetDeg: 120, fireDeg: 480 },
    { id: 6, bank:  1, z: -0.86, crankOffsetDeg: 120, fireDeg: 120 }
  ],

  // Twin turbochargers mounted symmetrically aft-outboard of cylinder banks
  turboX: 1.98,
  turboY: -0.58,
  turboZ: -0.35,

  features: {
    explode: true,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: true
  },

  interactionHint: "Drag throttle lever, boost dial, or front crank pulley",

  controls: [
    {
      id: "rpm",
      label: "RPM",
      min: 0,
      max: 7200,
      step: 100,
      initial: 1800,
      title: "Crankshaft speed (RPM)"
    },
    {
      id: "throttle",
      label: "THROT",
      min: 10,
      max: 100,
      step: 1,
      initial: 68,
      title: "Throttle butterfly opening (%)"
    },
    {
      id: "boost",
      label: "BOOST",
      min: 0.4,
      max: 2.0,
      step: 0.05,
      initial: 1.25,
      title: "Target twin-turbo boost pressure (bar)"
    }
  ],

  triggers: [
    {
      id: "antilag",
      label: "ANTILAG",
      rise: 0.06,
      fall: 1.15,
      title: "Fire antilag spool pulse — spikes boost & exhaust header incandescence"
    }
  ],

  section: {
    axis: "z",
    min: -1.16,
    max: 1.25,
    initial: 1.25,
    label: "SECT",
    title: "Slice crankcase, cylinder banks, cams, and twin turbos along Z"
  },

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.94, pan: [0, 0.34] },
    { id: "boxer", label: "BOXER", elev: 84, azim: 0, zoom: 1.04, pan: [0, 0.04] },
    { id: "turbo", label: "TURBO R", elev: 22, azim: -66, zoom: 1.36, pan: [-0.45, 0.24] },
    { id: "dyno", label: "DYNO", elev: 24, azim: -22, zoom: 1.42, pan: [-0.95, 0.38] }
  ],

  initialTheta: 0.55,
  initialRpm: 1800,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.94,
  initialPanY: 0.34,
  minVertSpan: 5.1,
  minHorizSpan: 7.0,

  BASE_W: 5.6,
  BASE_D: 3.8,
  BASE_H: 0.22,
  BASE_Y: -1.95,
  topSurfaceY: -1.95 + 0.22 + 0.025,

  auditPoses: [
    { name: "rest (θ=0°)", theta: 0, explode: 0, params: { rpm: 1800, throttle: 68, boost: 1.25 } },
    { name: "quarter (θ=90°)", theta: Math.PI * 0.5, explode: 0, params: { rpm: 3600, throttle: 90, boost: 1.8 } },
    { name: "half (θ=180°)", theta: Math.PI, explode: 0, params: { rpm: 900, throttle: 20, boost: 0.4 } },
    { name: "three-quarter (θ=270°)", theta: Math.PI * 1.5, explode: 0, params: { rpm: 6500, throttle: 100, boost: 2.0 } },
    { name: "exploded (E=1)", theta: 0.55, explode: 1, params: { rpm: 1800, throttle: 68, boost: 1.25 } }
  ],

  drivePoses: [
    {
      label: "1. CRUISE · 1.25 BAR",
      pose: { theta: 0.55, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 1800, throttle: 68, boost: 1.25 } }
    },
    {
      label: "2. FULL BOOST · 2.0 BAR",
      pose: { theta: 1.45, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 6200, throttle: 100, boost: 2.0 } }
    },
    {
      label: "3. IDLE · 0.4 BAR",
      pose: { theta: 2.35, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 800, throttle: 15, boost: 0.4 } }
    },
    {
      label: "4. EXPLODED ASSEMBLY",
      pose: { theta: 0.55, explode: 1, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 1800, throttle: 68, boost: 1.25 } }
    },
    {
      label: "5. CUTAWAY OFF (CLOSED)",
      pose: { theta: 0.55, explode: 0, cutaway: false, shader: true, hud: true, theme: "light", params: { rpm: 1800, throttle: 68, boost: 1.25 } }
    },
    {
      label: "6. Z-SECTION SLICE",
      pose: { theta: 0.55, explode: 0, cutaway: true, shader: true, section: 0.12, hud: true, theme: "light", params: { rpm: 1800, throttle: 68, boost: 1.25 } }
    },
    {
      label: "7. DARK THEME · HOT HEADERS",
      pose: { theta: 1.1, explode: 0, cutaway: true, shader: true, section: 1.25, hud: true, theme: "dark", params: { rpm: 6800, throttle: 100, boost: 2.0 } }
    },
    {
      label: "8. BLUEPRINT THEME",
      pose: { theta: 2.8, explode: 0, cutaway: true, shader: true, section: 1.25, hud: true, theme: "blueprint", params: { rpm: 3200, throttle: 75, boost: 1.5 } }
    }
  ]
};

const TOP_Y = SPEC.topSurfaceY;

export const ANCHORS = {
  baseTop: [0, TOP_Y, 0],
  pedestalFront: [0, TOP_Y, 1.12],
  pedestalRear: [0, TOP_Y, -1.12],
  turboMountL: [-SPEC.turboX, TOP_Y, SPEC.turboZ],
  turboMountR: [SPEC.turboX, TOP_Y, SPEC.turboZ],
  plaqueCenter: [-1.86, TOP_Y, SPEC.BASE_D * 0.5 - 0.34],
  rulerCenter: [0.06, TOP_Y, SPEC.BASE_D * 0.5 - 0.30],
  throttleMount: [-0.82, TOP_Y, SPEC.BASE_D * 0.5 - 0.42],
  boostDialMount: [1.02, TOP_Y, SPEC.BASE_D * 0.5 - 0.44],
  dynoScreenMount: [2.08, TOP_Y, SPEC.BASE_D * 0.5 - 0.48]
};

/**
 * Computes exact horizontal boxer piston pin X, crankpin (cx, cy), and conrod angle
 * for cylinder `cyl` at crank angle `theta` (radians).
 */
export function getPistonKinematics(cyl, theta) {
  const { crankY, rThrow, rodLength } = SPEC;
  const throwRad = (cyl.crankOffsetDeg * Math.PI) / 180;
  // Opposed bank pins sit 180° apart on the crank so opposing pistons mirror in/out together
  const pinAngle = theta + throwRad + (cyl.bank < 0 ? Math.PI : 0);
  const cx = rThrow * Math.cos(pinAngle);
  const cy = crankY + rThrow * Math.sin(pinAngle);
  const dy = cy - crankY;
  const reachX = Math.sqrt(Math.max(0.001, rodLength * rodLength - dy * dy));
  const pistonPinX = cx + cyl.bank * reachX;
  const rodAngleZ = Math.atan2(crankY - cy, pistonPinX - cx);
  const pistonCrownX = pistonPinX + cyl.bank * 0.12;
  return { cx, cy, pistonPinX, pistonCrownX, rodAngleZ, pinAngle };
}

/**
 * Smooth bell-shaped cam lift (0..1) for intake or exhaust valve in the 720° cycle.
 */
function valveLiftCurve(cycDeg, openDeg, closeDeg) {
  const span = closeDeg - openDeg;
  if (cycDeg < openDeg || cycDeg > closeDeg) return 0;
  const u = (cycDeg - openDeg) / span;
  return Math.sin(u * Math.PI);
}

/**
 * Returns 4-stroke cycle state (0..720 deg) and intake/exhaust valve lifts for a cylinder.
 */
export function getCylinderStroke(cyl, theta, boostBar = 1.25, throttlePct = 68, antilag = 0) {
  const crankDeg = (((theta * 180) / Math.PI) % 720 + 720) % 720;
  const cycDeg = ((crankDeg - cyl.fireDeg) % 720 + 720) % 720;
  const effectiveBoost = Math.min(2.4, boostBar + antilag * 0.65);

  let stroke = "POWER";
  let pressure = 1.0;
  if (cycDeg < 180) {
    stroke = "POWER";
    const t = cycDeg / 180;
    const peak = Math.exp(-Math.pow((t - 0.08) / 0.14, 2));
    pressure = (1.0 + effectiveBoost) * (4.5 * (1 - 0.7 * t) + 28.0 * peak * (0.4 + 0.6 * (throttlePct / 100)));
  } else if (cycDeg < 360) {
    stroke = "EXHAUST";
    const t = (cycDeg - 180) / 180;
    pressure = 1.1 + effectiveBoost * 0.8 + 2.2 * Math.exp(-t * 3.5);
  } else if (cycDeg < 540) {
    stroke = "INTAKE";
    pressure = 1.0 + effectiveBoost * (0.5 + 0.5 * (throttlePct / 100));
  } else {
    stroke = "COMPRESSION";
    const t = (cycDeg - 540) / 180;
    pressure = (1.0 + effectiveBoost) * (1.0 + 9.2 * Math.pow(t, 2.2));
  }

  const exhaustLift = valveLiftCurve(cycDeg, 165, 375);
  const intakeLift = valveLiftCurve(cycDeg, 350, 555);
  return { cycDeg, stroke, pressure, intakeLift, exhaustLift };
}

/**
 * Computes thermal & dyno metrics (RPM, turbo RPM, EGT, header glow 0..1, HP)
 * Uses operating RPM setting (params.rpm) even when viewport animation is paused for inspection.
 */
export function getEngineMetrics(state = {}) {
  const paramRpm = state.params?.rpm ?? state.rpm;
  const rpm = Math.max(0, paramRpm !== undefined ? paramRpm : SPEC.initialRpm);
  const throttle = Math.max(10, Math.min(100, state.throttle ?? state.params?.throttle ?? 68));
  const boost = Math.max(0.4, Math.min(2.0, state.boost ?? state.params?.boost ?? 1.25));
  const antilag = state.triggers?.antilag ?? 0;

  const rpmNorm = rpm / 7200;
  const throtNorm = throttle / 100;
  const effBoost = Math.min(
    2.35,
    boost * (0.35 + 0.65 * Math.min(1, rpm / 2600)) * (0.45 + 0.55 * throtNorm) + antilag * 0.75
  );
  const turboRpm = Math.round(18000 + rpmNorm * 85000 + effBoost * 36000);
  const headerHeat = Math.min(1.0, 0.16 + 0.44 * rpmNorm + 0.30 * (effBoost / 2.0) + antilag * 0.38);
  const egtCelsius = Math.round(410 + headerHeat * 560);
  const powerHp = Math.round(Math.pow(rpmNorm, 0.85) * (0.56 + effBoost * 0.32) * throtNorm * 610);

  return { rpm, throttle, boost, effBoost, turboRpm, headerHeat, egtCelsius, powerHp, antilag };
}

/**
 * Signed radial clearance inside a horizontal X-axis cylinder bore for audit3d.mjs
 */
export function boreClearanceForCylinder(cylZ) {
  return (_x, y, z) => {
    const r = Math.hypot(y - SPEC.crankY, z - cylZ);
    return SPEC.boreRadius - r;
  };
}

export function formatReadout(state) {
  const theta = state.theta ?? 0;
  const m = getEngineMetrics(state);
  const c1 = getCylinderStroke(SPEC.cylinders[0], theta, m.effBoost, m.throttle, m.antilag);
  const deg = Math.round((((theta * 180) / Math.PI) % 720 + 720) % 720);

  return {
    readout: `θ ${String(deg).padStart(3, "0")}° · ${Math.round(m.rpm)} rpm · ${m.effBoost.toFixed(2)} bar · ${m.egtCelsius}°C`,
    phase: `CYL 1 · ${c1.stroke} · ${m.powerHp} HP`
  };
}
