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

/**
 * Orthographic blueprint datum grid + perimeter frame for non-bench archetypes
 * ("free-space", "section", "diorama").
 */
export function makeDatumGrid(width, depth, divisionsX = 8, divisionsZ = 6, y = 0, kit, toneKey = "faint") {
  const g = new THREE.Group();
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const gridPts = [];
  const tickPts = [];

  for (let i = 0; i <= divisionsX; i++) {
    const x = -hw + (i / divisionsX) * width;
    const target = i === 0 || i === divisionsX ? tickPts : gridPts;
    target.push(new THREE.Vector3(x, y, -hd), new THREE.Vector3(x, y, hd));
  }
  for (let j = 0; j <= divisionsZ; j++) {
    const z = -hd + (j / divisionsZ) * depth;
    const target = j === 0 || j === divisionsZ ? tickPts : gridPts;
    target.push(new THREE.Vector3(-hw, y, z), new THREE.Vector3(hw, y, z));
  }

  const c = 0.14;
  tickPts.push(
    new THREE.Vector3(-c, y + 0.001, 0), new THREE.Vector3(c, y + 0.001, 0),
    new THREE.Vector3(0, y + 0.001, -c), new THREE.Vector3(0, y + 0.001, c)
  );

  g.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gridPts),
      kit.lineMaterials[toneKey] || kit.lineMaterials.faint
    ),
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(tickPts),
      kit.lineMaterials.lo
    )
  );
  return g;
}

/**
 * Graduated 3-axis / azimuthal gimbal datum ring for "free-space" or aerospace figures.
 */
export function makeGimbalDatumRing(radius, y = 0, kit, toneKey = "lo") {
  const g = new THREE.Group();
  g.position.set(0, y, 0);

  const eqPts = [];
  const tickPts = [];
  const majorPts = [];
  const segs = 72;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    eqPts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  for (let deg = 0; deg < 360; deg += 10) {
    const a = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const r0 = radius - (isMajor ? 0.14 : 0.07);
    const target = isMajor ? majorPts : tickPts;
    target.push(
      new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0),
      new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)
    );
  }

  const meridPts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const rM = radius * 1.03;
    meridPts.push(new THREE.Vector3(Math.cos(a) * rM, Math.sin(a) * rM, 0));
  }

  g.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts), kit.lineMaterials[toneKey] || kit.lineMaterials.lo),
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), kit.lineMaterials.faint),
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(majorPts), kit.lineMaterials.mid),
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(meridPts), kit.lineMaterials.faint)
  );
  return g;
}

/**
 * Builds an open-front hollow cabinet/chassis shell BufferGeometry for "cabinet" / "enclosure" archetypes.
 * Centered on X and Z; Y runs from 0..height (or -height/2..+height/2 when centerY = true).
 */
export function buildEnclosureBoxGeometry(width, height, depth, wallThickness = 0.12, opts = {}) {
  const { openTop = false, centerY = true } = opts;
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const t = Math.min(wallThickness, hw * 0.45, height * 0.35, hd * 0.45);
  const y0 = centerY ? -height * 0.5 : 0;
  const y1 = centerY ? height * 0.5 : height;
  const iy0 = y0 + t;
  const iy1 = openTop ? y1 : y1 - t;
  const iz0 = -hd + t;

  const positions = [];
  const pushTri = (a, b, c) => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  // Quad with outward normal when vertices [p0, p1, p2, p3] are ordered CCW from outside
  const pushQuad = (p0, p1, p2, p3) => {
    pushTri(p0, p1, p2);
    pushTri(p0, p2, p3);
  };

  // Outer left (-X)
  pushQuad([-hw, y0, -hd], [-hw, y0, hd], [-hw, y1, hd], [-hw, y1, -hd]);
  // Outer right (+X)
  pushQuad([hw, y0, hd], [hw, y0, -hd], [hw, y1, -hd], [hw, y1, hd]);
  // Outer back (-Z)
  pushQuad([hw, y0, -hd], [-hw, y0, -hd], [-hw, y1, -hd], [hw, y1, -hd]);
  // Outer bottom (-Y)
  pushQuad([-hw, y0, -hd], [hw, y0, -hd], [hw, y0, hd], [-hw, y0, hd]);

  // Inner bottom (+Y)
  pushQuad([-hw + t, iy0, hd], [hw - t, iy0, hd], [hw - t, iy0, iz0], [-hw + t, iy0, iz0]);
  // Inner back (+Z)
  pushQuad([-hw + t, iy0, iz0], [hw - t, iy0, iz0], [hw - t, iy1, iz0], [-hw + t, iy1, iz0]);
  // Inner left (+X)
  pushQuad([-hw + t, iy0, hd], [-hw + t, iy0, iz0], [-hw + t, iy1, iz0], [-hw + t, iy1, hd]);
  // Inner right (-X)
  pushQuad([hw - t, iy0, iz0], [hw - t, iy0, hd], [hw - t, iy1, hd], [hw - t, iy1, iz0]);

  if (!openTop) {
    // Outer top (+Y)
    pushQuad([-hw, y1, hd], [hw, y1, hd], [hw, y1, -hd], [-hw, y1, -hd]);
    // Inner top (-Y)
    pushQuad([-hw + t, iy1, iz0], [hw - t, iy1, iz0], [hw - t, iy1, hd], [-hw + t, iy1, hd]);
    // Front rim (+Z): 4 strips around opening
    pushQuad([-hw, y0, hd], [hw, y0, hd], [hw, iy0, hd], [-hw, iy0, hd]); // bottom rim
    pushQuad([-hw, iy1, hd], [hw, iy1, hd], [hw, y1, hd], [-hw, y1, hd]); // top rim
    pushQuad([-hw, iy0, hd], [-hw + t, iy0, hd], [-hw + t, iy1, hd], [-hw, iy1, hd]); // left post
    pushQuad([hw - t, iy0, hd], [hw, iy0, hd], [hw, iy1, hd], [hw - t, iy1, hd]); // right post
  } else {
    // Front U-rim (+Z)
    pushQuad([-hw, y0, hd], [hw, y0, hd], [hw, iy0, hd], [-hw, iy0, hd]); // bottom rim
    pushQuad([-hw, iy0, hd], [-hw + t, iy0, hd], [-hw + t, y1, hd], [-hw, y1, hd]); // left post
    pushQuad([hw - t, iy0, hd], [hw, iy0, hd], [hw, y1, hd], [hw - t, y1, hd]); // right post
    // Open top U-rim (+Y)
    pushQuad([-hw, y1, hd], [-hw + t, y1, hd], [-hw + t, y1, iz0], [-hw, y1, iz0]); // top left lip
    pushQuad([hw - t, y1, hd], [hw, y1, hd], [hw, y1, iz0], [hw - t, y1, iz0]); // top right lip
    pushQuad([-hw, y1, iz0], [hw, y1, iz0], [hw, y1, -hd], [-hw, y1, -hd]); // top back lip
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
