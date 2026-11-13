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

  // Feature flags: open articulated linkage — no exploded view
  features: {
    explode: false,
    cutaway: true,
    shader: true,
    crank: true
  },

  interactionHint: "Drag swashplate, cyclic stick, or collective lever",

  // Domain-authentic operator controls
  controls: [
    {
      id: "collective",
      label: "COLL",
      min: 2,
      max: 14,
      step: 0.2,
      initial: 8.5,
      title: "Collective blade pitch angle (deg)"
    },
    {
      id: "cyclicPitch",
      label: "PITCH",
      min: -10,
      max: 10,
      step: 0.2,
      initial: 6.5,
      title: "Fore/aft cyclic swashplate tilt (deg)"
    },
    {
      id: "cyclicRoll",
      label: "ROLL",
      min: -10,
      max: 10,
      step: 0.2,
      initial: -4.5,
      title: "Left/right cyclic swashplate tilt (deg)"
    },
    {
      id: "rpm",
      label: "RPM",
      min: 0,
      max: 1600,
      step: 20,
      initial: 480,
      title: "Drive motor speed (set 0 to pause & inspect blade pitch)"
    }
  ],

  // Audit poses across collective & cyclic extremes (no exploded pose)
  auditPoses: [
    {
      name: "rest (θ=0°)",
      theta: 0,
      explode: 0,
      params: { collective: 8.5, cyclicPitch: 6.5, cyclicRoll: -4.5, rpm: 480 }
    },
    {
      name: "low-coll + fwd-pitch (θ=90°)",
      theta: Math.PI * 0.5,
      explode: 0,
      params: { collective: 2.0, cyclicPitch: 10.0, cyclicRoll: 0, rpm: 0 }
    },
    {
      name: "high-coll + aft-pitch (θ=180°)",
      theta: Math.PI,
      explode: 0,
      params: { collective: 14.0, cyclicPitch: -10.0, cyclicRoll: 0, rpm: 0 }
    },
    {
      name: "roll-left (θ=270°)",
      theta: Math.PI * 1.5,
      explode: 0,
      params: { collective: 8.5, cyclicPitch: 0, cyclicRoll: -10.0, rpm: 480 }
    },
    {
      name: "roll-right + max-coll",
      theta: 0.65,
      explode: 0,
      params: { collective: 14.0, cyclicPitch: 8.0, cyclicRoll: 10.0, rpm: 1600 }
    }
  ],

  // 8-state interactive contact sheet poses for scripts/drive.mjs
  drivePoses: [
    {
      label: "1. REST · COLLECTIVE 8.5°",
      pose: {
        theta: 0.65,
        explode: 0,
        cutaway: true,
        shader: true,
        hud: true,
        theme: "light",
        params: { collective: 8.5, cyclicPitch: 6.5, cyclicRoll: -4.5, rpm: 480 }
      }
    },
    {
      label: "2. PAUSED · LOW COLL 2°",
      pose: {
        theta: 0.65,
        explode: 0,
        cutaway: true,
        shader: false,
        hud: true,
        theme: "light",
        params: { collective: 2.0, cyclicPitch: 0, cyclicRoll: 0, rpm: 0 }
      }
    },
    {
      label: "3. PAUSED · HIGH COLL 14°",
      pose: {
        theta: 0.65,
        explode: 0,
        cutaway: true,
        shader: false,
        hud: true,
        theme: "light",
        params: { collective: 14.0, cyclicPitch: 0, cyclicRoll: 0, rpm: 0 }
      }
    },
    {
      label: "4. CYCLIC FWD (+10° PITCH)",
      pose: {
        theta: 0.65,
        explode: 0,
        cutaway: true,
        shader: false,
        hud: true,
        theme: "light",
        params: { collective: 8.5, cyclicPitch: 10.0, cyclicRoll: 0, rpm: 0 }
      }
    },
    {
      label: "5. CYCLIC ROLL (-10° LEFT)",
      pose: {
        theta: 0.65,
        explode: 0,
        cutaway: true,
        shader: false,
        hud: true,
        theme: "light",
        params: { collective: 8.5, cyclicPitch: 0, cyclicRoll: -10.0, rpm: 0 }
      }
    },
    {
      label: "6. CUTAWAY OFF (C = 0)",
      pose: {
        theta: 0.65,
        explode: 0,
        cutaway: false,
        shader: true,
        hud: true,
        theme: "light",
        params: { collective: 8.5, cyclicPitch: 6.5, cyclicRoll: -4.5, rpm: 480 }
      }
    },
    {
      label: "7. DARK THEME",
      pose: {
        theta: 1.9,
        explode: 0,
        cutaway: true,
        shader: true,
        hud: true,
        theme: "dark",
        params: { collective: 11.5, cyclicPitch: -6.0, cyclicRoll: 6.0, rpm: 960 }
      }
    },
    {
      label: "8. BLUEPRINT THEME",
      pose: {
        theta: 3.1,
        explode: 0,
        cutaway: true,
        shader: true,
        hud: true,
        theme: "blueprint",
        params: { collective: 6.0, cyclicPitch: 7.5, cyclicRoll: -6.0, rpm: 480 }
      }
    }
  ],

  // Kinematic defaults & camera framing
  initialTheta: 0.65,
  initialRpm: 480,
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
  -Math.PI / 2,              // Servo 0: Aft cyclic pitch
  (5 * Math.PI) / 6,         // Servo 1: Forward-left CCPM
  Math.PI / 6                // Servo 2: Forward-right CCPM
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
  plaqueCenter: [-1.40, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.44],
  rulerCenter: [0.15, SPEC.topSurfaceY, SPEC.BASE_D * 0.5 - 0.44],
  cyclicMount: [1.76, SPEC.topSurfaceY, 1.06],
  collectiveMount: [-1.78, SPEC.topSurfaceY, 0.68],
  pitchScaleMount: [1.94, SPEC.topSurfaceY, -0.88],
  motorMount: [1.34, SPEC.topSurfaceY, SPEC.mastZ]
};

function resolveControls(paramsOrRpm) {
  if (typeof paramsOrRpm === "number") {
    return {
      collective: 8.5,
      cyclicPitch: 6.5,
      cyclicRoll: -4.5,
      rpm: paramsOrRpm
    };
  }
  const p = paramsOrRpm || {};
  return {
    collective: p.collective !== undefined ? p.collective : 8.5,
    cyclicPitch: p.cyclicPitch !== undefined ? p.cyclicPitch : 6.5,
    cyclicRoll: p.cyclicRoll !== undefined ? p.cyclicRoll : -4.5,
    rpm: p.rpm !== undefined ? p.rpm : SPEC.initialRpm
  };
}

/**
 * Computes swashplate collective lift, cyclic tilt around X and Z, blade pitch,
 * and aerodynamic coning angle for a given shaft azimuth `theta` and control params.
 */
export function getRotorState(theta, paramsOrRpm = SPEC.initialRpm) {
  const { collective, cyclicPitch, cyclicRoll, rpm } = resolveControls(paramsOrRpm);
  const rpmNorm = Math.max(0, Math.min(1, rpm / 1600));

  const collNorm = Math.max(0, Math.min(1, (collective - 2.0) / 12.0));
  const collLift = (collNorm - 0.5) * 0.24; // -0.12 .. +0.12 world units

  // Positive cyclicPitch tilts +Y normal forward (+Z) -> rotation.x > 0
  // Positive cyclicRoll tilts +Y normal right (+X) -> rotation.z < 0
  const tiltX = (cyclicPitch * Math.PI) / 180;
  const tiltZ = -(cyclicRoll * Math.PI) / 180;
  const cyclicAmpRad = Math.hypot(tiltX, tiltZ);
  const cyclicAzim = Math.atan2(tiltX, -tiltZ);

  const swashCenterY = SPEC.swashY0 + collLift;
  const collPitchDeg = collective;

  // Aerodynamic coning angle increases with collective lift and centrifugal RPM
  const coningDeg = 1.6 + 2.4 * rpmNorm + 4.4 * collNorm;
  const coningRad = (coningDeg * Math.PI) / 180;

  let phase = "LEVEL HOVER";
  if (Math.abs(cyclicPitch) > 3.0 || Math.abs(cyclicRoll) > 3.0) {
    if (Math.abs(cyclicPitch) >= Math.abs(cyclicRoll)) {
      phase = cyclicPitch > 0 ? "FORWARD CYCLIC" : "AFT CYCLIC";
    } else {
      phase = cyclicRoll > 0 ? "RIGHT CYCLIC" : "LEFT CYCLIC";
    }
  } else if (collPitchDeg > 10.5) {
    phase = "HIGH COLLECTIVE";
  } else if (collPitchDeg < 5.0) {
    phase = "FLAT PITCH";
  }

  const rotorRpm = rpm / SPEC.gearRatio;

  return {
    collective,
    cyclicPitch,
    cyclicRoll,
    rpm,
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
 * and upper swashplate horn height offset matching swash.carrier rotation.
 */
export function getBladeKinematics(theta, paramsOrRpm, bladeIndex) {
  const st = getRotorState(theta, paramsOrRpm);
  const ry = theta + (bladeIndex * 2 * Math.PI) / SPEC.numBlades;
  const hornAzim = -ry + SPEC.pitchHornPhase;

  const hx = Math.cos(hornAzim) * SPEC.swashPitchR;
  const hz = Math.sin(hornAzim) * SPEC.swashPitchR;

  // Under THREE.Euler(tiltX, 0, tiltZ, "XZY"): y' = -z*sin(tiltX) + x*sin(tiltZ)
  const tiltOffsetY = -hz * Math.sin(st.tiltX) + hx * Math.sin(st.tiltZ);

  // Mechanical pitch change from swashplate vertical displacement at pitch horn
  const cyclicPitchRad = Math.atan2(tiltOffsetY, SPEC.pitchHornZ * 1.45);
  const collPitchRad = (st.collPitchDeg * Math.PI) / 180;
  const totalPitchRad = collPitchRad + cyclicPitchRad;

  // Blade aerodynamic flap responds ~90 deg after cyclic pitch
  const flapCyclicRad = 0.022 * Math.sin(ry - st.cyclicAzim);
  const flapAngleRad = st.coningRad + flapCyclicRad;

  return {
    psi: ry,
    hornAzim,
    swashHornLocalY: tiltOffsetY,
    totalPitchRad,
    totalPitchDeg: (totalPitchRad * 180) / Math.PI,
    flapAngleRad,
    flapAngleDeg: (flapAngleRad * 180) / Math.PI
  };
}

export function formatReadout({ theta, effectiveRpm, params }) {
  const displayRpm = params?.rpm !== undefined ? params.rpm : effectiveRpm;
  const ctrl = params ? { ...params, rpm: displayRpm } : displayRpm;
  const st = getRotorState(theta, ctrl);
  const b0 = getBladeKinematics(theta, ctrl, 0);
  const azimDeg = Math.round((((-theta * 180) / Math.PI) % 360 + 360) % 360);
  const rotorRpm = Math.round(st.rotorRpm);
  return {
    readout: `ψ ${String(azimDeg).padStart(3, "0")}° · COLL ${st.collPitchDeg.toFixed(1)}° · CYC ${st.cyclicPitch >= 0 ? "+" : ""}${st.cyclicPitch.toFixed(1)}°/${st.cyclicRoll >= 0 ? "+" : ""}${st.cyclicRoll.toFixed(1)}° · B1 ${b0.totalPitchDeg.toFixed(1)}° · ${rotorRpm} rpm`,
    phase: st.phase
  };
}
