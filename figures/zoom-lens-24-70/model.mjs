export const SPEC = {
  archetype: "free-space",
  simulationMode: "sandbox",
  toneMode: "multi-channel",

  // Optical bench bedplate dimensions
  BASE_W: 6.2,
  BASE_D: 4.0,
  BASE_H: 0.24,
  BASE_Y: -1.88,
  topSurfaceY: -1.88 + 0.24 + 0.025, // -1.615

  railBridgeHeight: 0.23,
  railTopY: -1.88 + 0.24 + 0.025 + 0.23, // -1.385
  railRodY: -1.88 + 0.24 + 0.025 + 0.16, // -1.455
  railRodOffsetZ: 0.36,

  opticalAxisY: -0.14,
  opticalAxisZ: -0.12,
  focalMinMm: 24,
  focalMaxMm: 70,
  irisX: 0.66,
  g4X: 0.94,
  sensorPlaneX: 1.66,

  // Feature flags: multi-group sliding cam tracks on guide rods -> cutaway & section yes, explode no
  features: {
    explode: false,
    cutaway: true,
    shader: true,
    crank: false,
    slow: false,
    section: true
  },

  interactionHint: "Drag brass zoom cam barrel, G2 variator, servo rocker, or USM dial",

  controls: [
    {
      id: "focal",
      label: "ZOOM",
      min: 24,
      max: 70,
      step: 1,
      initial: 35,
      title: "Focal length in mm (24mm wide-angle to 70mm telephoto)"
    },
    {
      id: "focusDist",
      label: "FOCUS",
      min: 0.38,
      max: 8.0,
      step: 0.05,
      initial: 1.5,
      title: "Subject focus distance in meters (0.38m close focus to 8m / infinity)"
    },
    {
      id: "fstop",
      label: "F-STOP",
      min: 2.8,
      max: 22.0,
      step: 0.2,
      initial: 2.8,
      title: "Constant-aperture diaphragm setting (f/2.8 to f/22)"
    }
  ],

  triggers: [
    {
      id: "snapWide",
      label: "SNAP 24mm",
      rise: 0.08,
      fall: 0.80,
      title: "Drive servo zoom to 24mm wide-angle & pulse parfocal ray bundle",
      onTrigger: ({ setParam }) => setParam("focal", 24)
    },
    {
      id: "snapTele",
      label: "SNAP 70mm",
      rise: 0.08,
      fall: 0.80,
      title: "Drive servo zoom to 70mm telephoto & pulse parfocal ray bundle",
      onTrigger: ({ setParam }) => setParam("focal", 70)
    }
  ],

  section: {
    axis: "z",
    min: -0.82,
    max: 1.02,
    initial: 1.02,
    label: "SECT",
    title: "Slice zoom cam barrel, guide rods, and 4-group optical carriages along Z"
  },

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 1.02, pan: [0, 0.30] },
    { id: "cams", label: "CAM TRACKS", elev: 22, azim: -18, zoom: 1.24, pan: [-0.10, 0.26] },
    { id: "section", label: "OPTICAL", elev: 5, azim: -4, zoom: 1.12, pan: [-0.04, 0.24] },
    { id: "top", label: "TOP PLAN", elev: 88, azim: 0, zoom: 0.98, pan: [0.10, 0] }
  ],

  // Canonical framing
  initialTheta: 0,
  initialRpm: 0,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 1.02,
  initialPanY: 0.30,
  minVertSpan: 5.7,
  minHorizSpan: 7.9,

  // 5 Audit poses across zoom, focus, and aperture extremes (no explode pose since explode: false)
  auditPoses: [
    {
      name: "rest (35mm, f/2.8, 1.5m)",
      theta: 0,
      explode: 0,
      params: { focal: 35, focusDist: 1.5, fstop: 2.8 }
    },
    {
      name: "wide 24mm close-focus",
      theta: 0,
      explode: 0,
      params: { focal: 24, focusDist: 0.38, fstop: 2.8 }
    },
    {
      name: "mid 45mm compensator inflection",
      theta: 0,
      explode: 0,
      params: { focal: 45, focusDist: 1.5, fstop: 5.6 }
    },
    {
      name: "tele 70mm stopped-down",
      theta: 0,
      explode: 0,
      params: { focal: 70, focusDist: 8.0, fstop: 22.0 }
    },
    {
      name: "wide 24mm stopped-down f/16",
      theta: 0,
      explode: 0,
      params: { focal: 24, focusDist: 8.0, fstop: 16.0 }
    }
  ],

  // 8-state interactive drive sheet poses
  drivePoses: [
    {
      label: "1. 24mm WIDE · f/2.8 (84° FOV)",
      pose: { cutaway: true, shader: true, hud: true, theme: "light", params: { focal: 24, focusDist: 1.5, fstop: 2.8 } }
    },
    {
      label: "2. 45mm MID · PEAK",
      pose: { cutaway: true, shader: true, hud: true, theme: "light", params: { focal: 45, focusDist: 1.5, fstop: 2.8 } }
    },
    {
      label: "3. 70mm TELE · f/2.8 (34° FOV)",
      pose: { cutaway: true, shader: true, hud: true, theme: "light", params: { focal: 70, focusDist: 1.5, fstop: 2.8 } }
    },
    {
      label: "4. CLOSE FOCUS 0.38m · G1 EXT",
      pose: { cutaway: true, shader: true, hud: true, theme: "light", params: { focal: 35, focusDist: 0.38, fstop: 4.0 } }
    },
    {
      label: "5. STOPPED DOWN · f/22 IRIS",
      pose: { cutaway: true, shader: true, hud: true, theme: "light", params: { focal: 50, focusDist: 2.0, fstop: 22.0 } }
    },
    {
      label: "6. CUTAWAY OFF · FULL BARREL",
      pose: { cutaway: false, shader: true, hud: true, theme: "light", params: { focal: 35, focusDist: 1.5, fstop: 2.8 } }
    },
    {
      label: "7. DARK THEME · Z-SECTION SLICE",
      pose: { cutaway: true, shader: true, section: -0.06, hud: true, theme: "dark", params: { focal: 55, focusDist: 1.2, fstop: 2.8 } }
    },
    {
      label: "8. BLUEPRINT THEME",
      pose: { cutaway: true, shader: true, section: 1.02, hud: true, theme: "blueprint", params: { focal: 28, focusDist: 1.5, fstop: 5.6 } }
    }
  ]
};

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  railBridgeFront: [-1.52, SPEC.railTopY, SPEC.opticalAxisZ],
  railBridgeRear: [1.74, SPEC.railTopY, SPEC.opticalAxisZ],
  cradleFrontMount: [-0.94, SPEC.railTopY, SPEC.opticalAxisZ],
  cradleRearMount: [1.06, SPEC.railTopY, SPEC.opticalAxisZ],
  sensorTowerMount: [1.74, SPEC.railTopY, SPEC.opticalAxisZ],
  zoomRockerMount: [-1.52, SPEC.topSurfaceY + 0.08, 0.68],
  usmCtrlMount: [0.48, SPEC.topSurfaceY + 0.08, 0.72],
  camScreenMount: [2.26, SPEC.topSurfaceY + 0.08, 0.84],
  plaqueCenter: [-0.58, SPEC.topSurfaceY + 0.08, 0.72]
};

/**
 * Evaluates pure 4-group parfocal zoom cam laws (G1 Collector, G2 Variator,
 * G3 Compensator, G4 Relay + Iris) and optical field metrics.
 */
export function getZoomState(params = {}, triggers = {}) {
  const focal = Math.max(SPEC.focalMinMm, Math.min(SPEC.focalMaxMm, params.focal ?? 35));
  const focusDist = Math.max(0.38, Math.min(8.0, params.focusDist ?? 1.5));
  const fstop = Math.max(2.8, Math.min(22.0, params.fstop ?? 2.8));

  const zoomNorm = (focal - SPEC.focalMinMm) / (SPEC.focalMaxMm - SPEC.focalMinMm);
  const focusNorm = 1 - (focusDist - 0.38) / (8.0 - 0.38);

  // Group 1 (Front Collector / Focus Group): advances toward -X for close focus
  const xG1 = -1.26 - 0.16 * focusNorm;

  // Group 2 (Variator, negative optical power): monotonic cam curve toward +X as focal increases
  const xG2 = -0.72 + 0.60 * (0.85 * zoomNorm + 0.15 * zoomNorm * zoomNorm);

  // Group 3 (Compensator, positive optical power): U-shaped reciprocating locus keeping BFL = const
  const xG3 = 0.34 - 0.22 * Math.sin(Math.PI * zoomNorm) + 0.08 * zoomNorm;

  // Group 4 (Rear Master Relay): stationary
  const xG4 = SPEC.g4X;

  // Cam barrel angular rotation (rad)
  const camRotRad = zoomNorm * 1.18;
  const focusRingRad = focusNorm * 1.65;

  // Constant-aperture f/2.8 pupil radius (scales gently with entrance pupil magnification, bounded by physical iris)
  const fNorm = Math.log(fstop / 2.8) / Math.log(22.0 / 2.8);
  const pupilOpenR = 0.33;
  const pupilClosedR = 0.068;
  const rPupil = pupilOpenR * Math.pow(pupilClosedR / pupilOpenR, Math.max(0, Math.min(1, fNorm)));
  const pupilNorm = (rPupil - pupilClosedR) / (pupilOpenR - pupilClosedR);
  const bladeSwingRad = (1 - pupilNorm) * 0.68;

  // Full-frame 43.27mm diagonal field of view
  const fovDiagDeg = (2 * Math.atan(21.63 / focal) * 180) / Math.PI;
  const magRatio = focal / SPEC.focalMinMm;

  const pulseEnv = Math.max(triggers.snapWide ?? 0, triggers.snapTele ?? 0);

  let regime = "MID ZOOM · PARFOCAL TRACKING";
  if (pulseEnv > 0.2) regime = "SERVO ZOOM · CAM SLEWING";
  else if (focal <= 27) regime = "24mm WIDE · 84° FIELD";
  else if (focal >= 65) regime = "70mm TELE · 34° FIELD";
  else if (focal >= 38 && focal <= 52) regime = "COMPENSATOR · ΔBFL 0";

  return {
    focal,
    focusDist,
    fstop,
    zoomNorm,
    focusNorm,
    xG1,
    xG2,
    xG3,
    xG4,
    camRotRad,
    focusRingRad,
    rPupil,
    pupilNorm,
    bladeSwingRad,
    fovDiagDeg,
    magRatio,
    pulseEnv,
    bflErrorMm: 0.0,
    regime
  };
}

export function formatReadout({ params, triggers }) {
  const st = getZoomState(params, triggers);
  const distStr = st.focusDist >= 7.8 ? "∞" : `${st.focusDist.toFixed(2)}m`;
  return {
    readout: `${Math.round(st.focal)}mm f/${st.fstop.toFixed(1)} · FOV ${st.fovDiagDeg.toFixed(1)}° · d ${distStr} · G2/G3 Δ ${(st.xG3 - st.xG2).toFixed(2)} · ΔBFL 0.00mm`,
    phase: st.regime
  };
}
