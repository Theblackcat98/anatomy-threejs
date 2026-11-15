export const SPEC = {
  archetype: "bench",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Porsche M64/60 Boxer Cranktrain Constants (100.0 mm bore x 76.4 mm stroke -> stroke/bore = 0.764)
  crankY: -0.32,
  rThrow: 0.155,          // stroke = 0.310, bore = 0.404 -> 0.767 ratio
  rodLength: 0.62,
  pistonRadius: 0.184,
  pistonLength: 0.165,
  boreRadius: 0.202,
  boreStartAbsX: 0.39,
  boreEndAbsX: 0.96,
  headOuterAbsX: 1.30,
  camAbsX: 1.36,
  camOffsetY: 0.142,

  // 11-blade Porsche axial cooling fan (1.62:1 crank drive) mounted cleanly at upper front
  fanY: 0.36,
  fanZ: 0.94,
  fanRatio: 1.62,
  fanRadius: 0.275,

  // 6-cylinder Z spacing & 180-deg boxer throws (Firing order: 1 - 6 - 2 - 4 - 3 - 5)
  // Left bank (-X): Cyl 1, 2, 3 (front +Z to rear -Z)
  // Right bank (+X): Cyl 4, 5, 6 (front +Z to rear -Z)
  cylinders: [
    { id: 1, bank: -1, z:  0.80, crankOffsetDeg: 0,   fireDeg: 0 },
    { id: 4, bank:  1, z:  0.63, crankOffsetDeg: 0,   fireDeg: 360 },
    { id: 2, bank: -1, z:  0.08, crankOffsetDeg: 240, fireDeg: 240 },
    { id: 5, bank:  1, z: -0.08, crankOffsetDeg: 240, fireDeg: 600 },
    { id: 3, bank: -1, z: -0.63, crankOffsetDeg: 120, fireDeg: 480 },
    { id: 6, bank:  1, z: -0.80, crankOffsetDeg: 120, fireDeg: 120 }
  ],

  // Twin KKK K16 turbochargers tucked symmetrically aft-outboard below cylinder banks
  turboX: 1.76,
  turboY: -0.94,
  turboZ: -0.58,

  features: {
    explode: true,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: true
  },

  interactionHint: "Drag throttle lever or front crank pulley · Boost & heat react to RPM + Throttle",

  // Independent inputs ONLY — boost, power, torque, and EGT are derived consequences
  controls: [
    {
      id: "rpm",
      label: "RPM",
      min: 0,
      max: 6800,
      step: 100,
      initial: 2400,
      title: "Crankshaft speed (0–6800 rpm)"
    },
    {
      id: "throttle",
      label: "THROT",
      min: 10,
      max: 100,
      step: 1,
      initial: 72,
      title: "Throttle butterfly opening (%) — drives boost, combustion & exhaust heat"
    }
  ],

  // No superfluous impulse trigger buttons; throttle + RPM drive everything directly
  triggers: [],

  section: {
    axis: "z",
    min: -1.32,
    max: 1.42,
    initial: 1.42,
    label: "SECT",
    title: "Slice longitudinally through cooling fan, 6 boxer cylinders, cams & K16 turbos"
  },

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.82, pan: [0, 0.42] },
    { id: "boxer", label: "BOXER", elev: 84, azim: 0, zoom: 1.04, pan: [0, 0.02] },
    { id: "turbo", label: "K16 TURBO", elev: 18, azim: -128, zoom: 1.32, pan: [0.15, 0.24] },
    { id: "dyno", label: "DYNO", elev: 24, azim: -22, zoom: 1.38, pan: [-0.88, 0.38] }
  ],

  initialTheta: 0.55,
  initialRpm: 2400,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.82,
  initialPanY: 0.42,
  minVertSpan: 5.1,
  minHorizSpan: 7.0,

  BASE_W: 5.7,
  BASE_D: 3.9,
  BASE_H: 0.22,
  BASE_Y: -1.98,
  topSurfaceY: -1.98 + 0.22 + 0.025,

  auditPoses: [
    { name: "rest (θ=0°)", theta: 0, explode: 0, params: { rpm: 2400, throttle: 72 } },
    { name: "quarter (θ=90°)", theta: Math.PI * 0.5, explode: 0, params: { rpm: 4200, throttle: 90 } },
    { name: "half (θ=180°)", theta: Math.PI, explode: 0, params: { rpm: 900, throttle: 18 } },
    { name: "three-quarter (θ=270°)", theta: Math.PI * 1.5, explode: 0, params: { rpm: 6400, throttle: 100 } },
    { name: "exploded (E=1)", theta: 0.55, explode: 1, params: { rpm: 2400, throttle: 72 } }
  ],

  drivePoses: [
    {
      label: "1. CRUISE · 2400 RPM · 72% THROT",
      pose: { theta: 0.55, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 2400, throttle: 72 } }
    },
    {
      label: "2. FULL THROTTLE · 6200 RPM",
      pose: { theta: 1.45, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 6200, throttle: 100 } }
    },
    {
      label: "3. IDLE · 900 RPM · 15% THROT",
      pose: { theta: 2.35, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 900, throttle: 15 } }
    },
    {
      label: "4. EXPLODED ASSEMBLY",
      pose: { theta: 0.55, explode: 1, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 2400, throttle: 72 } }
    },
    {
      label: "5. CUTAWAY OFF (CLOSED)",
      pose: { theta: 0.55, explode: 0, cutaway: false, shader: true, hud: true, theme: "light", params: { rpm: 2400, throttle: 72 } }
    },
    {
      label: "6. Z-SECTION SLICE",
      pose: { theta: 0.55, explode: 0, cutaway: true, shader: true, section: 0.10, hud: true, theme: "light", params: { rpm: 2400, throttle: 72 } }
    },
    {
      label: "7. DARK · HOT HEADERS",
      pose: { theta: 1.1, explode: 0, cutaway: true, shader: true, section: 1.42, hud: true, theme: "dark", params: { rpm: 6500, throttle: 100 } }
    },
    {
      label: "8. BLUEPRINT · K16 TURBO VIEW",
      pose: { theta: 2.8, explode: 0, cutaway: true, shader: true, section: 1.42, cameraView: "turbo", hud: true, theme: "blueprint", params: { rpm: 4500, throttle: 88 } }
    }
  ]
};

const TOP_Y = SPEC.topSurfaceY;

export const ANCHORS = {
  baseTop: [0, TOP_Y, 0],
  pedestalFront: [0, TOP_Y, 1.06],
  pedestalRear: [0, TOP_Y, -1.06],
  turboMountL: [-SPEC.turboX, TOP_Y, SPEC.turboZ],
  turboMountR: [SPEC.turboX, TOP_Y, SPEC.turboZ],
  plaqueCenter: [-1.88, TOP_Y, SPEC.BASE_D * 0.5 - 0.34],
  rulerCenter: [0.06, TOP_Y, SPEC.BASE_D * 0.5 - 0.30],
  throttleMount: [-0.82, TOP_Y, SPEC.BASE_D * 0.5 - 0.42],
  boostDialMount: [1.02, TOP_Y, SPEC.BASE_D * 0.5 - 0.44],
  dynoScreenMount: [2.10, TOP_Y, SPEC.BASE_D * 0.5 - 0.48]
};

/**
 * Computes horizontal 180-deg boxer piston pin X, crankpin (cx, cy), and conrod angle
 * for cylinder `cyl` at crank angle `theta` (radians).
 */
export function getPistonKinematics(cyl, theta) {
  const { crankY, rThrow, rodLength } = SPEC;
  const throwRad = (cyl.crankOffsetDeg * Math.PI) / 180;
  const pinAngle = theta + throwRad + (cyl.bank < 0 ? Math.PI : 0);
  const cx = rThrow * Math.cos(pinAngle);
  const cy = crankY + rThrow * Math.sin(pinAngle);
  const dy = cy - crankY;
  const reachX = Math.sqrt(Math.max(0.001, rodLength * rodLength - dy * dy));
  const pistonPinX = cx + cyl.bank * reachX;
  const rodAngleZ = Math.atan2(crankY - cy, pistonPinX - cx);
  const pistonCrownX = pistonPinX + cyl.bank * 0.115;
  return { cx, cy, pistonPinX, pistonCrownX, rodAngleZ, pinAngle };
}

function valveLiftCurve(cycDeg, openDeg, closeDeg) {
  const span = closeDeg - openDeg;
  if (cycDeg < openDeg || cycDeg > closeDeg) return 0;
  const u = (cycDeg - openDeg) / span;
  return Math.sin(u * Math.PI);
}

/**
 * Returns 4-stroke cycle state (0..720 deg) and intake/exhaust valve lifts for a cylinder.
 */
export function getCylinderStroke(cyl, theta, boostBar = 0.4, throttlePct = 72) {
  const crankDeg = (((theta * 180) / Math.PI) % 720 + 720) % 720;
  const cycDeg = ((crankDeg - cyl.fireDeg) % 720 + 720) % 720;
  const throtNorm = throttlePct / 100;

  let stroke = "POWER";
  let pressure = 1.0;
  if (cycDeg < 180) {
    stroke = "POWER";
    const t = cycDeg / 180;
    const peak = Math.exp(-Math.pow((t - 0.08) / 0.14, 2));
    pressure = (1.0 + boostBar) * (4.2 * (1 - 0.7 * t) + 26.0 * peak * (0.35 + 0.65 * throtNorm));
  } else if (cycDeg < 360) {
    stroke = "EXHAUST";
    const t = (cycDeg - 180) / 180;
    pressure = 1.1 + boostBar * 0.7 + 2.0 * Math.exp(-t * 3.5);
  } else if (cycDeg < 540) {
    stroke = "INTAKE";
    pressure = 1.0 + boostBar * (0.4 + 0.6 * throtNorm);
  } else {
    stroke = "COMPRESSION";
    const t = (cycDeg - 540) / 180;
    pressure = (1.0 + boostBar) * (1.0 + 8.8 * Math.pow(t, 2.2));
  }

  const exhaustLift = valveLiftCurve(cycDeg, 165, 375);
  const intakeLift = valveLiftCurve(cycDeg, 350, 555);
  return { cycDeg, stroke, pressure, intakeLift, exhaustLift };
}

/**
 * Computes derived twin-K16 boost pressure, turbo shaft RPM, header thermal glow,
 * EGT, torque, and PS/HP purely from the two independent inputs (RPM + Throttle).
 */
export function getEngineMetrics(state = {}) {
  const paramRpm = state.params?.rpm ?? state.rpm;
  const rpm = Math.max(0, Math.min(6800, paramRpm !== undefined ? paramRpm : SPEC.initialRpm));
  const throttle = Math.max(10, Math.min(100, state.throttle ?? state.params?.throttle ?? 72));

  const rpmNorm = rpm / 6800;
  const throtNorm = (throttle - 10) / 90; // 0..1 opening

  // K16 twin-turbo spool: builds boost smoothly above ~1500 rpm proportional to throttle load
  const spoolCurve = 1 / (1 + Math.exp(-(rpm - 2350) / 520));
  const loadFactor = Math.pow(throtNorm, 0.85);
  // Gauge boost: slight intake vacuum (-0.35 bar) at closed throttle, up to +1.05 bar at full load
  const boostGauge = -0.35 * (1 - throtNorm) + 1.05 * spoolCurve * loadFactor;
  const effBoost = Math.max(0.0, boostGauge); // positive gauge bar (0..1.05 bar)

  const turboRpm = Math.round(14000 + rpmNorm * 78000 + effBoost * 46000);
  const headerHeat = Math.min(1.0, 0.08 + 0.44 * rpmNorm + 0.48 * throtNorm * (0.35 + 0.65 * rpmNorm));
  const egtCelsius = Math.round(360 + headerHeat * 610);

  // Authentic M64/60 torque/power curve (~540 Nm @ 4500 rpm, ~408 PS @ 5750 rpm at WOT)
  const torqueShape = 0.58 + 0.42 * Math.exp(-Math.pow((rpm - 4500) / 2100, 2));
  const torqueNm = rpm > 0 ? Math.round((190 + 350 * (0.35 + 0.65 * effBoost / 1.05)) * torqueShape * (0.18 + 0.82 * throtNorm)) : 0;
  const powerPs = Math.round((torqueNm * rpm) / 7023.5);
  const fanRpm = Math.round(rpm * SPEC.fanRatio);

  return {
    rpm,
    rpmNorm,
    throttle,
    throtNorm,
    boostGauge,
    effBoost,
    turboRpm,
    fanRpm,
    headerHeat,
    egtCelsius,
    torqueNm,
    powerPs
  };
}

export function boreClearanceForCylinder(cylZ) {
  return (_x, y, z) => {
    const r = Math.hypot(y - SPEC.crankY, z - cylZ);
    return SPEC.boreRadius - r;
  };
}

export function formatReadout(state) {
  const theta = state.theta ?? 0;
  const m = getEngineMetrics(state);
  const c1 = getCylinderStroke(SPEC.cylinders[0], theta, m.effBoost, m.throttle);
  const deg = Math.round((((theta * 180) / Math.PI) % 720 + 720) % 720);
  const boostSign = m.boostGauge >= 0 ? "+" : "";

  return {
    readout: `θ ${String(deg).padStart(3, "0")}° · ${Math.round(m.rpm)} rpm · ${boostSign}${m.boostGauge.toFixed(2)} bar · ${m.egtCelsius}°C`,
    phase: `CYL 1 · ${c1.stroke} · ${m.powerPs} PS`
  };
}
