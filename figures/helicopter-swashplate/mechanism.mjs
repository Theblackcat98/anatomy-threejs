import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, SERVO_ANGLES, getRotorState, getBladeKinematics } from "./model.mjs";

const UP_VEC = new THREE.Vector3(0, 1, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();
const TMP_QUAT = new THREE.Quaternion();

function buildAnnularGeometry(rInner, rOuter, height, segs = 40) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    curveSegments: segs
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -height * 0.5, 0);
  return geo;
}

function buildArcBandGeometry(rInner, rOuter, depth, aStart, aEnd, segs = 32) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = aStart + (i / segs) * (aEnd - aStart);
    const x = Math.cos(a) * rOuter;
    const y = Math.sin(a) * rOuter;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = aStart + (i / segs) * (aEnd - aStart);
    const x = Math.cos(a) * rInner;
    const y = Math.sin(a) * rInner;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    curveSegments: segs
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

function buildProtractorBackingGeometry(radius, depth, segs = 32) {
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI - (i / segs) * Math.PI;
    shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    curveSegments: segs
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

export function buildMechanism(reg, kit) {
  const {
    topSurfaceY,
    mastZ,
    swashY0,
    hubY,
    numBlades,
    swashServoR,
    swashPitchR,
    pitchHornPhase
  } = SPEC;

  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const housingBaseY = topSurfaceY + 0.09 + 0.024;
  const inputY = housingBaseY + 0.34;

  // ---------------------------------------------------------------------------
  // 1. Main Rotor Mast, 4:1 Bevel Drive Gears, Input Shaft & Guide Sleeve
  // ---------------------------------------------------------------------------
  const mastAssembly = reg.group("mast.assembly", {
    pos: [0, 0, mastZ],
    stage: "mechanism"
  });

  const mastSpinGroup = reg.group("mast.spin", {
    parent: mastAssembly,
    stage: "mechanism"
  });

  const mastBottomY = topSurfaceY + 0.14;
  const mastTopY = hubY + 0.10;
  const mastLen = mastTopY - mastBottomY;
  const mastMidY = (mastBottomY + mastTopY) * 0.5;

  const mastGeo = buildCylinderGeometry(0.125, 0.125, mastLen, { segments: 28, axis: "y" });
  reg.part("mast.shaft", mastGeo, {
    parent: mastSpinGroup,
    pos: [0, mastMidY, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "coaxial",
    allowOverlap: [
      "gearbox.flange",
      "gearbox.topDeck",
      "gearbox.mastBearing",
      "hub.yoke",
      "hub.cap",
      "swash.uniball",
      "swash.lower",
      "swash.upper"
    ]
  });

  const thrustGeo = buildCylinderGeometry(0.18, 0.19, 0.08, { segments: 24, axis: "y" });
  reg.part("mast.thrustCollar", thrustGeo, {
    parent: mastSpinGroup,
    pos: [0, topSurfaceY + 0.15, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "gearbox.flange",
    allowOverlap: ["mast.shaft"]
  });

  const crownGearGeo = buildExternalGearGeometry(0.30, 28, 0.036, 0.075, 0.42);
  crownGearGeo.rotateX(-Math.PI / 2);
  reg.part("mast.bevelGear", crownGearGeo, {
    parent: mastSpinGroup,
    pos: [0, inputY + 0.09, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    creaseAngle: 35,
    mountOn: "mast.shaft",
    allowOverlap: ["gearbox.pinion"]
  });

  const driveCollarGeo = buildCylinderGeometry(0.18, 0.18, 0.10, { segments: 24, axis: "y" });
  reg.part("mast.driveCollar", driveCollarGeo, {
    parent: mastSpinGroup,
    pos: [0, hubY - 0.28, 0],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "mast.shaft"
  });
  const mastDriveLugGeo = new THREE.BoxGeometry(0.12, 0.07, 0.09);
  const mastDriveLug = reg.part("mast.driveLug", mastDriveLugGeo, {
    parent: mastSpinGroup,
    pos: [Math.cos(Math.PI / 3) * 0.20, hubY - 0.28, Math.sin(Math.PI / 3) * 0.20],
    rot: [0, -Math.PI / 3, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "mast.driveCollar"
  });
  reg.anchor("mast.drivePin", 0.05, 0, 0, mastDriveLug);

  const sleeveGeo = buildCylinderGeometry(0.165, 0.165, 0.48, { segments: 24, axis: "y" });
  reg.part("mast.guideSleeve", sleeveGeo, {
    parent: mastSpinGroup,
    pos: [0, swashY0, 0],
    ramp: "copper",
    outline: "mid",
    crease: "faint",
    mountOn: "mast.shaft",
    allowOverlap: ["swash.uniball", "swash.lower", "swash.upper"]
  });

  // Horizontal Input Shaft & Bevel Pinion connecting Motor -> Gearbox
  const [motorX] = ANCHORS.motorMount;
  const inputShaftLen = motorX - 0.30;
  const inputShaftGeo = buildCylinderGeometry(0.065, 0.065, inputShaftLen, { segments: 20, axis: "x" });
  const inputSpinGroup = reg.group("input.spin", {
    parent: mastAssembly,
    pos: [0, inputY, 0],
    stage: "mechanism"
  });
  reg.part("gearbox.inputShaft", inputShaftGeo, {
    parent: inputSpinGroup,
    pos: [0.30 + inputShaftLen * 0.5, 0, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "gearbox.inputBoss",
    allowOverlap: ["motor.housing", "gearbox.housing", "gearbox.pinion", "mast.coupling"]
  });

  const pinionGeo = buildExternalGearGeometry(0.095, 10, 0.028, 0.070, 0.45);
  pinionGeo.rotateY(Math.PI / 2);
  reg.part("gearbox.pinion", pinionGeo, {
    parent: inputSpinGroup,
    pos: [0.30, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "gearbox.inputShaft",
    allowOverlap: ["mast.bevelGear", "gearbox.inputBoss"]
  });

  const couplingGeo = buildCylinderGeometry(0.105, 0.105, 0.16, { segments: 20, axis: "x" });
  reg.part("mast.coupling", couplingGeo, {
    parent: inputSpinGroup,
    pos: [0.88, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "gearbox.inputShaft"
  });

  // ---------------------------------------------------------------------------
  // 2. Two-Part Articulated Swashplate (Uniball + Stationary Lower + Rotating Upper)
  // ---------------------------------------------------------------------------
  const swashAssembly = reg.group("swash.assembly", {
    pos: [0, swashY0, mastZ],
    stage: "mechanism"
  });

  const swashCarrier = reg.group("swash.carrier", {
    parent: swashAssembly,
    stage: "mechanism"
  });

  const uniballGeo = new THREE.SphereGeometry(0.185, 24, 18);
  reg.part("swash.uniball", uniballGeo, {
    parent: swashCarrier,
    pos: [0, -0.04, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: "mast.guideSleeve",
    allowOverlap: ["mast.shaft", "mast.guideSleeve", "swash.lower"]
  });

  const lowerSwashGeo = buildAnnularGeometry(0.185, 0.66, 0.064, 40);
  reg.part("swash.lower", lowerSwashGeo, {
    parent: swashCarrier,
    pos: [0, -0.042, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "swash.uniball",
    allowOverlap: ["mast.shaft", "mast.guideSleeve"]
  });

  SERVO_ANGLES.forEach((ang, idx) => {
    const lugGeo = new THREE.BoxGeometry(0.26, 0.046, 0.095);
    const lugPart = reg.part(`swash.servoLug.${idx}`, lugGeo, {
      parent: swashCarrier,
      pos: [Math.cos(ang) * 0.74, -0.045, Math.sin(ang) * 0.74],
      rot: [0, -ang, 0],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "swash.lower",
      allowOverlap: [`servo.rod.${idx}`, `servo.ball.${idx}`]
    });
    reg.anchor(`swash.servoPin.${idx}`, swashServoR - 0.74, 0, 0, lugPart);
  });

  const antiRotLugGeo = new THREE.BoxGeometry(0.18, 0.046, 0.095);
  const antiRotLug = reg.part("swash.antiRotLug", antiRotLugGeo, {
    parent: swashCarrier,
    pos: [-0.48, -0.045, -0.48],
    rot: [0, -Math.PI * 0.75, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "swash.lower"
  });
  reg.anchor("swash.antiRotPin", 0.07, 0, 0, antiRotLug);

  const raceGeo = buildAnnularGeometry(0.35, 0.56, 0.036, 40);
  reg.part("swash.bearingRace", raceGeo, {
    parent: swashCarrier,
    pos: [0, 0.028, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "swash.lower"
  });

  const upperSpinGroup = reg.group("swash.upperSpin", {
    parent: swashCarrier,
    stage: "mechanism"
  });

  const upperSwashGeo = buildAnnularGeometry(0.265, 0.58, 0.060, 40);
  reg.part("swash.upper", upperSwashGeo, {
    parent: upperSpinGroup,
    pos: [0, 0.098, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "swash.bearingRace",
    allowOverlap: ["mast.shaft", "mast.guideSleeve", "swash.lower"]
  });

  for (let k = 0; k < numBlades; k++) {
    const worldA = -((k * 2 * Math.PI) / numBlades) + pitchHornPhase;
    const lugGeo = new THREE.BoxGeometry(0.15, 0.042, 0.085);
    const pLug = reg.part(`swash.pitchLug.${k}`, lugGeo, {
      parent: upperSpinGroup,
      pos: [Math.cos(worldA) * 0.56, 0.106, Math.sin(worldA) * 0.56],
      rot: [0, -worldA, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "swash.upper",
      allowOverlap: [`pitchLink.botBall.${k}`, `pitchLink.rod.${k}`]
    });
    reg.anchor(`swash.pitchPin.${k}`, swashPitchR - 0.56, 0.022, 0, pLug);
  }

  const driveLugGeo = new THREE.BoxGeometry(0.14, 0.042, 0.085);
  const driveLug = reg.part("swash.driveLug", driveLugGeo, {
    parent: upperSpinGroup,
    pos: [Math.cos(Math.PI / 3) * 0.52, 0.106, Math.sin(Math.PI / 3) * 0.52],
    rot: [0, -Math.PI / 3, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "swash.upper"
  });
  reg.anchor("swash.drivePin", 0.05, 0.02, 0, driveLug);

  // ---------------------------------------------------------------------------
  // 3. Articulated Linkages: 3 Servo Pushrods, 3 Pitch Links, & Scissors Links
  // ---------------------------------------------------------------------------
  const servoRodLen = 1.15;
  SERVO_ANGLES.forEach((_, idx) => {
    const rodGroup = reg.group(`servo.rodGroup.${idx}`, {
      parent: baseGroup,
      stage: "mechanism"
    });
    const rodGeo = buildCylinderGeometry(0.028, 0.028, servoRodLen, { segments: 14, axis: "y" });
    rodGeo.translate(0, -servoRodLen * 0.5, 0);
    reg.part(`servo.rod.${idx}`, rodGeo, {
      parent: rodGroup,
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: `swash.servoLug.${idx}`,
      allowOverlap: [`swash.lower`, `swash.servoLug.${idx}`, `servo.gland.${idx}`, `servo.body.${idx}`, `servo.ball.${idx}`]
    });
    const ballGeo = new THREE.SphereGeometry(0.044, 14, 10);
    reg.part(`servo.ball.${idx}`, ballGeo, {
      parent: rodGroup,
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      detail: true,
      mountOn: `swash.servoLug.${idx}`
    });
  });

  const nominalPitchLen = 1.0;
  for (let k = 0; k < numBlades; k++) {
    const linkGroup = reg.group(`pitchLink.group.${k}`, {
      parent: baseGroup,
      stage: "mechanism"
    });
    const botBallGeo = new THREE.SphereGeometry(0.040, 14, 10);
    reg.part(`pitchLink.botBall.${k}`, botBallGeo, {
      parent: linkGroup,
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      detail: true,
      mountOn: `swash.pitchLug.${k}`
    });
    const rodGeo = buildCylinderGeometry(0.026, 0.026, nominalPitchLen, { segments: 14, axis: "y" });
    rodGeo.translate(0, nominalPitchLen * 0.5, 0);
    reg.part(`pitchLink.rod.${k}`, rodGeo, {
      parent: linkGroup,
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: `swash.pitchLug.${k}`,
      allowOverlap: [
        `swash.pitchLug.${k}`,
        `swash.upper`,
        `blade.pitchHorn.${k}`,
        `blade.grip.${k}`,
        `pitchLink.botBall.${k}`,
        `pitchLink.topBall.${k}`
      ]
    });
    const topBallGeo = new THREE.SphereGeometry(0.040, 14, 10);
    reg.part(`pitchLink.topBall.${k}`, topBallGeo, {
      parent: linkGroup,
      pos: [0, nominalPitchLen, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      detail: true,
      mountOn: `blade.pitchHorn.${k}`
    });
  }

  const driveScissorGroup = reg.group("scissors.drive", {
    parent: baseGroup,
    stage: "mechanism"
  });
  const driveArmGeo = buildCylinderGeometry(0.025, 0.025, 1.0, { segments: 12, axis: "y" });
  driveArmGeo.translate(0, 0.5, 0);
  reg.part("scissors.driveArm", driveArmGeo, {
    parent: driveScissorGroup,
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    noCrease: true,
    mountOn: "swash.driveLug",
    allowOverlap: ["swash.driveLug", "swash.upper", "mast.driveLug", "mast.driveCollar"]
  });

  // 2-Bar Stationary Anti-Rotation Scissors (arm length 0.50 covers max collective + cyclic span)
  const scissorArmLen = 0.50;
  const fixedLowerGroup = reg.group("scissors.fixedLower", {
    parent: baseGroup,
    stage: "mechanism"
  });
  const fixedLowerGeo = new THREE.BoxGeometry(0.048, scissorArmLen, 0.048);
  fixedLowerGeo.translate(0, scissorArmLen * 0.5, 0);
  reg.part("scissors.fixedLowerArm", fixedLowerGeo, {
    parent: fixedLowerGroup,
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "scissor.baseBracket",
    allowOverlap: ["scissor.baseBracket", "scissors.fixedUpperArm", "scissors.kneePin"]
  });

  const fixedUpperGroup = reg.group("scissors.fixedUpper", {
    parent: baseGroup,
    stage: "mechanism"
  });
  const fixedUpperGeo = new THREE.BoxGeometry(0.044, scissorArmLen, 0.044);
  fixedUpperGeo.translate(0, scissorArmLen * 0.5, 0);
  reg.part("scissors.fixedUpperArm", fixedUpperGeo, {
    parent: fixedUpperGroup,
    ramp: "mid",
    outline: "lo",
    crease: "lo",
    mountOn: "swash.antiRotLug",
    allowOverlap: ["swash.antiRotLug", "swash.lower", "scissors.fixedLowerArm", "scissors.kneePin"]
  });

  const kneePinGeo = buildCylinderGeometry(0.036, 0.036, 0.09, { segments: 14, axis: "z" });
  reg.part("scissors.kneePin", kneePinGeo, {
    parent: baseGroup,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true,
    mountOn: "scissors.fixedLowerArm"
  });

  // ---------------------------------------------------------------------------
  // 4. 2-Axis Gimbal Cyclic Control Stick (Front-Right Apron)
  // ---------------------------------------------------------------------------
  const [cycX, , cycZ] = ANCHORS.cyclicMount;
  const cyclicBaseGroup = reg.group("cyclic.baseGroup", {
    parent: baseGroup,
    pos: [cycX, 0, cycZ],
    stage: "mechanism"
  });

  const cycBaseGeo = buildCylinderGeometry(0.25, 0.28, 0.09, { segments: 24, axis: "y" });
  reg.part("cyclic.mountBase", cycBaseGeo, {
    parent: cyclicBaseGroup,
    pos: [0, topSurfaceY + 0.045, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  [
    [-0.17, -0.17],
    [ 0.17, -0.17],
    [-0.17,  0.17],
    [ 0.17,  0.17]
  ].forEach(([bx, bz], idx) => {
    reg.detail(
      `cyclic.bolt.${idx}`,
      makeScrewDetail(bx, topSurfaceY + 0.093, bz, 0.025, "y", kit),
      { parent: cyclicBaseGroup }
    );
  });

  const gimbalGeo = buildCylinderGeometry(0.15, 0.17, 0.08, { segments: 20, axis: "y" });
  reg.part("cyclic.gimbalRing", gimbalGeo, {
    parent: cyclicBaseGroup,
    pos: [0, topSurfaceY + 0.125, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "cyclic.mountBase"
  });

  const bootGeo = new THREE.SphereGeometry(0.098, 18, 12);
  reg.part("cyclic.boot", bootGeo, {
    parent: cyclicBaseGroup,
    pos: [0, topSurfaceY + 0.175, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: "cyclic.gimbalRing",
    allowOverlap: ["cyclic.stick"]
  });

  const cyclicGroup = reg.group("cyclic.group", {
    parent: cyclicBaseGroup,
    pos: [0, topSurfaceY + 0.175, 0],
    stage: "mechanism"
  });

  const stickGeo = buildCylinderGeometry(0.035, 0.042, 0.60, { segments: 16, axis: "y" });
  reg.part("cyclic.stick", stickGeo, {
    parent: cyclicGroup,
    pos: [0, 0.30, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "cyclic.boot",
    allowOverlap: ["cyclic.gripCollar"]
  });

  const cycCollarGeo = buildCylinderGeometry(0.060, 0.044, 0.07, { segments: 18, axis: "y" });
  reg.part("cyclic.gripCollar", cycCollarGeo, {
    parent: cyclicGroup,
    pos: [0, 0.62, 0],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "cyclic.stick"
  });

  const cycGripGeo = buildCylinderGeometry(0.066, 0.056, 0.20, { segments: 20, axis: "y" });
  reg.part("cyclic.grip", cycGripGeo, {
    parent: cyclicGroup,
    pos: [0, 0.75, 0],
    ramp: "copper",
    outline: "mid",
    crease: "lo",
    mountOn: "cyclic.gripCollar"
  });

  const hatGeo = buildCylinderGeometry(0.030, 0.034, 0.045, { segments: 14, axis: "y" });
  reg.part("cyclic.hatSwitch", hatGeo, {
    parent: cyclicGroup,
    pos: [0, 0.865, 0.015],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true,
    mountOn: "cyclic.grip"
  });

  // Two conduit ports on cyclic base (roll -> servo 2, pitch -> servo 0)
  const portRollAng = Math.PI;
  const cycPortRoll = reg.part(
    "cyclic.portRoll",
    buildCylinderGeometry(0.036, 0.036, 0.08, { segments: 12, axis: "x" }),
    {
      parent: cyclicBaseGroup,
      pos: [Math.cos(portRollAng) * 0.25, topSurfaceY + 0.045, Math.sin(portRollAng) * 0.25],
      rot: [0, -portRollAng, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "cyclic.mountBase",
      allowOverlap: ["tube.cyclicRoll"]
    }
  );
  reg.anchor("cyclic.portRoll", 0.03, 0, 0, cycPortRoll, { dir: [1, 0.06, 0] });

  const portPitchAng = -Math.PI * 0.14;
  const cycPortPitch = reg.part(
    "cyclic.portPitch",
    buildCylinderGeometry(0.036, 0.036, 0.08, { segments: 12, axis: "x" }),
    {
      parent: cyclicBaseGroup,
      pos: [Math.cos(portPitchAng) * 0.25, topSurfaceY + 0.045, Math.sin(portPitchAng) * 0.25],
      rot: [0, -portPitchAng, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "cyclic.mountBase",
      allowOverlap: ["tube.cyclicPitch"]
    }
  );
  reg.anchor("cyclic.portPitch", 0.03, 0, 0, cycPortPitch, { dir: [1, 0.06, 0] });

  // ---------------------------------------------------------------------------
  // 5. Collective Pitch Quadrant Lever (Front-Left Apron)
  // ---------------------------------------------------------------------------
  const [colX, , colZ] = ANCHORS.collectiveMount;
  const collBaseGroup = reg.group("collective.baseGroup", {
    parent: baseGroup,
    pos: [colX, 0, colZ],
    stage: "mechanism"
  });

  const collBaseGeo = new THREE.BoxGeometry(0.46, 0.08, 0.28);
  reg.part("collective.base", collBaseGeo, {
    parent: collBaseGroup,
    pos: [0, topSurfaceY + 0.04, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const collPivotPos = [0.14, topSurfaceY + 0.15, 0];
  const quadGeo = buildArcBandGeometry(0.35, 0.47, 0.044, 0.60 * Math.PI, 1.02 * Math.PI, 28);
  reg.part("collective.quadrant", quadGeo, {
    parent: collBaseGroup,
    pos: collPivotPos,
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "collective.base",
    allowOverlap: ["collective.pivot", "collective.lever"]
  });

  const quadTickPts = [];
  for (let i = 0; i <= 12; i++) {
    const a = 0.64 * Math.PI + (i / 12) * (0.34 * Math.PI);
    const rOut = 0.46;
    const rIn = i % 3 === 0 ? 0.37 : 0.405;
    quadTickPts.push(
      new THREE.Vector3(collPivotPos[0] + Math.cos(a) * rIn, collPivotPos[1] + Math.sin(a) * rIn, 0.032),
      new THREE.Vector3(collPivotPos[0] + Math.cos(a) * rOut, collPivotPos[1] + Math.sin(a) * rOut, 0.032)
    );
  }
  reg.detail(
    "collective.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(quadTickPts), kit.lineMaterials.mid),
    { parent: collBaseGroup }
  );

  const collPivotGeo = buildCylinderGeometry(0.055, 0.055, 0.14, { segments: 18, axis: "z" });
  reg.part("collective.pivot", collPivotGeo, {
    parent: collBaseGroup,
    pos: collPivotPos,
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "collective.base",
    allowOverlap: ["collective.lever", "collective.quadrant"]
  });

  const collectiveGroup = reg.group("collective.group", {
    parent: collBaseGroup,
    pos: [collPivotPos[0], collPivotPos[1], 0.056],
    stage: "mechanism"
  });

  const collLeverGeo = new THREE.BoxGeometry(0.64, 0.052, 0.042);
  collLeverGeo.translate(-0.32, 0, 0);
  reg.part("collective.lever", collLeverGeo, {
    parent: collectiveGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "collective.pivot"
  });

  const collGripGeo = buildCylinderGeometry(0.048, 0.044, 0.22, { segments: 18, axis: "x" });
  reg.part("collective.grip", collGripGeo, {
    parent: collectiveGroup,
    pos: [-0.73, 0, 0],
    ramp: "copper",
    outline: "mid",
    crease: "lo",
    mountOn: "collective.lever"
  });

  const collPort = reg.part(
    "collective.port",
    buildCylinderGeometry(0.036, 0.036, 0.08, { segments: 12, axis: "x" }),
    {
      parent: collBaseGroup,
      pos: [0.22, topSurfaceY + 0.045, -0.02],
      rot: [0, -0.35, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "collective.base",
      allowOverlap: ["tube.collective"]
    }
  );
  reg.anchor("collective.port", 0.03, 0, 0, collPort, { dir: [1, 0.06, 0] });

  // ---------------------------------------------------------------------------
  // 6. Blade Pitch Protractor Scale Stand (Right-Rear Apron, Distinct Semi-Circle)
  // ---------------------------------------------------------------------------
  const [pitchX, , pitchZ] = ANCHORS.pitchScaleMount;
  const pitchBaseGroup = reg.group("pitchScale.group", {
    parent: baseGroup,
    pos: [pitchX, 0, pitchZ],
    stage: "mechanism"
  });

  const pBaseGeo = new THREE.BoxGeometry(0.46, 0.09, 0.32);
  reg.part("pitchScale.base", pBaseGeo, {
    parent: pitchBaseGroup,
    pos: [0, topSurfaceY + 0.045, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const pPostH = 0.72;
  const pPostGeo = new THREE.BoxGeometry(0.11, pPostH, 0.11);
  reg.part("pitchScale.post", pPostGeo, {
    parent: pitchBaseGroup,
    pos: [0, topSurfaceY + 0.09 + pPostH * 0.5, -0.04],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "pitchScale.base",
    allowOverlap: ["pitchScale.backing"]
  });

  const pitchHeadY = topSurfaceY + 0.80;
  const pitchHeadGroup = reg.group("pitchScale.head", {
    parent: pitchBaseGroup,
    pos: [0, pitchHeadY, 0.02],
    rot: [0, -0.22, 0],
    stage: "mechanism"
  });

  const pBackingGeo = buildProtractorBackingGeometry(0.44, 0.08, 32);
  reg.part("pitchScale.backing", pBackingGeo, {
    parent: pitchHeadGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "pitchScale.post",
    allowOverlap: ["pitchScale.rim"]
  });

  const pRimGeo = buildArcBandGeometry(0.37, 0.45, 0.032, 0, Math.PI, 32);
  reg.part("pitchScale.rim", pRimGeo, {
    parent: pitchHeadGroup,
    pos: [0, 0, 0.032],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "pitchScale.backing"
  });
  reg.anchor("pitchScale.pivot", 0, 0.05, 0.054, pitchHeadGroup);

  const protTickPts = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * 0.88 - (i / 16) * (Math.PI * 0.76);
    const rOut = 0.355;
    const rIn = i % 4 === 0 ? 0.255 : 0.295;
    protTickPts.push(
      new THREE.Vector3(Math.cos(a) * rIn, 0.04 + Math.sin(a) * rIn, 0.052),
      new THREE.Vector3(Math.cos(a) * rOut, 0.04 + Math.sin(a) * rOut, 0.052)
    );
  }
  reg.detail(
    "pitchScale.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(protTickPts), kit.lineMaterials.mid),
    { parent: pitchHeadGroup }
  );

  const pitchNeedleGroup = reg.group("pitchScale.needle", {
    parent: pitchHeadGroup,
    pos: [0, 0.04, 0.058],
    stage: "mechanism"
  });
  const pNeedlePts = [new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0, 0.33, 0)];
  reg.detail(
    "pitchScale.needle.line",
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(pNeedlePts), kit.lineMaterials.lit),
    { parent: pitchNeedleGroup }
  );
  const pNeedleCap = new THREE.Mesh(new THREE.CircleGeometry(0.038, 16), kit.dotMaterials.lit);
  pNeedleCap.position.z = 0.002;
  reg.detail("pitchScale.needle.cap", pNeedleCap, { parent: pitchNeedleGroup });

  reg.tag("tag-pitch", "BLADE 1 PITCH°", pitchX + 0.10, pitchHeadY + 0.64, pitchZ);

  // ---------------------------------------------------------------------------
  // 7. Three Bowden Control Conduits (Pilot Controls -> 3 CCPM Servos)
  // ---------------------------------------------------------------------------
  // Conduit 1: Collective Lever -> Left CCPM Servo 1
  reg.tube(
    "tube.collective",
    "collective.port",
    [
      [-1.32, topSurfaceY + 0.07, 0.72],
      [-1.16, topSurfaceY + 0.14, 0.68],
      [-1.06, topSurfaceY + 0.21, 0.50]
    ],
    "servo.1.ctrlPort",
    {
      parent: baseGroup,
      radius: 0.024,
      segments: 36,
      leadOut: 0.10,
      leadIn: 0.12,
      ramp: "copper",
      outline: "lo",
      fromPart: "collective.port",
      toPart: "servo.port.1",
      allowOverlap: ["collective.base", "servo.body.1"]
    }
  );

  // Conduit 2: Cyclic Roll Port -> Right CCPM Servo 2
  reg.tube(
    "tube.cyclicRoll",
    "cyclic.portRoll",
    [
      [1.20, topSurfaceY + 0.06, 1.06],
      [0.96, topSurfaceY + 0.13, 0.94],
      [0.98, topSurfaceY + 0.20, 0.64]
    ],
    "servo.2.ctrlPort",
    {
      parent: baseGroup,
      radius: 0.024,
      segments: 36,
      leadOut: 0.12,
      leadIn: 0.12,
      ramp: "copper",
      outline: "lo",
      fromPart: "cyclic.portRoll",
      toPart: "servo.port.2",
      allowOverlap: ["cyclic.mountBase", "servo.body.2"]
    }
  );

  // Conduit 3: Cyclic Pitch Port -> Aft CCPM Servo 0 (sweeps around outer right perimeter)
  reg.tube(
    "tube.cyclicPitch",
    "cyclic.portPitch",
    [
      [2.26, topSurfaceY + 0.07, 0.62],
      [2.36, topSurfaceY + 0.10, -0.25],
      [2.28, topSurfaceY + 0.13, -1.08],
      [1.86, topSurfaceY + 0.16, -1.26],
      [1.14, topSurfaceY + 0.21, -1.12],
      [0.56, topSurfaceY + 0.23, -1.07]
    ],
    "servo.0.ctrlPort",
    {
      parent: baseGroup,
      radius: 0.024,
      segments: 60,
      leadOut: 0.14,
      leadIn: 0.14,
      ramp: "copper",
      outline: "lo",
      fromPart: "cyclic.portPitch",
      toPart: "servo.port.0",
      allowOverlap: ["cyclic.mountBase", "servo.body.0"]
    }
  );

  // ---------------------------------------------------------------------------
  // 8. Direct 3D Viewport Manipulation (Draggable Swashplate, Cyclic & Collective)
  // ---------------------------------------------------------------------------
  reg.interactable("swash.assembly", {
    cursor: "grab",
    hint: "Drag swashplate up/down for collective or sideways to tilt cyclic",
    onDrag: ({ dx, dy, state, setParam }) => {
      const curColl = state.params.collective ?? 8.5;
      const curRoll = state.params.cyclicRoll ?? -4.5;
      setParam("collective", curColl - dy * 0.09);
      setParam("cyclicRoll", curRoll + dx * 0.13);
    }
  });

  reg.interactable("cyclic.group", {
    cursor: "grab",
    hint: "Drag cyclic stick in 2 axes to tilt the swashplate",
    onDrag: ({ dx, dy, state, setParam }) => {
      const curPitch = state.params.cyclicPitch ?? 6.5;
      const curRoll = state.params.cyclicRoll ?? -4.5;
      setParam("cyclicRoll", curRoll + dx * 0.14);
      setParam("cyclicPitch", curPitch - dy * 0.14);
    }
  });

  reg.interactable("collective.group", {
    cursor: "ns-resize",
    hint: "Drag collective lever up/down to change collective pitch",
    onDrag: ({ dy, state, setParam }) => {
      const curColl = state.params.collective ?? 8.5;
      setParam("collective", curColl - dy * 0.09);
    }
  });

  // Initial kinematic pose
  updateKinematics(reg, {
    theta: SPEC.initialTheta,
    explode: 0,
    rpm: SPEC.initialRpm,
    effectiveRpm: SPEC.initialRpm,
    shaderEnv: 1.0,
    cutaway: true,
    params: {
      collective: 8.5,
      cyclicPitch: 6.5,
      cyclicRoll: -4.5,
      rpm: SPEC.initialRpm
    }
  });
}

function alignSegment(group, pFrom, pTo) {
  TMP_DIR.subVectors(pTo, pFrom);
  const len = TMP_DIR.length();
  group.position.copy(pFrom);
  if (len > 1e-5) {
    TMP_DIR.divideScalar(len);
    TMP_QUAT.setFromUnitVectors(UP_VEC, TMP_DIR);
    group.quaternion.copy(TMP_QUAT);
  }
  return len;
}

export function updateKinematics(reg, state) {
  const { theta, rpm, shaderEnv = 1, params } = state;
  const ctrlParams = params ? { ...params, rpm: rpm ?? params.rpm } : rpm;
  const st = getRotorState(theta, ctrlParams);

  // 1. Spin Main Mast, 4:1 Input Shaft, Upper Swashplate & Rotor Hub
  const mastSpin = reg.groups.get("mast.spin")?.group;
  if (mastSpin) mastSpin.rotation.y = theta;

  const inputSpin = reg.groups.get("input.spin")?.group;
  if (inputSpin) inputSpin.rotation.x = theta * SPEC.gearRatio;

  const hubSpin = reg.groups.get("hub.spin")?.group;
  if (hubSpin) hubSpin.rotation.y = theta;

  const upperSpin = reg.groups.get("swash.upperSpin")?.group;
  if (upperSpin) upperSpin.rotation.y = theta;

  // 2. Lift & Tilt Swashplate Carrier
  const swashCarrier = reg.groups.get("swash.carrier")?.group;
  if (swashCarrier) {
    swashCarrier.position.y = st.collLift;
    swashCarrier.rotation.order = "XZY";
    swashCarrier.rotation.x = st.tiltX;
    swashCarrier.rotation.z = st.tiltZ;
  }

  // 3. Articulate All 3 Rotor Blades (Flapping Coning + Cyclic/Collective Pitch Feathering)
  let blade0PitchDeg = st.collPitchDeg;
  for (let k = 0; k < SPEC.numBlades; k++) {
    const bk = getBladeKinematics(theta, ctrlParams, k);
    if (k === 0) blade0PitchDeg = bk.totalPitchDeg;
    const flapGroup = reg.groups.get(`blade.flap.${k}`)?.group;
    const pitchGroup = reg.groups.get(`blade.pitch.${k}`)?.group;
    if (flapGroup) flapGroup.rotation.z = bk.flapAngleRad;
    if (pitchGroup) pitchGroup.rotation.x = -bk.totalPitchRad;
  }

  // Sync world matrices of parent assemblies before querying exact pin world positions
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  reg.root.updateMatrixWorld(true);
  const invBase = baseGroup.matrixWorld.clone().invert();

  const toBaseLocal = (anchorId, outVec) => {
    const obj = reg.joints.get(anchorId);
    if (!obj) return outVec.set(0, 0, 0);
    return obj.getWorldPosition(outVec).applyMatrix4(invBase);
  };

  // 4. Articulate 3 Servo Pushrods
  for (let i = 0; i < 3; i++) {
    const rodGroup = reg.groups.get(`servo.rodGroup.${i}`)?.group;
    if (!rodGroup) continue;
    toBaseLocal(`swash.servoPin.${i}`, TMP_A);
    toBaseLocal(`servo.${i}.glandTop`, TMP_B);
    TMP_DIR.subVectors(TMP_A, TMP_B);
    const len = TMP_DIR.length();
    rodGroup.position.copy(TMP_A);
    if (len > 1e-5) {
      TMP_DIR.divideScalar(len);
      rodGroup.quaternion.setFromUnitVectors(UP_VEC, TMP_DIR);
    }
  }

  // 5. Articulate 3 Pitch Control Links
  for (let k = 0; k < SPEC.numBlades; k++) {
    const linkGroup = reg.groups.get(`pitchLink.group.${k}`)?.group;
    if (!linkGroup) continue;
    toBaseLocal(`swash.pitchPin.${k}`, TMP_A);
    toBaseLocal(`blade.${k}.hornBall`, TMP_B);
    const dist = alignSegment(linkGroup, TMP_A, TMP_B);
    const rodPart = reg.parts.get(`pitchLink.rod.${k}`)?.group;
    const topBall = reg.parts.get(`pitchLink.topBall.${k}`)?.group;
    if (rodPart) rodPart.scale.y = Math.max(0.2, dist);
    if (topBall) topBall.position.y = dist;
  }

  // 6. Articulate Rotating Drive Scissors
  const driveScissor = reg.groups.get("scissors.drive")?.group;
  if (driveScissor) {
    toBaseLocal("swash.drivePin", TMP_A);
    toBaseLocal("mast.drivePin", TMP_B);
    const dist = alignSegment(driveScissor, TMP_A, TMP_B);
    const armPart = reg.parts.get("scissors.driveArm")?.group;
    if (armPart) armPart.scale.y = Math.max(0.2, dist);
  }

  // 7. Articulate 2-Bar Stationary Anti-Rotation Scissors
  const lowerArmGroup = reg.groups.get("scissors.fixedLower")?.group;
  const upperArmGroup = reg.groups.get("scissors.fixedUpper")?.group;
  const kneePin = reg.parts.get("scissors.kneePin")?.group;
  if (lowerArmGroup && upperArmGroup && kneePin) {
    toBaseLocal("scissor.fixedPivot", TMP_A);
    toBaseLocal("swash.antiRotPin", TMP_B);
    const span = TMP_A.distanceTo(TMP_B);
    const L = 0.50;
    const halfSpan = Math.min(span * 0.5, L - 0.02);
    const kneeOut = Math.sqrt(Math.max(0.001, L * L - halfSpan * halfSpan));
    const mid = TMP_A.clone().add(TMP_B).multiplyScalar(0.5);
    const outDir = new THREE.Vector3(-0.707, 0, -0.707).normalize();
    const kneePos = mid.addScaledVector(outDir, kneeOut);

    alignSegment(lowerArmGroup, TMP_A, kneePos);
    alignSegment(upperArmGroup, TMP_B, kneePos);
    kneePin.position.copy(kneePos);
    kneePin.rotation.y = Math.PI * 0.25;
  }

  // 8. Drive Physical Cyclic Stick, Collective Quadrant Lever & Pitch Protractor Needle
  const cyclicGroup = reg.groups.get("cyclic.group")?.group;
  if (cyclicGroup) {
    cyclicGroup.rotation.order = "XZY";
    cyclicGroup.rotation.x = st.tiltX * 1.5;
    cyclicGroup.rotation.z = st.tiltZ * 1.5;
  }

  const collectiveGroup = reg.groups.get("collective.group")?.group;
  if (collectiveGroup) {
    collectiveGroup.rotation.z = -(0.22 + st.collNorm * 0.62);
  }

  const pitchNorm = Math.max(0, Math.min(1, (blade0PitchDeg + 10) / 40));
  const needleAngle = Math.PI * 0.38 - pitchNorm * (Math.PI * 0.76);
  const pitchNeedle = reg.groups.get("pitchScale.needle")?.group;
  if (pitchNeedle) {
    pitchNeedle.rotation.z = needleAngle;
  }

  const discShader = reg.root.getObjectByName("rotor.discShader");
  if (discShader && discShader.material && discShader.material.uniforms) {
    discShader.material.uniforms.uTheta.value = theta;
    discShader.material.uniforms.uRpmNorm.value = st.rpmNorm;
    discShader.material.uniforms.uConeRad.value = st.coningRad;
    discShader.material.uniforms.uTiltX.value = st.tiltX;
    discShader.material.uniforms.uTiltZ.value = st.tiltZ;
    discShader.material.uniforms.uEnvelope.value = shaderEnv;
  }
}
