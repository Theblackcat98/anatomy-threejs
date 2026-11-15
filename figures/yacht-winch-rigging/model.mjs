export const SPEC = {
  archetype: "section",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Sculpted yacht foredeck & cockpit section dimensions
  deckW: 5.0,
  deckD: 2.65,
  deckH: 0.22,
  deckY: -1.62,
  topSurfaceY: -1.62 + 0.22 + 0.025, // -1.375

  // Mast, spreaders & boom coordinates
  mastX: -1.32,
  mastZ: -0.16,
  mastHeight: 2.84,
  spreaderY: 0.24,
  spreaderHalfSpan: 0.58,
  boomY: -0.68,
  boomLength: 1.82,

  // Hero 2-speed self-tailing planetary winch (coaming top at topSurfaceY + 0.24 = -1.135)
  // Exact involute pitch math (module m = 0.025): rSun + 2*rPlanet = 0.150 + 0.375 = 0.525 = rRing
  winchX: 1.40,
  winchZ: 0.40,
  winchBaseY: -1.135,
  sunTeeth: 12,
  planetTeeth: 15,
  ringTeeth: 42,
  rSun: 0.150,
  rPlanet: 0.1875,
  rRing: 0.525,
  gearToothDepth: 0.036,
  gearRatioLow: 3.5, // 42 / 12 exact planetary reduction

  features: {
    explode: true,
    cutaway: true,
    shader: true,
    crank: true,
    slow: true,
    section: true
  },

  interactionHint: "Drag winch handle to crank (CW 1:1 / CCW 3.5:1), or drag boom/wind vane",

  controls: [
    {
      id: "rpm",
      label: "CRANK",
      min: -60,
      max: 60,
      step: 4,
      initial: -32,
      title: "Winch handle speed (CW + = 1:1 High Speed, CCW - = 3.5:1 Planetary Power, 0 = Hold)"
    },
    {
      id: "wind",
      label: "WIND",
      min: 4,
      max: 36,
      step: 1,
      initial: 18,
      title: "Apparent wind speed (knots) — drives sail camber & shroud load"
    },
    {
      id: "trim",
      label: "SHEET",
      min: 0,
      max: 100,
      step: 2,
      initial: 58,
      title: "Mainsheet trim (0% eased off -> 100% close-hauled)"
    }
  ],

  triggers: [
    {
      id: "fastCw",
      label: "1:1 CW",
      rise: 0.05,
      fall: 0.55,
      title: "Switch winch handle clockwise to 1:1 direct high-speed gear",
      onTrigger: ({ setParam }) => setParam("rpm", 44)
    },
    {
      id: "powerCcw",
      label: "3.5:1 CCW",
      rise: 0.05,
      fall: 0.55,
      title: "Reverse winch handle counter-clockwise to engage 3.5:1 planetary reduction",
      onTrigger: ({ setParam }) => setParam("rpm", -36)
    },
    {
      id: "gust",
      label: "GUST +14kn",
      rise: 0.08,
      fall: 1.25,
      title: "Simulate sudden wind gust — spikes sail camber and windward shroud tension"
    }
  ],

  section: {
    axis: "z",
    min: -0.95,
    max: 1.15,
    initial: 1.15,
    label: "SECT",
    title: "Slice planetary winch housing, deck coaming, and mast partner along Z"
  },

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 1.00, pan: [0, 0.04] },
    { id: "winch", label: "WINCH", elev: 28, azim: -26, zoom: 1.62, pan: [-1.10, 0.58] },
    { id: "rig", label: "RIG", elev: 18, azim: -48, zoom: 1.08, pan: [0.60, -0.20] },
    { id: "top", label: "DECK", elev: 86, azim: 0, zoom: 0.98, pan: [0, 0] }
  ],

  initialTheta: 0.45,
  initialRpm: -32,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 1.00,
  initialPanY: 0.04,
  minVertSpan: 5.5,
  minHorizSpan: 7.2,

  auditPoses: [
    { name: "3.5:1 CCW power (θ=0°)", theta: 0, explode: 0, params: { rpm: -32, wind: 18, trim: 58 } },
    { name: "1:1 CW fast (θ=90°)", theta: Math.PI * 0.5, explode: 0, params: { rpm: 44, wind: 12, trim: 85 } },
    { name: "eased light air (θ=180°)", theta: Math.PI, explode: 0, params: { rpm: 0, wind: 6, trim: 15 } },
    { name: "heavy gust close-hauled (θ=270°)", theta: Math.PI * 1.5, explode: 0, params: { rpm: -48, wind: 36, trim: 95 } },
    { name: "exploded (E=1)", theta: 0.45, explode: 1, params: { rpm: -32, wind: 18, trim: 58 } }
  ],

  drivePoses: [
    {
      label: "1. 3.5:1 CCW PLANETARY",
      pose: { theta: 0.45, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: -32, wind: 18, trim: 58 } }
    },
    {
      label: "2. 1:1 CW DIRECT SPEED",
      pose: { theta: 1.2, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 44, wind: 14, trim: 78 } }
    },
    {
      label: "3. HEAVY WIND · 34 KN",
      pose: { theta: 2.0, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: -40, wind: 34, trim: 92 } }
    },
    {
      label: "4. EASED REACH · 10% TRIM",
      pose: { theta: 2.8, explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 20, wind: 16, trim: 10 } }
    },
    {
      label: "5. EXPLODED PLANETARY",
      pose: { theta: 0.45, explode: 1, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: -32, wind: 18, trim: 58 } }
    },
    {
      label: "6. CUTAWAY OFF (CLOSED DRUM)",
      pose: { theta: 0.45, explode: 0, cutaway: false, shader: true, hud: true, theme: "light", params: { rpm: -32, wind: 18, trim: 58 } }
    },
    {
      label: "7. DARK THEME · Z-SLICE",
      pose: { theta: 1.0, explode: 0, cutaway: true, shader: true, section: 0.46, hud: true, theme: "dark", params: { rpm: -36, wind: 26, trim: 72 } }
    },
    {
      label: "8. BLUEPRINT THEME",
      pose: { theta: 2.2, explode: 0, cutaway: true, shader: true, hud: true, theme: "blueprint", params: { rpm: 32, wind: 20, trim: 60 } }
    }
  ]
};

const TOP_Y = SPEC.topSurfaceY;

export const ANCHORS = {
  baseTop: [0, TOP_Y, 0],
  mastStep: [SPEC.mastX, TOP_Y, SPEC.mastZ],
  shroudPort: [SPEC.mastX, TOP_Y, -1.10],
  shroudStbd: [SPEC.mastX, TOP_Y, 0.78],
  forestayDeck: [-2.30, TOP_Y, SPEC.mastZ],
  backstayDeck: [0.54, TOP_Y, -1.10],
  travelerCenter: [0.22, TOP_Y, -0.02],
  turningBlock: [0.42, TOP_Y, 0.52],
  winchBase: [SPEC.winchX, SPEC.winchBaseY, SPEC.winchZ],
  screenMount: [-1.86, TOP_Y, 0.84],
  plaqueCenter: [-0.04, TOP_Y, 1.03]
};

/**
 * Computes exact planetary winch kinematics & aerodynamic rigging loads.
 * Right-handed +Y rotation sign convention (runtime.mjs steps theta -= omega * dt):
 * - rpm > 0 (CW crank): d(theta)/dt < 0 -> handleRotY = theta turns CW; 1:1 ratchet locks carrier & drum together (CW).
 * - rpm < 0 (CCW crank): d(theta)/dt > 0 -> handleRotY = theta turns CCW; base ratchet holds carrier fixed,
 *   sun turns CCW (+theta), 3x planets spin CW (-theta * 12/15), and ring/drum turns CW (-theta / 3.5)!
 */
export function getRigState(state = {}) {
  const rpm = state.params?.rpm ?? state.rpm ?? SPEC.initialRpm;
  const wind = Math.max(4, Math.min(36, state.wind ?? state.params?.wind ?? 18));
  const trim = Math.max(0, Math.min(100, state.trim ?? state.params?.trim ?? 58));
  const gust = state.triggers?.gust ?? 0;
  const theta = state.theta ?? SPEC.initialTheta;

  const effWind = wind + gust * 14;
  const isLowGear = rpm < -0.5;
  const isHold = Math.abs(rpm) <= 0.5;
  const ratio = isLowGear ? SPEC.gearRatioLow : 1.0;

  const handleRotY = theta;
  let carrierRotY = 0;
  let planetSelfRot = 0;
  let drumRotY = 0;

  if (isLowGear) {
    // Sun turns CCW (+theta), carrier held stationary by base ratchet,
    // planets spin CW (-theta * Zs/Zp), ring & drum turn CW (-theta * Zs/Zr).
    carrierRotY = 0;
    planetSelfRot = -theta * (SPEC.sunTeeth / SPEC.planetTeeth);
    drumRotY = -theta / SPEC.gearRatioLow;
  } else {
    // 1:1 Direct CW lock: carrier, planets, ring & drum turn rigidly with handle/sun.
    carrierRotY = theta;
    planetSelfRot = 0;
    drumRotY = theta;
  }

  // Boom ease angle (rad around Y): trim=100% -> -0.05 rad (close-hauled), trim=0% -> -0.68 rad (eased toward +Z)
  const trimNorm = trim / 100;
  const windPush = Math.min(1, effWind / 36) * 0.14 * (1 - 0.65 * trimNorm);
  const boomAngleY = -(0.05 + (1 - trimNorm) * 0.52 + windPush);

  // Traveler car z-offset responds gently to sheet trim
  const travelerCarZ = 0.24 - trimNorm * 0.34;

  // Sail dynamic camber depth (0.10 .. 0.36)
  const camber = (0.09 + 0.22 * Math.pow(effWind / 36, 0.85)) * (1.12 - 0.38 * trimNorm);

  // Shroud tension (kN): windward shroud carries primary load, leeward goes slack
  const totalLoadKn = 1.4 + 0.022 * effWind * effWind * (0.45 + 0.55 * trimNorm);
  const windwardShroudKn = totalLoadKn * 0.84;
  const leewardShroudKn = Math.max(0.4, totalLoadKn * 0.16);
  const sheetLoadKn = totalLoadKn * 0.34;

  // Apparent wind vane angle (steers toward aft-port with wind speed)
  const windVaneYaw = 0.42 + (effWind / 36) * 0.35;

  const gearLabel = isHold ? "RATCHET HOLD" : isLowGear ? "3.5:1 PLANETARY" : "1:1 DIRECT";

  return {
    rpm,
    effWind,
    trim,
    trimNorm,
    gust,
    isLowGear,
    isHold,
    ratio,
    gearLabel,
    handleRotY,
    carrierRotY,
    planetSelfRot,
    drumRotY,
    boomAngleY,
    travelerCarZ,
    camber,
    windwardShroudKn,
    leewardShroudKn,
    sheetLoadKn,
    windVaneYaw
  };
}

export function formatReadout(state) {
  const r = getRigState(state);
  return {
    readout: `${r.gearLabel} · ${r.effWind.toFixed(1)} kn · SHROUD ${r.windwardShroudKn.toFixed(1)} kN · SHEET ${r.sheetLoadKn.toFixed(1)} kN`,
    phase: `WINCH ${r.ratio.toFixed(1)}:1 · TRIM ${Math.round(r.trim)}%`
  };
}
