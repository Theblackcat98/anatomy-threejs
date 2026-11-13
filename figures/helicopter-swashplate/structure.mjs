import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, SERVO_ANGLES } from "./model.mjs";

function buildCutawayArcGeometry(rInner, rOuter, height, aStart, aEnd, segs = 48) {
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
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: segs
  });
  // Rotate so shape XY maps to XZ with -Y_shape -> +Z_world, and extrusion depth -> +Y_world
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function buildAnnularRingGeometry(rInner, rOuter, height, segs = 48) {
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
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: segs
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function buildStructure(reg, kit) {
  const { topSurfaceY, mastZ, gearboxTopY } = SPEC;
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;

  // 1. Central Main Rotor Gearbox Housing (Cutaway facing +Z)
  const gearboxGroup = reg.group("gearbox.group", {
    parent: baseGroup,
    pos: [0, 0, mastZ],
    stage: "structure"
  });

  const flangeH = 0.09;
  const flangeGeo = buildAnnularRingGeometry(0.18, 0.70, flangeH, 32);
  reg.part("gearbox.flange", flangeGeo, {
    parent: gearboxGroup,
    pos: [0, topSurfaceY + 0.012, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = Math.cos(a) * 0.62;
    const bz = Math.sin(a) * 0.62;
    reg.detail(
      `gearbox.flange.bolt.${i}`,
      makeScrewDetail(bx, topSurfaceY + flangeH + 0.026, bz, 0.036, "y", kit),
      { parent: gearboxGroup }
    );
  }

  // Hollow C-shaped cutaway transmission housing (-0.18*pi .. +1.12*pi leaves +Z open)
  const housingBaseY = topSurfaceY + flangeH + 0.024;
  const housingH = 0.78;
  const housingGeo = buildCutawayArcGeometry(0.47, 0.59, housingH, -0.18 * Math.PI, 1.12 * Math.PI, 44);
  reg.part("gearbox.housing", housingGeo, {
    parent: gearboxGroup,
    pos: [0, housingBaseY, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    creaseAngle: 24,
    outlineWidth: 0.019,
    mountOn: "gearbox.flange",
    allowOverlap: ["gearbox.topDeck", "gearbox.inputBoss", "gearbox.frontCover"]
  });

  // Cutaway front cover arc (hidden in default cutaway mode; shown when C=0)
  const frontCoverGeo = buildCutawayArcGeometry(0.47, 0.59, housingH, -0.88 * Math.PI, -0.18 * Math.PI, 28);
  reg.part("gearbox.frontCover", frontCoverGeo, {
    parent: gearboxGroup,
    pos: [0, housingBaseY, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "gearbox.flange",
    allowOverlap: ["gearbox.housing", "gearbox.topDeck"]
  });

  // Cooling fin loops around the rear housing arc
  [0.18, 0.39, 0.60].forEach((fy, idx) => {
    const finPts = [];
    for (let i = 0; i <= 36; i++) {
      const a = -0.18 * Math.PI + (i / 36) * (1.30 * Math.PI);
      finPts.push(new THREE.Vector3(Math.cos(a) * 0.605, housingBaseY + fy, -Math.sin(a) * 0.605));
    }
    reg.detail(
      `gearbox.fin.${idx}`,
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(finPts), kit.lineMaterials.lo),
      { parent: gearboxGroup }
    );
  });

  // Upper bearing collar & top deck
  const topDeckH = 0.12;
  const topDeckY = housingBaseY + housingH + 0.012;
  const topDeckGeo = buildAnnularRingGeometry(0.18, 0.63, topDeckH, 36);
  reg.part("gearbox.topDeck", topDeckGeo, {
    parent: gearboxGroup,
    pos: [0, topDeckY, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "gearbox.housing",
    allowOverlap: ["mast.shaft", "gearbox.frontCover", "gearbox.mastBearing"]
  });

  // Top bearing race brass ring
  const bearingGeo = buildAnnularRingGeometry(0.16, 0.27, 0.055, 28);
  reg.part("gearbox.mastBearing", bearingGeo, {
    parent: gearboxGroup,
    pos: [0, topDeckY + topDeckH + 0.012, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "gearbox.topDeck",
    allowOverlap: ["mast.shaft"]
  });

  // Stationary anti-rotation scissors anchor bracket on rear-left of topDeck
  const bracketGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const bracketPart = reg.part("scissor.baseBracket", bracketGeo, {
    parent: gearboxGroup,
    pos: [-0.36, topDeckY + topDeckH + 0.07, -0.28],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "gearbox.topDeck"
  });
  reg.anchor("scissor.fixedPivot", 0, 0.04, 0, bracketPart);

  // Input drive boss on +X side of gearbox housing
  const inputY = housingBaseY + 0.34;
  const inputBossGeo = buildCylinderGeometry(0.16, 0.19, 0.24, { segments: 24, axis: "x" });
  reg.part("gearbox.inputBoss", inputBossGeo, {
    parent: gearboxGroup,
    pos: [0.60, inputY, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "gearbox.housing",
    allowOverlap: ["gearbox.inputShaft", "gearbox.pinion"]
  });

  // 2. Electric Drive Motor Pedestal on +X side of bedplate (drives 4:1 bevel gearbox)
  const [motorX, , motorZ] = ANCHORS.motorMount;
  const motorGroup = reg.group("motor.group", {
    parent: baseGroup,
    pos: [motorX, 0, motorZ],
    stage: "structure"
  });

  const motorFootGeo = new THREE.BoxGeometry(0.56, 0.10, 0.48);
  reg.part("motor.foot", motorFootGeo, {
    parent: motorGroup,
    pos: [0, topSurfaceY + 0.05, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const motorWebGeo = new THREE.BoxGeometry(0.42, 0.30, 0.30);
  reg.part("motor.pedestal", motorWebGeo, {
    parent: motorGroup,
    pos: [0, topSurfaceY + 0.24, 0],
    ramp: "mid",
    outline: "lo",
    crease: "lo",
    mountOn: "motor.foot"
  });

  const motorStatorGeo = buildCylinderGeometry(0.24, 0.24, 0.56, { segments: 28, axis: "x" });
  reg.part("motor.housing", motorStatorGeo, {
    parent: motorGroup,
    pos: [0, inputY, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "motor.pedestal",
    allowOverlap: ["gearbox.inputShaft"]
  });

  [-0.18, -0.06, 0.06, 0.18].forEach((mx, idx) => {
    const finRing = makeRingLine(0.244, 28, kit, "lo");
    finRing.rotation.y = Math.PI / 2;
    finRing.position.set(mx, inputY, 0);
    reg.detail(`motor.fin.${idx}`, finRing, { parent: motorGroup });
  });

  const motorCapGeo = buildCylinderGeometry(0.19, 0.24, 0.14, { segments: 24, axis: "x" });
  reg.part("motor.endCap", motorCapGeo, {
    parent: motorGroup,
    pos: [0.35, inputY, 0],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "motor.housing"
  });

  // 3. Three 120° CCPM Servo Actuators mounted around the gearbox on base.plate
  SERVO_ANGLES.forEach((ang, idx) => {
    const sx = Math.cos(ang) * SPEC.servoMountR;
    const sz = mastZ + Math.sin(ang) * SPEC.servoMountR;

    const servoGroup = reg.group(`servo.${idx}`, {
      parent: baseGroup,
      pos: [sx, 0, sz],
      stage: "structure"
    });

    const baseFlangeGeo = new THREE.BoxGeometry(0.28, 0.08, 0.28);
    reg.part(`servo.base.${idx}`, baseFlangeGeo, {
      parent: servoGroup,
      pos: [0, topSurfaceY + 0.04, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: "base.plate"
    });

    const bodyH = 0.66;
    const bodyGeo = buildCylinderGeometry(0.11, 0.12, bodyH, { segments: 22, axis: "y" });
    const bodyPart = reg.part(`servo.body.${idx}`, bodyGeo, {
      parent: servoGroup,
      pos: [0, topSurfaceY + 0.08 + bodyH * 0.5, 0],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: `servo.base.${idx}`,
      allowOverlap: [`servo.rod.${idx}`]
    });

    const glandGeo = buildCylinderGeometry(0.085, 0.105, 0.08, { segments: 20, axis: "y" });
    reg.part(`servo.gland.${idx}`, glandGeo, {
      parent: servoGroup,
      pos: [0, topSurfaceY + 0.08 + bodyH + 0.04, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: `servo.body.${idx}`,
      allowOverlap: [`servo.rod.${idx}`]
    });

    // Anchor at top of servo gland for piston rod articulation
    reg.anchor(`servo.${idx}.glandTop`, 0, topSurfaceY + 0.08 + bodyH + 0.06, 0, servoGroup);

    // Mechanical Bowden control conduit fitting pointing cleanly toward pilot input
    const portAngs = [0.0, Math.PI * 0.86, Math.PI * 0.30];
    const tubeNames = ["tube.cyclicPitch", "tube.collective", "tube.cyclicRoll"];
    const pAng = portAngs[idx];
    const portPart = reg.part(
      `servo.port.${idx}`,
      buildCylinderGeometry(0.036, 0.036, 0.07, { segments: 12, axis: "x" }),
      {
        parent: bodyPart,
        pos: [Math.cos(pAng) * 0.12, -0.18, Math.sin(pAng) * 0.12],
        rot: [0, -pAng, 0],
        ramp: "brass",
        outline: "lo",
        crease: "faint",
        mountOn: `servo.body.${idx}`,
        allowOverlap: [tubeNames[idx]]
      }
    );
    reg.anchor(`servo.${idx}.ctrlPort`, 0.025, 0, 0, portPart, {
      dir: [1, 0.06, 0]
    });

    const ring = makeRingLine(0.122, 24, kit, "lo");
    ring.rotation.x = Math.PI / 2;
    ring.position.y = topSurfaceY + 0.08 + bodyH * 0.5;
    reg.detail(`servo.band.${idx}`, ring, { parent: servoGroup });
  });

  reg.anchor("gearbox.top", 0, gearboxTopY, 0, gearboxGroup);
}
