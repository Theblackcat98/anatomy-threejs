export const TAU = Math.PI * 2;

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function clampUnit(x) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export const SPEC = {
  archetype: "section",
  simulationMode: "continuous",
  toneMode: "multi-channel",

  // Yacht Deck Section Envelope
  DECK_W: 4.60,
  DECK_D: 3.30,
  DECK_H: 0.28,
  FLOOR_Y: -1.75,
  DECK_SLAB_Y: -1.445,    // With bevelThickness 0.025 -> bottom = -1.75, top = -1.42
  topSurfaceY: -1.42,

  // Starboard 46ST 2-Speed Self-Tailing Winch Coordinates
  WINCH_CX: 1.12,
  WINCH_CZ: 0.18,
  WINCH_PLINTH_H: 0.24,
  WINCH_BASE_Y: -1.18,    // Top of base.winchPlinth (-1.42 + 0.24)
  SKIRT_H: 0.18,          // struct.winchBaseSkirt: -1.18 .. -1.00
  CARRIER_Y: -0.58,       // Planetary carrier plate center Y
  PLANET_Y: -0.42,        // Planetary gear & internal ring gear plane Y
  COMPOUND_Y: -0.82,      // 2nd-speed compound reduction gear plane Y
  DRUM_R_TOP: 0.58,
  DRUM_R_BOT: 0.64,
  DRUM_H: 0.96,           // Drum shell spans y in [-0.80, +0.16]
  JAWS_Y: 0.23,           // Self-tailing ribbed brass jaw crown center Y
  STRIPPER_Y: 0.32,       // Stationary chrome stripper arm center Y
  HANDLE_Y: 0.54,         // Lock-in winch handle socket plane (clears stripper arm!)
  HANDLE_LEN: 0.68,

  // 46ST Gear Ratios & Capstan Constants
  GEAR1_RATIO: 2.60,      // CW Handle -> Fast Trim (13.5:1 power ratio)
  GEAR2_RATIO: 9.20,      // CCW Handle -> Low-Speed Grind (46.0:1 power ratio)
  POWER_RATIO_1: 13.5,
  POWER_RATIO_2: 46.0,
  CAPSTAN_MU: 0.33,
  CAPSTAN_TURNS: 3.25,

  // Masthead Rig, Spreaders, Boom & Sail Foil Coordinates
  MAST_X: -1.18,
  MAST_Z: -0.18,
  MAST_STEP_Y: -1.30,
  GOOSENECK_Y: -0.82,
  SPREADER_Y: 0.60,
  SPREADER_SPAN: 0.96,    // Each spreader extends 0.96 u in +Z and -Z
  MASTHEAD_Y: 2.28,
  BOOM_LEN: 1.48,
  SAIL_LUFF_H: 2.92,
  SAIL_FOOT_W: 1.40,
  CHAINPLATE_Z_WIND: 1.12,
  CHAINPLATE_Z_LEE: -1.42,
  STEMHEAD_X: -2.08,
  STERN_BACKSTAY_X: -0.22,

  features: {
    explode: false,   // Open rigging + cutaway winch drum -> explode disabled to keep shrouds & tubes intact
    cutaway: true,    // Hides front half of winch drum barrel & upper gear housing cover to expose planetary + compound gears
    shader: true,     // GLSL aerodynamic windward pressure + leeward suction slot streamlines across sail camber
    crank: true,      // Manual handle cranking in viewport
    slow: true,       // 1x, 1/5x, 1/20x, PAUSED
    section: false    // Cutaway already opens the +Z front winch drum cleanly
  },

  interactionHint: "Drag handle to crank or sail/boom to trim",

  controls: [
    {
      id: "rpm",
      label: "CRANK",
      min: 15,
      max: 120,
      step: 5,
      initial: 55,
      title: "Winch handle cranking cadence (RPM)"
    },
    {
      id: "gearMode",
      label: "GEAR (1/2)",
      min: 1,
      max: 2,
      step: 1,
      initial: 1,
      title: "1 = CW Handle (Fast 2.6:1 Trim) · 2 = CCW Handle (High-Torque 9.2:1 Grind)"
    },
    {
      id: "windKt",
      label: "WIND KT",
      min: 6,
      max: 32,
      step: 1,
      initial: 18,
      title: "Apparent wind speed (knots) — drives sail camber, shroud kN load & mast bend"
    },
    {
      id: "backstay",
      label: "BACKSTAY",
      min: 10,
      max: 100,
      step: 5,
      initial: 45,
      title: "Hydraulic backstay tension (%) — bends mast & flattens mid-sail draft camber"
    }
  ],

  triggers: [
    {
      id: "reverseGear",
      label: "SHIFT 2ND GEAR",
      rise: 0.14,
      fall: 1.60,
      title: "Reverse handle rotation into 2nd-speed compound reduction (46:1 high-load grind)"
    },
    {
      id: "gust",
      label: "WIND GUST",
      rise: 0.12,
      fall: 1.25,
      title: "Hit rig with a 10-knot wind gust — deepens sail draft, spikes windward shroud load & deflects masthead"
    }
  ],

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.88, pan: [0.02, 0.14] },
    { id: "winch", label: "PLANETARY", elev: 24, azim: -28, zoom: 1.58, pan: [-0.82, 0.36] },
    { id: "jaws", label: "SELF-TAILER", elev: 42, azim: -16, zoom: 1.72, pan: [-0.88, 0.08] },
    { id: "rig", label: "MAST & SAIL", elev: 22, azim: -48, zoom: 1.08, pan: [0.68, -0.14] },
    { id: "top", label: "DECK PLAN", elev: 88, azim: 0, zoom: 0.94, pan: [0.0, 0.0] }
  ],

  initialTheta: 1.85,
  initialRpm: 55,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.88,
  initialPanY: 0.14,
  minVertSpan: 5.8,
  minHorizSpan: 7.4,

  auditPoses: [
    {
      name: "gear 1 fast trim (18 kt wind)",
      theta: 1.85,
      explode: 0,
      params: { rpm: 55, gearMode: 1, windKt: 18, backstay: 45 }
    },
    {
      name: "gear 2 high-torque grind (26 kt wind)",
      theta: Math.PI * 0.75,
      explode: 0,
      params: { rpm: 70, gearMode: 2, windKt: 26, backstay: 75 }
    },
    {
      name: "light air full camber (8 kt, low backstay)",
      theta: Math.PI * 1.35,
      explode: 0,
      params: { rpm: 40, gearMode: 1, windKt: 8, backstay: 15 }
    },
    {
      name: "storm flattened trim (32 kt, max backstay)",
      theta: Math.PI * 1.90,
      explode: 0,
      params: { rpm: 95, gearMode: 2, windKt: 32, backstay: 100 }
    },
    {
      name: "gust & shift trigger active",
      theta: 2.40,
      explode: 0,
      params: { rpm: 65, gearMode: 1, windKt: 22, backstay: 60 },
      triggers: { reverseGear: 1.0, gust: 1.0 }
    }
  ],

  drivePoses: [
    {
      label: "1. GEAR 1 (CW) · FAST SHEET TRIM (13.5:1)",
      pose: { theta: 1.85, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 55, gearMode: 1, windKt: 16, backstay: 35 } }
    },
    {
      label: "2. GEAR 2 (CCW) · COMPOUND GRIND (46:1)",
      pose: { theta: 3.40, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 65, gearMode: 2, windKt: 26, backstay: 70 } }
    },
    {
      label: "3. LIGHT AIR (8 KT) · DEEP 16% SAIL CAMBER",
      pose: { theta: 0.65, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 40, gearMode: 1, windKt: 8, backstay: 15 } }
    },
    {
      label: "4. HEAVY AIR (32 KT) + MAX BACKSTAY BEND",
      pose: { theta: 4.80, cutaway: true, shader: true, hud: true, theme: "light", params: { rpm: 90, gearMode: 2, windKt: 32, backstay: 100 } }
    },
    {
      label: "5. WIND GUST PULSE · SHROUD PEAK LOAD",
      pose: { theta: 2.60, cutaway: true, shader: true, trigger: "gust", hud: true, theme: "light", params: { rpm: 70, gearMode: 2, windKt: 24, backstay: 55 } }
    },
    {
      label: "6. CUTAWAY OFF · ENCLOSED 46ST DRUM",
      pose: { theta: 2.10, cutaway: false, shader: true, hud: true, theme: "light", params: { rpm: 55, gearMode: 1, windKt: 18, backstay: 45 } }
    },
    {
      label: "7. DARK THEME · AERODYNAMIC SLOT FLOW",
      pose: { theta: 3.90, cutaway: true, shader: true, hud: true, theme: "dark", params: { rpm: 65, gearMode: 2, windKt: 24, backstay: 65 } }
    },
    {
      label: "8. BLUEPRINT THEME · RIG & PLANETARY PLAN",
      pose: { theta: 1.20, cutaway: true, shader: true, hud: true, theme: "blueprint", params: { rpm: 55, gearMode: 1, windKt: 20, backstay: 50 } }
    }
  ]
};

export const ANCHORS = {
  winchCenter: [SPEC.WINCH_CX, SPEC.WINCH_BASE_Y, SPEC.WINCH_CZ],
  mastStepCenter: [SPEC.MAST_X, SPEC.MAST_STEP_Y, SPEC.MAST_Z],
  gooseneckPivot: [-1.06, SPEC.GOOSENECK_Y, SPEC.MAST_Z],
  spreaderRoot: [SPEC.MAST_X, SPEC.SPREADER_Y, SPEC.MAST_Z],
  mastheadTop: [SPEC.MAST_X, SPEC.MASTHEAD_Y, SPEC.MAST_Z],
  windwardChainplate: [SPEC.MAST_X, -1.26, SPEC.CHAINPLATE_Z_WIND],
  leewardChainplate: [SPEC.MAST_X, -1.26, SPEC.CHAINPLATE_Z_LEE],
  stemheadFitting: [SPEC.STEMHEAD_X, -1.26, SPEC.MAST_Z],
  sternBackstayPad: [SPEC.STERN_BACKSTAY_X, -1.26, SPEC.MAST_Z],
  turningBlockOut: [-0.44, -1.22, 0.88],
  winchSheetIn: [0.34, -0.96, 0.56],
  stripperTailOut: [1.12, 0.26, 0.82],
  cockpitCleatIn: [1.92, -1.28, 1.02],
  screenMount: [-0.04, -1.15, 1.34],
  plaqueCenter: [1.16, -1.38, 1.42]
};

/**
 * Computes exact NACA-style sail camber offset (+Z leeward/windward billow)
 * for normalized chord xi in [0..1] (0 = mast luff, 1 = leech)
 * and normalized span eta in [0..1] (0 = boom foot, 1 = masthead peak).
 */
export function computeSailSurfaceOffset(xi, eta, camberRatio, twistRad, mastPreBend) {
  // Peak draft positioned at 38% chord (xi = 0.38)
  const p = 0.38;
  const camberProfile =
    xi < p
      ? (2 * p * xi - xi * xi) / (p * p)
      : (1 - 2 * p + 2 * p * xi - xi * xi) / ((1 - p) * (1 - p));

  // Camber builds from foot/head toward mid-span and scales with camberRatio
  const spanEnvelope = 0.35 + 0.65 * Math.sin(Math.PI * clampUnit(eta * 0.92 + 0.04));
  // Sail billows toward -Z (leeward) under wind coming from +Z (windward)
  const billowZ = -camberRatio * 1.65 * camberProfile * spanEnvelope;

  // Spanwise leech twist opens upper leech toward -Z
  const twistZ = -Math.sin(twistRad * Math.pow(eta, 1.25)) * xi * 0.62;

  // Luff tracks mast pre-bend along X
  const luffBendX = mastPreBend * Math.sin(Math.PI * eta) * (1 - xi);

  return {
    dx: luffBendX,
    dz: billowZ + twistZ
  };
}

export function getRigState(theta = SPEC.initialTheta, params = {}, triggers = {}) {
  const crankRpm = clamp(params.rpm ?? 55, 15, 120);
  const rawGear = params.gearMode ?? 1;
  const shiftEnv = clampUnit(triggers.reverseGear ?? 0);
  const gustEnv = clampUnit(triggers.gust ?? 0);

  // Active gear: Gear 2 engages either via slider (gearMode >= 1.5) or SHIFT 2ND GEAR trigger
  const gearBlend = clampUnit(Math.max(rawGear - 1, shiftEnv));
  const isGear2 = gearBlend >= 0.5;
  const activeGear = isGear2 ? 2 : 1;
  const gearRatio = lerp(SPEC.GEAR1_RATIO, SPEC.GEAR2_RATIO, gearBlend);
  const powerRatio = lerp(SPEC.POWER_RATIO_1, SPEC.POWER_RATIO_2, gearBlend);

  // Effective wind speed including gust impulse (+10 kt peak)
  const baseWindKt = clamp(params.windKt ?? 18, 6, 32);
  const effWindKt = clamp(baseWindKt + gustEnv * 10.0, 6, 38);
  const windNorm = clampUnit((effWindKt - 6) / 28);

  // Hydraulic backstay tension (%)
  const backstayPct = clamp(params.backstay ?? 45, 10, 100);
  const backstayNorm = (backstayPct - 10) / 90;

  // Winch kinematics (kit/runtime.mjs decrements state.theta as time advances, so d(theta)/dt < 0):
  // In right-handed +Y coords, decreasing rotation.y = clockwise (CW) viewed from above.
  // - Gear 1 (handleDir = +1): handleRad = +theta turns CW; drumRad = +theta/2.6 turns CW.
  // - Gear 2 (handleDir = -1): handleRad = -theta turns CCW; drumRad = +theta/9.2 STILL turns CW!
  const handleDir = isGear2 ? -1 : 1;
  const handleRad = theta * handleDir;
  const drumRad = theta / gearRatio;
  const carrierRad = isGear2 ? drumRad * 1.45 : handleRad * 0.52;
  const planetSelfRad = (handleRad - carrierRad) * 2.2;
  const compoundRad = isGear2 ? -handleRad * (10 / 18) : -handleRad * 0.25;

  // Periodic sheet trim cycle coupled to drum rotation + wind/backstay
  // Smoothly cycles sheet trim between 0.15 (eased) and 0.95 (sheeted hard in)
  const trimWave = 0.52 + 0.43 * Math.sin(theta * 0.45);
  const sheetTrim = clampUnit(trimWave + backstayNorm * 0.08 - gustEnv * 0.10);

  // Boom trim angle (close-hauled ~9 deg = 0.16 rad when sheetTrim=1; eased ~36 deg = 0.63 rad when sheetTrim=0)
  const boomAngleRad = lerp(0.62, 0.15, sheetTrim) + gustEnv * 0.05;

  // Dynamic Sail Camber (f/c ratio: 6.2% flattened up to 17.5% deep draft)
  // Wind pressure deepens draft; sheet tension and hydraulic backstay mast-bend flatten draft!
  const camberRatio = clamp(
    0.115 + windNorm * 0.055 + gustEnv * 0.028 - sheetTrim * 0.042 - backstayNorm * 0.038,
    0.062,
    0.178
  );
  const camberPct = camberRatio * 100;

  // Spanwise leech twist (radians)
  const twistRad = clamp(0.18 + windNorm * 0.16 - sheetTrim * 0.14 + gustEnv * 0.08, 0.08, 0.42);

  // Masthead deflection & pre-bend
  const mastPreBend = 0.035 + backstayNorm * 0.065 + sheetTrim * 0.02;
  const mastAftBendRad = 0.015 + backstayNorm * 0.042;
  const mastLeewardDropRad = 0.012 + windNorm * 0.045 + gustEnv * 0.022;

  // Forces: Sheet Load (kN), Tail Load (N), Windward Cap Shroud V1 Load (kN), Backstay Load (kN)
  const dynamicPressure = (effWindKt / 18) * (effWindKt / 18);
  const sheetLoadKn = clamp(1.4 + dynamicPressure * (3.2 + sheetTrim * 2.8), 0.8, 9.8);
  const capstanFactor = Math.exp(SPEC.CAPSTAN_MU * SPEC.CAPSTAN_TURNS * TAU); // ~843
  const tailLoadN = (sheetLoadKn * 1000) / capstanFactor;
  const handleForceN = Math.round((sheetLoadKn * 1000) / powerRatio);

  const windwardShroudKn = clamp(3.5 + dynamicPressure * 6.8 + backstayNorm * 3.2, 2.5, 18.5);
  const leewardShroudKn = clamp(2.2 - windNorm * 1.6 + backstayNorm * 1.1, 0.3, 4.0);
  const backstayKn = clamp(1.8 + backstayNorm * 10.4 + windNorm * 2.2, 1.5, 14.2);

  const modeLabel =
    gustEnv > 0.25
      ? "GUST LOAD · SHROUD PEAK"
      : isGear2
        ? "2ND GEAR (CCW) · 46:1 GRIND"
        : "1ST GEAR (CW) · 13.5:1 FAST TRIM";

  return {
    theta,
    crankRpm,
    activeGear,
    isGear2,
    gearBlend,
    gearRatio,
    powerRatio,
    effWindKt,
    windNorm,
    backstayPct,
    backstayNorm,
    handleRad,
    drumRad,
    carrierRad,
    planetSelfRad,
    compoundRad,
    sheetTrim,
    boomAngleRad,
    camberRatio,
    camberPct,
    twistRad,
    mastPreBend,
    mastAftBendRad,
    mastLeewardDropRad,
    sheetLoadKn,
    tailLoadN,
    handleForceN,
    windwardShroudKn,
    leewardShroudKn,
    backstayKn,
    shiftEnv,
    gustEnv,
    modeLabel
  };
}

export function formatReadout(state = {}) {
  const st = getRigState(state.theta ?? SPEC.initialTheta, state.params || state, state.triggers || {});
  const dirTag = st.isGear2 ? "CCW" : "CW";
  return {
    readout: `GEAR ${st.activeGear} (${dirTag} ${st.powerRatio.toFixed(1)}:1) · SHEET ${st.sheetLoadKn.toFixed(1)} kN · V1 ${st.windwardShroudKn.toFixed(1)} kN · CAMBER ${st.camberPct.toFixed(1)}% · ${Math.round(st.effWindKt)} kt`,
    phase: `46ST SELF-TAILING · ${st.modeLabel}`
  };
}
