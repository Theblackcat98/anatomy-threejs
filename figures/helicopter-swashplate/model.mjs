export const SPEC = {
  // Rotor & Swashplate dimensions (world units ~ 1m scaled bench instrument)
  numBlades: 3,
  rotorR: 2.45,
  flapHingeR: 0.28,
  featherR: 0.44,
  pitchHornR: 0.52,
  pitchHornZ: 0.21,          // Tangential leading offset of feathering pitch horn
  swashServoR: 0.86,
  swashPitchR: 0.56,         // Matches hypot(0.52, 0.21) = 0.561 for vertical pitch links
  pitchHornPhase: Math.atan2(0.21, 0.52),
  servoMountR: 0.92,
  mastZ: -0.15,
  gearboxTopY: -0.745,
  swashY0: -0.10,
  hubY: 0.96,
  gearRatio: 4,              // 4:1 bevel drive reduction (motor input RPM -> rotor RPM)

  // Kinematic defaults & camera framing
  initialTheta: 0.65,
  initialRpm: 720,
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.86,
  initialPanY: 0.50,
  minVertSpan: 5.6,
  minHorizSpan: 7.2,

  // Heavy datum bedplate
  BASE_W: 5.4,
  BASE_D: 3.8,
  BASE_H: 0.24,
  BASE_Y: -2.06,
  topSurfaceY: -2.06 + 0.24 + 0.025 // Account for 0.025 top bevel of baseplate
};

export const SERVO_ANGLES = [
  -Math.PI / 2,              // Servo 0: Aft center
  (5 * Math.PI) / 6,         // Servo 1: Forward-left
  Math.PI / 6                // Servo 2: Forward-right
];

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  mastCenter: [0, SPEC.topSurfaceY, SPEC.mastZ],
  servo0Mount: [
    Math.cos(SERVO_ANGLES[0]) * SPEC.servoMountR,
    SPEC.topSurfaceY,
    SPEC.mastZ + Math.sin(SERVO_ANGLES[0]) * SPEC.servoMountR
  ],
  servo1Mount: [
    Math.cos(SERVO_ANGLES[1]) * SPEC.servoMountR,
    SPEC.topSurfaceY,
    SPEC.mastZ + Math.sin(SERVO_ANGLES[1]) * SPEC.servoMountR
  ],
  servo2Mount: [
    Math.cos(SERVO_ANGLES[2]) * SPEC.servoMountR,
    SPEC.topSurfaceY,
    SPEC.mastZ + Math.sin(SERVO_ANGLES[2]) * SPEC.servoMountR
  ],
  plaqueCenter: [-1.34, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.50],
  rulerCenter: [0.36, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.44],
  knobMount: [SPEC.BASE_W * 0.5 - 0.72, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.62],
  manifoldMount: [1.98, SPEC.topSurfaceY, -0.78],
  motorMount: [1.34, SPEC.topSurfaceY, SPEC.mastZ],
  gaugeMount: [-2.14, SPEC.topSurfaceY, 0.74]
};

/**
 * Computes deterministic swashplate cyclic tilt, collective lift, blade pitch,
 * and aerodynamic coning angle for a given shaft azimuth `theta` and input `rpm`.
 */
export function getRotorState(theta, rpm = SPEC.initialRpm) {
  const rpmNorm = Math.max(0, Math.min(1, rpm / 2400));

  // Collective pitch test sweep over 4*PI so 0..6*PI covers full min-to-max travel
  const collNorm = 0.5 - 0.42 * Math.cos(theta * 0.5); // 0.08 .. 0.92
  const collLift = (collNorm - 0.5) * 0.24;            // -0.10 .. +0.10 world units

  // Cyclic tilt stays visibly angled (~9.5 deg) and slowly precesses in azimuth
  const cyclicAzim = 0.55 + 0.35 * Math.sin(theta * 0.25);
  const cyclicAmpRad = 0.165; // ~9.5 degrees swashplate tilt
  const tiltX = Math.sin(cyclicAzim) * cyclicAmpRad;   // Pitch tilt around X
  const tiltZ = -Math.cos(cyclicAzim) * cyclicAmpRad;  // Roll tilt around Z

  const swashCenterY = SPEC.swashY0 + collLift;

  // Collective pitch (deg): 3.0° flat pitch -> 13.5° high collective
  const collPitchDeg = 3.0 + collNorm * 10.5;

  // Centrifugal + aerodynamic lift coning angle (deg): 2.2° .. 9.4°
  const coningDeg = 2.2 + 3.0 * rpmNorm + 4.2 * collNorm;
  const coningRad = (coningDeg * Math.PI) / 180;

  // Phase label describing the active articulation regime
  let phase = "LOW COLLECTIVE";
  if (collNorm > 0.72) phase = "HIGH COLLECTIVE";
  else if (Math.sin(theta * 0.5) > 0.25) phase = "COLLECTIVE CLIMB";
  else if (Math.sin(theta * 0.5) < -0.25) phase = "COLLECTIVE FLARE";

  const rotorRpm = rpm / SPEC.gearRatio;

  return {
    rpmNorm,
    rotorRpm,
    collNorm,
    collLift,
    swashCenterY,
    tiltX,
    tiltZ,
    cyclicAzim,
    cyclicAmpRad,
    collPitchDeg,
    coningDeg,
    coningRad,
    phase
  };
}

/**
 * Computes individual blade k (0, 1, 2) pitch angle (rad), flapping angle (rad),
 * and upper swashplate horn height offset at shaft rotation `theta`.
 */
export function getBladeKinematics(theta, rpm, bladeIndex) {
  const st = getRotorState(theta, rpm);
  const psi = theta + (bladeIndex * 2 * Math.PI) / SPEC.numBlades;
  const hornAzim = psi + SPEC.pitchHornPhase;

  // Approximate swashplate horn vertical offset from tiltX (around X) and tiltZ (around Z)
  const hx = Math.cos(hornAzim) * SPEC.swashPitchR;
  const hz = Math.sin(hornAzim) * SPEC.swashPitchR;
  const tiltOffsetY = hz * st.tiltX - hx * st.tiltZ;

  // Mechanical pitch change from swashplate vertical motion around feathering horn
  const cyclicPitchRad = Math.atan2(tiltOffsetY, SPEC.pitchHornZ * 2.1);
  const collPitchRad = (st.collPitchDeg * Math.PI) / 180;
  const totalPitchRad = collPitchRad + cyclicPitchRad;

  // Blade aerodynamic flap responds ~90 deg after cyclic pitch (gyroscopic precession)
  const flapCyclicRad = 0.022 * Math.sin(psi - st.cyclicAzim);
  const flapAngleRad = st.coningRad + flapCyclicRad;

  return {
    psi,
    hornAzim,
    swashHornLocalY: tiltOffsetY,
    totalPitchRad,
    totalPitchDeg: (totalPitchRad * 180) / Math.PI,
    flapAngleRad,
    flapAngleDeg: (flapAngleRad * 180) / Math.PI
  };
}

export function formatReadout({ theta, effectiveRpm }) {
  const st = getRotorState(theta, effectiveRpm);
  const azimDeg = Math.round((((-theta * 180) / Math.PI) % 360 + 360) % 360);
  const rotorRpm = Math.round(st.rotorRpm);
  return {
    readout: `ψ ${String(azimDeg).padStart(3, "0")}° · COLL ${st.collPitchDeg.toFixed(1)}° · CONE ${st.coningDeg.toFixed(1)}° · ${rotorRpm} rpm`,
    phase: st.phase
  };
}
