import * as THREE from "three";
import { buildCylinderGeometry, buildSlabGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

/**
 * Builds an extruded A-frame / arched dyno cradle pedestal with weight-relief arch.
 */
function buildDynoPedestalGeometry(widthBot, widthTop, height, depth) {
  const shape = new THREE.Shape();
  const hb = widthBot * 0.5;
  const ht = widthTop * 0.5;
  const footH = 0.09;

  shape.moveTo(-hb, 0);
  shape.lineTo(hb, 0);
  shape.lineTo(hb, footH);
  shape.lineTo(ht + 0.06, footH + 0.06);
  shape.lineTo(ht, height);
  shape.lineTo(-ht, height);
  shape.lineTo(-ht - 0.06, footH + 0.06);
  shape.lineTo(-hb, footH);
  shape.closePath();

  // Weight-relief arch hole in center of pedestal
  const hole = new THREE.Path();
  const aw = ht * 0.48;
  const ay0 = 0.16;
  const ay1 = height - 0.18;
  if (ay1 > ay0 + 0.12) {
    hole.moveTo(-aw, ay0);
    hole.lineTo(aw, ay0);
    hole.lineTo(aw, ay1 - aw * 0.6);
    hole.absarc(0, ay1 - aw * 0.6, aw, 0, Math.PI, false);
    hole.lineTo(-aw, ay0);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    bevelSegments: 1
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Builds a contoured crankcase main-bearing bulkhead web with lower sump flange
 * and semicircular crankshaft bearing saddle cutout.
 */
function buildCrankcaseBulkheadGeometry(width, height, depth, bearingR) {
  const shape = new THREE.Shape();
  const hw = width * 0.5;
  const hh = height * 0.5;
  const ch = 0.08;

  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh - ch);
  shape.lineTo(hw - ch, hh);
  shape.lineTo(bearingR * 1.15, hh);
  // Semicircular main bearing journal saddle centered at y = 0 (crankY)
  shape.absarc(0, 0, bearingR, 0, Math.PI, true);
  shape.lineTo(-hw + ch, hh);
  shape.lineTo(-hw, hh - ch);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Builds an open U-channel cutaway arc geometry along X (used for cylinder barrel & cooling fins).
 */
function buildCutawayArcXGeometry(rInner, rOuter, length, aStartDeg = 104, aEndDeg = 346, bevel = true) {
  const shape = new THREE.Shape();
  const aStart = (aStartDeg * Math.PI) / 180;
  const aEnd = (aEndDeg * Math.PI) / 180;
  const segs = 24;
  for (let i = 0; i <= segs; i++) {
    const a = aStart + (aEnd - aStart) * (i / segs);
    const x = Math.cos(a) * rOuter;
    const y = Math.sin(a) * rOuter;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = aStart + (aEnd - aStart) * (i / segs);
    shape.lineTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: bevel,
    bevelSize: bevel ? 0.006 : 0,
    bevelThickness: bevel ? 0.006 : 0,
    bevelSegments: 1,
    curveSegments: 24
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/**
 * Builds a chamfered cylinder head casting profile along X.
 */
function buildCylinderHeadGeometry(widthX, heightY, depthZ) {
  const shape = new THREE.Shape();
  const hx = widthX * 0.5;
  const hy = heightY * 0.5;
  const c = 0.045;
  shape.moveTo(-hx, -hy + c);
  shape.lineTo(-hx + c, -hy);
  shape.lineTo(hx - c, -hy);
  shape.lineTo(hx, -hy + c);
  shape.lineTo(hx, hy - c);
  shape.lineTo(hx - c, hy);
  shape.lineTo(-hx + c, hy);
  shape.lineTo(-hx, hy - c);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depthZ,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    bevelSegments: 1
  });
  geo.translate(0, 0, -depthZ * 0.5);
  return geo;
}

/**
 * Builds a sculpted spiral snail-volute turbo housing using an extruded spiral shell
 * with tangential discharge neck, open on the front (+Z) half when cutaway=true
 * so the 3D impeller spins visibly inside.
 */
function buildSnailVoluteGeometry(rInner, rOuterBase, depth, { cutaway = true, mirrorX = 1 } = {}) {
  const shape = new THREE.Shape();
  const segs = 36;
  const aStart = cutaway ? 0.42 : 0.0;
  const aEnd = cutaway ? Math.PI * 1.78 : Math.PI * 2.0;

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const a = aStart + (aEnd - aStart) * u;
    const r = rOuterBase * (0.94 + 0.28 * u);
    const x = Math.cos(a) * r * mirrorX;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  if (cutaway) {
    for (let i = segs; i >= 0; i--) {
      const u = i / segs;
      const a = aStart + (aEnd - aStart) * u;
      const x = Math.cos(a) * rInner * mirrorX;
      const y = Math.sin(a) * rInner;
      shape.lineTo(x, y);
    }
    shape.closePath();
  } else {
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.014,
    bevelSegments: 2
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Builds a full circular front compressor shroud ring with central intake bore when Cutaway=OFF.
 */
function buildTurboFrontCapGeometry(rInner, rOuter, thickness) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1,
    curveSegments: 24
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

export function buildStructure(reg, kit) {
  const structGroup = reg.group("struct.group", { stage: "structure" });
  const {
    topSurfaceY,
    crankY,
    boreRadius,
    boreStartAbsX,
    boreEndAbsX,
    headOuterAbsX,
    camAbsX,
    turboX,
    turboY,
    turboZ
  } = SPEC;

  // 1. Sculpted A-Frame Dyno Mount Pedestals (grounded cleanly on base.plate)
  const sumpBottomY = crankY - 0.50; // -0.82
  const pedH = sumpBottomY - topSurfaceY;
  const pedGeo = buildDynoPedestalGeometry(0.98, 0.72, pedH, 0.20);

  reg.part("struct.pedestal.front", pedGeo, {
    parent: structGroup,
    pos: [0, topSurfaceY, ANCHORS.pedestalFront[2]],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  reg.part("struct.pedestal.rear", pedGeo, {
    parent: structGroup,
    pos: [0, topSurfaceY, ANCHORS.pedestalRear[2]],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });

  // Pedestal base mount bolts
  [-0.36, 0.36].forEach((bx, bi) => {
    reg.detail(`struct.ped.screwF.${bi}`, makeScrewDetail(bx, topSurfaceY + 0.095, ANCHORS.pedestalFront[2], 0.025, "y", kit), { parent: structGroup });
    reg.detail(`struct.ped.screwR.${bi}`, makeScrewDetail(bx, topSurfaceY + 0.095, ANCHORS.pedestalRear[2], 0.025, "y", kit), { parent: structGroup });
  });

  // 2. Finned Dry-Sump Oil Pan + 4 Arched Crankcase Main-Bearing Bulkheads
  const sumpH = 0.12;
  reg.part("struct.sump.pan", buildSlabGeometry(0.76, 2.38, sumpH, { radius: 0.07, bevel: true, bevelSize: 0.012, bevelThickness: 0.012 }), {
    parent: structGroup,
    pos: [0, sumpBottomY + sumpH, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "struct.pedestal.front",
    allowOverlap: ["struct.pedestal.rear"]
  });

  // Longitudinal sump cooling ribs along bottom of dry-sump pan
  const finGeo = new THREE.BoxGeometry(0.03, 0.035, 2.02);
  [-0.24, -0.12, 0, 0.12, 0.24].forEach((fx, fi) => {
    reg.part(`struct.sump.fin.${fi}`, finGeo, {
      parent: structGroup,
      pos: [fx, sumpBottomY - 0.015, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // 4 Contoured Main-Bearing Crankcase Webs (front, midF, midR, rear; width 0.68 clears boreStartAbsX=0.39)
  const endBulkheadGeo = buildCrankcaseBulkheadGeometry(0.68, 0.68, 0.10, 0.09);
  const midWebGeo = buildCrankcaseBulkheadGeometry(0.68, 0.64, 0.08, 0.09);

  reg.part("struct.bulkhead.front", endBulkheadGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, 1.13],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    mountOn: "struct.sump.pan"
  });
  reg.part("struct.bulkhead.midF", midWebGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, 0.38],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    clippable: true,
    mountOn: "struct.sump.pan"
  });
  reg.part("struct.bulkhead.midR", midWebGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, -0.38],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    clippable: true,
    mountOn: "struct.sump.pan"
  });
  reg.part("struct.bulkhead.rear", endBulkheadGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, -1.13],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    mountOn: "struct.sump.pan"
  });

  // Upper cutaway crankcase bridge + oil filler cap (hidden when Cutaway=ON)
  reg.part("struct.crankcase.topCover", buildSlabGeometry(0.66, 2.14, 0.07, { radius: 0.05, bevel: true, bevelSize: 0.01, bevelThickness: 0.01 }), {
    parent: structGroup,
    pos: [0, crankY + 0.36, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    clippable: true,
    cutawayHide: true,
    explode: [0, 0.54, 0],
    mountOn: "struct.bulkhead.front",
    allowOverlap: ["struct.bulkhead.rear", "struct.bulkhead.midF", "struct.bulkhead.midR"]
  });
  reg.part("struct.crankcase.oilCap", buildCylinderGeometry(0.08, 0.09, 0.06, { segments: 18, axis: "y" }), {
    parent: structGroup,
    pos: [-0.20, crankY + 0.40, 0.72],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    cutawayHide: true,
    explode: [0, 0.54, 0],
    mountOn: "struct.crankcase.topCover"
  });

  // 3. Six Finned Cutaway Cylinder Barrels, DOHC Heads, Ignition Coils & Valve Covers
  const barrelLen = boreEndAbsX - boreStartAbsX; // 0.62
  const barrelCenterAbsX = (boreStartAbsX + boreEndAbsX) * 0.5; // 0.67
  const headWidth = headOuterAbsX - boreEndAbsX; // 0.34
  const headCenterAbsX = (boreEndAbsX + headOuterAbsX) * 0.5; // 1.15

  // Open front-top (+Y / +Z quadrant: angle 78..200 deg) when Cutaway=ON so pistons & bore shaders read clearly!
  const barrelGeo = buildCutawayArcXGeometry(boreRadius, boreRadius + 0.052, barrelLen, 200, 438, true);
  const finArcGeo = buildCutawayArcXGeometry(boreRadius + 0.048, boreRadius + 0.088, 0.032, 200, 438, false);
  const barrelCapGeo = buildCutawayArcXGeometry(boreRadius + 0.020, boreRadius + 0.064, barrelLen, 78, 200, false);
  const headGeo = buildCylinderHeadGeometry(headWidth, 0.48, 0.46);
  const camRailGeo = new THREE.BoxGeometry(0.16, 0.055, 0.44);
  const valveCoverGeo = buildCylinderHeadGeometry(0.09, 0.44, 0.46);
  const exhaustPortGeo = buildCylinderGeometry(0.064, 0.072, 0.11, { segments: 16, axis: "y" });
  const intakePortGeo = buildCylinderGeometry(0.066, 0.074, 0.24, { segments: 16, axis: "y" });
  const coilGeo = buildCylinderGeometry(0.036, 0.042, 0.13, { segments: 12, axis: "y" });

  SPEC.cylinders.forEach((cyl) => {
    const bSign = cyl.bank;
    const barrelId = `cyl.barrel.${cyl.id}`;

    // Lower barrel spigot saddle bolted into crankcase sump deck
    const flangeX = bSign * (boreStartAbsX + 0.07);
    reg.part(`cyl.flange.${cyl.id}`, new THREE.BoxGeometry(0.16, 0.14, 0.32), {
      parent: structGroup,
      pos: [flangeX, crankY - 0.29, cyl.z],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: "struct.sump.pan",
      allowOverlap: ["struct.sump.pan", "struct.bulkhead.front", "struct.bulkhead.rear"]
    });

    reg.part(barrelId, barrelGeo, {
      parent: structGroup,
      pos: [bSign * barrelCenterAbsX, crankY, cyl.z],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      clippable: true,
      mountOn: `cyl.flange.${cyl.id}`
    });

    // 3 Circumferential cooling fins along each cutaway barrel
    [-0.18, 0, 0.18].forEach((dx, fi) => {
      reg.part(`cyl.fin.${cyl.id}.${fi}`, finArcGeo, {
        parent: structGroup,
        pos: [bSign * (barrelCenterAbsX + dx), crankY, cyl.z],
        ramp: "hi",
        outline: "lo",
        crease: "faint",
        clippable: true,
        detail: true
      });
    });

    // Upper barrel cutaway cap (hides in Cutaway=ON, lifts cleanly above intercooler in Explode=1)
    reg.part(`cyl.cap.${cyl.id}`, barrelCapGeo, {
      parent: structGroup,
      pos: [bSign * barrelCenterAbsX, crankY, cyl.z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      cutawayHide: true,
      explode: [bSign * 0.20, 0.84, 0],
      mountOn: barrelId,
      allowOverlap: [`piston.${cyl.id}`, `conrod.${cyl.id}`]
    });

    // Sculpted cylinder head
    const headId = `cyl.head.${cyl.id}`;
    reg.part(headId, headGeo, {
      parent: structGroup,
      pos: [bSign * headCenterAbsX, crankY, cyl.z],
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      clippable: true,
      mountOn: barrelId
    });

    // Open upper & lower cam carrier rails (frames the exposed DOHC camshafts cleanly)
    reg.part(`cyl.camRailTop.${cyl.id}`, camRailGeo, {
      parent: structGroup,
      pos: [bSign * (headOuterAbsX + 0.06), crankY + 0.215, cyl.z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      mountOn: headId
    });
    reg.part(`cyl.camRailBot.${cyl.id}`, camRailGeo, {
      parent: structGroup,
      pos: [bSign * (headOuterAbsX + 0.06), crankY - 0.215, cyl.z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      mountOn: headId
    });

    // Outer finned magnesium valve cover (hides in Cutaway=ON to expose DOHC camshafts & valves)
    reg.part(`cyl.valveCover.${cyl.id}`, valveCoverGeo, {
      parent: structGroup,
      pos: [bSign * (headOuterAbsX + 0.17), crankY, cyl.z],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      clippable: true,
      cutawayHide: true,
      explode: [bSign * 0.42, 0.96, 0],
      mountOn: `cyl.camRailTop.${cyl.id}`,
      allowOverlap: [`cyl.camRailBot.${cyl.id}`]
    });

    // Exhaust port boss (underside of cylinder head)
    const exPortId = `cyl.exPort.${cyl.id}`;
    reg.part(exPortId, exhaustPortGeo, {
      parent: structGroup,
      pos: [bSign * headCenterAbsX, crankY - 0.27, cyl.z],
      ramp: "exhaust",
      outline: "lo",
      crease: "faint",
      mountOn: headId
    });
    reg.anchor(`exhaust.port.${cyl.id}`, bSign * headCenterAbsX, crankY - 0.32, cyl.z, structGroup, {
      dir: [0, -1, 0]
    });

    // Intake runner port (top of cylinder head up to intake plenum rail)
    reg.part(`cyl.inPort.${cyl.id}`, intakePortGeo, {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX - 0.02), crankY + 0.34, cyl.z - 0.05],
      ramp: "intake",
      outline: "lo",
      crease: "faint",
      mountOn: headId
    });

    // Top-mounted Coil-on-Plug ignition tower + brass terminal boot
    reg.part(`cyl.coil.${cyl.id}`, coilGeo, {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX + 0.04), crankY + 0.29, cyl.z + 0.12],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      mountOn: headId
    });
    reg.part(`cyl.coilBoot.${cyl.id}`, buildCylinderGeometry(0.046, 0.046, 0.04, { segments: 12, axis: "y" }), {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX + 0.04), crankY + 0.35, cyl.z + 0.12],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // Left & Right Cast Intake Plenum Log Rails (connected to top of intake ports)
  [-1, 1].forEach((bSign) => {
    const bankSide = bSign < 0 ? "L" : "R";
    const railId = `struct.intakeLog.${bankSide}`;
    reg.part(railId, buildCylinderGeometry(0.092, 0.092, 1.98, { segments: 20, axis: "z" }), {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX - 0.02), crankY + 0.49, -0.02],
      ramp: "intake",
      outline: "mid",
      crease: "faint",
      clippable: true,
      mountOn: bSign < 0 ? "cyl.inPort.1" : "cyl.inPort.4",
      allowOverlap: bSign < 0 ? ["cyl.inPort.2", "cyl.inPort.3"] : ["cyl.inPort.5", "cyl.inPort.6"]
    });
    reg.anchor(`intake.log.${bankSide}.rear`, bSign * (headCenterAbsX - 0.02), crankY + 0.49, -1.00, structGroup, {
      dir: [0, 0, -1]
    });
  });

  // 4. Compact Rear-Mounted Finned Air-to-Air Intercooler (braced cleanly onto rear bulkhead)
  const icY = crankY + 0.72; // +0.40
  const icZ = -1.24;
  [-0.32, 0.32].forEach((sx, idx) => {
    reg.part(`struct.ic.strut.${idx}`, new THREE.BoxGeometry(0.11, 0.44, 0.14), {
      parent: structGroup,
      pos: [sx, crankY + 0.44, -1.16],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "struct.bulkhead.rear"
    });
  });

  reg.part("struct.intercooler.core", new THREE.BoxGeometry(1.42, 0.30, 0.24), {
    parent: structGroup,
    pos: [0, icY, icZ],
    ramp: "hi",
    outline: "hi",
    crease: "mid",
    mountOn: "struct.ic.strut.0",
    allowOverlap: ["struct.ic.strut.1"]
  });

  // Crisp cooling fin array across front face of intercooler core
  const finPts = [];
  for (let i = -7; i <= 7; i++) {
    const fx = i * 0.09;
    finPts.push(
      new THREE.Vector3(fx, icY - 0.14, icZ + 0.124),
      new THREE.Vector3(fx, icY + 0.14, icZ + 0.124)
    );
  }
  reg.detail("struct.intercooler.fins", new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(finPts), kit.lineMaterials.lo), {
    parent: structGroup
  });

  // Top removable intercooler shroud plate (lifts in Explode=1)
  reg.part("struct.ic.shroud", buildSlabGeometry(1.48, 0.28, 0.04, { radius: 0.03, bevel: true, bevelSize: 0.006, bevelThickness: 0.006 }), {
    parent: structGroup,
    pos: [0, icY + 0.19, icZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    explode: [0, 0.42, 0],
    mountOn: "struct.intercooler.core"
  });

  // Left & Right Intercooler Cast End-Tanks
  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    reg.part(`struct.ic.tank.${side}`, new THREE.BoxGeometry(0.22, 0.30, 0.24), {
      parent: structGroup,
      pos: [bSign * 0.82, icY, icZ],
      ramp: "intake",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.intercooler.core"
    });
    reg.anchor(`ic.in.${side}`, bSign * 0.92, icY, icZ, structGroup, {
      dir: [bSign, 0, 0]
    });
    reg.anchor(`ic.out.${side}`, bSign * 0.82, icY - 0.15, icZ, structGroup, {
      dir: [0, -1, 0]
    });
  });

  // 5. Symmetrical Twin Snail-Volute Turbochargers (Pedestal + CHRA + V-Band + Snail Scrolls + Wastegate)
  const turboPedH = (turboY - 0.11) - topSurfaceY;
  const turboPedGeo = buildDynoPedestalGeometry(0.38, 0.22, turboPedH, 0.20);
  const chraGeo = buildCylinderGeometry(0.125, 0.125, 0.24, { segments: 20, axis: "z" });
  const vBandGeo = buildCylinderGeometry(0.145, 0.145, 0.04, { segments: 20, axis: "z" });
  const collectorGeo = buildCylinderGeometry(0.11, 0.14, 0.13, { segments: 18, axis: "y" });
  const frontCapGeo = buildTurboFrontCapGeometry(0.105, 0.295, 0.045);

  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    const tx = bSign * turboX;

    // Tapered A-frame pedestal grounded on base.plate
    reg.part(`turbo.pedestal.${side}`, turboPedGeo, {
      parent: structGroup,
      pos: [tx, topSurfaceY, turboZ],
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      mountOn: "base.plate"
    });

    // Brass CHRA bearing cartridge + twin V-band clamp flanges
    const chraId = `turbo.chra.${side}`;
    reg.part(chraId, chraGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: `turbo.pedestal.${side}`
    });
    reg.part(`turbo.vband.hot.${side}`, vBandGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ - 0.10],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.part(`turbo.vband.cold.${side}`, vBandGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ + 0.10],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    // Hot Turbine Snail Scroll (rear z = turboZ - 0.21)
    const turbZ = turboZ - 0.21;
    const turbScrollId = `turbo.turbineScroll.${side}`;
    const turbineScrollGeo = buildSnailVoluteGeometry(0.19, 0.29, 0.20, { cutaway: true, mirrorX: bSign });
    reg.part(turbScrollId, turbineScrollGeo, {
      parent: structGroup,
      pos: [tx, turboY, turbZ],
      ramp: "exhaust",
      outline: "hi",
      crease: "lo",
      clippable: true,
      mountOn: chraId
    });

    // Turbine collector inlet flange (underside)
    reg.part(`turbo.collector.${side}`, collectorGeo, {
      parent: structGroup,
      pos: [tx, turboY - 0.32, turbZ],
      ramp: "exhaust",
      outline: "mid",
      crease: "faint",
      mountOn: turbScrollId
    });
    reg.anchor(`turbo.exIn.${side}`, tx, turboY - 0.38, turbZ, structGroup, {
      dir: [0, -1, 0]
    });

    // Exhaust downpipe outlet stub exiting rear (-Z)
    reg.part(`turbo.downpipe.${side}`, buildCylinderGeometry(0.10, 0.115, 0.32, { segments: 18, axis: "z" }), {
      parent: structGroup,
      pos: [tx, turboY, turbZ - 0.25],
      ramp: "exhaust",
      outline: "mid",
      crease: "faint",
      explode: [0, 0, -0.34],
      mountOn: turbScrollId
    });

    // Cold Compressor Snail Volute (front z = turboZ + 0.21)
    const compZ = turboZ + 0.21;
    const compScrollId = `turbo.compScroll.${side}`;
    const compScrollGeo = buildSnailVoluteGeometry(0.19, 0.29, 0.20, { cutaway: true, mirrorX: bSign });
    reg.part(compScrollId, compScrollGeo, {
      parent: structGroup,
      pos: [tx, turboY, compZ],
      ramp: "intake",
      outline: "hi",
      crease: "lo",
      clippable: true,
      mountOn: chraId
    });

    // Removable compressor front shroud ring (closes in Cutaway=OFF, slides +Z in Explode=1)
    reg.part(`turbo.compFrontCap.${side}`, frontCapGeo, {
      parent: structGroup,
      pos: [tx, turboY, compZ + 0.12],
      ramp: "intake",
      outline: "lo",
      crease: "faint",
      cutawayHide: true,
      explode: [0, 0, 0.38],
      mountOn: compScrollId
    });

    // Compressor discharge nozzle pointing +Y
    reg.part(`turbo.compOut.${side}`, buildCylinderGeometry(0.080, 0.092, 0.13, { segments: 16, axis: "y" }), {
      parent: structGroup,
      pos: [tx, turboY + 0.32, compZ],
      ramp: "intake",
      outline: "lo",
      crease: "faint",
      mountOn: compScrollId
    });
    reg.anchor(`turbo.compOut.${side}`, tx, turboY + 0.38, compZ, structGroup, {
      dir: [0, 1, 0]
    });
    reg.anchor(`turbo.axis.${side}`, tx, turboY, turboZ, structGroup);

    // Pneumatic Wastegate Actuator Pod mounted alongside CHRA
    reg.part(`turbo.wgPod.${side}`, buildCylinderGeometry(0.075, 0.075, 0.12, { segments: 16, axis: "z" }), {
      parent: structGroup,
      pos: [tx - bSign * 0.20, turboY + 0.22, turboZ + 0.04],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: chraId
    });
  });

  // 6. Wastegate Boost Dial Base Stand (front-right beside dyno monitor)
  const [bdX, , bdZ] = ANCHORS.boostDialMount;
  reg.part("struct.boostBase", buildCylinderGeometry(0.27, 0.30, 0.08, { segments: 24, axis: "y" }), {
    parent: structGroup,
    pos: [bdX, topSurfaceY + 0.04, bdZ],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "base.plate"
  });
  reg.detail("struct.boostBase.screw0", makeScrewDetail(bdX - 0.20, topSurfaceY + 0.082, bdZ, 0.022, "y", kit), { parent: structGroup });
  reg.detail("struct.boostBase.screw1", makeScrewDetail(bdX + 0.20, topSurfaceY + 0.082, bdZ, 0.022, "y", kit), { parent: structGroup });
}
