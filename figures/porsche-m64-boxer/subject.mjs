import * as THREE from "three";
import { buildCylinderGeometry, buildExternalGearGeometry, buildSlabGeometry, makeRingLine } from "../../kit/primitives.mjs";
import { SPEC, getPistonKinematics } from "./model.mjs";

function mergeBufferGeometries(geos) {
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVerts = 0;
  for (const g of nonIndexed) totalVerts += g.attributes.position.count;
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    if (!g.attributes.normal) g.computeVertexNormals();
    positions.set(g.attributes.position.array, offset * 3);
    normals.set(g.attributes.normal.array, offset * 3);
    offset += g.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return merged;
}

function buildImpellerWheelGeometry(rHub, rTip, depth, blades = 10, twistSign = 1) {
  const geos = [];
  const backGeo = buildCylinderGeometry(rTip * 0.94, rTip * 0.94, 0.02, { segments: 24, axis: "z" });
  backGeo.translate(0, 0, -depth * 0.44);
  geos.push(backGeo);

  const hubGeo = buildCylinderGeometry(rHub * 0.52, rHub * 1.12, depth * 0.94, { segments: 20, axis: "z" });
  geos.push(hubGeo);

  const bladeLen = rTip - rHub * 0.62;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -depth * 0.40);
  bladeShape.lineTo(bladeLen, -depth * 0.40);
  bladeShape.lineTo(bladeLen, depth * 0.14);
  bladeShape.quadraticCurveTo(bladeLen * 0.55, depth * 0.34, 0, depth * 0.38);
  bladeShape.closePath();

  const baseBlade = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.015, bevelEnabled: false });
  baseBlade.translate(rHub * 0.58, 0, -0.0075);
  baseBlade.rotateX(Math.PI / 2);
  baseBlade.rotateX(twistSign * 0.52);

  for (let i = 0; i < blades; i++) {
    const g = baseBlade.clone();
    g.rotateZ((i / blades) * Math.PI * 2);
    geos.push(g);
  }
  return mergeBufferGeometries(geos);
}

function buildCrankWebGeometry(rThrow, thickness = 0.048) {
  const shape = new THREE.Shape();
  shape.absarc(rThrow, 0, 0.078, -Math.PI * 0.45, Math.PI * 0.45, false);
  shape.lineTo(-0.04, 0.15);
  shape.absarc(-0.04, 0, 0.165, Math.PI * 0.5, Math.PI * 1.5, false);
  shape.lineTo(rThrow, -0.078);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 1
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function buildSpokedPulleyGeometry(rOuter, rHub, thickness, spokes = 5) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);

  const rIn = rOuter - 0.052;
  const rOutHub = rHub + 0.032;
  const spokeHalfAngle = 0.17;
  const sector = (Math.PI * 2) / spokes;

  for (let i = 0; i < spokes; i++) {
    const a0 = i * sector + spokeHalfAngle;
    const a1 = (i + 1) * sector - spokeHalfAngle;
    if (a1 <= a0 + 0.05) continue;
    const hole = new THREE.Path();
    hole.absarc(0, 0, rOutHub, a0, a1, false);
    hole.absarc(0, 0, rIn, a1, a0, true);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 1,
    curveSegments: 24
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function buildConrodGeometry(length) {
  const shape = new THREE.Shape();
  const rBig = 0.072;
  const rSmall = 0.046;
  const wBig = 0.044;
  const wSmall = 0.030;

  shape.absarc(0, 0, rBig, Math.PI * 0.25, Math.PI * 1.75, false);
  shape.lineTo(length, -wSmall);
  shape.absarc(length, 0, rSmall, -Math.PI * 0.25, Math.PI * 0.25, false);
  shape.lineTo(0, wBig);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.054,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 1
  });
  geo.translate(0, 0, -0.027);
  return geo;
}

function buildCamLobeGeometry(baseR, noseY, thickness = 0.050) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, baseR, Math.PI * 0.15, Math.PI * 1.85, false);
  shape.quadraticCurveTo(baseR * 1.35, noseY * 0.55, 0, noseY + baseR * 0.72);
  shape.quadraticCurveTo(-baseR * 1.35, noseY * 0.55, Math.cos(Math.PI * 0.15) * baseR, Math.sin(Math.PI * 0.15) * baseR);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function buildPoppetValveGeometry(bankSign) {
  const geos = [];
  const headGeo = buildCylinderGeometry(0.056, 0.032, 0.026, { segments: 16, axis: "x" });
  headGeo.translate(bankSign * 0.013, 0, 0);
  geos.push(headGeo);

  const stemGeo = buildCylinderGeometry(0.014, 0.014, 0.23, { segments: 10, axis: "x" });
  stemGeo.translate(bankSign * 0.135, 0, 0);
  geos.push(stemGeo);

  const keeperGeo = buildCylinderGeometry(0.030, 0.030, 0.020, { segments: 12, axis: "x" });
  keeperGeo.translate(bankSign * 0.23, 0, 0);
  geos.push(keeperGeo);

  return mergeBufferGeometries(geos);
}

/**
 * Closed V-belt loop wrapping around top fan pulley (yTop, rTop) and bottom crank pulley (yBot, rBot).
 */
function buildBeltLoopGeometry(yTop, rTop, yBot, rBot, width, thickness) {
  const outer = new THREE.Shape();
  const dy = yTop - yBot;
  const sinA = (rBot - rTop) / dy;
  const ang = Math.asin(Math.max(-0.92, Math.min(0.92, sinA)));

  const rT = rTop + thickness;
  const rB = rBot + thickness;
  outer.absarc(0, yTop, rT, Math.PI - ang, ang, true);
  outer.absarc(0, yBot, rB, ang, Math.PI - ang, true);
  outer.closePath();

  const inner = new THREE.Path();
  inner.absarc(0, yTop, rTop, Math.PI - ang, ang, true);
  inner.absarc(0, yBot, rBot, ang, Math.PI - ang, true);
  inner.closePath();
  outer.holes.push(inner);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: width,
    bevelEnabled: false,
    curveSegments: 28
  });
  geo.translate(0, 0, -width * 0.5);
  return geo;
}

export function buildSubject(reg, kit) {
  const subjectGroup = reg.group("subject.group", { stage: "subject" });
  const {
    crankY,
    rThrow,
    rodLength,
    pistonRadius,
    pistonLength,
    camAbsX,
    camOffsetY,
    fanY,
    fanZ,
    fanRadius,
    turboX,
    turboY,
    turboZ
  } = SPEC;

  // 1. 6-Throw 180-deg Forged Crankshaft + Open Spoked Pulley + Timing Gear + Flywheel
  const crankGroup = reg.group("crank.group", {
    parent: subjectGroup,
    pos: [0, crankY, 0],
    stage: "subject"
  });

  reg.part("crank.mainShaft", buildCylinderGeometry(0.068, 0.068, 2.52, { segments: 20, axis: "z" }), {
    parent: crankGroup,
    pos: [0, 0, 0.02],
    ramp: "hi",
    outline: "hi",
    crease: "faint",
    mountOn: "coaxial",
    allowOverlap: ["struct.bulkhead.front", "struct.bulkhead.midF", "struct.bulkhead.midR", "struct.bulkhead.rear"]
  });

  reg.part("crank.gear", buildExternalGearGeometry(0.115, 22, 0.016, 0.068, 0.34), {
    parent: crankGroup,
    pos: [0, 0, 1.15],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "crank.mainShaft"
  });

  reg.part("crank.pulley", buildSpokedPulleyGeometry(0.225, 0.070, 0.062, 5), {
    parent: crankGroup,
    pos: [0, 0, 1.25],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    explode: [0, 0, 0.36],
    mountOn: "crank.mainShaft"
  });

  reg.detail(
    "crank.pulley.mark",
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.09, 1.29),
        new THREE.Vector3(0, 0.21, 1.29)
      ]),
      kit.lineMaterials.hi
    ),
    { parent: crankGroup }
  );

  // Rear Billet Flywheel + Brass Starter Ring Gear
  reg.part("crank.flywheel", buildCylinderGeometry(0.31, 0.31, 0.072, { segments: 32, axis: "z" }), {
    parent: crankGroup,
    pos: [0, 0, -1.19],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    explode: [0, 0, -0.32],
    mountOn: "crank.mainShaft",
    allowOverlap: ["struct.bulkhead.rear"]
  });
  reg.part("crank.starterRing", buildExternalGearGeometry(0.335, 36, 0.026, 0.042, 0.85), {
    parent: crankGroup,
    pos: [0, 0, -1.19],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    explode: [0, 0, -0.32],
    mountOn: "crank.flywheel"
  });

  // 6 Counterweighted Throws, I-Beam Conrods & Lit Pistons
  const pinGeo = buildCylinderGeometry(0.056, 0.056, 0.125, { segments: 16, axis: "z" });
  const webGeo = buildCrankWebGeometry(rThrow, 0.048);
  const conrodGeo = buildConrodGeometry(rodLength);

  const pistonGeo = buildCylinderGeometry(pistonRadius, pistonRadius * 0.985, pistonLength, { segments: 24, axis: "x" });
  const ringGeo = buildCylinderGeometry(pistonRadius + 0.005, pistonRadius + 0.005, 0.013, { segments: 24, axis: "x" });
  const wristPinGeo = buildCylinderGeometry(0.034, 0.034, pistonRadius * 1.65, { segments: 14, axis: "z" });

  SPEC.cylinders.forEach((cyl) => {
    const throwRad = (cyl.crankOffsetDeg * Math.PI) / 180 + (cyl.bank < 0 ? Math.PI : 0);
    const px = rThrow * Math.cos(throwRad);
    const py = rThrow * Math.sin(throwRad);

    const webId = `crank.web.${cyl.id}`;
    reg.part(webId, webGeo, {
      parent: crankGroup,
      pos: [0, 0, cyl.z],
      rot: [0, 0, throwRad],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "crank.mainShaft",
      allowOverlap: [`crank.pin.${cyl.id}`, "crank.mainShaft"]
    });

    const pinId = `crank.pin.${cyl.id}`;
    reg.part(pinId, pinGeo, {
      parent: crankGroup,
      pos: [px, py, cyl.z],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: webId,
      allowOverlap: [`conrod.${cyl.id}`, "crank.mainShaft"]
    });

    const restK = getPistonKinematics(cyl, SPEC.initialTheta);
    const rodGroup = reg.group(`conrod.group.${cyl.id}`, {
      parent: subjectGroup,
      pos: [restK.cx, restK.cy, cyl.z],
      rot: [0, 0, restK.rodAngleZ],
      stage: "subject"
    });
    reg.part(`conrod.${cyl.id}`, conrodGeo, {
      parent: rodGroup,
      ramp: "hi",
      outline: "mid",
      crease: "faint",
      mountOn: pinId,
      allowOverlap: [pinId, `piston.${cyl.id}`, "crank.mainShaft", webId]
    });

    const pistonGroup = reg.group(`piston.group.${cyl.id}`, {
      parent: subjectGroup,
      pos: [restK.pistonPinX, crankY, cyl.z],
      stage: "subject"
    });
    const pistonId = `piston.${cyl.id}`;
    reg.part(pistonId, pistonGeo, {
      parent: pistonGroup,
      pos: [cyl.bank * 0.025, 0, 0],
      ramp: "lit",
      outline: "hi",
      crease: "lo",
      mountOn: `conrod.${cyl.id}`,
      insideBoreOf: `cyl.barrel.${cyl.id}`,
      boreClearanceFn: (_x, y, z) => SPEC.boreRadius - Math.hypot(y, z),
      allowOverlap: [`conrod.${cyl.id}`, `cyl.barrel.${cyl.id}`]
    });

    reg.part(`piston.ringA.${cyl.id}`, ringGeo, {
      parent: pistonGroup,
      pos: [cyl.bank * 0.085, 0, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.part(`piston.ringB.${cyl.id}`, ringGeo, {
      parent: pistonGroup,
      pos: [cyl.bank * 0.060, 0, 0],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.part(`piston.wristPin.${cyl.id}`, wristPinGeo, {
      parent: pistonGroup,
      pos: [0, 0, 0],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // 2. Porsche 11-Blade Axial Cooling Fan (1.62:1 drive) + Crank-to-Fan V-Belt
  const fanGroup = reg.group("subject.fanGroup", {
    parent: subjectGroup,
    pos: [0, fanY, fanZ],
    explode: [0, 0, 0.24],
    stage: "subject"
  });

  reg.part("subject.fanHub", buildCylinderGeometry(0.084, 0.092, 0.11, { segments: 24, axis: "z" }), {
    parent: fanGroup,
    pos: [0, 0, 0.03],
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.fanAlternatorHub"
  });
  // Fan pulley shaft extending forward to V-belt plane (z = 1.25 -> local +0.31)
  reg.part("subject.fanPulleyShaft", buildCylinderGeometry(0.036, 0.036, 0.25, { segments: 16, axis: "z" }), {
    parent: fanGroup,
    pos: [0, 0, 0.19],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "subject.fanHub"
  });
  reg.part("subject.fanPulley", buildCylinderGeometry(0.088, 0.088, 0.056, { segments: 24, axis: "z" }), {
    parent: fanGroup,
    pos: [0, 0, 0.31],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "subject.fanPulleyShaft"
  });
  reg.detail(
    "subject.fanPulleyMark",
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.03, 0.342),
        new THREE.Vector3(0, 0.082, 0.342)
      ]),
      kit.lineMaterials.hi
    ),
    { parent: fanGroup }
  );

  const fanBladeGeo = buildSlabGeometry(fanRadius - 0.095, 0.014, 0.052, {
    radius: 0.006,
    bevel: true,
    bevelSize: 0.002,
    bevelThickness: 0.002,
    centerY: true
  });
  for (let b = 0; b < 11; b++) {
    const a = (b * Math.PI * 2) / 11;
    const gBlade = reg.group(`subject.fanBladePivot.${b}`, {
      parent: fanGroup,
      pos: [0, 0, 0.035],
      rot: [0, 0, a],
      stage: "subject"
    });
    reg.part(`subject.fanBlade.${b}`, fanBladeGeo, {
      parent: gBlade,
      pos: [0.085 + (fanRadius - 0.095) * 0.5, 0, 0],
      rot: [0.46, 0, 0],
      ramp: "lit",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  }

  // V-belt loop wrapping crank pulley (crankY, r=0.220) to fan pulley (fanY, r=0.088) at z = 1.25
  reg.part("subject.fanBelt", buildBeltLoopGeometry(fanY, 0.088, crankY, 0.220, 0.032, 0.018), {
    parent: subjectGroup,
    pos: [0, 0, 1.25],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    detail: true,
    explode: [0, 0, 0.36]
  });

  // 3. 4 Camshafts (0.5x Crank Speed), Brass Cam Sprockets, Timing Belt Tracks & 12 Poppet Valves
  const camShaftGeo = buildCylinderGeometry(0.036, 0.036, 2.18, { segments: 14, axis: "z" });
  const camSprocketGeo = buildExternalGearGeometry(0.114, 22, 0.017, 0.042, 0.32);
  const camLobeGeo = buildCamLobeGeometry(0.042, 0.046, 0.048);

  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    const bankCyls = SPEC.cylinders.filter((c) => c.bank === bSign);

    [
      { kind: "in", yOff: +camOffsetY, ramp: "intake" },
      { kind: "ex", yOff: -camOffsetY, ramp: "exhaust" }
    ].forEach(({ kind, yOff, ramp }) => {
      const camGroup = reg.group(`cam.${kind}.${side}`, {
        parent: subjectGroup,
        pos: [bSign * camAbsX, crankY + yOff, 0.06],
        stage: "subject"
      });

      reg.part(`cam.shaft.${kind}.${side}`, camShaftGeo, {
        parent: camGroup,
        ramp: "hi",
        outline: "mid",
        crease: "faint",
        mountOn: `cyl.head.${bankCyls[0].id}`,
        allowOverlap: bankCyls.map((c) => `cyl.head.${c.id}`).concat([
          "struct.bulkhead.front",
          "struct.bulkhead.rear"
        ])
      });

      reg.part(`cam.sprocket.${kind}.${side}`, camSprocketGeo, {
        parent: camGroup,
        pos: [0, 0, 1.09],
        ramp: "brass",
        outline: "mid",
        crease: "faint",
        mountOn: `cam.shaft.${kind}.${side}`
      });

      bankCyls.forEach((cyl) => {
        const lobePhase = -(cyl.fireDeg * 0.5 + (kind === "in" ? 226 : 135)) * (Math.PI / 180);
        reg.part(`cam.lobe.${kind}.${cyl.id}`, camLobeGeo, {
          parent: camGroup,
          pos: [0, 0, cyl.z - 0.06],
          rot: [0, 0, lobePhase],
          ramp,
          outline: "lo",
          crease: "faint",
          detail: true
        });
      });
    });

    const cx0 = 0;
    const cy0 = crankY;
    const cTopX = bSign * camAbsX;
    const cTopY = crankY + camOffsetY;
    const cBotY = crankY - camOffsetY;
    const beltPts = [
      new THREE.Vector3(cx0, cy0 + 0.09, 1.15),
      new THREE.Vector3(cTopX, cTopY + 0.115, 1.15),
      new THREE.Vector3(cTopX + bSign * 0.115, cTopY, 1.15),
      new THREE.Vector3(cTopX + bSign * 0.115, cBotY, 1.15),
      new THREE.Vector3(cTopX, cBotY - 0.115, 1.15),
      new THREE.Vector3(cx0, cy0 - 0.09, 1.15)
    ];
    reg.detail(
      `timing.belt.${side}`,
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(beltPts), kit.lineMaterials.hi),
      { parent: subjectGroup }
    );
  });

  const valveInGeo = { "-1": buildPoppetValveGeometry(-1), "1": buildPoppetValveGeometry(1) };
  SPEC.cylinders.forEach((cyl) => {
    const bSign = cyl.bank;
    const valveBaseX = bSign * (SPEC.boreEndAbsX + 0.03);
    const inGroup = reg.group(`valve.in.group.${cyl.id}`, {
      parent: subjectGroup,
      pos: [valveBaseX, crankY + camOffsetY, cyl.z - 0.04],
      stage: "subject"
    });
    reg.part(`valve.in.${cyl.id}`, valveInGeo[String(bSign)], {
      parent: inGroup,
      ramp: "intake",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    const exGroup = reg.group(`valve.ex.group.${cyl.id}`, {
      parent: subjectGroup,
      pos: [valveBaseX, crankY - camOffsetY, cyl.z + 0.04],
      stage: "subject"
    });
    reg.part(`valve.ex.${cyl.id}`, valveInGeo[String(bSign)], {
      parent: exGroup,
      ramp: "exhaust",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // 4. Twin 3D Conical-Hub Swept Impeller KKK K16 Rotors
  const turboShaftGeo = buildCylinderGeometry(0.038, 0.038, 0.36, { segments: 14, axis: "z" });
  const turbineWheelGeo = buildImpellerWheelGeometry(0.056, 0.145, 0.11, 10, 1);
  const compWheelGeo = buildImpellerWheelGeometry(0.052, 0.145, 0.11, 10, -1);
  const noseNutGeo = buildCylinderGeometry(0.020, 0.034, 0.045, { segments: 12, axis: "z" });

  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    const rotorGroup = reg.group(`turbo.rotor.${side}`, {
      parent: subjectGroup,
      pos: [bSign * turboX, turboY, turboZ],
      stage: "subject"
    });

    reg.part(`turbo.shaft.${side}`, turboShaftGeo, {
      parent: rotorGroup,
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: `turbo.chra.${side}`,
      allowOverlap: [`turbo.turbineScroll.${side}`, `turbo.compScroll.${side}`]
    });

    reg.part(`turbo.turbineWheel.${side}`, turbineWheelGeo, {
      parent: rotorGroup,
      pos: [0, 0, -0.17],
      ramp: "comb",
      outline: "mid",
      crease: "lo",
      mountOn: `turbo.shaft.${side}`,
      allowOverlap: [`turbo.turbineScroll.${side}`]
    });

    reg.part(`turbo.compWheel.${side}`, compWheelGeo, {
      parent: rotorGroup,
      pos: [0, 0, 0.17],
      ramp: "lit",
      outline: "hi",
      crease: "lo",
      mountOn: `turbo.shaft.${side}`,
      allowOverlap: [`turbo.compScroll.${side}`, `turbo.compShroud.${side}`]
    });

    reg.part(`turbo.noseNut.${side}`, noseNutGeo, {
      parent: rotorGroup,
      pos: [0, 0, 0.23],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    const ring = makeRingLine(0.150, 24, kit, "lo");
    ring.position.z = 0.22;
    reg.detail(`turbo.compRing.${side}`, ring, { parent: rotorGroup });
  });
}
