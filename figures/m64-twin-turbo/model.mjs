const TAU = Math.PI * 2;

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Cylinders 0,1,2 = Left Bank (Cyls 1, 2, 3 at -X)
// Cylinders 3,4,5 = Right Bank (Cyls 4, 5, 6 at +X)
export const CYL_NUMBERS = [1, 2, 3, 4, 5, 6];
export const BANK_SIGN = [-1, -1, -1, 1, 1, 1];
export const CYL_Z = [-0.71, -0.04, 0.63, -0.63, 0.04, 0.71];

// Opposing pairs (1,4), (2,5), (3,6) share crank throw TDC angles 0°, 240°, 120°
export const CRANK_THROW_PHASE = [
  0.0,
  (4 * Math.PI) / 3,
  (2 * Math.PI) / 3,
  0.0,
  (4 * Math.PI) / 3,
  (2 * Math.PI) / 3
];

// 4-Stroke Firing Order: 1 - 6 - 2 - 4 - 3 - 5 (every 120° over 720° cycle)
export const FIRING_ORDER = [1, 6, 2, 4, 3, 5];
export const FIRING_OFFSET_DEG = [0, 240, 480, 360, 600, 120];

export const SPEC = {
  archetype: "gantry",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Ground & Dyno Cradle Envelope
  FLOOR_Y: -1.68,
  CRADLE_W: 3.50,
  CRADLE_D: 2.36,
  topSurfaceY: -1.44,

  // M64/60 Boxer Cranktrain Geometry (100.0 mm bore x 76.4 mm stroke)
  R_CRANK: 0.22,
  L_ROD: 0.66,
  BORE_R: 0.20,
  BARREL_R: 0.23,
  BARREL_X_INNER: 0.44,
  BARREL_X_OUTER: 1.12,
  HEAD_X_CENTER: 1.24,
  CAM_X_CENTER: 1.45,
  FAN_Y: 0.80,
  FAN_Z: 0.84,
  FAN_RATIO: 1.62,
  IC_Y: 1.18,
  IC_Z: -0.52,
  TURBO_X: 1.24,
  TURBO_Y: -0.96,
  TURBO_Z: -0.74,

  features: {
    explode: false,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: true
  },

  section: {
    axis: "z",
    min: -1.35,
    max: 1.45,
    initial: 1.45,
    step: 0.02,
    label: "SECT",
    title: "Slice longitudinally through cooling fan, 6 Boxer cylinders, crankcase & intercooler"
  },

  interactionHint: "Drag crank pulley, cooling fan, pistons, or boost dial",

  controls: [
    {
      id: "rpm",
      label: "RPM",
      min: 600,
      max: 6800,
      step: 100,
      initial: 2400,
      title: "Crankshaft speed (rpm, 6,800 rpm redline)"
    },
    {
      id: "boostTarget",
      label: "BOOST",
      min: 0.2,
      max: 1.2,
      step: 0.05,
      initial: 0.80,
      title: "Twin KKK K16 target boost pressure (bar gauge)"
    },
    {
      id: "throttle",
      label: "THROTTLE",
      min: 15,
      max: 100,
      step: 5,
      initial: 85,
      title: "74 mm central throttle plate opening (%)"
    },
    {
      id: "timingAdv",
      label: "IGN ADV",
      min: 5,
      max: 35,
      step: 1,
      initial: 22,
      title: "Bosch Motronic M5.2 ignition timing advance (°BTDC)"
    }
  ],

  triggers: [
    {
      id: "overboost",
      label: "OVERBOOST 1.1B",
      rise: 0.10,
      fall: 1.15,
      title: "Temporarily close dual wastegates for 1.1 bar X50 overboost surge"
    },
    {
      id: "wastegate",
      label: "WASTEGATE DUMP",
      rise: 0.08,
      fall: 0.85,
      title: "Open twin wastegate bypass valves to vent turbine exhaust pressure"
    }
  ],

  cameraViews: [
    { id: "iso", label: "ISO", elev: 28, azim: -36, zoom: 0.96, pan: [0.0, 0.06] },
    { id: "boxer", label: "BOXER PLAN", elev: 76, azim: -12, zoom: 1.08, pan: [0.0, -0.05] },
    { id: "turbos", label: "TWIN K16 TURBOS", elev: 14, azim: -138, zoom: 1.24, pan: [0.0, 0.28] },
    { id: "fan", label: "11-BLADE FAN", elev: 18, azim: -16, zoom: 1.38, pan: [0.0, -0.18] },
    { id: "front", label: "FRONT ELEV", elev: 4, azim: 0, zoom: 1.04, pan: [0.0, 0.08] }
  ],

  initialTheta: 0.65,
  initialRpm: 2400,
  isoElevDeg: 28,
  isoAzimDeg: -36,
  initialZoom: 0.96,
  initialPanY: 0.06,
  minVertSpan: 4.8,
  minHorizSpan: 6.4,

  auditPoses: [
    {
      name: "rest (θ=0.65 rad)",
      theta: 0.65,
      explode: 0,
      params: { rpm: 2400, boostTarget: 0.80, throttle: 85, timingAdv: 22 }
    },
    {
      name: "pair 1&4 TDC (θ=0°)",
      theta: 0.0,
      explode: 0,
      params: { rpm: 1200, boostTarget: 0.50, throttle: 50, timingAdv: 15 }
    },
    {
      name: "pair 3&6 TDC (θ=120°)",
      theta: (2 * Math.PI) / 3,
      explode: 0,
      params: { rpm: 4500, boostTarget: 0.85, throttle: 100, timingAdv: 26 }
    },
    {
      name: "pair 2&5 TDC (θ=240°)",
      theta: (4 * Math.PI) / 3,
      explode: 0,
      params: { rpm: 5750, boostTarget: 1.00, throttle: 100, timingAdv: 30 }
    },
    {
      name: "overboost & wastegate trigger",
      theta: Math.PI,
      explode: 0,
      params: { rpm: 6400, boostTarget: 1.10, throttle: 100, timingAdv: 28 },
      triggers: { overboost: 1.0, wastegate: 0.5 }
    }
  ],

  drivePoses: [
    {
      label: "1. PAIR 1&4 TDC · CYL 1 IGNITION",
      pose: { theta: -0.18, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 2400, boostTarget: 0.80, throttle: 85, timingAdv: 22 } }
    },
    {
      label: "2. CYL 6 POWER · 120° INTERVAL",
      pose: { theta: -2.28, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 3600, boostTarget: 0.85, throttle: 90, timingAdv: 24 } }
    },
    {
      label: "3. 5750 RPM · 408 PS PEAK POWER",
      pose: { theta: -4.35, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 5750, boostTarget: 0.90, throttle: 100, timingAdv: 28 } }
    },
    {
      label: "4. OVERBOOST 1.1 BAR SURGE",
      pose: { theta: -6.45, cutaway: true, shader: true, trigger: "overboost", hud: true, theme: "light", params: { rpm: 5200, boostTarget: 1.10, throttle: 100, timingAdv: 26 } }
    },
    {
      label: "5. Z-SECTION SLICE · BORE & RODS",
      pose: { theta: -1.10, cutaway: true, shader: true, section: 0.15, hud: true, theme: "light", params: { rpm: 2400, boostTarget: 0.80, throttle: 85, timingAdv: 22 } }
    },
    {
      label: "6. CUTAWAY OFF · FULL SHROUD",
      pose: { theta: -3.20, cutaway: false, shader: true, section: 1.45, hud: true, theme: "light", params: { rpm: 2400, boostTarget: 0.80, throttle: 85, timingAdv: 22 } }
    },
    {
      label: "7. DARK THEME · TWIN K16 GLOW",
      pose: { theta: -8.35, cutaway: true, shader: true, section: 1.45, hud: true, theme: "dark", params: { rpm: 6200, boostTarget: 1.05, throttle: 100, timingAdv: 30 } }
    },
    {
      label: "8. BLUEPRINT THEME · BOXER PLAN",
      pose: { theta: -5.20, cutaway: true, shader: true, section: 1.45, hud: true, theme: "blueprint", params: { rpm: 3000, boostTarget: 0.80, throttle: 85, timingAdv: 22 } }
    }
  ]
};

export const ANCHORS = {
  crankCenter: [0.0, 0.0, 0.0],
  fanCenter: [0.0, SPEC.FAN_Y, SPEC.FAN_Z],
  plenumTop: [0.0, 0.92, -0.30],
  intercoolerCore: [0.0, SPEC.IC_Y, SPEC.IC_Z],
  turboLeftCenter: [-SPEC.TURBO_X, SPEC.TURBO_Y, SPEC.TURBO_Z],
  turboRightCenter: [SPEC.TURBO_X, SPEC.TURBO_Y, SPEC.TURBO_Z],
  compOutletL: [-1.53, -0.88, -0.90],
  compOutletR: [1.53, -0.88, -0.90],
  icInletL: [-1.06, 0.98, -0.52],
  icInletR: [1.06, 0.98, -0.52],
  wastegatePortL: [-1.24, -0.60, -1.05],
  wastegatePortR: [1.24, -0.60, -1.05],
  plaqueCenter: [0.76, -1.52, 1.62]
};

export function getCylinderKinematics(theta, cylIndex) {
  const s = BANK_SIGN[cylIndex];
  const phi = -theta - CRANK_THROW_PHASE[cylIndex];
  const Rc = SPEC.R_CRANK;
  const L = SPEC.L_ROD;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  // Crankpin world XY position (all 6 throws rotate rigidly together by -theta around Z)
  const xPin = s * Rc * cosPhi;
  const yPin = s * Rc * sinPhi;

  // Exact slider-crank wrist-pin position along horizontal X cylinder bore
  const wristDist = Rc * cosPhi + Math.sqrt(Math.max(0.01, L * L - Rc * Rc * sinPhi * sinPhi));
  const xPiston = s * wristDist;

  // Connecting rod angle in XY plane from wrist-pin (xPiston, 0) to crankpin (xPin, yPin)
  const rodAngle = Math.atan2(yPin, xPin - xPiston);

  // 720° 4-stroke cycle angle for this cylinder (0..720°)
  const crankDeg720 = (((-theta * 180) / Math.PI - FIRING_OFFSET_DEG[cylIndex]) % 720 + 720) % 720;
  let strokeName = "POWER";
  let combIntensity = 0.0;
  let intakeWeight = 0.0;
  let compWeight = 0.0;
  let exhWeight = 0.0;

  if (crankDeg720 < 180) {
    strokeName = "IGNITION · POWER";
    const u = crankDeg720 / 180;
    combIntensity = Math.exp(-u * 2.8) * (0.65 + 0.35 * Math.exp(-Math.pow(u / 0.16, 2)));
  } else if (crankDeg720 < 360) {
    strokeName = "EXHAUST";
    exhWeight = Math.sin(((crankDeg720 - 180) / 180) * Math.PI);
  } else if (crankDeg720 < 540) {
    strokeName = "INTAKE";
    intakeWeight = Math.sin(((crankDeg720 - 360) / 180) * Math.PI);
  } else {
    strokeName = "COMPRESSION";
    compWeight = Math.pow((crankDeg720 - 540) / 180, 1.35);
  }

  return {
    cylNumber: CYL_NUMBERS[cylIndex],
    bankSign: s,
    cz: CYL_Z[cylIndex],
    xPin,
    yPin,
    xPiston,
    wristDist,
    rodAngle,
    crankDeg720,
    strokeName,
    combIntensity,
    intakeWeight,
    compWeight,
    exhWeight
  };
}

export function getEngineState(theta = SPEC.initialTheta, params = {}, triggers = {}) {
  const rpm = clamp(params.rpm ?? SPEC.initialRpm, 600, 6800);
  const boostTarget = clamp(params.boostTarget ?? 0.80, 0.2, 1.2);
  const throttle = clamp(params.throttle ?? 85, 15, 100);
  const timingAdv = clamp(params.timingAdv ?? 22, 5, 35);

  const overboostEnv = clamp01(triggers.overboost ?? 0);
  const wastegateEnv = clamp01(triggers.wastegate ?? 0);

  const rpmNorm = clamp01((rpm - 600) / 6200);
  const spoolFactor = clamp01((rpm - 1350) / 2100) * (throttle / 100);
  const effectiveBoost = clamp(
    (boostTarget * spoolFactor + 0.32 * overboostEnv) * (1 - 0.68 * wastegateEnv),
    0.0,
    1.25
  );

  // Realistic M64/60 torque & power estimate (540 Nm @ 4500 rpm, 408 PS @ 5750 rpm)
  const torqueShape = 0.62 + 0.38 * Math.exp(-Math.pow((rpm - 4500) / 2100, 2));
  const torqueNm = Math.round(
    (295 + 245 * (effectiveBoost / 0.8)) * torqueShape * (0.25 + 0.75 * (throttle / 100))
  );
  const powerPs = Math.round((torqueNm * rpm) / 7023.5);

  const cylinders = [];
  let activeFiringCyl = 1;
  let minFiringDeg = 999;
  for (let i = 0; i < 6; i++) {
    const ck = getCylinderKinematics(theta, i);
    cylinders.push(ck);
    if (ck.crankDeg720 < minFiringDeg) {
      minFiringDeg = ck.crankDeg720;
      activeFiringCyl = ck.cylNumber;
    }
  }

  let modeLabel = `CYL ${activeFiringCyl} FIRING · 1-6-2-4-3-5`;
  if (overboostEnv > 0.15) {
    modeLabel = `OVERBOOST SURGE · ${effectiveBoost.toFixed(2)} BAR`;
  } else if (wastegateEnv > 0.15) {
    modeLabel = `WASTEGATE BYPASS DUMP`;
  }

  return {
    theta,
    rpm,
    rpmNorm,
    boostTarget,
    effectiveBoost,
    throttle,
    timingAdv,
    overboostEnv,
    wastegateEnv,
    torqueNm,
    powerPs,
    fanRad: theta * SPEC.FAN_RATIO,
    camRad: theta * 0.5,
    turboRad: theta * (6.0 + 10.0 * spoolFactor + 4.0 * overboostEnv),
    activeFiringCyl,
    modeLabel,
    cylinders
  };
}

export function formatReadout(state = {}) {
  const st = getEngineState(state.theta ?? SPEC.initialTheta, state.params || state, state.triggers || {});
  const crankDeg = Math.round((((-st.theta * 180) / Math.PI) % 720 + 720) % 720);
  return {
    readout: `θ ${String(crankDeg).padStart(3, "0")}° · ${Math.round(st.rpm)} rpm · +${st.effectiveBoost.toFixed(2)} bar · ${st.powerPs} PS / ${st.torqueNm} Nm · ADV ${Math.round(st.timingAdv)}°`,
    phase: st.modeLabel
  };
}
