export const SPEC = {
  archetype: "free-space",
  simulationMode: "sandbox",
  toneMode: "multi-channel",

  // Optical & bench dimensions (world units ~ scaled precision optical bench)
  BASE_W: 5.8,
  BASE_D: 3.9,
  BASE_H: 0.24,
  BASE_Y: -1.85,
  topSurfaceY: -1.85 + 0.24 + 0.025, // -1.585

  railHeight: 0.14,
  railCapHeight: 0.06,
  railTopY: -1.85 + 0.24 + 0.025 + 0.14 + 0.06, // -1.385

  opticalAxisY: -0.18,
  opticalAxisZ: -0.12,
  focalLengthMm: 50,
  maxDiameterMm: 58,
  irisX: -0.04,
  sensorPlaneX: 1.45,
  maxHelicoidShiftX: -0.22,

  // Feature flags: Double-Gauss concentric barrel supports exploded & cutaway & section slicing
  features: {
    explode: true,
    cutaway: true,
    shader: true,
    crank: false,
    slow: false,
    section: true
  },

  interactionHint: "Drag focus carriage, iris ring, follow-focus wheel, or aperture lever",

  controls: [
    {
      id: "focusDist",
      label: "FOCUS",
      min: 0.45,
      max: 10.0,
      step: 0.05,
      initial: 1.2,
      title: "Subject focus distance in meters (0.45m close focus to 10m / infinity)"
    },
    {
      id: "fstop",
      label: "F-STOP",
      min: 1.4,
      max: 16.0,
      step: 0.2,
      initial: 2.0,
      title: "Iris diaphragm aperture f-number (f/1.4 wide open to f/16 stopped down)"
    },
    {
      id: "fieldDeg",
      label: "FIELD",
      min: -14,
      max: 14,
      step: 0.5,
      initial: 0,
      title: "Incident off-axis chief ray field angle (deg)"
    }
  ],

  triggers: [
    {
      id: "afLock",
      label: "AF LOCK",
      rise: 0.08,
      fall: 0.80,
      title: "Pulse phase-detect autofocus lock & optical ray caustic sweep"
    },
    {
      id: "dofPreview",
      label: "DOF STOP",
      rise: 0.10,
      fall: 0.90,
      title: "Momentarily stop down diaphragm to preview f/11–f/16 depth of field"
    }
  ],

  section: {
    axis: "z",
    min: -0.78,
    max: 0.92,
    initial: 0.92,
    label: "SECT",
    title: "Slice Double-Gauss barrel, optical cells, and sensor housing along Z axis"
  },

  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 1.06, pan: [0, 0.28] },
    { id: "section", label: "OPTICAL", elev: 5, azim: -4, zoom: 1.18, pan: [-0.04, 0.26] },
    { id: "iris", label: "IRIS BORE", elev: 14, azim: -78, zoom: 1.36, pan: [0, 0.22] },
    { id: "top", label: "TOP PLAN", elev: 88, azim: 0, zoom: 0.96, pan: [0, 0] }
  ],

  // Canonical framing
  initialTheta: 0,
  initialRpm: 0,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 1.06,
  initialPanY: 0.28,
  minVertSpan: 5.5,
  minHorizSpan: 7.5,

  // 5 Audit poses covering wide-open, close-focus, stopped-down, off-axis, and exploded states
  auditPoses: [
    {
      name: "rest (1.2m, f/2.0)",
      theta: 0,
      explode: 0,
      params: { focusDist: 1.2, fstop: 2.0, fieldDeg: 0 }
    },
    {
      name: "wide-open close-focus (0.45m, f/1.4)",
      theta: 0,
      explode: 0,
      params: { focusDist: 0.45, fstop: 1.4, fieldDeg: 10 }
    },
    {
      name: "infinity stopped-down (10m, f/16)",
      theta: 0,
      explode: 0,
      params: { focusDist: 10.0, fstop: 16.0, fieldDeg: -10 }
    },
    {
      name: "mid-focus off-axis (2.5m, f/5.6)",
      theta: 0,
      explode: 0,
      params: { focusDist: 2.5, fstop: 5.6, fieldDeg: 14 }
    },
    {
      name: "exploded (E=1)",
      theta: 0,
      explode: 1,
      params: { focusDist: 1.2, fstop: 2.0, fieldDeg: 0 }
    }
  ],

  // 8-state interactive contact sheet for scripts/drive.mjs
  drivePoses: [
    {
      label: "1. WIDE OPEN · f/1.4 · 1.2m",
      pose: { explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { focusDist: 1.2, fstop: 1.4, fieldDeg: 0 } }
    },
    {
      label: "2. CLOSE FOCUS · 0.45m HELICOID",
      pose: { explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { focusDist: 0.45, fstop: 2.0, fieldDeg: 0 } }
    },
    {
      label: "3. STOPPED DOWN · f/16 IRIS",
      pose: { explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { focusDist: 2.5, fstop: 16.0, fieldDeg: 0 } }
    },
    {
      label: "4. OFF-AXIS FIELD +12°",
      pose: { explode: 0, cutaway: true, shader: true, hud: true, theme: "light", params: { focusDist: 1.8, fstop: 2.8, fieldDeg: 12 } }
    },
    {
      label: "5. EXPLODED · 7E/6G ELEMENTS",
      pose: { explode: 1, cutaway: true, shader: false, hud: true, theme: "light", params: { focusDist: 1.2, fstop: 2.0, fieldDeg: 0 } }
    },
    {
      label: "6. CUTAWAY OFF · FULL BARREL",
      pose: { explode: 0, cutaway: false, shader: true, hud: true, theme: "light", params: { focusDist: 1.2, fstop: 2.0, fieldDeg: 0 } }
    },
    {
      label: "7. DARK THEME · Z-SECTION SLICE",
      pose: { explode: 0, cutaway: true, shader: true, section: -0.05, hud: true, theme: "dark", params: { focusDist: 0.85, fstop: 1.4, fieldDeg: -6 } }
    },
    {
      label: "8. BLUEPRINT THEME",
      pose: { explode: 0, cutaway: true, shader: true, section: 0.92, hud: true, theme: "blueprint", params: { focusDist: 1.2, fstop: 4.0, fieldDeg: 4 } }
    }
  ]
};

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  railTop: [0.20, SPEC.railTopY, SPEC.opticalAxisZ],
  cradleFrontMount: [-0.74, SPEC.railTopY, SPEC.opticalAxisZ],
  cradleRearMount: [0.66, SPEC.railTopY, SPEC.opticalAxisZ],
  sensorTowerMount: [1.56, SPEC.railTopY, SPEC.opticalAxisZ],
  followFocusMount: [-1.28, SPEC.topSurfaceY + 0.08, 0.58],
  apertureCtrlMount: [0.46, SPEC.topSurfaceY + 0.08, 0.66],
  monitorMount: [1.92, SPEC.topSurfaceY + 0.08, 0.94],
  plaqueCenter: [-0.04, SPEC.topSurfaceY + 0.08, 0.44],
  rulerCenter: [0.26, SPEC.railTopY, SPEC.opticalAxisZ + 0.16]
};

/**
 * Computes pure thin-lens Double-Gauss kinematics, helicoid extension,
 * iris pupil radius, depth-of-field bounds, and MTF contrast metric.
 */
export function getLensState(params = {}, triggers = {}) {
  const focusDist = Math.max(0.45, Math.min(10.0, params.focusDist ?? 1.2));
  const fstopBase = Math.max(1.4, Math.min(16.0, params.fstop ?? 2.0));
  const fieldDeg = Math.max(-14, Math.min(14, params.fieldDeg ?? 0));

  const dofEnv = Math.max(0, Math.min(1, triggers.dofPreview ?? 0));
  const afEnv = Math.max(0, Math.min(1, triggers.afLock ?? 0));

  // Momentary DOF stop-down preview stops iris toward f/14
  const effFstop = fstopBase + dofEnv * Math.max(0, 14.0 - fstopBase);

  // Physical thin-lens extension: x_ext = f^2 / (d - f) in mm (0.25mm at inf -> 6.25mm at 0.45m)
  const fMm = SPEC.focalLengthMm;
  const distMm = focusDist * 1000;
  const extensionMm = (fMm * fMm) / Math.max(100, distMm - fMm);
  const extMin = (fMm * fMm) / (10000 - fMm);
  const extMax = (fMm * fMm) / (450 - fMm);
  const focusNorm = Math.max(0, Math.min(1, (extensionMm - extMin) / (extMax - extMin)));

  // Helicoid carriage shifts forward (-X) as focus distance decreases
  const helicoidShiftX = SPEC.maxHelicoidShiftX * focusNorm;
  const focusRingAngle = focusNorm * 2.15; // ~123 deg helicoid barrel throw

  // Entrance/exit pupil physical radius inside the 9-blade iris diaphragm
  const fNorm = Math.log(effFstop / 1.4) / Math.log(16.0 / 1.4); // 0 at f/1.4 -> 1 at f/16
  const pupilOpenR = 0.35;
  const pupilClosedR = 0.072;
  const rPupil = pupilOpenR * Math.pow(pupilClosedR / pupilOpenR, Math.max(0, Math.min(1, fNorm)));
  const pupilNorm = (rPupil - pupilClosedR) / (pupilOpenR - pupilClosedR);

  // Classic 35mm full-frame Depth of Field (circle of confusion c = 0.030 mm)
  const cocMm = 0.03;
  const hyperfocalMm = (fMm * fMm) / (effFstop * cocMm) + fMm;
  const dofNearMm = (distMm * (hyperfocalMm - fMm)) / (hyperfocalMm + distMm - 2 * fMm);
  const denomFar = hyperfocalMm - distMm;
  const dofFarMm = denomFar <= 1 ? Infinity : (distMm * (hyperfocalMm - fMm)) / denomFar;
  const dofNearM = dofNearMm / 1000;
  const dofFarM = Number.isFinite(dofFarMm) ? dofFarMm / 1000 : Infinity;
  const hyperfocalM = hyperfocalMm / 1000;

  // Center MTF50 behavior: spherical aberration softens f/1.4, diffraction softens f/16, peaks f/4–f/5.6
  const logF = Math.log2(effFstop / 4.5);
  const mtfScore = Math.max(42, Math.min(96, 94 - 16 * logF * logF));

  // Chief ray tangent and sensor image height offset (in world units)
  const fieldRad = (fieldDeg * Math.PI) / 180;
  const sensorShiftY = Math.tan(fieldRad) * 0.88;

  // Blade pivot angle (radians) for the 9-blade iris diaphragm
  const bladeSwingRad = (1 - pupilNorm) * 0.68;

  let regime = "BALANCED · DOUBLE-GAUSS";
  if (dofEnv > 0.2) regime = "DOF PREVIEW · STOPPED DOWN";
  else if (afEnv > 0.25) regime = "AF LOCK · CONVERGED";
  else if (effFstop <= 1.85) regime = "WIDE OPEN · f/1.4 BOKEH";
  else if (focusDist <= 0.65) regime = "CLOSE FOCUS · HELICOID EXT";
  else if (effFstop >= 11.0) regime = "STOPPED DOWN · DEEP DOF";
  else if (effFstop >= 3.6 && effFstop <= 6.4) regime = "PEAK MTF · SWEET SPOT";

  return {
    focusDist,
    fstopBase,
    effFstop,
    fieldDeg,
    fieldRad,
    extensionMm,
    focusNorm,
    helicoidShiftX,
    focusRingAngle,
    fNorm,
    rPupil,
    pupilNorm,
    bladeSwingRad,
    dofNearM,
    dofFarM,
    hyperfocalM,
    mtfScore,
    sensorShiftY,
    afEnv,
    dofEnv,
    regime
  };
}

export function formatReadout({ params, triggers }) {
  const st = getLensState(params, triggers);
  const distStr = st.focusDist >= 9.8 ? "∞" : `${st.focusDist.toFixed(2)}m`;
  const dofStr = Number.isFinite(st.dofFarM)
    ? `${st.dofNearM.toFixed(2)}–${st.dofFarM.toFixed(2)}m`
    : `${st.dofNearM.toFixed(2)}m–∞`;
  return {
    readout: `50mm · f/${st.effFstop.toFixed(1)} · d ${distStr} (+${st.extensionMm.toFixed(1)}mm) · DoF ${dofStr} · MTF ${Math.round(st.mtfScore)}%`,
    phase: st.regime
  };
}
