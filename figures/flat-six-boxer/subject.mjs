import * as THREE from "three";
import { buildCylinderGeometry, buildExternalGearGeometry, makeRingLine } from "../../kit/primitives.mjs";
import { SPEC, getPistonKinematics, boreClearanceForCylinder } from "./model.mjs";

/**
 * Merges an array of BufferGeometries (converting indexed to non-indexed) into one clean BufferGeometry.
 */
function mergeBufferGeometries(geos) {
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVerts = 0;
  for (const g of nonIndexed) {
    totalVerts += g.attributes.position.count;
  }
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position.array;
    const norm = g.attributes.normal.array;
    positions.set(pos, offset * 3);
    normals.set(norm, offset * 3);
    offset += g.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return merged;
}

/**
 * Builds a 3D conical-hub billet compressor / turbine impeller with 10 pitched swept blades.
 */
function buildImpellerWheelGeometry(rHub, rTip, depth, blades = 10, twistSign = 1) {
  const geos = [];

  // 1. Backplate disk (at -depth/2)
  const backGeo = buildCylinderGeometry(rTip * 0.96, rTip * 0.96, 0.022, { segments: 24, axis: "z" });
  backGeo.translate(0, 0, -depth * 0.44);
  geos.push(backGeo);

  // 2. Tapered conical nose hub
  const hubGeo = buildCylinderGeometry(rHub * 0.55, rHub * 1.15, depth * 0.96, { segments: 20, axis: "z" });
  geos.push(hubGeo);

  // 3. 10 pitched 3D swept impeller blades radiating around Z
  const bladeLen = rTip - rHub * 0.65;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -depth * 0.42);
  bladeShape.lineTo(bladeLen, -depth * 0.42);
  bladeShape.lineTo(bladeLen, depth * 0.14);
  bladeShape.quadraticCurveTo(bladeLen * 0.55, depth * 0.36, 0, depth * 0.40);
  bladeShape.closePath();

  const baseBlade = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.016,
    bevelEnabled: false
  });
  baseBlade.translate(rHub * 0.60, 0, -0.008);
  // Orient blade along radial +X with axial profile in Z, then pitch around radial X
  baseBlade.rotateX(Math.PI / 2);
  baseBlade.rotateX(twistSign * 0.52);

  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const g = baseBlade.clone();
    g.rotateZ(a);
    geos.push(g);
  }

  return mergeBufferGeometries(geos);
}

/**
 * Builds a sculpted counterweighted crankshaft web centered at (0,0,0) with crankpin at (+rThrow, 0, 0)
 * and wider counterweight fan opposite at (-0.15, 0, 0).
 */
function buildCrankWebGeometry(rThrow, thickness = 0.052) {
  const shape = new THREE.Shape();
  // Pin end (radius 0.085 at +rThrow) -> Counterweight arc (radius 0.19 at -X)
  shape.absarc(rThrow, 0, 0.082, -Math.PI * 0.45, Math.PI * 0.45, false);
  shape.lineTo(-0.04, 0.16);
  shape.absarc(-0.04, 0, 0.175, Math.PI * 0.5, Math.PI * 1.5, false);
  shape.lineTo(rThrow, -0.082);
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

/**
 * Builds an open 5-spoke machined harmonic damper crank pulley so the timing drive behind it remains visible.
 */
function buildSpokedPulleyGeometry(rOuter, rHub, thickness, spokes = 5) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);

  const rIn = rOuter - 0.055;
  const rOutHub = rHub + 0.035;
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

/**
 * Builds an I-beam connecting rod extending from (0,0,0) big-end to (+L,0,0) wrist pin.
 */
function buildConrodGeometry(length) {
  const shape = new THREE.Shape();
  const rBig = 0.076;
  const rSmall = 0.048;
  const wBig = 0.046;
  const wSmall = 0.032;

  shape.absarc(0, 0, rBig, Math.PI * 0.25, Math.PI * 1.75, false);
  shape.lineTo(length, -wSmall);
  shape.absarc(length, 0, rSmall, -Math.PI * 0.25, Math.PI * 0.25, false);
  shape.lineTo(0, wBig);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.058,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 1
  });
  geo.translate(0, 0, -0.029);
  return geo;
}

/**
 * Builds an eccentric pear-shaped cam lobe for DOHC camshafts.
 */
function buildCamLobeGeometry(baseR, noseLift, width) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, baseR, Math.PI * 0.35, Math.PI * 1.65, false);
  shape.quadraticCurveTo(baseR + noseLift * 0.9, -baseR * 0.45, baseR + noseLift, 0);
  shape.quadraticCurveTo(baseR + noseLift * 0.9, baseR * 0.45, Math.cos(Math.PI * 0.35) * baseR, Math.sin(Math.PI * 0.35) * baseR);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1
  });
  geo.translate(0, 0, -width * 0.5);
  return geo;
}

/**
 * Builds a poppet valve (stem + flared tulip head) aligned along X with head at (0,0,0) and stem extending +X.
 */
function buildPoppetValveGeometry(bankSign) {
  const stem = buildCylinderGeometry(0.016, 0.016, 0.22, { segments: 10, axis: "x" });
  stem.translate(bankSign * 0.11, 0, 0);
  const head = buildCylinderGeometry(bankSign > 0 ? 0.056 : 0.022, bankSign > 0 ? 0.022 : 0.056, 0.028, { segments: 14, axis: "x" });
  return mergeBufferGeometries([stem, head]);
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
    turboX,
    turboY,
    turboZ
  } = SPEC;

  // 1. Rotating Counterweighted Forged Crankshaft + Toothed Flywheel + Timing Drive
  const crankGroup = reg.group("crank.group", {
    parent: subjectGroup,
    pos: [0, crankY, 0],
    stage: "subject"
  });

  reg.part("crank.mainShaft", buildCylinderGeometry(0.072, 0.072, 2.58, { segments: 20, axis: "z" }), {
    parent: crankGroup,
    pos: [0, 0, 0],
    ramp: "hi",
    outline: "hi",
    crease: "faint",
    mountOn: "coaxial",
    allowOverlap: [
      "struct.bulkhead.front",
      "struct.bulkhead.midF",
      "struct.bulkhead.midR",
      "struct.bulkhead.rear",
      "crank.pulley",
      "crank.timingGear",
      "crank.flywheel",
      "crank.starterRing"
    ]
  });

  // Front Crank Timing Sprocket (16T brass gear driving 4 camshaft sprockets at 0.5x speed)
  reg.part("crank.timingGear", buildExternalGearGeometry(0.088, 14, 0.018, 0.050, 0.45), {
    parent: crankGroup,
    pos: [0, 0, 1.18],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "crank.mainShaft",
    allowOverlap: ["struct.bulkhead.front"]
  });

  // Front Open 5-Spoke Harmonic Damper Pulley (directly draggable in 3D!)
  reg.part("crank.pulley", buildSpokedPulleyGeometry(0.26, 0.085, 0.075, 5), {
    parent: crankGroup,
    pos: [0, 0, 1.30],
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    explode: [0, 0, 0.36],
    mountOn: "crank.mainShaft"
  });

  const pulleyMark = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.09, 1.345),
      new THREE.Vector3(0, 0.25, 1.345)
    ]),
    kit.lineMaterials.hi
  );
  reg.detail("crank.pulley.mark", pulleyMark, { parent: crankGroup });

  // Rear Billet Flywheel + Toothed Brass Starter Ring Gear
  reg.part("crank.flywheel", buildCylinderGeometry(0.32, 0.32, 0.075, { segments: 32, axis: "z" }), {
    parent: crankGroup,
    pos: [0, 0, -1.20],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    explode: [0, 0, -0.30],
    mountOn: "crank.mainShaft",
    allowOverlap: ["struct.bulkhead.rear"]
  });
  reg.part("crank.starterRing", buildExternalGearGeometry(0.345, 36, 0.028, 0.042, 0.88), {
    parent: crankGroup,
    pos: [0, 0, -1.20],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    explode: [0, 0, -0.30],
    mountOn: "crank.flywheel"
  });

  // 6 Counterweighted Crank Throws, Conrods, Wrist Pins & Multi-Ring Pistons
  const pinGeo = buildCylinderGeometry(0.058, 0.058, 0.13, { segments: 16, axis: "z" });
  const webGeo = buildCrankWebGeometry(rThrow, 0.050);
  const conrodGeo = buildConrodGeometry(rodLength);

  const pistonGeo = buildCylinderGeometry(pistonRadius, pistonRadius * 0.985, pistonLength, { segments: 24, axis: "x" });
  const ringGeo = buildCylinderGeometry(pistonRadius + 0.005, pistonRadius + 0.005, 0.014, { segments: 24, axis: "x" });
  const wristPinGeo = buildCylinderGeometry(0.036, 0.036, pistonRadius * 1.68, { segments: 14, axis: "z" });

  SPEC.cylinders.forEach((cyl) => {
    const throwRad = (cyl.crankOffsetDeg * Math.PI) / 180 + (cyl.bank < 0 ? Math.PI : 0);
    const px = rThrow * Math.cos(throwRad);
    const py = rThrow * Math.sin(throwRad);

    // Counterweighted crank web
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

    // Crankpin journal
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

    // Forged I-Beam Connecting Rod
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

    // Opposed Forged Piston (lit!)
    const pistonGroup = reg.group(`piston.group.${cyl.id}`, {
      parent: subjectGroup,
      pos: [restK.pistonPinX, crankY, cyl.z],
      stage: "subject"
    });
    const pistonId = `piston.${cyl.id}`;
    reg.part(pistonId, pistonGeo, {
      parent: pistonGroup,
      pos: [cyl.bank * 0.03, 0, 0],
      ramp: "lit",
      outline: "hi",
      crease: "lo",
      mountOn: `conrod.${cyl.id}`,
      insideBoreOf: `cyl.barrel.${cyl.id}`,
      boreClearanceFn: (_x, y, z) => SPEC.boreRadius - Math.hypot(y, z),
      allowOverlap: [`conrod.${cyl.id}`, `cyl.barrel.${cyl.id}`]
    });

    // Dual compression + oil ring pack near crown
    reg.part(`piston.ringA.${cyl.id}`, ringGeo, {
      parent: pistonGroup,
      pos: [cyl.bank * 0.092, 0, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.part(`piston.ringB.${cyl.id}`, ringGeo, {
      parent: pistonGroup,
      pos: [cyl.bank * 0.066, 0, 0],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    // Floating steel wrist (gudgeon) pin visible at piston skirt window
    reg.part(`piston.wristPin.${cyl.id}`, wristPinGeo, {
      parent: pistonGroup,
      pos: [0, 0, 0],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // 2. 4 DOHC Camshafts (0.5x Crank Speed), Cam Sprockets, Timing Idlers & 12 Poppet Valves
  const camShaftGeo = buildCylinderGeometry(0.038, 0.038, 2.24, { segments: 14, axis: "z" });
  const camSprocketGeo = buildExternalGearGeometry(0.118, 22, 0.018, 0.044, 0.34);
  const camLobeGeo = buildCamLobeGeometry(0.044, 0.048, 0.055);

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

      // Toothed brass camshaft sprocket at front timing face (z = +1.18 in world -> +1.12 in camGroup)
      reg.part(`cam.sprocket.${kind}.${side}`, camSprocketGeo, {
        parent: camGroup,
        pos: [0, 0, 1.12],
        ramp: "brass",
        outline: "mid",
        crease: "faint",
        mountOn: `cam.shaft.${kind}.${side}`
      });

      // Eccentric cam lobes positioned at each cylinder along this bank
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

    // Timing belt guide track lines connecting crank gear -> intake/exhaust cam sprockets (front face z = 1.18)
    const cx0 = 0;
    const cy0 = crankY;
    const cTopX = bSign * camAbsX;
    const cTopY = crankY + camOffsetY;
    const cBotY = crankY - camOffsetY;
    const beltPts = [
      new THREE.Vector3(cx0, cy0 + 0.09, 1.18),
      new THREE.Vector3(cTopX, cTopY + 0.12, 1.18),
      new THREE.Vector3(cTopX + bSign * 0.12, cTopY, 1.18),
      new THREE.Vector3(cTopX + bSign * 0.12, cBotY, 1.18),
      new THREE.Vector3(cTopX, cBotY - 0.12, 1.18),
      new THREE.Vector3(cx0, cy0 - 0.09, 1.18)
    ];
    reg.detail(
      `timing.belt.${side}`,
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(beltPts), kit.lineMaterials.hi),
      { parent: subjectGroup }
    );
  });

  // 12 Animated Poppet Valves (6 Intake + 6 Exhaust) driven by cam lift
  const valveInGeo = { "-1": buildPoppetValveGeometry(-1), "1": buildPoppetValveGeometry(1) };
  SPEC.cylinders.forEach((cyl) => {
    const bSign = cyl.bank;
    const valveBaseX = bSign * (SPEC.boreEndAbsX + 0.03);
    const inGroup = reg.group(`valve.in.group.${cyl.id}`, {
      parent: subjectGroup,
      pos: [valveBaseX, crankY + camOffsetY, cyl.z - 0.05],
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
      pos: [valveBaseX, crankY - camOffsetY, cyl.z + 0.05],
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

  // 3. Twin 3D Conical-Hub Swept Impeller Turbocharger Rotors
  const turboShaftGeo = buildCylinderGeometry(0.042, 0.042, 0.44, { segments: 14, axis: "z" });
  const turbineWheelGeo = buildImpellerWheelGeometry(0.068, 0.180, 0.13, 10, 1);
  const compWheelGeo = buildImpellerWheelGeometry(0.064, 0.180, 0.13, 10, -1);
  const noseNutGeo = buildCylinderGeometry(0.022, 0.038, 0.05, { segments: 12, axis: "z" });

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
      pos: [0, 0, -0.21],
      ramp: "comb",
      outline: "mid",
      crease: "lo",
      mountOn: `turbo.shaft.${side}`,
      allowOverlap: [`turbo.turbineScroll.${side}`]
    });

    reg.part(`turbo.compWheel.${side}`, compWheelGeo, {
      parent: rotorGroup,
      pos: [0, 0, 0.21],
      ramp: "lit",
      outline: "hi",
      crease: "lo",
      mountOn: `turbo.shaft.${side}`,
      allowOverlap: [`turbo.compScroll.${side}`]
    });

    reg.part(`turbo.noseNut.${side}`, noseNutGeo, {
      parent: rotorGroup,
      pos: [0, 0, 0.28],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    const ring = makeRingLine(0.185, 24, kit, "lo");
    ring.position.z = 0.27;
    reg.detail(`turbo.compRing.${side}`, ring, { parent: rotorGroup });
  });
}
