import * as THREE from "three";
import {
  buildCylinderGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

function buildAnnularRingGeo(rInner, rOuter, height, segs = 36) {
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

export function buildStructure(reg, kit) {
  const { topSurfaceY, engineZ, enginePivotY, gantryZ, gantrySpanX, gantryTopY, pitchStandPos, yawStandPos } = SPEC;
  const standGroup = reg.group("stand.group", { stage: "structure" });

  // 1. Twin Rear Gantry Columns (left & right) bolted onto base.plate
  const colBotY = topSurfaceY + 0.14;
  const colLen = gantryTopY - colBotY;
  const colMidY = (colBotY + gantryTopY) * 0.5;

  const sides = [
    { key: "L", x: -gantrySpanX },
    { key: "R", x: gantrySpanX }
  ];

  for (const s of sides) {
    // Base mounting flange
    const footGeo = new THREE.BoxGeometry(0.56, 0.14, 0.56);
    reg.part(`stand.foot.${s.key}`, footGeo, {
      parent: standGroup,
      pos: [s.x, topSurfaceY + 0.07, gantryZ],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      mountOn: "base.plate"
    });

    [[-0.20, -0.20], [0.20, -0.20], [-0.20, 0.20], [0.20, 0.20]].forEach(([bx, bz], bi) => {
      reg.detail(
        `stand.foot.${s.key}.bolt.${bi}`,
        makeScrewDetail(s.x + bx, topSurfaceY + 0.143, gantryZ + bz, 0.032, "y", kit),
        { parent: standGroup }
      );
    });

    // Tapered base collar
    const collarGeo = new THREE.BoxGeometry(0.38, 0.26, 0.38);
    reg.part(`stand.collar.${s.key}`, collarGeo, {
      parent: standGroup,
      pos: [s.x, topSurfaceY + 0.27, gantryZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: `stand.foot.${s.key}`
    });

    // Main vertical structural gantry column
    const colGeo = new THREE.BoxGeometry(0.24, colLen, 0.26);
    reg.part(`stand.col.${s.key}`, colGeo, {
      parent: standGroup,
      pos: [s.x, colMidY, gantryZ],
      ramp: "mid",
      outline: "hi",
      crease: "lo",
      outlineWidth: 0.017,
      mountOn: `stand.foot.${s.key}`,
      allowOverlap: [`stand.collar.${s.key}`]
    });

    // Outer structural web stiffener rib
    const webX = s.x + (s.key === "L" ? -0.14 : 0.14);
    const webGeo = new THREE.BoxGeometry(0.06, colLen - 0.35, 0.14);
    reg.part(`stand.web.${s.key}`, webGeo, {
      parent: standGroup,
      pos: [webX, colMidY + 0.04, gantryZ],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: `stand.col.${s.key}`
    });

    // Column top cap plate & fasteners
    const capGeo = new THREE.BoxGeometry(0.36, 0.08, 0.36);
    reg.part(`stand.cap.${s.key}`, capGeo, {
      parent: standGroup,
      pos: [s.x, gantryTopY + 0.04, gantryZ],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      mountOn: `stand.col.${s.key}`
    });

    [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].forEach(([bx, bz], bi) => {
      reg.detail(
        `stand.cap.${s.key}.bolt.${bi}`,
        makeScrewDetail(s.x + bx, gantryTopY + 0.083, gantryZ + bz, 0.026, "y", kit),
        { parent: standGroup }
      );
    });
  }

  // 2. Heavy Upper Crossbeam spanning both gantry columns
  const crossBeamY = gantryTopY - 0.08;
  const crossGeo = new THREE.BoxGeometry(gantrySpanX * 2 + 0.24, 0.24, 0.28);
  reg.part("stand.crossbeam", crossGeo, {
    parent: standGroup,
    pos: [0, crossBeamY, gantryZ],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "stand.col.L",
    allowOverlap: ["stand.col.R", "stand.cap.L", "stand.cap.R"]
  });

  // 3. Twin Forward Cantilever Thrust Beams from crossbeam to upper engine thrust ring
  const armLen = Math.abs(engineZ - gantryZ) + 0.10;
  const armMidZ = (gantryZ + engineZ) * 0.5;
  for (const s of [{ key: "L", x: -0.54 }, { key: "R", x: 0.54 }]) {
    const armGeo = new THREE.BoxGeometry(0.18, 0.20, armLen);
    reg.part(`stand.arm.${s.key}`, armGeo, {
      parent: standGroup,
      pos: [s.x, crossBeamY, armMidZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "stand.crossbeam"
    });
  }

  // 4. Circular Upper Thrust-Mount Ring & Gimbal Clevis Housing above engine pivot
  const thrustRingY = crossBeamY - 0.02;
  const thrustRingGeo = buildAnnularRingGeo(0.36, 0.72, 0.16, 36);
  reg.part("stand.thrustRing", thrustRingGeo, {
    parent: standGroup,
    pos: [0, thrustRingY, engineZ],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "stand.arm.L",
    allowOverlap: ["stand.arm.R"]
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    reg.detail(
      `stand.thrustRing.bolt.${i}`,
      makeScrewDetail(Math.cos(a) * 0.56, thrustRingY + 0.092, engineZ + Math.sin(a) * 0.56, 0.026, "y", kit),
      { parent: standGroup }
    );
  }

  // Top dome cover cap on thrust ring (gimbal bearing cap)
  const gimbalCapGeo = buildCylinderGeometry(0.28, 0.36, 0.10, { segments: 24, axis: "y" });
  reg.part("stand.gimbalCap", gimbalCapGeo, {
    parent: standGroup,
    pos: [0, thrustRingY + 0.12, engineZ],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "stand.thrustRing"
  });

  // Left & Right Upper Gimbal Clevis Ears descending from thrust ring to enginePivotY
  const earH = thrustRingY - enginePivotY + 0.08;
  const earMidY = (thrustRingY + enginePivotY) * 0.5;
  for (const [ek, ex] of [["L", -0.36], ["R", 0.36]]) {
    const earGeo = new THREE.BoxGeometry(0.10, earH, 0.22);
    reg.part(`stand.gimbalEar.${ek}`, earGeo, {
      parent: standGroup,
      pos: [ex, earMidY, engineZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "stand.thrustRing"
    });
  }

  // 5. TVC Actuator Stationary Brackets & Hydraulic Inlet Ports
  // Pitch TVC bracket mounted below rear crossbeam down to pitchStandPos
  const pitchBrkH = crossBeamY - 0.12 - pitchStandPos[1] + 0.14;
  const pitchBrkGeo = new THREE.BoxGeometry(0.20, pitchBrkH, 0.18);
  reg.part("stand.pitchBracket", pitchBrkGeo, {
    parent: standGroup,
    pos: [pitchStandPos[0], pitchStandPos[1] + pitchBrkH * 0.5 - 0.02, pitchStandPos[2]],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "stand.crossbeam"
  });
  reg.anchor("tvc.pitch.stand", pitchStandPos[0], pitchStandPos[1], pitchStandPos[2], standGroup, { dir: [0, -1, 0] });

  const pitchHydPortGeo = buildCylinderGeometry(0.04, 0.045, 0.07, { segments: 14, axis: "x" });
  reg.part("stand.pitchHydPort", pitchHydPortGeo, {
    parent: standGroup,
    pos: [pitchStandPos[0] - 0.13, pitchStandPos[1] + 0.10, pitchStandPos[2] + 0.04],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "stand.pitchBracket"
  });
  reg.anchor("tvc.pitch.hydIn", pitchStandPos[0] - 0.16, pitchStandPos[1] + 0.10, pitchStandPos[2] + 0.04, standGroup, { dir: [-1, 0, 0] });

  // Yaw TVC outrigger arm projecting left & rear from stand.arm.L to yawStandPos
  const yawOutGeo = new THREE.BoxGeometry(0.68, 0.14, 0.18);
  reg.part("stand.yawOutrigger", yawOutGeo, {
    parent: standGroup,
    pos: [-0.88, crossBeamY, yawStandPos[2]],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "stand.arm.L",
    allowOverlap: ["stand.thrustRing"]
  });

  const yawBrkH = crossBeamY - 0.07 - yawStandPos[1] + 0.10;
  const yawBrkGeo = new THREE.BoxGeometry(0.18, yawBrkH, 0.18);
  reg.part("stand.yawBracket", yawBrkGeo, {
    parent: standGroup,
    pos: [yawStandPos[0], yawStandPos[1] + yawBrkH * 0.5 - 0.02, yawStandPos[2]],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "stand.yawOutrigger"
  });
  reg.anchor("tvc.yaw.stand", yawStandPos[0], yawStandPos[1], yawStandPos[2], standGroup, { dir: [0, -1, 0] });

  const yawHydPortGeo = buildCylinderGeometry(0.04, 0.045, 0.07, { segments: 14, axis: "x" });
  reg.part("stand.yawHydPort", yawHydPortGeo, {
    parent: standGroup,
    pos: [yawStandPos[0] - 0.12, yawStandPos[1] + 0.08, yawStandPos[2]],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "stand.yawBracket"
  });
  reg.anchor("tvc.yaw.hydIn", yawStandPos[0] - 0.15, yawStandPos[1] + 0.08, yawStandPos[2], standGroup, { dir: [-1, 0, 0] });

  // 6. Upper Stationary Cryogenic Feed Bosses (receive LH2 & LOX supply pipes)
  const lh2BossPos = [-0.74, crossBeamY - 0.04, -0.78];
  const lh2BossGeo = buildCylinderGeometry(0.11, 0.12, 0.22, { segments: 20, axis: "x" });
  reg.part("stand.lh2FeedBoss", lh2BossGeo, {
    parent: standGroup,
    pos: lh2BossPos,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "stand.arm.L"
  });
  reg.anchor("lh2.supply.in", lh2BossPos[0] - 0.11, lh2BossPos[1], lh2BossPos[2], standGroup, { dir: [-1, 0, 0] });

  const loxBossPos = [0.74, crossBeamY - 0.04, -0.78];
  const loxBossGeo = buildCylinderGeometry(0.11, 0.12, 0.22, { segments: 20, axis: "x" });
  reg.part("stand.loxFeedBoss", loxBossGeo, {
    parent: standGroup,
    pos: loxBossPos,
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "stand.arm.R"
  });
  reg.anchor("lox.supply.in", loxBossPos[0] + 0.11, loxBossPos[1], loxBossPos[2], standGroup, { dir: [1, 0, 0] });

  // Upper pressure sense manifold tap on right thrust arm for Chamber Pressure dial gauge
  const pcTapPos = [0.72, crossBeamY - 0.04, -0.22];
  const pcTapGeo = buildCylinderGeometry(0.045, 0.055, 0.16, { segments: 16, axis: "x" });
  reg.part("stand.pcTapBoss", pcTapGeo, {
    parent: standGroup,
    pos: pcTapPos,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "stand.thrustRing"
  });
  reg.anchor("pc.tap.out", pcTapPos[0] + 0.08, pcTapPos[1], pcTapPos[2], standGroup, { dir: [1, 0, 0] });
}
