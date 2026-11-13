export const SPEC = {
  // Bench bedplate dimensions (world units ~ 1 m scaled static-fire rig)
  BASE_W: 5.8,
  BASE_D: 4.2,
  BASE_H: 0.24,
  BASE_Y: -2.30,
  topSurfaceY: -2.30 + 0.24 + 0.025, // Account for top bevel of baseplate

  // Engine & Test Stand Geometry
  engineZ: -0.22,
  enginePivotY: 1.62,
  gantryZ: -1.28,
  gantrySpanX: 1.82,
  gantryTopY: 2.16,

  // RS-25 Nozzle & Combustion Chamber Profile (local coords relative to engine gimbal pivot)
  powerheadTopY: -0.14,
  mccTopY: -0.60,
  mccThroatY: -1.04,
  mccExitY: -1.20,
  nozzleExitY: -2.76,
  mccChamberR: 0.295,
  mccThroatR: 0.185,
  mccOuterR: 0.39,
  nozzleExitR: 0.86,

  // Turbopump offsets relative to engine gimbal pivot
  hpftpX: -0.76,
  hpftpY: -0.36,
  hpotpX: 0.76,
  hpotpY: -0.36,

  // TVC Actuator mounts (world coords on stand, local coords on engine)
  pitchStandPos: [0, 1.72, -1.16],
  pitchEngineLugLocal: [0, -0.46, -0.46],
  yawStandPos: [-1.14, 1.72, -0.62],
  yawEngineLugLocal: [-0.36, -0.48, -0.36],

  // RS-25 physical constants
  maxGimbalDeg: 10.5,
  ratedPcMpa: 20.64,       // 100% RPL = 20.64 MPa (~2,994 psi)
  ratedHpftpRpm: 35130,    // High-Pressure Fuel Turbopump rated speed
  ratedHpotpRpm: 28120,    // High-Pressure Oxidizer Turbopump rated speed
  mixtureRatio: 6.03,      // LOX : LH2 mass ratio

  // Feature flags: articulated TVC actuators & cryogenic lines -> cutaway yes, explode no
  features: {
    explode: false,
    cutaway: true,
    shader: true,
    crank: true
  },

  interactionHint: "Drag nozzle, throttle quadrant, or TVC stick",

  // Domain-authentic RS-25 controls
  controls: [
    {
      id: "throttle",
      label: "THR",
      min: 67,
      max: 109,
      step: 1,
      initial: 100,
      title: "Engine Power Level (% RPL: 67% min, 100% rated, 109% max)"
    },
    {
      id: "pitch",
      label: "PITCH",
      min: -10.5,
      max: 10.5,
      step: 0.5,
      initial: 0,
      title: "TVC Pitch gimbal deflection (deg)"
    },
    {
      id: "yaw",
      label: "YAW",
      min: -10.5,
      max: 10.5,
      step: 0.5,
      initial: 0,
      title: "TVC Yaw gimbal deflection (deg)"
    },
    {
      id: "pump",
      label: "PUMP",
      min: 0,
      max: 100,
      step: 5,
      initial: 70,
      title: "Turbopump visual animation speed (0% pauses spin for inspection)"
    }
  ],

  // Canonical camera & framing
  initialTheta: 0.65,
  initialRpm: 720,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.94,
  initialPanY: 0.30,
  minVertSpan: 7.7,
  minHorizSpan: 8.8,

  // Audit poses across throttle and ±10.5° TVC gimbal extremes
  auditPoses: [
    {
      name: "rest (100% RPL, 0°/0°)",
      theta: 0,
      explode: 0,
      params: { throttle: 100, pitch: 0, yaw: 0, pump: 70 }
    },
    {
      name: "min-throttle + pitch-up",
      theta: Math.PI * 0.5,
      explode: 0,
      params: { throttle: 67, pitch: 10.5, yaw: 0, pump: 0 }
    },
    {
      name: "max-power + pitch-down",
      theta: Math.PI,
      explode: 0,
      params: { throttle: 109, pitch: -10.5, yaw: 0, pump: 100 }
    },
    {
      name: "yaw-left + pitch-up",
      theta: Math.PI * 1.5,
      explode: 0,
      params: { throttle: 100, pitch: 10.5, yaw: -10.5, pump: 70 }
    },
    {
      name: "yaw-right + pitch-down",
      theta: 0.65,
      explode: 0,
      params: { throttle: 109, pitch: -10.5, yaw: 10.5, pump: 100 }
    }
  ],

  // Interactive drive contact sheet poses
  drivePoses: [
    {
      label: "1 · RATED 100% RPL",
      pose: { theta: 0.65, cutaway: true, shader: true, params: { throttle: 100, pitch: 0, yaw: 0, pump: 70 } }
    },
    {
      label: "2 · 109% MAX + PITCH +10.5°",
      pose: { theta: 1.9, cutaway: true, shader: true, params: { throttle: 109, pitch: 10.5, yaw: -4.0, pump: 100 } }
    },
    {
      label: "3 · 67% MIN + YAW +10.5°",
      pose: { theta: 3.1, cutaway: true, shader: true, params: { throttle: 67, pitch: -6.0, yaw: 10.5, pump: 40 } }
    },
    {
      label: "4 · FULL SHROUD (NO CUTAWAY)",
      pose: { theta: 4.2, cutaway: false, shader: true, params: { throttle: 100, pitch: 4.5, yaw: 4.5, pump: 70 } }
    },
    {
      label: "5 · PAUSED + SHADER OFF",
      pose: { theta: 2.4, cutaway: true, shader: false, params: { throttle: 104, pitch: -8.0, yaw: -8.0, pump: 0 } }
    },
    {
      label: "6 · DARK THEME",
      pose: { theta: 1.1, cutaway: true, shader: true, theme: "dark", params: { throttle: 109, pitch: 7.5, yaw: -6.5, pump: 90 } }
    },
    {
      label: "7 · BLUEPRINT THEME",
      pose: { theta: 2.2, cutaway: true, shader: true, theme: "blueprint", params: { throttle: 92, pitch: -5.5, yaw: 7.5, pump: 70 } }
    },
    {
      label: "8 · PAPER THEME (TOP VIEW)",
      view: "top",
      pose: { theta: 0.8, cutaway: true, shader: true, theme: "paper", params: { throttle: 100, pitch: 8.5, yaw: 8.5, pump: 70 } }
    }
  ]
};

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  deflectorCenter: [0, SPEC.topSurfaceY, SPEC.engineZ],
  gantryMountL: [-SPEC.gantrySpanX, SPEC.topSurfaceY, SPEC.gantryZ],
  gantryMountR: [SPEC.gantrySpanX, SPEC.topSurfaceY, SPEC.gantryZ],
  lh2Manifold: [-2.25, SPEC.topSurfaceY, -0.38],
  loxManifold: [2.25, SPEC.topSurfaceY, -0.88],
  hpuMount: [-2.25, SPEC.topSurfaceY, 0.44],
  tvcStickMount: [-1.76, SPEC.topSurfaceY, 1.42],
  plaqueCenter: [-0.62, SPEC.topSurfaceY, 1.58],
  rulerCenter: [0.86, SPEC.topSurfaceY, 1.58],
  throttleMount: [2.16, SPEC.topSurfaceY, 0.96],
  gaugeMount: [2.24, SPEC.topSurfaceY, -0.02]
};

/**
 * Evaluates the Rao-style parabolic bell radius along local Y relative to the engine gimbal pivot.
 * Covers MCC chamber -> convergent-divergent throat -> 77.5:1 bell nozzle skirt.
 */
export function nozzleInnerRadiusAtY(localY) {
  const { mccTopY, mccThroatY, nozzleExitY, mccChamberR, mccThroatR, nozzleExitR } = SPEC;
  if (localY >= mccTopY) {
    return mccChamberR;
  }
  if (localY >= mccThroatY) {
    const u = (mccTopY - localY) / (mccTopY - mccThroatY); // 0 at chamber top -> 1 at throat
    const smooth = 0.5 - 0.5 * Math.cos(Math.PI * u);
    return mccChamberR + (mccThroatR - mccChamberR) * smooth;
  }
  const t = Math.max(0, Math.min(1, (mccThroatY - localY) / (mccThroatY - nozzleExitY)));
  // Parabolic Rao bell contour: steep expansion near throat, gentler toward exit lip
  const bellCurve = Math.pow(t, 0.68);
  return mccThroatR + (nozzleExitR - mccThroatR) * bellCurve;
}

/**
 * Computes physical RS-25 operating state from throttle (% RPL), TVC angles, and pump speed.
 */
export function getEngineState(params = {}) {
  const throttle = Math.max(67, Math.min(109, params.throttle ?? 100));
  const pitchDeg = Math.max(-10.5, Math.min(10.5, params.pitch ?? 0));
  const yawDeg = Math.max(-10.5, Math.min(10.5, params.yaw ?? 0));
  const pumpPct = Math.max(0, Math.min(100, params.pump ?? 70));

  const thrFrac = throttle / 100;
  // Chamber pressure scales closely with power level (100% = 20.64 MPa)
  const pcMpa = SPEC.ratedPcMpa * thrFrac;
  const pcBar = pcMpa * 10;
  // Turbopump RPM scales roughly with throttle^0.75
  const rpmScale = Math.pow(thrFrac, 0.78);
  const hpftpRpm = SPEC.ratedHpftpRpm * rpmScale;
  const hpotpRpm = SPEC.ratedHpotpRpm * rpmScale;

  // Sea-level / static-fire thrust scaling (approx 1,860 kN SL at 100%, 2,279 kN vac at 109%)
  const thrustKn = 1860 * thrFrac;
  const valveNorm = (throttle - 67) / (109 - 67);

  let regime = "RATED POWER (100% RPL)";
  if (throttle < 82) regime = "DEEP THROTTLE (MAX-Q)";
  else if (throttle > 103) regime = "FULL POWER (109% FPL)";
  else if (Math.abs(pitchDeg) > 4 || Math.abs(yawDeg) > 4) regime = "TVC GIMBAL VECTORING";

  return {
    throttle,
    thrFrac,
    valveNorm,
    pitchDeg,
    yawDeg,
    pitchRad: (pitchDeg * Math.PI) / 180,
    yawRad: (yawDeg * Math.PI) / 180,
    pumpPct,
    pcMpa,
    pcBar,
    hpftpRpm,
    hpotpRpm,
    thrustKn,
    regime
  };
}

export function formatReadout({ params }) {
  const st = getEngineState(params);
  const pSign = st.pitchDeg >= 0 ? "+" : "";
  const ySign = st.yawDeg >= 0 ? "+" : "";
  return {
    readout: `THR ${Math.round(st.throttle)}% · Pc ${st.pcMpa.toFixed(1)} MPa · TVC ${pSign}${st.pitchDeg.toFixed(1)}°/${ySign}${st.yawDeg.toFixed(1)}° · HPFTP ${Math.round(st.hpftpRpm).toLocaleString("en-US")} rpm`,
    phase: `SSME · ${st.regime}`
  };
}
