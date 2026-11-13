import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeScrewDetail,
  makeKnurlLines
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
    explode: [0, 0.25, 0],
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

  // Lower thrust bearing collar inside cutaway gearbox
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

  // Main Mast Crown Bevel Gear (4:1 ratio, visible through +Z gearbox cutaway)
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

  // Mast Rotating Drive Scissors Collar above Swashplate
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

  // Copper Swashplate Guide Sleeve around mast shaft
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
    explode: [0, 0.30, 0],
    stage: "mechanism"
  });

  const swashCarrier = reg.group("swash.carrier", {
    parent: swashAssembly,
    stage: "mechanism"
  });

  // Spherical uniball joint on mast guide sleeve
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

  // Non-rotating lower swashplate ring (total height with 0.01 bevel = 0.084 -> [-0.084, 0.000])
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

  // 3 Servo Clevis Lugs on lower swashplate
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

  // Stationary anti-rotation lug on rear-left of lower swashplate
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

  // Brass bearing race separating stationary lower and rotating upper swashplate ([0.000, +0.056])
  const raceGeo = buildAnnularGeometry(0.35, 0.56, 0.036, 40);
  reg.part("swash.bearingRace", raceGeo, {
    parent: swashCarrier,
    pos: [0, 0.028, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "swash.lower"
  });

  // Rotating Upper Swashplate Star (spins with mast around local Y, [+0.056, +0.136])
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
    allowOverlap: ["mast.shaft", "mast.guideSleeve"]
  });

  // 3 Pitch-link clevis horns on upper swashplate
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

  // Rotating Drive Scissors lug on upper swashplate
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
  // 3A. Servo Pushrods (anchored at swash.servoPin.i, telescoping down into servo.body.i)
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

  // 3B. 3 Pitch Control Links (swash.pitchPin.k -> blade.k.hornBall)
  const nominalPitchLen = 1.0;
  for (let k = 0; k < numBlades; k++) {
    const linkGroup = reg.group(`pitchLink.group.${k}`, {
      parent: baseGroup,
      explode: [Math.cos((k * 2 * Math.PI) / numBlades) * 0.25, 0.64, -Math.sin((k * 2 * Math.PI) / numBlades) * 0.25],
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

  // 3C. Rotating Drive Scissors (mast.drivePin -> swash.drivePin)
  const driveScissorGroup = reg.group("scissors.drive", {
    parent: baseGroup,
    explode: [0.22, 0.62, 0.22],
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

  // 3D. Stationary Anti-Rotation Scissors (2-bar articulated knee: scissor.fixedPivot -> knee -> swash.antiRotPin)
  const fixedLowerGroup = reg.group("scissors.fixedLower", {
    parent: baseGroup,
    stage: "mechanism"
  });
  const fixedLowerGeo = new THREE.BoxGeometry(0.048, 0.42, 0.048);
  fixedLowerGeo.translate(0, 0.21, 0);
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
  const fixedUpperGeo = new THREE.BoxGeometry(0.044, 0.42, 0.044);
  fixedUpperGeo.translate(0, 0.21, 0);
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
  // 4. Bench RPM / Collective Throttle Control Knob
  // ---------------------------------------------------------------------------
  const [knobX, , knobZ] = ANCHORS.knobMount;
  const knobBossGeo = buildCylinderGeometry(0.30, 0.33, 0.10, { segments: 28, axis: "y" });
  reg.part("knob.boss", knobBossGeo, {
    parent: baseGroup,
    pos: [knobX, topSurfaceY + 0.05, knobZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const knobGroup = reg.group("knob.group", {
    parent: baseGroup,
    pos: [knobX, topSurfaceY + 0.22, knobZ],
    stage: "mechanism"
  });
  const knobDrumGeo = buildCylinderGeometry(0.24, 0.24, 0.24, { segments: 32, axis: "y" });
  reg.part("knob.drum", knobDrumGeo, {
    parent: knobGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "knob.boss"
  });
  reg.detail(
    "knob.knurl",
    makeKnurlLines(0.24, -0.09, 0.09, 28, kit, {
      tone: "lo",
      pointer: { y: 0.123, z0: 0.07, z1: 0.22 }
    }),
    { parent: knobGroup }
  );
  reg.detail("knob.screw", makeScrewDetail(0, 0.123, 0, 0.065, "y", kit), { parent: knobGroup });
  reg.anchor("knob.top", 0, 0.12, 0, knobGroup);

  // ---------------------------------------------------------------------------
  // 5. Blade Coning & Collective Telemetry Dial Gauge (Unobstructed Front-Left)
  // ---------------------------------------------------------------------------
  const [gaugeX, , gaugeZ] = ANCHORS.gaugeMount;
  const gCollarGeo = buildCylinderGeometry(0.17, 0.19, 0.11, { segments: 24, axis: "y" });
  reg.part("gauge.collar", gCollarGeo, {
    parent: baseGroup,
    pos: [gaugeX, topSurfaceY + 0.055, gaugeZ],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const postH = 1.44;
  const gPostGeo = buildCylinderGeometry(0.072, 0.085, postH, { segments: 20, axis: "y" });
  reg.part("gauge.post", gPostGeo, {
    parent: baseGroup,
    pos: [gaugeX, topSurfaceY + 0.08 + postH * 0.5, gaugeZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "gauge.collar",
    allowOverlap: ["base.plate", "gauge.bezel"]
  });

  const gaugeHeadY = topSurfaceY + 0.08 + postH + 0.08;
  const gaugeHeadGroup = reg.group("gauge.head", {
    parent: baseGroup,
    pos: [gaugeX, gaugeHeadY, gaugeZ],
    stage: "mechanism"
  });

  const bezelGeo = buildCylinderGeometry(0.42, 0.42, 0.17, { segments: 36, axis: "z" });
  reg.part("gauge.bezel", bezelGeo, {
    parent: gaugeHeadGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "gauge.post"
  });
  reg.anchor("gauge.dial", 0, 0, 0.09, gaugeHeadGroup);

  const dialTickPts = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI * 0.75 + (i / 24) * (Math.PI * 1.5);
    const rOuter = 0.34;
    const rInner = i % 4 === 0 ? 0.24 : 0.285;
    dialTickPts.push(
      new THREE.Vector3(Math.sin(a) * rInner, Math.cos(a) * rInner, 0.09),
      new THREE.Vector3(Math.sin(a) * rOuter, Math.cos(a) * rOuter, 0.09)
    );
  }
  reg.detail(
    "gauge.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dialTickPts), kit.lineMaterials.mid),
    { parent: gaugeHeadGroup }
  );
  const innerRing = makeRingLine(0.35, 32, kit, "lo");
  innerRing.position.z = 0.089;
  reg.detail("gauge.ring", innerRing, { parent: gaugeHeadGroup });

  const needleGroup = reg.group("gauge.needle", {
    parent: gaugeHeadGroup,
    pos: [0, 0, 0.095],
    stage: "mechanism"
  });
  const needlePts = [new THREE.Vector3(0, -0.06, 0), new THREE.Vector3(0, 0.30, 0)];
  const needleLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(needlePts), kit.lineMaterials.lit);
  const needleCap = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), kit.dotMaterials.lit);
  needleCap.position.z = 0.002;
  reg.detail("gauge.needle.line", needleLine, { parent: needleGroup });
  reg.detail("gauge.needle.cap", needleCap, { parent: needleGroup });

  reg.tag("tag-gauge", "CONE°", gaugeX, gaugeHeadY - 0.19, gaugeZ + 0.105);

  // ---------------------------------------------------------------------------
  // 6. Three Smooth Hydraulic Supply Tubes (Manifold Block -> 3 CCPM Servos)
  // ---------------------------------------------------------------------------
  const servo0World = reg.getAnchorWorldPos("servo.0.hydPort");
  const servo1World = reg.getAnchorWorldPos("servo.1.hydPort");
  const servo2World = reg.getAnchorWorldPos("servo.2.hydPort");

  // Tube 0: Manifold rear port 0 -> Rear Servo 0 (arches smoothly behind motor & gearbox)
  reg.tube(
    "tube.hyd.0",
    "manifold.port.0",
    [
      [1.72, topSurfaceY + 0.36, -1.36],
      [0.64, topSurfaceY + 0.32, -1.46],
      [servo0World.x + 0.06, topSurfaceY + 0.28, servo0World.z - 0.34]
    ],
    "servo.0.hydPort",
    {
      parent: baseGroup,
      radius: 0.026,
      segments: 40,
      leadOut: 0.16,
      leadIn: 0.16,
      ramp: "copper",
      outline: "lo",
      fromPart: "manifold.port.0",
      toPart: "servo.port.0",
      allowOverlap: ["manifold.block", "servo.body.0"]
    }
  );

  // Tube 1: Manifold outer-front port 1 -> Forward-Left Servo 1 (sweeps cleanly around motor & exploded cover)
  reg.tube(
    "tube.hyd.1",
    "manifold.port.1",
    [
      [2.16, topSurfaceY + 0.20, 0.34],
      [1.48, topSurfaceY + 0.16, 0.96],
      [0.22, topSurfaceY + 0.16, 1.04],
      [-0.56, topSurfaceY + 0.20, 0.94]
    ],
    "servo.1.hydPort",
    {
      parent: baseGroup,
      radius: 0.026,
      segments: 56,
      leadOut: 0.16,
      leadIn: 0.16,
      ramp: "copper",
      outline: "lo",
      fromPart: "manifold.port.1",
      toPart: "servo.port.1",
      allowOverlap: ["manifold.block", "servo.body.1"]
    }
  );

  // Tube 2: Manifold inner-front port 2 -> Forward-Right Servo 2 (stays cleanly right of motor)
  reg.tube(
    "tube.hyd.2",
    "manifold.port.2",
    [
      [1.82, topSurfaceY + 0.30, 0.05],
      [1.76, topSurfaceY + 0.26, 0.48],
      [1.24, topSurfaceY + 0.26, 0.48]
    ],
    "servo.2.hydPort",
    {
      parent: baseGroup,
      radius: 0.026,
      segments: 36,
      leadOut: 0.16,
      leadIn: 0.16,
      ramp: "copper",
      outline: "lo",
      fromPart: "manifold.port.2",
      toPart: "servo.port.2",
      allowOverlap: ["manifold.block", "servo.body.2"]
    }
  );

  // Initial kinematic pose so rest-state positions are populated immediately
  updateKinematics(reg, {
    theta: SPEC.initialTheta,
    explode: 0,
    rpm: SPEC.initialRpm,
    effectiveRpm: SPEC.initialRpm,
    shaderEnv: 1.0,
    cutaway: true
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
  const { theta, rpm, explode = 0, shaderEnv = 1 } = state;
  const st = getRotorState(theta, rpm);

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

  // 3. Articulate All 3 Rotor Blades (Flapping Coning + Cyclic Pitch Feathering)
  for (let k = 0; k < SPEC.numBlades; k++) {
    const bk = getBladeKinematics(theta, rpm, k);
    const flapGroup = reg.groups.get(`blade.flap.${k}`)?.group;
    const pitchGroup = reg.groups.get(`blade.pitch.${k}`)?.group;
    if (flapGroup) flapGroup.rotation.z = bk.flapAngleRad;
    if (pitchGroup) pitchGroup.rotation.x = bk.totalPitchRad;
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

  // 4. Articulate 3 Servo Pushrods (swash.servoPin.i -> servo.i.glandTop)
  for (let i = 0; i < 3; i++) {
    const rodGroup = reg.groups.get(`servo.rodGroup.${i}`)?.group;
    if (!rodGroup) continue;
    toBaseLocal(`swash.servoPin.${i}`, TMP_A);
    toBaseLocal(`servo.${i}.glandTop`, TMP_B);
    // Rod extends along -Y from rodGroup origin (TMP_A) toward glandTop (TMP_B)
    TMP_DIR.subVectors(TMP_A, TMP_B);
    const len = TMP_DIR.length();
    rodGroup.position.copy(TMP_A);
    if (len > 1e-5) {
      TMP_DIR.divideScalar(len);
      rodGroup.quaternion.setFromUnitVectors(UP_VEC, TMP_DIR);
    }
  }

  // 5. Articulate 3 Pitch Control Links (swash.pitchPin.k -> blade.k.hornBall)
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

  // 6. Articulate Rotating Drive Scissors (swash.drivePin -> mast.drivePin)
  const driveScissor = reg.groups.get("scissors.drive")?.group;
  if (driveScissor) {
    toBaseLocal("swash.drivePin", TMP_A);
    toBaseLocal("mast.drivePin", TMP_B);
    const dist = alignSegment(driveScissor, TMP_A, TMP_B);
    const armPart = reg.parts.get("scissors.driveArm")?.group;
    if (armPart) armPart.scale.y = Math.max(0.2, dist);
  }

  // 7. Articulate 2-Bar Stationary Anti-Rotation Scissors (2-link IK knee)
  const lowerArmGroup = reg.groups.get("scissors.fixedLower")?.group;
  const upperArmGroup = reg.groups.get("scissors.fixedUpper")?.group;
  const kneePin = reg.parts.get("scissors.kneePin")?.group;
  if (lowerArmGroup && upperArmGroup && kneePin) {
    toBaseLocal("scissor.fixedPivot", TMP_A);
    toBaseLocal("swash.antiRotPin", TMP_B);
    const span = TMP_A.distanceTo(TMP_B);
    const L = 0.42;
    const halfSpan = Math.min(span * 0.5, L - 0.02);
    const kneeOut = Math.sqrt(Math.max(0.001, L * L - halfSpan * halfSpan));
    const mid = TMP_A.clone().add(TMP_B).multiplyScalar(0.5);
    // Push knee outward radially (-X, -Z) away from the swashplate ring
    const outDir = new THREE.Vector3(-0.707, 0, -0.707).normalize();
    const kneePos = mid.addScaledVector(outDir, kneeOut);

    alignSegment(lowerArmGroup, TMP_A, kneePos);
    alignSegment(upperArmGroup, TMP_B, kneePos);
    kneePin.position.copy(kneePos);
    kneePin.rotation.y = Math.PI * 0.25;
  }

  // 8. Control Knob, Coning Dial Gauge Needle & Rotor-Disc Shader Uniforms
  const knobGroup = reg.groups.get("knob.group")?.group;
  if (knobGroup) {
    knobGroup.rotation.y = -((rpm / 2400) * Math.PI * 1.5);
  }

  const gaugeAngle = Math.PI * 0.72 - Math.min(st.coningDeg / 12.0, 1.0) * (Math.PI * 1.44);
  const needleGroup = reg.groups.get("gauge.needle")?.group;
  if (needleGroup) {
    needleGroup.rotation.z = gaugeAngle;
  }

  const discShader = reg.root.getObjectByName("rotor.discShader");
  if (discShader && discShader.material && discShader.material.uniforms) {
    discShader.material.uniforms.uTheta.value = theta;
    discShader.material.uniforms.uRpmNorm.value = st.rpmNorm;
    discShader.material.uniforms.uConeRad.value = st.coningRad;
    discShader.material.uniforms.uTiltX.value = st.tiltX;
    discShader.material.uniforms.uTiltZ.value = st.tiltZ;
    discShader.material.uniforms.uEnvelope.value = shaderEnv * (1.0 - explode * 0.45);
  }
}
