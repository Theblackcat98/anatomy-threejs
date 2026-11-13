import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, getEngineState } from "./model.mjs";

const UP_VEC = new THREE.Vector3(0, 1, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();
const TMP_QUAT = new THREE.Quaternion();

function buildArcBandGeo(rInner, rOuter, depth, aStart, aEnd, segs = 24) {
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
    bevelSize: 0.006,
    bevelThickness: 0.006,
    curveSegments: segs
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

export function buildMechanism(reg, kit) {
  const { topSurfaceY, pitchStandPos, yawStandPos } = SPEC;
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const mechGroup = reg.group("mech.group", { stage: "mechanism" });

  // ---------------------------------------------------------------------------
  // 1. Dynamic Hydraulic TVC Actuators (Pitch & Yaw)
  // ---------------------------------------------------------------------------
  function buildTvcActuator(name, standPos, standMountPart, lugPart) {
    const barrelGroup = reg.group(`tvc.${name}.barrelGroup`, {
      parent: mechGroup,
      pos: standPos,
      stage: "mechanism"
    });
    const rodGroup = reg.group(`tvc.${name}.rodGroup`, {
      parent: mechGroup,
      pos: standPos,
      stage: "mechanism"
    });

    const ballGeo = new THREE.SphereGeometry(0.066, 16, 12);
    reg.part(`tvc.${name}.standBall`, ballGeo, {
      parent: barrelGroup,
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: standMountPart,
      allowOverlap: [standMountPart]
    });

    const barrelGeo = buildCylinderGeometry(0.056, 0.056, 0.44, { segments: 18, axis: "y" });
    reg.part(`tvc.${name}.barrel`, barrelGeo, {
      parent: barrelGroup,
      pos: [0, 0.23, 0],
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      mountOn: `tvc.${name}.standBall`,
      allowOverlap: [`tvc.${name}.rod`, `tvc.${name}.engBall`, standMountPart]
    });

    reg.part(`tvc.${name}.engBall`, ballGeo, {
      parent: rodGroup,
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: lugPart
    });

    const rodGeo = buildCylinderGeometry(0.028, 0.028, 0.48, { segments: 14, axis: "y" });
    reg.part(`tvc.${name}.rod`, rodGeo, {
      parent: rodGroup,
      pos: [0, 0.25, 0],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: `tvc.${name}.engBall`,
      allowOverlap: [`tvc.${name}.barrel`, `tvc.${name}.standBall`]
    });
  }

  buildTvcActuator("pitch", pitchStandPos, "stand.pitchBracket", "engine.pitchLug");
  buildTvcActuator("yaw", yawStandPos, "stand.yawBracket", "engine.yawLug");

  // ---------------------------------------------------------------------------
  // 2. Notched Shuttle Throttle Quadrant Lever (Front-Right Apron)
  // ---------------------------------------------------------------------------
  const [thrX, , thrZ] = ANCHORS.throttleMount;
  const throttleBaseGroup = reg.group("throttle.group", {
    parent: mechGroup,
    pos: [thrX, topSurfaceY, thrZ],
    stage: "mechanism"
  });

  const thrPedGeo = new THREE.BoxGeometry(0.36, 0.14, 0.56);
  reg.part("throttle.base", thrPedGeo, {
    parent: throttleBaseGroup,
    pos: [0, 0.07, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });

  [[-0.13, -0.22], [0.13, -0.22], [-0.13, 0.22], [0.13, 0.22]].forEach(([bx, bz], i) => {
    reg.detail(
      `throttle.bolt.${i}`,
      makeScrewDetail(bx, 0.143, bz, 0.024, "y", kit),
      { parent: throttleBaseGroup }
    );
  });

  // Twin quadrant cheek plates + brass notched detent arc
  const cheekGeo = new THREE.BoxGeometry(0.045, 0.28, 0.42);
  reg.part("throttle.cheek.L", cheekGeo, {
    parent: throttleBaseGroup,
    pos: [-0.075, 0.28, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "throttle.base",
    allowOverlap: ["throttle.arc", "throttle.arm"]
  });
  reg.part("throttle.cheek.R", cheekGeo, {
    parent: throttleBaseGroup,
    pos: [0.075, 0.28, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "throttle.base",
    allowOverlap: ["throttle.arc", "throttle.arm"]
  });

  const thrArcGeo = buildArcBandGeo(0.20, 0.28, 0.11, Math.PI * 0.22, Math.PI * 0.78, 20);
  thrArcGeo.rotateY(Math.PI / 2); // Align arc in YZ plane, spanning solidly between L/R cheek plates
  reg.part("throttle.arc", thrArcGeo, {
    parent: throttleBaseGroup,
    pos: [0, 0.24, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "throttle.cheek.L",
    allowOverlap: ["throttle.cheek.R", "throttle.arm"]
  });

  // Graduated tick marks along throttle quadrant outer rim
  const thrTickPts = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.25 + (i / 10) * (Math.PI * 0.50);
    const r0 = 0.255;
    const r1 = i === 0 || i === 7 || i === 10 ? 0.30 : 0.282;
    thrTickPts.push(
      new THREE.Vector3(0.032, 0.24 + Math.sin(a) * r0, Math.cos(a) * r0),
      new THREE.Vector3(0.032, 0.24 + Math.sin(a) * r1, Math.cos(a) * r1)
    );
  }
  reg.detail(
    "throttle.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(thrTickPts), kit.lineMaterials.mid),
    { parent: throttleBaseGroup }
  );

  const throttleLeverGroup = reg.group("throttle.leverGroup", {
    parent: throttleBaseGroup,
    pos: [0, 0.24, 0],
    stage: "mechanism"
  });

  const thrHubGeo = buildCylinderGeometry(0.065, 0.065, 0.22, { segments: 16, axis: "x" });
  reg.part("throttle.hub", thrHubGeo, {
    parent: throttleLeverGroup,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "throttle.cheek.L",
    allowOverlap: ["throttle.cheek.R", "throttle.arc"]
  });

  const thrArmGeo = new THREE.BoxGeometry(0.044, 0.50, 0.048);
  reg.part("throttle.arm", thrArmGeo, {
    parent: throttleLeverGroup,
    pos: [0, 0.27, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "throttle.hub",
    allowOverlap: ["throttle.arc"]
  });

  const thrGripGeo = buildCylinderGeometry(0.044, 0.044, 0.26, { segments: 18, axis: "x" });
  reg.part("throttle.grip", thrGripGeo, {
    parent: throttleLeverGroup,
    pos: [0, 0.53, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "throttle.arm"
  });

  // ---------------------------------------------------------------------------
  // 3. 2-Axis TVC Gimbal Control Stick (Front-Left Apron)
  // ---------------------------------------------------------------------------
  const [stkX, , stkZ] = ANCHORS.tvcStickMount;
  const stickBaseGroup = reg.group("tvcStick.group", {
    parent: mechGroup,
    pos: [stkX, topSurfaceY, stkZ],
    stage: "mechanism"
  });

  const stkBoxGeo = new THREE.BoxGeometry(0.42, 0.16, 0.42);
  reg.part("tvcStick.base", stkBoxGeo, {
    parent: stickBaseGroup,
    pos: [0, 0.08, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });

  [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([bx, bz], i) => {
    reg.detail(
      `tvcStick.bolt.${i}`,
      makeScrewDetail(bx, 0.163, bz, 0.025, "y", kit),
      { parent: stickBaseGroup }
    );
  });

  const stkCollarGeo = buildCylinderGeometry(0.14, 0.16, 0.08, { segments: 24, axis: "y" });
  reg.part("tvcStick.collar", stkCollarGeo, {
    parent: stickBaseGroup,
    pos: [0, 0.20, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "tvcStick.base"
  });

  const stickGimbalGroup = reg.group("tvcStick.gimbalGroup", {
    parent: stickBaseGroup,
    pos: [0, 0.27, 0],
    stage: "mechanism"
  });
  stickGimbalGroup.rotation.order = "XZY";

  const stkBootGeo = new THREE.SphereGeometry(0.10, 18, 14);
  reg.part("tvcStick.boot", stkBootGeo, {
    parent: stickGimbalGroup,
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "tvcStick.collar",
    allowOverlap: ["tvcStick.base"]
  });

  const stkShaftGeo = buildCylinderGeometry(0.032, 0.038, 0.40, { segments: 16, axis: "y" });
  reg.part("tvcStick.shaft", stkShaftGeo, {
    parent: stickGimbalGroup,
    pos: [0, 0.24, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "tvcStick.boot"
  });

  const stkGripGeo = buildCylinderGeometry(0.056, 0.044, 0.17, { segments: 18, axis: "y" });
  reg.part("tvcStick.grip", stkGripGeo, {
    parent: stickGimbalGroup,
    pos: [0, 0.49, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "tvcStick.shaft"
  });

  // ---------------------------------------------------------------------------
  // 4. Chamber Pressure (Pc MPa) Dial Gauge (Right Apron)
  // ---------------------------------------------------------------------------
  const [gX, , gZ] = ANCHORS.gaugeMount;
  const gaugeGroup = reg.group("gauge.group", {
    parent: mechGroup,
    pos: [gX, topSurfaceY, gZ],
    stage: "mechanism"
  });

  const gFootGeo = buildCylinderGeometry(0.16, 0.18, 0.08, { segments: 24, axis: "y" });
  reg.part("gauge.foot", gFootGeo, {
    parent: gaugeGroup,
    pos: [0, 0.04, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const gPostGeo = buildCylinderGeometry(0.065, 0.078, 0.56, { segments: 20, axis: "y" });
  reg.part("gauge.post", gPostGeo, {
    parent: gaugeGroup,
    pos: [0, 0.35, 0],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "gauge.foot"
  });

  const gPortGeo = buildCylinderGeometry(0.042, 0.048, 0.12, { segments: 14, axis: "x" });
  reg.part("gauge.port", gPortGeo, {
    parent: gaugeGroup,
    pos: [-0.10, 0.32, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "gauge.post"
  });
  reg.anchor("gauge.pc.in", -0.16, 0.32, 0, gaugeGroup, { dir: [-1, 0, 0] });

  const gaugeHeadGroup = reg.group("gauge.headGroup", {
    parent: gaugeGroup,
    pos: [0, 0.78, 0],
    rot: [-0.36, -0.44, 0],
    stage: "mechanism"
  });

  const gCaseGeo = buildCylinderGeometry(0.28, 0.28, 0.12, { segments: 32, axis: "z" });
  reg.part("gauge.bezel", gCaseGeo, {
    parent: gaugeHeadGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    mountOn: "gauge.post"
  });

  const gFaceGeo = buildCylinderGeometry(0.225, 0.225, 0.02, { segments: 32, axis: "z" });
  reg.part("gauge.face", gFaceGeo, {
    parent: gaugeHeadGroup,
    pos: [0, 0, 0.06],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "gauge.bezel",
    allowOverlap: ["gauge.post"]
  });

  // Gauge radial calibration ticks
  const gTickPts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 1.25 - (i / 12) * (Math.PI * 1.5);
    const r0 = i % 3 === 0 ? 0.145 : 0.17;
    const r1 = 0.205;
    gTickPts.push(
      new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0, 0.074),
      new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0.074)
    );
  }
  reg.detail(
    "gauge.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gTickPts), kit.lineMaterials.hi),
    { parent: gaugeHeadGroup }
  );

  const gaugeNeedleGroup = reg.group("gauge.needleGroup", {
    parent: gaugeHeadGroup,
    pos: [0, 0, 0.082],
    stage: "mechanism"
  });
  const gPinGeo = buildCylinderGeometry(0.032, 0.032, 0.025, { segments: 14, axis: "z" });
  reg.part("gauge.pin", gPinGeo, {
    parent: gaugeNeedleGroup,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true,
    mountOn: "gauge.face"
  });
  const gNeedleGeo = new THREE.BoxGeometry(0.018, 0.165, 0.014);
  reg.part("gauge.needle", gNeedleGeo, {
    parent: gaugeNeedleGroup,
    pos: [0, 0.072, 0.004],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true,
    mountOn: "gauge.pin"
  });

  reg.tag("tag-gauge", "Pc MPa", gX, topSurfaceY + 1.24, gZ);

  // ---------------------------------------------------------------------------
  // 5. Front Gimbal Deflection Protractor Scale (on apron forward of deflector)
  // ---------------------------------------------------------------------------
  const protZ = 0.98;
  const protGroup = reg.group("protractor.group", {
    parent: mechGroup,
    pos: [0, topSurfaceY, protZ],
    stage: "mechanism"
  });
  const protBaseGeo = new THREE.BoxGeometry(1.18, 0.036, 0.22);
  reg.part("protractor.base", protBaseGeo, {
    parent: protGroup,
    pos: [0, 0.018, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });
  const protTicks = [];
  for (let i = -7; i <= 7; i++) {
    const tx = (i / 7) * 0.48;
    const len = i === 0 ? 0.14 : i % 2 === 0 ? 0.10 : 0.06;
    protTicks.push(
      new THREE.Vector3(tx, 0.039, -0.09),
      new THREE.Vector3(tx, 0.039, -0.09 + len)
    );
  }
  reg.detail(
    "protractor.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(protTicks), kit.lineMaterials.mid),
    { parent: protGroup }
  );

  // ---------------------------------------------------------------------------
  // 6. Stationary Cryogenic Supply, TVC Hydraulic & Pc Sense Plumbing
  // ---------------------------------------------------------------------------
  // LH2 Cryogenic Supply Pipe (left manifold -> upper left thrust feed boss)
  reg.tube(
    "tube.lh2Supply",
    "lh2.supply.out",
    [
      [-2.12, -0.55, -0.52],
      [-1.92, 0.95, -0.70],
      [-1.38, 1.92, -0.76]
    ],
    "lh2.supply.in",
    {
      parent: baseGroup,
      radius: 0.048,
      segments: 38,
      radialSegments: 12,
      leadOut: 0.22,
      leadIn: 0.20,
      ramp: "hi",
      outline: "lo",
      fromPart: "base.lh2.flange",
      toPart: "stand.lh2FeedBoss"
    }
  );

  // LOX Cryogenic Supply Pipe (right manifold -> upper right thrust feed boss)
  reg.tube(
    "tube.loxSupply",
    "lox.supply.out",
    [
      [2.28, -0.55, -0.96],
      [2.16, 0.85, -0.96],
      [1.52, 1.76, -0.84]
    ],
    "lox.supply.in",
    {
      parent: baseGroup,
      radius: 0.048,
      segments: 38,
      radialSegments: 12,
      leadOut: 0.22,
      leadIn: 0.20,
      ramp: "brass",
      outline: "lo",
      fromPart: "base.lox.flange",
      toPart: "stand.loxFeedBoss"
    }
  );

  // TVC Pitch Hydraulic Supply Line (HPU port 0 -> Pitch actuator bracket, sweeping outside LH2 & below arm)
  reg.tube(
    "tube.tvcHydPitch",
    "hpu.pitch.out",
    [
      [-2.48, -0.68, 0.10],
      [-2.46, 0.85, -0.32],
      [-2.16, 1.54, -1.04],
      [-0.95, 1.78, -1.12]
    ],
    "tvc.pitch.hydIn",
    {
      parent: baseGroup,
      radius: 0.022,
      segments: 42,
      radialSegments: 10,
      leadOut: 0.20,
      leadIn: 0.22,
      ramp: "copper",
      outline: "lo",
      fromPart: "base.hpu.port.0",
      toPart: "stand.pitchHydPort"
    }
  );

  // TVC Yaw Hydraulic Supply Line (HPU port 1 -> Yaw actuator bracket)
  reg.tube(
    "tube.tvcHydYaw",
    "hpu.yaw.out",
    [
      [-2.32, -0.68, 0.56],
      [-2.14, 0.72, 0.18],
      [-1.72, 1.66, -0.42]
    ],
    "tvc.yaw.hydIn",
    {
      parent: baseGroup,
      radius: 0.022,
      segments: 38,
      radialSegments: 10,
      leadOut: 0.20,
      leadIn: 0.18,
      ramp: "copper",
      outline: "lo",
      fromPart: "base.hpu.port.1",
      toPart: "stand.yawHydPort"
    }
  );

  // Chamber Pressure (Pc) Instrumentation Sense Line (upper thrust manifold tap -> Pc dial gauge)
  reg.tube(
    "tube.pcSense",
    "pc.tap.out",
    [
      [1.28, 1.78, -0.18],
      [1.54, 0.72, -0.06],
      [1.68, -0.68, -0.02],
      [1.82, -1.62, -0.02]
    ],
    "gauge.pc.in",
    {
      parent: baseGroup,
      radius: 0.018,
      segments: 40,
      radialSegments: 10,
      leadOut: 0.18,
      leadIn: 0.18,
      ramp: "brass",
      outline: "lo",
      fromPart: "stand.pcTapBoss",
      toPart: "gauge.port"
    }
  );

  // ---------------------------------------------------------------------------
  // 7. Direct 3D Interaction Registration (Works even when simulation is paused!)
  // ---------------------------------------------------------------------------
  reg.interactable("engine.gimbal", {
    cursor: "grab",
    hint: "Drag engine nozzle to steer Pitch & Yaw TVC (±10.5°)",
    onDrag: ({ dx, dy, state, setParam }) => {
      const nextYaw = (state.params.yaw ?? 0) + dx * 0.11;
      const nextPitch = (state.params.pitch ?? 0) - dy * 0.11;
      setParam("yaw", nextYaw);
      setParam("pitch", nextPitch);
    }
  });

  reg.interactable("throttle.leverGroup", {
    cursor: "grab",
    hint: "Drag throttle quadrant lever (67%–109% RPL)",
    onDrag: ({ dy, state, setParam }) => {
      setParam("throttle", (state.params.throttle ?? 100) - dy * 0.25);
    }
  });

  reg.interactable("tvcStick.gimbalGroup", {
    cursor: "grab",
    hint: "Drag TVC stick to command Pitch & Yaw gimbal",
    onDrag: ({ dx, dy, state, setParam }) => {
      setParam("yaw", (state.params.yaw ?? 0) + dx * 0.14);
      setParam("pitch", (state.params.pitch ?? 0) - dy * 0.14);
    }
  });
}

function orientActuatorPair(barrelGroup, rodGroup, standPos, lugAnchor) {
  if (!barrelGroup || !rodGroup || !lugAnchor) return;
  TMP_A.set(standPos[0], standPos[1], standPos[2]);
  lugAnchor.getWorldPosition(TMP_B);

  TMP_DIR.subVectors(TMP_B, TMP_A);
  if (TMP_DIR.lengthSq() > 1e-6) {
    TMP_DIR.normalize();
    TMP_QUAT.setFromUnitVectors(UP_VEC, TMP_DIR);
    barrelGroup.position.copy(TMP_A);
    barrelGroup.quaternion.copy(TMP_QUAT);

    TMP_DIR.negate();
    TMP_QUAT.setFromUnitVectors(UP_VEC, TMP_DIR);
    // Position rodGroup in parent local coords (mechGroup is identity world-aligned)
    const parentInv = rodGroup.parent ? rodGroup.parent.matrixWorld.clone().invert() : null;
    if (parentInv) {
      TMP_B.applyMatrix4(parentInv);
    }
    rodGroup.position.copy(TMP_B);
    rodGroup.quaternion.copy(TMP_QUAT);
  }
}

export function updateKinematics(reg, state) {
  const params = state.params || state;
  const eng = getEngineState(params);

  // 1. Apply 2-Axis Pitch & Yaw TVC Gimbal Rotation
  const engineGimbal = reg.groups.get("engine.gimbal")?.group;
  if (engineGimbal) {
    engineGimbal.rotation.set(eng.pitchRad, 0, eng.yawRad);
    engineGimbal.updateMatrixWorld(true);
  }

  // 2. Spin Dual High-Pressure Turbopump Rotors (35,130 : 28,120 rpm ratio = 1.25 : 1)
  const speedFactor = (eng.pumpPct / 100) * (0.7 + 0.5 * eng.thrFrac);
  const spinAngle = (state.theta || 0) * speedFactor * 3.0;
  const hpftpSpin = reg.groups.get("hpftp.rotor.spin")?.group;
  if (hpftpSpin) {
    hpftpSpin.rotation.y = -spinAngle * 1.25;
  }
  const hpotpSpin = reg.groups.get("hpotp.rotor.spin")?.group;
  if (hpotpSpin) {
    hpotpSpin.rotation.y = spinAngle;
  }

  // 3. Preburner Oxidizer Valve Lever tracks Throttle Power Level
  const oxArm = reg.groups.get("powerhead.oxValveArm")?.group;
  if (oxArm) {
    oxArm.rotation.z = -0.65 + eng.valveNorm * 1.30;
  }

  // 4. Update Dynamic Hydraulic TVC Actuators between stand and gimbaled engine lugs
  const pitchBarrel = reg.groups.get("tvc.pitch.barrelGroup")?.group;
  const pitchRod = reg.groups.get("tvc.pitch.rodGroup")?.group;
  const pitchLugAnchor = reg.joints.get("tvc.pitch.engine");
  orientActuatorPair(pitchBarrel, pitchRod, SPEC.pitchStandPos, pitchLugAnchor);

  const yawBarrel = reg.groups.get("tvc.yaw.barrelGroup")?.group;
  const yawRod = reg.groups.get("tvc.yaw.rodGroup")?.group;
  const yawLugAnchor = reg.joints.get("tvc.yaw.engine");
  orientActuatorPair(yawBarrel, yawRod, SPEC.yawStandPos, yawLugAnchor);

  // 5. Update Front-Apron Throttle Quadrant Lever & 2-Axis TVC Stick
  const thrLever = reg.groups.get("throttle.leverGroup")?.group;
  if (thrLever) {
    // 67% = tilted aft (-Z/+angle), 109% = pushed forward (+Z/-angle)
    thrLever.rotation.x = -0.58 + eng.valveNorm * 1.16;
  }

  const stickGimbal = reg.groups.get("tvcStick.gimbalGroup")?.group;
  if (stickGimbal) {
    stickGimbal.rotation.set(eng.pitchRad * 2.1, 0, eng.yawRad * 2.1);
  }

  // 6. Chamber Pressure Dial Gauge Needle (13.8 MPa -> 22.5 MPa)
  const gaugeNeedle = reg.groups.get("gauge.needleGroup")?.group;
  if (gaugeNeedle) {
    const startAng = Math.PI * 0.72;
    const sweepAng = -Math.PI * 1.44;
    gaugeNeedle.rotation.z = startAng + eng.valveNorm * sweepAng;
  }

  // 7. Update Supersonic Plume Shader Uniforms (when present in Stage 6)
  const plumeMesh = reg.root.getObjectByName("exhaust.plumeShader");
  if (plumeMesh && plumeMesh.material && plumeMesh.material.uniforms) {
    const u = plumeMesh.material.uniforms;
    u.uTime.value = state.theta || 0;
    u.uThrottle.value = eng.thrFrac;
    u.uValveNorm.value = eng.valveNorm;
    u.uEnvelope.value = state.shaderEnv !== undefined ? state.shaderEnv : 1.0;
    if (u.uCutaway) u.uCutaway.value = state.cutaway ? 1.0 : 0.0;
  }
}
