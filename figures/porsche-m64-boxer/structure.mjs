import * as THREE from "three";
import { buildSlabGeometry, buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

/**
 * Tapered A-frame dynamometer mounting pedestal grounded cleanly on base.plate.
 */
function buildDynoPedestalGeometry(baseW, topW, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-baseW * 0.5, 0);
  shape.lineTo(baseW * 0.5, 0);
  shape.lineTo(topW * 0.5, height);
  shape.lineTo(-topW * 0.5, height);
  shape.closePath();

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
 * Contoured crankcase main-bearing bulkhead web with semicircular bearing saddle cutout.
 */
function buildCrankcaseBulkheadGeometry(width, height, depth, bearingR) {
  const shape = new THREE.Shape();
  const hw = width * 0.5;
  const hh = height * 0.5;
  const ch = 0.075;

  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh - ch);
  shape.lineTo(hw - ch, hh);
  shape.lineTo(bearingR * 1.15, hh);
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
 * Open cutaway arc along X (used for finned Nikasil cylinder barrels & removable upper barrel caps).
 */
function buildCutawayArcXGeometry(rInner, rOuter, length, aStartDeg = 200, aEndDeg = 438, bevel = true) {
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

function buildCylinderHeadGeometry(widthX, heightY, depthZ) {
  const shape = new THREE.Shape();
  const hx = widthX * 0.5;
  const hy = heightY * 0.5;
  const c = 0.042;
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
    bevelSize: 0.009,
    bevelThickness: 0.009,
    bevelSegments: 1
  });
  geo.translate(0, 0, -depthZ * 0.5);
  return geo;
}

/**
 * Sweeps a closed, watertight 3D circular-section tube with smoothly varying radius
 * along a 3D spine (used to sculpt authentic volumetric KKK K16 snail volute horns).
 */
function buildVariableRadiusTubeGeometry(points, radii, radialSegs = 16) {
  const n = points.length;
  const tangents = [];
  for (let i = 0; i < n; i++) {
    const pPrev = points[Math.max(0, i - 1)];
    const pNext = points[Math.min(n - 1, i + 1)];
    tangents.push(pNext.clone().sub(pPrev).normalize());
  }

  // Parallel-transport frame along the curve
  const normals = [];
  const binormals = [];
  let n0 = new THREE.Vector3(0, 0, 1);
  if (Math.abs(tangents[0].dot(n0)) > 0.9) n0 = new THREE.Vector3(1, 0, 0);
  const b0 = new THREE.Vector3().crossVectors(tangents[0], n0).normalize();
  n0 = new THREE.Vector3().crossVectors(b0, tangents[0]).normalize();
  normals.push(n0);
  binormals.push(b0);

  for (let i = 1; i < n; i++) {
    const prevT = tangents[i - 1];
    const curT = tangents[i];
    const axis = new THREE.Vector3().crossVectors(prevT, curT);
    let nextN = normals[i - 1].clone();
    if (axis.lengthSq() > 1e-8) {
      axis.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, prevT.dot(curT))));
      nextN.applyAxisAngle(axis, angle);
    }
    const nextB = new THREE.Vector3().crossVectors(curT, nextN).normalize();
    nextN = new THREE.Vector3().crossVectors(nextB, curT).normalize();
    normals.push(nextN);
    binormals.push(nextB);
  }

  const positions = [];
  const indices = [];

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const r = radii[i];
    const nVec = normals[i];
    const bVec = binormals[i];
    for (let j = 0; j <= radialSegs; j++) {
      const phi = (j / radialSegs) * Math.PI * 2;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      positions.push(
        p.x + r * (cp * nVec.x + sp * bVec.x),
        p.y + r * (cp * nVec.y + sp * bVec.y),
        p.z + r * (cp * nVec.z + sp * bVec.z)
      );
    }
  }

  const stride = radialSegs + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      // Outward winding for right-handed (nVec, bVec, tangent) frame
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  // Cap start & end rings cleanly
  const startCenterIdx = positions.length / 3;
  positions.push(points[0].x, points[0].y, points[0].z);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(startCenterIdx, j + 1, j);
  }

  const endCenterIdx = positions.length / 3;
  const lastRing = (n - 1) * stride;
  positions.push(points[n - 1].x, points[n - 1].y, points[n - 1].z);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(endCenterIdx, lastRing + j, lastRing + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a realistic 3D volumetric KKK K16 snail volute housing with expanding circular scroll
 * and tangential discharge/inlet horn.
 * - `mode: "comp"` sweeps into an upward-inboard discharge horn (+Y)
 * - `mode: "turb"` sweeps from an underside tangential inlet horn (-Y)
 */
function buildK16VoluteGeometry({ mirrorX = 1, mode = "comp" } = {}) {
  const pts = [];
  const radii = [];
  const segs = 28;

  if (mode === "comp") {
    // Spiral wraps from tongue (a=0.45) to outer tangent (a=2*PI, pointing straight +Y)
    const aStart = 0.45;
    const aEnd = Math.PI * 2.0;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = aStart + (aEnd - aStart) * u;
      const tubeR = 0.042 + 0.064 * Math.pow(u, 0.85);
      const ringR = 0.145 + tubeR * 0.72;
      pts.push(new THREE.Vector3(Math.cos(a) * ringR * mirrorX, Math.sin(a) * ringR, 0));
      radii.push(tubeR);
    }
    const endX = pts[pts.length - 1].x;
    pts.push(new THREE.Vector3(endX, 0.14, 0));
    radii.push(0.102);
    pts.push(new THREE.Vector3(endX, 0.25, 0));
    radii.push(0.092);
  } else {
    // Turbine spiral enters straight +Y on inboard side (x = -0.221*mirrorX, y = -0.26 -> 0) and wraps clockwise
    const inletR = 0.104;
    const inletRingR = 0.145 + inletR * 0.72; // ~0.220
    const inletX = -inletRingR * mirrorX;
    pts.push(new THREE.Vector3(inletX, -0.28, 0));
    radii.push(0.092);
    pts.push(new THREE.Vector3(inletX, -0.14, 0));
    radii.push(0.100);

    const aStart = Math.PI;
    const aEnd = -Math.PI * 0.72;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = aStart + (aEnd - aStart) * u;
      const tubeR = inletR - 0.062 * Math.pow(u, 0.88);
      const ringR = 0.145 + tubeR * 0.72;
      pts.push(new THREE.Vector3(Math.cos(a) * ringR * mirrorX, Math.sin(a) * ringR, 0));
      radii.push(tubeR);
    }
  }

  return buildVariableRadiusTubeGeometry(pts, radii, 16);
}

/**
 * Open ring collar / cutaway shroud cover for fan shroud and turbo compressor inlet.
 */
function buildAnnularRingGeometry(rInner, rOuter, thickness, bevel = true) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel,
    bevelSize: bevel ? 0.008 : 0,
    bevelThickness: bevel ? 0.008 : 0,
    bevelSegments: 1,
    curveSegments: 30
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
    fanY,
    fanZ,
    fanRadius,
    turboX,
    turboY,
    turboZ
  } = SPEC;

  // 1. Sculpted A-Frame Dyno Mount Pedestals (grounded on base.plate)
  const sumpBottomY = crankY - 0.50; // -0.82
  const pedH = sumpBottomY - topSurfaceY;
  const pedGeo = buildDynoPedestalGeometry(0.96, 0.72, pedH, 0.20);

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

  [-0.36, 0.36].forEach((bx, bi) => {
    reg.detail(`struct.ped.screwF.${bi}`, makeScrewDetail(bx, topSurfaceY + 0.095, ANCHORS.pedestalFront[2], 0.025, "y", kit), { parent: structGroup });
    reg.detail(`struct.ped.screwR.${bi}`, makeScrewDetail(bx, topSurfaceY + 0.095, ANCHORS.pedestalRear[2], 0.025, "y", kit), { parent: structGroup });
  });

  // 2. Finned Dry-Sump Oil Pan + 4 Contoured Main-Bearing Crankcase Bulkheads
  const sumpH = 0.12;
  reg.part("struct.sump.pan", buildSlabGeometry(0.76, 2.28, sumpH, { radius: 0.07, bevel: true, bevelSize: 0.012, bevelThickness: 0.012 }), {
    parent: structGroup,
    pos: [0, sumpBottomY + sumpH, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "struct.pedestal.front",
    allowOverlap: ["struct.pedestal.rear"]
  });

  const finGeo = new THREE.BoxGeometry(0.03, 0.035, 1.92);
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

  const endBulkheadGeo = buildCrankcaseBulkheadGeometry(0.68, 0.68, 0.10, 0.09);
  const midWebGeo = buildCrankcaseBulkheadGeometry(0.68, 0.64, 0.08, 0.09);

  reg.part("struct.bulkhead.front", endBulkheadGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, 1.08],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    mountOn: "struct.sump.pan"
  });
  reg.part("struct.bulkhead.midF", midWebGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, 0.36],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    clippable: true,
    mountOn: "struct.sump.pan"
  });
  reg.part("struct.bulkhead.midR", midWebGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, -0.36],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    clippable: true,
    mountOn: "struct.sump.pan"
  });
  reg.part("struct.bulkhead.rear", endBulkheadGeo, {
    parent: structGroup,
    pos: [0, crankY - 0.02, -1.08],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    mountOn: "struct.sump.pan"
  });

  // Cutaway-hide upper crankcase bridge + brass oil cap (clears fanShroud in Explode=1)
  reg.part("struct.crankcase.topCover", buildSlabGeometry(0.66, 1.84, 0.065, { radius: 0.05, bevel: true, bevelSize: 0.01, bevelThickness: 0.01 }), {
    parent: structGroup,
    pos: [0, crankY + 0.36, -0.14],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    clippable: true,
    cutawayHide: true,
    explode: [0, 0.62, 0],
    mountOn: "struct.bulkhead.midF",
    allowOverlap: ["struct.bulkhead.rear", "struct.bulkhead.midR"]
  });
  reg.part("struct.crankcase.oilCap", buildCylinderGeometry(0.075, 0.085, 0.055, { segments: 18, axis: "y" }), {
    parent: structGroup,
    pos: [-0.20, crankY + 0.40, -0.58],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    cutawayHide: true,
    explode: [0, 0.62, 0],
    mountOn: "struct.crankcase.topCover"
  });

  // 3. Top-Front Porsche 11-Blade Axial Cooling Fan Shroud (sits cleanly above front bulkhead, never hides pistons!)
  reg.part("struct.fanNeck", buildCylinderGeometry(0.11, 0.14, 0.16, { segments: 18, axis: "y" }), {
    parent: structGroup,
    pos: [0, 0.03, fanZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    clippable: true,
    mountOn: "struct.bulkhead.front",
    allowOverlap: ["struct.crankcase.topCover"]
  });
  reg.part("struct.fanShroud", buildAnnularRingGeometry(fanRadius + 0.015, fanRadius + 0.065, 0.16, true), {
    parent: structGroup,
    pos: [0, fanY, fanZ],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "struct.fanNeck"
  });
  reg.part("struct.fanAlternatorHub", buildCylinderGeometry(0.095, 0.10, 0.14, { segments: 20, axis: "z" }), {
    parent: structGroup,
    pos: [0, fanY, fanZ - 0.04],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    clippable: true,
    mountOn: "struct.fanShroud"
  });
  // Removable front fan grille ring (hides when Cutaway=ON so 11 lit blades read clearly; slides +Z in Explode=1)
  reg.part("struct.fanFrontCover", buildAnnularRingGeometry(0.09, fanRadius + 0.062, 0.035, true), {
    parent: structGroup,
    pos: [0, fanY, fanZ + 0.11],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    clippable: true,
    cutawayHide: true,
    explode: [0, 0, 0.68],
    mountOn: "struct.fanShroud"
  });

  // 4. Six Finned Cutaway Cylinder Barrels, Cylinder Heads, Cam Rails & Valve Covers
  const barrelLen = boreEndAbsX - boreStartAbsX; // 0.57
  const barrelCenterAbsX = (boreStartAbsX + boreEndAbsX) * 0.5; // 0.675
  const headWidth = headOuterAbsX - boreEndAbsX; // 0.34
  const headCenterAbsX = (boreEndAbsX + headOuterAbsX) * 0.5; // 1.13

  const barrelGeo = buildCutawayArcXGeometry(boreRadius, boreRadius + 0.052, barrelLen, 200, 438, true);
  const finArcGeo = buildCutawayArcXGeometry(boreRadius + 0.048, boreRadius + 0.088, 0.030, 200, 438, false);
  const barrelCapGeo = buildCutawayArcXGeometry(boreRadius + 0.020, boreRadius + 0.064, barrelLen, 78, 200, false);
  const headGeo = buildCylinderHeadGeometry(headWidth, 0.46, 0.44);
  const camRailGeo = new THREE.BoxGeometry(0.15, 0.052, 0.42);
  const valveCoverGeo = buildCylinderHeadGeometry(0.085, 0.42, 0.44);
  const exhaustPortGeo = buildCylinderGeometry(0.060, 0.068, 0.11, { segments: 16, axis: "y" });
  const intakePortGeo = buildCylinderGeometry(0.062, 0.070, 0.22, { segments: 16, axis: "y" });
  const coilGeo = buildCylinderGeometry(0.034, 0.040, 0.12, { segments: 12, axis: "y" });

  SPEC.cylinders.forEach((cyl) => {
    const bSign = cyl.bank;
    const barrelId = `cyl.barrel.${cyl.id}`;

    const flangeX = bSign * (boreStartAbsX + 0.06);
    reg.part(`cyl.flange.${cyl.id}`, new THREE.BoxGeometry(0.15, 0.14, 0.30), {
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

    [-0.17, 0, 0.17].forEach((dx, fi) => {
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

    reg.part(`cyl.cap.${cyl.id}`, barrelCapGeo, {
      parent: structGroup,
      pos: [bSign * barrelCenterAbsX, crankY, cyl.z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      cutawayHide: true,
      explode: [bSign * 0.22, 0.72, 0],
      mountOn: barrelId,
      allowOverlap: [`piston.${cyl.id}`, `conrod.${cyl.id}`]
    });

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

    reg.part(`cyl.camRailTop.${cyl.id}`, camRailGeo, {
      parent: structGroup,
      pos: [bSign * (headOuterAbsX + 0.055), crankY + 0.21, cyl.z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      mountOn: headId
    });
    reg.part(`cyl.camRailBot.${cyl.id}`, camRailGeo, {
      parent: structGroup,
      pos: [bSign * (headOuterAbsX + 0.055), crankY - 0.21, cyl.z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      mountOn: headId
    });

    reg.part(`cyl.valveCover.${cyl.id}`, valveCoverGeo, {
      parent: structGroup,
      pos: [bSign * (headOuterAbsX + 0.165), crankY, cyl.z],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      clippable: true,
      cutawayHide: true,
      explode: [bSign * 0.48, 0.96, 0],
      mountOn: `cyl.camRailTop.${cyl.id}`,
      allowOverlap: [`cyl.camRailBot.${cyl.id}`]
    });

    const exPortId = `cyl.exPort.${cyl.id}`;
    reg.part(exPortId, exhaustPortGeo, {
      parent: structGroup,
      pos: [bSign * headCenterAbsX, crankY - 0.26, cyl.z],
      ramp: "exhaust",
      outline: "lo",
      crease: "faint",
      mountOn: headId
    });
    reg.anchor(`exhaust.port.${cyl.id}`, bSign * headCenterAbsX, crankY - 0.31, cyl.z, structGroup, {
      dir: [0, -1, 0]
    });

    reg.part(`cyl.inPort.${cyl.id}`, intakePortGeo, {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX - 0.02), crankY + 0.32, cyl.z - 0.04],
      ramp: "intake",
      outline: "lo",
      crease: "faint",
      mountOn: headId
    });

    reg.part(`cyl.coil.${cyl.id}`, coilGeo, {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX + 0.04), crankY + 0.28, cyl.z + 0.11],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      mountOn: headId
    });
    reg.part(`cyl.coilBoot.${cyl.id}`, buildCylinderGeometry(0.044, 0.044, 0.038, { segments: 12, axis: "y" }), {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX + 0.04), crankY + 0.34, cyl.z + 0.11],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // Intake plenum logs
  [-1, 1].forEach((bSign) => {
    const bankSide = bSign < 0 ? "L" : "R";
    const railId = `struct.intakeLog.${bankSide}`;
    reg.part(railId, buildCylinderGeometry(0.088, 0.088, 1.88, { segments: 20, axis: "z" }), {
      parent: structGroup,
      pos: [bSign * (headCenterAbsX - 0.02), crankY + 0.46, -0.02],
      ramp: "intake",
      outline: "mid",
      crease: "faint",
      clippable: true,
      mountOn: bSign < 0 ? "cyl.inPort.1" : "cyl.inPort.4",
      allowOverlap: bSign < 0 ? ["cyl.inPort.2", "cyl.inPort.3"] : ["cyl.inPort.5", "cyl.inPort.6"]
    });
    reg.anchor(`intake.log.${bankSide}.rear`, bSign * (headCenterAbsX - 0.02), crankY + 0.46, -0.96, structGroup, {
      dir: [0, 0, -1]
    });
  });

  // 5. Rear-Mounted Finned Air-to-Air Intercooler (positioned cleanly aft behind cooling fan)
  const icY = crankY + 0.72; // +0.40
  const icZ = -1.24;
  [-0.32, 0.32].forEach((sx, idx) => {
    reg.part(`struct.ic.strut.${idx}`, new THREE.BoxGeometry(0.11, 0.44, 0.14), {
      parent: structGroup,
      pos: [sx, crankY + 0.44, -1.16],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      clippable: true,
      mountOn: "struct.bulkhead.rear"
    });
  });

  reg.part("struct.intercooler.core", new THREE.BoxGeometry(1.40, 0.28, 0.22), {
    parent: structGroup,
    pos: [0, icY, icZ],
    ramp: "hi",
    outline: "hi",
    crease: "mid",
    clippable: true,
    mountOn: "struct.ic.strut.0",
    allowOverlap: ["struct.ic.strut.1"]
  });

  const finPts = [];
  for (let i = -7; i <= 7; i++) {
    const fx = i * 0.088;
    finPts.push(
      new THREE.Vector3(fx, icY - 0.13, icZ + 0.114),
      new THREE.Vector3(fx, icY + 0.13, icZ + 0.114)
    );
  }
  reg.detail("struct.intercooler.fins", new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(finPts), kit.lineMaterials.lo), {
    parent: structGroup
  });

  reg.part("struct.ic.shroud", buildSlabGeometry(1.46, 0.26, 0.04, { radius: 0.03, bevel: true, bevelSize: 0.006, bevelThickness: 0.006 }), {
    parent: structGroup,
    pos: [0, icY + 0.18, icZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    clippable: true,
    cutawayHide: true,
    explode: [0, 0.46, 0],
    mountOn: "struct.intercooler.core"
  });

  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    reg.part(`struct.ic.tank.${side}`, new THREE.BoxGeometry(0.21, 0.28, 0.22), {
      parent: structGroup,
      pos: [bSign * 0.80, icY, icZ],
      ramp: "intake",
      outline: "mid",
      crease: "lo",
      clippable: true,
      mountOn: "struct.intercooler.core"
    });
    reg.anchor(`ic.in.${side}`, bSign * 0.90, icY, icZ, structGroup, {
      dir: [bSign, 0, 0]
    });
    reg.anchor(`ic.out.${side}`, bSign * 0.80, icY - 0.14, icZ, structGroup, {
      dir: [0, -1, 0]
    });
  });

  // 6. Sculpted Twin KKK K16 Turbochargers (3D Volumetric Snail Volutes + Stepped CHRA + V-Bands + Wastegate)
  const turboPedH = (turboY - 0.095) - topSurfaceY;
  const turboPedGeo = buildDynoPedestalGeometry(0.36, 0.20, turboPedH, 0.11);
  const chraCenterGeo = buildCylinderGeometry(0.105, 0.105, 0.20, { segments: 24, axis: "z" });
  const chraStepGeo = buildCylinderGeometry(0.132, 0.132, 0.055, { segments: 24, axis: "z" });
  const vBandGeo = buildCylinderGeometry(0.148, 0.148, 0.035, { segments: 24, axis: "z" });
  const collectorGeo = buildCylinderGeometry(0.092, 0.118, 0.12, { segments: 18, axis: "y" });
  const frontShroudRingGeo = buildAnnularRingGeometry(0.155, 0.225, 0.042, true);
  const compFrontCapGeo = buildAnnularRingGeometry(0.088, 0.222, 0.038, true);

  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    const tx = bSign * turboX;

    // Tapered pedestal grounded directly on base.plate
    reg.part(`turbo.pedestal.${side}`, turboPedGeo, {
      parent: structGroup,
      pos: [tx, topSurfaceY, turboZ],
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      mountOn: "base.plate"
    });

    // Stepped Brass CHRA bearing cartridge + V-band clamps + top oil feed boss
    const chraId = `turbo.chra.${side}`;
    reg.part(chraId, chraCenterGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: `turbo.pedestal.${side}`
    });
    reg.part(`turbo.chraFlange.${side}`, chraStepGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.part(`turbo.oilBoss.${side}`, buildCylinderGeometry(0.036, 0.042, 0.09, { segments: 12, axis: "y" }), {
      parent: structGroup,
      pos: [tx, turboY + 0.12, turboZ],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: chraId
    });
    reg.anchor(`turbo.oilIn.${side}`, tx, turboY + 0.16, turboZ, structGroup, { dir: [0, 1, 0] });

    reg.part(`turbo.vband.hot.${side}`, vBandGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ - 0.09],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.part(`turbo.vband.cold.${side}`, vBandGeo, {
      parent: structGroup,
      pos: [tx, turboY, turboZ + 0.09],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    // Hot Turbine 3D Volumetric Snail Volute (rear z = turboZ - 0.17)
    const turbZ = turboZ - 0.17;
    const turbScrollId = `turbo.turbineScroll.${side}`;
    const turbineScrollGeo = buildK16VoluteGeometry({ mirrorX: bSign, mode: "turb" });
    reg.part(turbScrollId, turbineScrollGeo, {
      parent: structGroup,
      pos: [tx, turboY, turbZ],
      ramp: "exhaust",
      outline: "hi",
      crease: "faint",
      noCrease: true,
      clippable: true,
      mountOn: chraId
    });
    reg.part(`turbo.turbBackplate.${side}`, frontShroudRingGeo, {
      parent: structGroup,
      pos: [tx, turboY, turbZ + 0.03],
      ramp: "exhaust",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    // Turbine inlet collector flange aligned directly under inboard turbine horn (x = tx - bSign * 0.220)
    const colX = tx - bSign * 0.220;
    reg.part(`turbo.collector.${side}`, collectorGeo, {
      parent: structGroup,
      pos: [colX, turboY - 0.31, turbZ],
      ramp: "exhaust",
      outline: "mid",
      crease: "faint",
      mountOn: turbScrollId
    });
    reg.anchor(`turbo.exIn.${side}`, colX, turboY - 0.37, turbZ, structGroup, {
      dir: [0, -1, 0]
    });

    // Flared exhaust downpipe exiting aft (-Z) (slides -Z in Explode=1)
    reg.part(`turbo.downpipe.${side}`, buildCylinderGeometry(0.088, 0.105, 0.28, { segments: 20, axis: "z" }), {
      parent: structGroup,
      pos: [tx, turboY, turbZ - 0.20],
      ramp: "exhaust",
      outline: "mid",
      crease: "faint",
      explode: [0, 0, -0.34],
      mountOn: turbScrollId
    });

    // Cold Compressor 3D Volumetric Snail Volute (front z = turboZ + 0.17)
    const compZ = turboZ + 0.17;
    const compScrollId = `turbo.compScroll.${side}`;
    const compScrollGeo = buildK16VoluteGeometry({ mirrorX: bSign, mode: "comp" });
    reg.part(compScrollId, compScrollGeo, {
      parent: structGroup,
      pos: [tx, turboY, compZ],
      ramp: "intake",
      outline: "hi",
      crease: "faint",
      noCrease: true,
      clippable: true,
      mountOn: chraId
    });

    // Machined cutaway inlet shroud ring (stays visible around spinning impeller)
    reg.part(`turbo.compShroud.${side}`, frontShroudRingGeo, {
      parent: structGroup,
      pos: [tx, turboY, compZ + 0.05],
      ramp: "intake",
      outline: "mid",
      crease: "faint",
      clippable: true,
      mountOn: compScrollId
    });

    // Removable front compressor cover bellmouth (hides when Cutaway=ON, slides +Z in Explode=1)
    reg.part(`turbo.compFrontCap.${side}`, compFrontCapGeo, {
      parent: structGroup,
      pos: [tx, turboY, compZ + 0.11],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      clippable: true,
      cutawayHide: true,
      explode: [0, 0, 0.36],
      mountOn: `turbo.compShroud.${side}`
    });

    // Compressor discharge nozzle aligned directly atop outboard compressor horn (x = tx + bSign * 0.221)
    const outX = tx + bSign * 0.221;
    reg.part(`turbo.compOut.${side}`, buildCylinderGeometry(0.074, 0.086, 0.14, { segments: 16, axis: "y" }), {
      parent: structGroup,
      pos: [outX, turboY + 0.27, compZ],
      ramp: "intake",
      outline: "lo",
      crease: "faint",
      mountOn: compScrollId
    });
    reg.anchor(`turbo.compOut.${side}`, outX, turboY + 0.34, compZ, structGroup, {
      dir: [0, 1, 0]
    });
    reg.anchor(`turbo.axis.${side}`, tx, turboY, turboZ, structGroup);

    // Pneumatic Wastegate Actuator Canister Pod + mounting bracket onto CHRA
    reg.part(`turbo.wgBracket.${side}`, new THREE.BoxGeometry(0.18, 0.04, 0.06), {
      parent: structGroup,
      pos: [tx - bSign * 0.13, turboY + 0.14, turboZ + 0.03],
      rot: [0, 0, -bSign * 0.55],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: chraId
    });
    reg.part(`turbo.wgPod.${side}`, buildCylinderGeometry(0.072, 0.072, 0.12, { segments: 18, axis: "z" }), {
      parent: structGroup,
      pos: [tx - bSign * 0.20, turboY + 0.21, turboZ + 0.04],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      mountOn: `turbo.wgBracket.${side}`
    });
    reg.anchor(`turbo.wgTap.${side}`, tx - bSign * 0.20, turboY + 0.21, turboZ + 0.10, structGroup, {
      dir: [0, 0, 1]
    });
  });

  // Crankcase oil gallery feed anchor for CHRA oil lines (routed cleanly underneath cylinder banks)
  reg.anchor("crankcase.oilTap.L", -0.38, crankY - 0.36, -0.45, structGroup, { dir: [-1, 0, 0] });
  reg.anchor("crankcase.oilTap.R", 0.38, crankY - 0.36, -0.45, structGroup, { dir: [1, 0, 0] });

  // 7. Boost Pressure Dial Pedestal (front-right beside dyno screen)
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
