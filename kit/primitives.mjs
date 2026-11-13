import * as THREE from "three";

export function makeRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const cr = Math.min(r, hw, hh);
  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.absarc(hw - cr, -hh + cr, cr, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - cr);
  shape.absarc(hw - cr, hh - cr, cr, 0, Math.PI / 2, false);
  shape.lineTo(-hw + cr, hh);
  shape.absarc(-hw + cr, hh - cr, cr, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hh + cr);
  shape.absarc(-hw + cr, -hh + cr, cr, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/**
 * Builds a horizontal rounded-rect slab in the XZ plane.
 * After rotateX(Math.PI / 2), extrusion extends from y = 0 down to y = -h
 * (so placing at y = topY sets the top surface at topY and bottom at topY - h).
 */
export function buildSlabGeometry(w, d, h, opts = {}) {
  const {
    radius = 0.26,
    bevel = true,
    bevelSize = 0.025,
    bevelThickness = 0.025,
    bevelSegments = 2,
    curveSegments = 16,
    centerY = false
  } = opts;
  const shape = makeRoundedRectShape(w, d, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: bevel,
    bevelSegments,
    steps: 1,
    bevelSize: bevel ? bevelSize : 0,
    bevelThickness: bevel ? bevelThickness : 0,
    curveSegments
  });
  geo.rotateX(Math.PI / 2);
  if (centerY) {
    geo.translate(0, h * 0.5, 0);
  }
  return geo;
}

/**
 * Axis-aware cylinder helper so callers never mix up Y-up vs Z-aligned shafts.
 */
export function buildCylinderGeometry(rTop, rBot, length, opts = {}) {
  const { segments = 24, axis = "y" } = opts;
  const geo = new THREE.CylinderGeometry(rTop, rBot, length, segments);
  if (axis === "z") {
    geo.rotateX(Math.PI / 2);
  } else if (axis === "x") {
    geo.rotateZ(-Math.PI / 2);
  }
  return geo;
}

export function buildExternalGearGeometry(pitchR, teeth, toothDepth, width, boreFraction = 0.56) {
  const shape = new THREE.Shape();
  const stepsPerTooth = 4;
  const total = teeth * stepsPerTooth;
  for (let i = 0; i <= total; i++) {
    const a = (i / total) * Math.PI * 2;
    const phase = (i % stepsPerTooth) / stepsPerTooth;
    const r = phase < 0.45 ? pitchR + toothDepth * 0.5 : pitchR - toothDepth * 0.5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  if (boreFraction > 0) {
    const bore = new THREE.Path();
    bore.absarc(0, 0, pitchR * boreFraction, 0, Math.PI * 2, false);
    shape.holes.push(bore);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    curveSegments: total
  });
  geo.translate(0, 0, -width * 0.5);
  return geo;
}

export function buildInternalGearRingGeometry(outerR, pitchR, teeth, toothDepth, width, zOffset = -width * 0.5) {
  const stepsPerTooth = 4;
  const total = teeth * stepsPerTooth;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);

  const gearHole = new THREE.Path();
  for (let i = 0; i <= total; i++) {
    const a = (i / total) * Math.PI * 2;
    const phase = (i % stepsPerTooth) / stepsPerTooth;
    const r = phase < 0.45 ? pitchR - toothDepth * 0.5 : pitchR + toothDepth * 0.5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) gearHole.moveTo(x, y);
    else gearHole.lineTo(x, y);
  }
  shape.holes.push(gearHole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    curveSegments: total
  });
  geo.translate(0, 0, zOffset);
  return geo;
}

export function makePlanOutline(w, d, r, y, kit, toneKey = "faint") {
  const shape = makeRoundedRectShape(w, d, r);
  const pts2d = shape.getPoints(16);
  const pts3d = pts2d.map((p) => new THREE.Vector3(p.x, y, p.y));
  const geo = new THREE.BufferGeometry().setFromPoints(pts3d);
  return new THREE.LineLoop(geo, kit.lineMaterials[toneKey] || kit.lineMaterials.faint);
}

export function makeRingLine(radius, segments, kit, toneKey = "lo") {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, kit.lineMaterials[toneKey] || kit.lineMaterials.lo);
}

export function makeScrewDetail(x, y, z, radius, axis, kit) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const ring = makeRingLine(radius, 20, kit, "lo");
  const dotGeo = new THREE.CircleGeometry(radius * 0.36, 12);
  const dot = new THREE.Mesh(dotGeo, kit.dotMaterials.dot);
  dot.position.z = 0.002;
  g.add(ring, dot);
  if (axis === "y") {
    g.rotation.x = -Math.PI / 2;
  } else if (axis === "x") {
    g.rotation.y = Math.PI / 2;
  }
  return g;
}

export function makeKnurlLines(radius, y0, y1, count, kit, opts = {}) {
  const { tone = "lo", pointer = null } = opts;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const kx = Math.cos(a) * (radius + 0.003);
    const kz = Math.sin(a) * (radius + 0.003);
    pts.push(new THREE.Vector3(kx, y0, kz), new THREE.Vector3(kx, y1, kz));
  }
  if (pointer) {
    pts.push(
      new THREE.Vector3(0, pointer.y, pointer.z0),
      new THREE.Vector3(0, pointer.y, pointer.z1)
    );
  }
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pts),
    kit.lineMaterials[tone] || kit.lineMaterials.lo
  );
}

export function makeRulerTicks(rulerX, rulerW, rulerZ, rulerD, y, count, majorEvery, kit) {
  const minorPts = [];
  const majorPts = [];
  for (let i = 0; i <= count; i++) {
    const tx = rulerX - rulerW * 0.46 + (i / count) * (rulerW * 0.92);
    const zEdge = rulerZ - rulerD * 0.5;
    const len = i % majorEvery === 0 ? 0.15 : 0.08;
    const target = i % majorEvery === 0 ? majorPts : minorPts;
    target.push(new THREE.Vector3(tx, y, zEdge), new THREE.Vector3(tx, y, zEdge + len));
  }
  const g = new THREE.Group();
  g.add(
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(minorPts), kit.lineMaterials.lo),
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(majorPts), kit.lineMaterials.mid)
  );
  return g;
}

export function makeHaloMesh(w, d, r, pos, kit) {
  const haloShape = makeRoundedRectShape(w, d, r);
  const haloGeo = new THREE.ShapeGeometry(haloShape, 24);
  haloGeo.rotateX(Math.PI / 2);
  const haloMat = kit.createHaloMaterial();
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.set(...pos);
  return haloMesh;
}
