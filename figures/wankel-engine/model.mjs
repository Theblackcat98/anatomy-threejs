export const SPEC = {
  archetype: "bench",
  simulationMode: "continuous",
  toneMode: "single-lit",
  R: 1.33,
  e: 0.19,
  depth: 0.72,
  stationaryTeeth: 34,
  rotorTeeth: 51,
  initialTheta: 0.65,
  initialRpm: 720,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.95,
  initialPanY: 0.22,
  minVertSpan: 5.3,
  minHorizSpan: 6.9,
  section: {
    axis: "z",
    min: -0.65,
    max: 0.95,
    initial: 0.95,
    label: "SECT",
    title: "Slice epitrochoid stator & endplates along shaft Z axis"
  },
  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.95, pan: [0, 0.22] },
    { id: "bore", label: "BORE", elev: 8, azim: -8, zoom: 1.32, pan: [0, 0.08] },
    { id: "top", label: "TOP", elev: 85, azim: 0, zoom: 0.96, pan: [0, 0] },
    { id: "gauge", label: "GAUGE", elev: 22, azim: -22, zoom: 1.48, pan: [1.55, 0.22] }
  ],
  BASE_W: 5.4,
  BASE_D: 3.5,
  BASE_H: 0.24,
  BASE_Y: -2.12,
  topSurfaceY: -2.12 + 0.24 + 0.025 // Account for top bevel of baseplate
};

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  pedestalRear: [0, SPEC.topSurfaceY, -0.98],
  pedestalFront: [0, SPEC.topSurfaceY, 0.98],
  plaqueCenter: [-1.72, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.48],
  rulerCenter: [0.22, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.42],
  knobMount: [SPEC.BASE_W * 0.5 - 0.85, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.58],
  coilMount: [2.02, SPEC.topSurfaceY, -0.52],
  gaugeMount: [-2.32, SPEC.topSurfaceY, 0.62]
};

export function epitrochoidPoint(t, clearance = 0) {
  const R = SPEC.R + clearance;
  const e = SPEC.e;
  return [
    e * Math.cos(3 * t) + R * Math.cos(t),
    e * Math.sin(3 * t) + R * Math.sin(t)
  ];
}

/**
 * Computes signed radial clearance between a 3D point (x, y, z) in stator coordinates
 * and the inner epitrochoid bore wall. Positive = inside bore (clear), Negative = wall collision.
 */
export function epitrochoidBoreClearance(x, y, z) {
  let t = Math.atan2(y, x);
  for (let iter = 0; iter < 3; iter++) {
    const [ex, ey] = epitrochoidPoint(t, 0.018);
    const err = Math.atan2(y, x) - Math.atan2(ey, ex);
    t += Math.atan2(Math.sin(err), Math.cos(err)) * 0.65;
  }
  const [wx, wy] = epitrochoidPoint(t, 0.018);
  const rWall = Math.hypot(wx, wy);
  const rPt = Math.hypot(x, y);
  return rWall - rPt;
}

export function getChamberState(theta, k = 0) {
  const alpha = theta / 3;
  const flankAngle = alpha + (k * 2 * Math.PI) / 3 + Math.PI / 3;
  const cyc = (((-flankAngle + Math.PI * 0.68) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const deg = (cyc * 180) / Math.PI;
  let phase = "INTAKE";
  let pressure = 1.0;

  if (deg < 95) {
    phase = "INTAKE";
    pressure = 0.95 + 0.1 * Math.sin((deg / 95) * Math.PI);
  } else if (deg < 180) {
    phase = "COMPRESSION";
    const t = (deg - 95) / 85;
    pressure = 1.0 + 8.5 * Math.pow(t, 2.1);
  } else if (deg < 270) {
    phase = "IGNITION · POWER";
    const t = (deg - 180) / 90;
    const ignitionPeak = Math.exp(-Math.pow((t - 0.14) / 0.18, 2));
    pressure = 9.5 * (1 - 0.72 * t) + 24.5 * ignitionPeak;
  } else {
    phase = "EXHAUST";
    const t = (deg - 270) / 90;
    pressure = 1.05 + 2.4 * Math.exp(-t * 3.2);
  }
  return { cyc, deg, phase, pressure };
}

export function formatReadout({ theta, effectiveRpm }) {
  const alpha = theta / 3;
  const chA = getChamberState(theta, 0);
  const shaftDeg = Math.round((((-theta * 180) / Math.PI) % 360 + 360) % 360);
  const rotorDeg = Math.round((((-alpha * 180) / Math.PI) % 360 + 360) % 360);
  const dispRpm = Math.round(effectiveRpm);

  return {
    readout: `θ ${String(shaftDeg).padStart(3, "0")}° · α ${String(rotorDeg).padStart(3, "0")}° · ${dispRpm} rpm · P ${chA.pressure.toFixed(1)} bar`,
    phase: `CHAMBER A · ${chA.phase}`
  };
}
