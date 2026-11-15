export const SPEC = {
  archetype: "free-space",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Grounding & Dyno Test Cradle dimensions
  BASE_W: 5.4,
  BASE_D: 3.3,
  BASE_Y: -1.86,
  railTopY: -1.66, // Dyno I-rails top face (BASE_Y + 0.20)
  topSurfaceY: -1.66,

  // Concentric Input Axis (K1 inner odd / K2 outer even) & Offset Output Countershaft
  inY: 0.30,
  inZ: -0.22,
  outY: -0.58,
  outZ: 0.22,
  shaftCenterDist: Math.hypot(0.30 - -0.58, -0.22 - 0.22), // 0.98387

  // Constant gear module m = 2*C / 62 so every pair has exact pitch-circle tangency (tIn + tOut = 62)
  gearModule: (2 * Math.hypot(0.88, -0.44)) / 62,

  // 7 forward gear stations (x, rIn, rOut, tIn, tOut, shaft: 'odd'|'even', synchro, lockDir)
  gears: (() => {
    const C = Math.hypot(0.88, -0.44);
    const m = (2 * C) / 62;
    const raw = [
      { gear: 2, shaft: "even", x: -0.80, tIn: 18, tOut: 44, synchro: "E1", lockDir: -1 },
      { gear: 4, shaft: "even", x: -0.28, tIn: 26, tOut: 36, synchro: "E1", lockDir: 1 },
      { gear: 6, shaft: "even", x: 0.16, tIn: 33, tOut: 29, synchro: "E2", lockDir: 1 },
      { gear: 1, shaft: "odd", x: 0.58, tIn: 14, tOut: 48, synchro: "O1", lockDir: -1 },
      { gear: 3, shaft: "odd", x: 1.10, tIn: 22, tOut: 40, synchro: "O1", lockDir: 1 },
      { gear: 5, shaft: "odd", x: 1.40, tIn: 30, tOut: 32, synchro: "O2", lockDir: -1 },
      { gear: 7, shaft: "odd", x: 1.88, tIn: 36, tOut: 26, synchro: "O2", lockDir: 1 }
    ];
    return raw.map((g) => ({
      ...g,
      rIn: (g.tIn * m) / 2,
      rOut: (g.tOut * m) / 2
    }));
  })(),

  synchros: [
    { id: "E1", x: -0.54, travel: 0.105, gears: [2, 4], rail: "even" },
    { id: "E2", x: -0.02, travel: 0.080, gears: [6], rail: "even" },
    { id: "O1", x: 0.84, travel: 0.105, gears: [1, 3], rail: "odd" },
    { id: "O2", x: 1.64, travel: 0.105, gears: [5, 7], rail: "odd" }
  ],

  features: {
    explode: true,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: true
  },

  interactionHint: "Drag 7-gate shift lever to select gears 1–7, or drag flywheel/clutch drum",

  controls: [
    {
      id: "gear",
      label: "GEAR",
      min: 1,
      max: 7,
      step: 1,
      initial: 3,
      title: "Selected transmission gear (1–7) — smooth transitions show live K1/K2 clutch handoff"
    },
    {
      id: "rpm",
      label: "IN RPM",
      min: 600,
      max: 6500,
      step: 100,
      initial: 2400,
      title: "Engine flywheel input speed (RPM)"
    },
    {
      id: "load",
      label: "LOAD",
      min: 10,
      max: 100,
      step: 5,
      initial: 72,
      title: "Engine input torque load (%)"
    }
  ],

  triggers: [
    {
      id: "upshift",
      label: "UPSHIFT +",
      rise: 0.05,
      fall: 0.70,
      title: "Sequential paddle upshift with pre-selected dual-clutch handoff",
      onTrigger: ({ state, setParam }) => {
        const cur = Math.round(state.params.gear ?? 3);
        setParam("gear", Math.min(7, cur + 1));
      }
    },
    {
      id: "downshift",
      label: "DOWNSHIFT -",
      rise: 0.05,
      fall: 0.70,
      title: "Sequential paddle downshift with rev-match dual-clutch handoff",
      onTrigger: ({ state, setParam }) => {
        const cur = Math.round(state.params.gear ?? 3);
        setParam("gear", Math.max(1, cur - 1));
      }
    }
  ],

  section: {
    axis: "z",
    min: -0.90,
    max: 1.05,
    initial: 1.05,
    label: "SECT",
    title: "Slice cast bellhousing, split-case sump, and gearbox housing along Z"
  },

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.98, pan: [-0.04, 0.28] },
    { id: "clutch", label: "CLUTCH K1/K2", elev: 20, azim: -22, zoom: 1.48, pan: [1.35, -0.02] },
    { id: "synchro", label: "SYNCHROS", elev: 26, azim: -48, zoom: 1.36, pan: [-0.36, 0.20] },
    { id: "top", label: "TOP PLAN", elev: 86, azim: 0, zoom: 1.00, pan: [0, 0] }
  ],

  initialTheta: 0.45,
  initialRpm: 2400,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.98,
  initialPanY: 0.28,
  minVertSpan: 5.3,
  minHorizSpan: 7.2,

  auditPoses: [
    { name: "gear 1 (K1 active)", theta: 0, explode: 0, params: { gear: 1, rpm: 2400, load: 80 } },
    { name: "gear 3->4 handoff (K1+K2)", theta: Math.PI * 0.5, explode: 0, params: { gear: 3.5, rpm: 3200, load: 90 } },
    { name: "gear 4 (K2 active)", theta: Math.PI, explode: 0, params: { gear: 4, rpm: 2800, load: 65 } },
    { name: "gear 7 overdrive", theta: Math.PI * 1.5, explode: 0, params: { gear: 7, rpm: 4500, load: 50 } },
    { name: "exploded (E=1)", theta: 0.45, explode: 1, params: { gear: 3, rpm: 2400, load: 72 } }
  ],

  drivePoses: [
    {
      label: "1. GEAR 1 · K1 ODD SHAFT",
      pose: { theta: 0.45, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { gear: 1, rpm: 2200, load: 85 } }
    },
    {
      label: "2. GEAR 3 · PRESELECT G4",
      pose: { theta: 0.95, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { gear: 3, rpm: 3200, load: 75 } }
    },
    {
      label: "3. K1->K2 HANDOFF (3.5)",
      pose: { theta: 1.45, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { gear: 3.5, rpm: 4100, load: 95 } }
    },
    {
      label: "4. GEAR 6 · K2 EVEN SHAFT",
      pose: { theta: 2.0, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { gear: 6, rpm: 2900, load: 60 } }
    },
    {
      label: "5. EXPLODED ASSEMBLY",
      pose: { theta: 0.45, explode: 1, cutaway: true, shader: true, hud: true, theme: "light", params: { gear: 3, rpm: 2400, load: 72 } }
    },
    {
      label: "6. CUTAWAY OFF (CASE CLOSED)",
      pose: { theta: 0.45, explode: 0, cutaway: false, shader: true, hud: true, theme: "light", params: { gear: 3, rpm: 2400, load: 72 } }
    },
    {
      label: "7. DARK THEME · Z-SLICE",
      pose: { theta: 1.1, explode: 0, cutaway: true, shader: true, section: 0.08, hud: true, theme: "dark", params: { gear: 5, rpm: 4800, load: 88 } }
    },
    {
      label: "8. BLUEPRINT THEME",
      pose: { theta: 2.5, explode: 0, cutaway: true, shader: true, hud: true, theme: "blueprint", params: { gear: 2, rpm: 2600, load: 70 } }
    }
  ]
};

const RAIL_Y = SPEC.railTopY;

export const ANCHORS = {
  cradleFrontMount: [-1.42, RAIL_Y, 0.0],
  cradleMidMount: [0.36, RAIL_Y, 0.0],
  cradleRearMount: [2.08, RAIL_Y, 0.0],
  mechatronicsMount: [0.16, RAIL_Y, 1.20],
  paddleMount: [-1.14, RAIL_Y, 1.34],
  plaqueCenter: [-2.12, RAIL_Y, 1.34],
  rulerCenter: [0.16, SPEC.BASE_Y + 0.01, 1.66],
  screenMount: [2.14, RAIL_Y, 1.58]
};

export function getGearSpec(gearNum) {
  return SPEC.gears.find((g) => g.gear === gearNum) || SPEC.gears[0];
}

export function getGearRatio(gearNum) {
  const g = getGearSpec(gearNum);
  return g.tOut / g.tIn;
}

/**
 * Evaluates dual-clutch K1/K2 clamp levels, preselected gear, synchro sleeve axial positions,
 * input/output shaft kinematics, and active torque path metrics for `gear` in [1..7].
 */
export function getDctState(state = {}) {
  const gearVal = Math.max(1, Math.min(7, state.gear ?? state.params?.gear ?? 3));
  const rpm = Math.max(0, state.rpm ?? state.effectiveRpm ?? state.params?.rpm ?? SPEC.initialRpm);
  const load = Math.max(10, Math.min(100, state.load ?? state.params?.load ?? 72));

  const gLow = Math.floor(gearVal);
  const gHigh = Math.min(7, gLow + 1);
  const frac = gearVal - gLow;
  const nearInt = Math.round(gearVal);

  // Smooth clutch cross-fade handoff between consecutive odd/even gears
  const blend = frac <= 0.1 ? 0 : frac >= 0.9 ? 1 : (frac - 0.1) / 0.8;
  const sBlend = blend * blend * (3 - 2 * blend);

  const lowOdd = gLow % 2 === 1;
  const highOdd = gHigh % 2 === 1;
  const k1 = (lowOdd ? 1 - sBlend : 0) + (highOdd ? sBlend : 0);
  const k2 = 1 - k1;

  const activeGear = Math.abs(gearVal - nearInt) < 0.35 ? nearInt : sBlend < 0.5 ? gLow : gHigh;
  const preselectGear = activeGear < 7 ? activeGear + 1 : 6;

  const ratioLow = getGearRatio(gLow);
  const ratioHigh = getGearRatio(gHigh);
  const effRatio = ratioLow * (1 - sBlend) + ratioHigh * sBlend;
  const outRpm = Math.round(rpm / effRatio);

  // Freewheeling shaft speeds: clamped clutch drives its shaft at engine RPM,
  // while preselected opposite shaft is back-driven through the preselected gear pair.
  const preSpec = getGearSpec(preselectGear);
  const preRatio = getGearRatio(preselectGear);
  const preShaftRpm = Math.round((rpm / effRatio) * preRatio);
  const oddRpm = activeGear % 2 === 1 ? Math.round(rpm) : preShaftRpm;
  const evenRpm = activeGear % 2 === 0 ? Math.round(rpm) : preShaftRpm;

  // Synchro sleeve displacement: locks BOTH active gear and preselected gear on opposite shaft!
  const synchroPos = {};
  for (const syn of SPEC.synchros) {
    let targetDir = 0;
    for (const gn of syn.gears) {
      const gs = getGearSpec(gn);
      if (gn === activeGear) {
        targetDir = gs.lockDir;
        break;
      }
      if (gn === gLow || gn === gHigh || gn === preselectGear) {
        targetDir = gs.lockDir;
      }
    }
    synchroPos[syn.id] = targetDir * syn.travel;
  }

  return {
    gearVal,
    activeGear,
    preselectGear,
    k1,
    k2,
    effRatio,
    rpm,
    outRpm,
    oddRpm,
    evenRpm,
    preSpec,
    load,
    synchroPos,
    isShifting: frac > 0.05 && frac < 0.95
  };
}

export function formatReadout(state) {
  const d = getDctState({ ...state, rpm: state.effectiveRpm ?? state.rpm });
  const shaftText = d.activeGear % 2 === 1 ? "K1 ODD" : "K2 EVEN";
  const phase = d.isShifting
    ? `SHIFT ${Math.floor(d.gearVal)}→${Math.ceil(d.gearVal)} · K1/K2 HANDOFF`
    : `GEAR ${d.activeGear} (${shaftText}) · PRE G${d.preselectGear}`;

  return {
    readout: `G${d.activeGear} · IN ${Math.round(d.rpm)} rpm · OUT ${d.outRpm} rpm · ${d.effRatio.toFixed(2)}:1`,
    phase
  };
}
