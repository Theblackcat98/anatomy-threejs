import * as THREE from "three";
import { buildCylinderGeometry, buildSlabGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

/**
 * Builds an X-extruded annular cutaway ring around X axis.
 * Under rotateY(+PI/2): z = -r*cos(a), y = r*sin(a).
 * Solid arc [205 deg .. 445 deg] keeps bottom & back solid, opening a crisp +Z/+Y cutaway window!
 */
function buildCutawayRingX(rInner, rOuter, length, aStartDeg, aEndDeg, segs = 36) {
  const shape = new THREE.Shape();
  const aStart = (aStartDeg * Math.PI) / 180;
  const aEnd = (aEndDeg * Math.PI) / 180;
  const isFull = Math.abs(aEndDeg - aStartDeg) >= 359.5;

  if (isFull) {
    shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  } else {
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
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    bevelSegments: 1,
    curveSegments: segs
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/**
 * Builds a contoured figure-8 / dual-lobe gearbox bearing web in the YZ plane (extruded along X).
 * Remember rotateY(+PI/2) maps shape (sx, sy) -> (z = -sx, y = sy), so sx = -z, sy = y.
 */
function buildFigure8WebX(yTop, zTop, rTop, yBot, zBot, rBot, thickness, waistScale = 0.55) {
  const sx1 = -zTop;
  const sy1 = yTop;
  const sx2 = -zBot;
  const sy2 = yBot;

  const dx = sx2 - sx1;
  const dy = sy2 - sy1;
  const ang = Math.atan2(dy, dx);
  const perp = ang + Math.PI / 2;

  const shape = new THREE.Shape();
  // Trace upper lobe around (sx1, sy1) from perp to -perp (back/top side)
  const segs = 20;
  for (let i = 0; i <= segs; i++) {
    const a = ang + Math.PI * 0.38 + (Math.PI * 1.24) * (i / segs);
    const px = sx1 + Math.cos(a) * rTop;
    const py = sy1 + Math.sin(a) * rTop;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  // Smooth waist pinch on left/front side
  const midX = (sx1 + sx2) * 0.5;
  const midY = (sy1 + sy2) * 0.5;
  const wAvg = ((rTop + rBot) * 0.5) * waistScale;
  shape.quadraticCurveTo(
    midX - Math.cos(perp) * wAvg,
    midY - Math.sin(perp) * wAvg,
    sx2 + Math.cos(ang - Math.PI * 0.62) * rBot,
    sy2 + Math.sin(ang - Math.PI * 0.62) * rBot
  );
  // Trace lower lobe around (sx2, sy2)
  for (let i = 0; i <= segs; i++) {
    const a = ang - Math.PI * 0.62 + (Math.PI * 1.24) * (i / segs);
    shape.lineTo(sx2 + Math.cos(a) * rBot, sy2 + Math.sin(a) * rBot);
  }
  // Smooth waist pinch on right/back side back to start
  shape.quadraticCurveTo(
    midX + Math.cos(perp) * wAvg,
    midY + Math.sin(perp) * wAvg,
    sx1 + Math.cos(ang + Math.PI * 0.38) * rTop,
    sy1 + Math.sin(ang + Math.PI * 0.38) * rTop
  );
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 1,
    curveSegments: 24
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/**
 * Builds a contoured C-curved rear/upper transmission housing shell in YZ plane extruded along X.
 */
function buildCaseArchShellX(pointsOuter, pointsInner, length) {
  const shape = new THREE.Shape();
  pointsOuter.forEach(([z, y], idx) => {
    const sx = -z;
    const sy = y;
    if (idx === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  });
  for (let i = pointsInner.length - 1; i >= 0; i--) {
    const [z, y] = pointsInner[i];
    shape.lineTo(-z, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    bevelSegments: 1
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildStructure(reg, kit) {
  const structGroup = reg.group("struct.group", { stage: "structure" });
  const { railTopY, inY, inZ, outY, outZ } = SPEC;

  // 1. Machined Cast-Alloy Dyno Mounting Saddles (sit on base.tie.front/mid/rear at railTopY)
  const sumpBotY = -1.52; // Sump floor bottom; largest output gear lowest tip is -1.364
  const saddleH = sumpBotY - railTopY; // 0.14
  const saddleCY = railTopY + saddleH * 0.5;

  reg.part("struct.saddle.front", new THREE.BoxGeometry(0.22, saddleH + 0.04, 0.96), {
    parent: structGroup,
    pos: [ANCHORS.cradleFrontMount[0], saddleCY + 0.02, -0.04],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.tie.front"
  });
  reg.part("struct.saddle.mid", new THREE.BoxGeometry(0.18, saddleH + 0.04, 1.06), {
    parent: structGroup,
    pos: [ANCHORS.cradleMidMount[0], saddleCY + 0.02, 0.02],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.tie.mid"
  });
  reg.part("struct.saddle.rear", new THREE.BoxGeometry(0.22, saddleH + 0.04, 1.02), {
    parent: structGroup,
    pos: [ANCHORS.cradleRearMount[0], saddleCY + 0.02, 0.02],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.tie.rear"
  });

  // 2. Finned Cast-Aluminum Oil Sump Pan (spans x = -1.10 .. +2.16 below the gearset)
  reg.part("struct.sump.pan", buildSlabGeometry(3.26, 1.48, 0.09, {
    radius: 0.08,
    bevel: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 1
  }), {
    parent: structGroup,
    pos: [0.53, -1.42, 0.02],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "struct.saddle.mid",
    allowOverlap: ["struct.saddle.front", "struct.saddle.rear"]
  });
  // Longitudinal oil sump cooling fins underneath
  [-0.36, -0.18, 0.0, 0.18, 0.36].forEach((fz, i) => {
    reg.part(`struct.sump.fin.${i}`, new THREE.BoxGeometry(2.60, 0.045, 0.03), {
      parent: structGroup,
      pos: [0.54, -1.545, 0.02 + fz],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      detail: true,
      clippable: true,
      mountOn: "struct.sump.pan"
    });
  });

  // 3. Contoured Figure-8 Gearbox Bearing Bulkheads (Front Bell-Wall, Slim Mid Web, Rear Output Wall)
  // Front gearbox bulkhead at x = -1.04 (separates wet clutch bellhousing from gear train)
  reg.part("struct.bulkhead.front", buildFigure8WebX(inY, inZ, 0.56, outY, outZ, 0.80, 0.10, 0.84), {
    parent: structGroup,
    pos: [-1.04, 0, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    explode: [-0.20, 0, 0],
    mountOn: "struct.sump.pan",
    allowOverlap: ["struct.bellhousing", "struct.bell.flange", "struct.bell.cover"]
  });

  // Slim contoured mid center-support bearing web at x = +0.36 (tight around shafts so all 7 gears stay exposed!)
  reg.part("struct.bulkhead.mid", buildFigure8WebX(inY, inZ, 0.25, outY, outZ, 0.27, 0.075, 0.65), {
    parent: structGroup,
    pos: [0.36, 0, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    mountOn: "struct.bulkhead.midFoot"
  });
  // Lower foot strut anchoring mid web cleanly down to sump pan
  reg.part("struct.bulkhead.midFoot", new THREE.BoxGeometry(0.08, 0.62, 0.34), {
    parent: structGroup,
    pos: [0.36, -1.12, outZ - 0.02],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    clippable: true,
    mountOn: "struct.sump.pan",
    allowOverlap: ["struct.bulkhead.mid"]
  });

  // Rear output bearing bulkhead at x = +2.10
  reg.part("struct.bulkhead.rear", buildFigure8WebX(inY, inZ, 0.44, outY, outZ, 0.56, 0.11, 0.82), {
    parent: structGroup,
    pos: [2.10, 0, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    explode: [0.22, 0, 0],
    mountOn: "struct.bulkhead.rearFoot"
  });
  reg.part("struct.bulkhead.rearFoot", new THREE.BoxGeometry(0.11, 0.44, 0.72), {
    parent: structGroup,
    pos: [2.10, -1.22, 0.04],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    clippable: true,
    explode: [0.22, 0, 0],
    mountOn: "struct.sump.pan",
    allowOverlap: ["struct.bulkhead.rear"]
  });

  // Machined Brass Bearing Bosses on Front, Mid, Rear Bulkheads
  const bearingSpecs = [
    { id: "frontIn", x: -1.04, y: inY, z: inZ, rIn: 0.145, rOut: 0.21, w: 0.13, parentPart: "struct.bulkhead.front" },
    { id: "frontOut", x: -1.04, y: outY, z: outZ, rIn: 0.09, rOut: 0.17, w: 0.13, parentPart: "struct.bulkhead.front" },
    { id: "midIn", x: 0.36, y: inY, z: inZ, rIn: 0.08, rOut: 0.16, w: 0.10, parentPart: "struct.bulkhead.mid" },
    { id: "midOut", x: 0.36, y: outY, z: outZ, rIn: 0.09, rOut: 0.17, w: 0.10, parentPart: "struct.bulkhead.mid" },
    { id: "rearIn", x: 2.10, y: inY, z: inZ, rIn: 0.08, rOut: 0.16, w: 0.14, parentPart: "struct.bulkhead.rear" },
    { id: "rearOut", x: 2.10, y: outY, z: outZ, rIn: 0.09, rOut: 0.18, w: 0.14, parentPart: "struct.bulkhead.rear" }
  ];
  bearingSpecs.forEach((b) => {
    reg.part(`struct.bearing.${b.id}`, buildCutawayRingX(b.rIn, b.rOut, b.w, 0, 360, 24), {
      parent: structGroup,
      pos: [b.x, b.y, b.z],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: b.parentPart,
      allowOverlap: ["shaft.in.odd", "shaft.in.even", "shaft.out"]
    });
  });

  // 4. Cutaway Ribbed Wet-Clutch Bellhousing (spans x = -1.82 .. -1.08 around inAxis)
  // Solid arc [205..445 deg] opens a wide +Z/+Y cutaway viewing window directly toward the camera!
  reg.part("struct.bellhousing", buildCutawayRingX(0.66, 0.74, 0.74, 205, 445, 36), {
    parent: structGroup,
    pos: [-1.45, inY, inZ],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    explode: [-0.14, 1.54, 0],
    mountOn: "struct.bulkhead.front",
    allowOverlap: [
      "struct.bell.flange",
      "struct.bell.cover",
      "clutch.k2.basket",
      "clutch.k2.plate.0",
      "clutch.k2.plate.1",
      "clutch.k2.plate.2",
      "clutch.k2.plate.3",
      "clutch.k2.piston",
      "clutch.k1.drum",
      "clutch.k1.piston"
    ]
  });

  // Front Engine-Mate Bellhousing Flange Ring with mounting lugs
  reg.part("struct.bell.flange", buildCutawayRingX(0.65, 0.82, 0.09, 205, 445, 36), {
    parent: structGroup,
    pos: [-1.81, inY, inZ],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    clippable: true,
    explode: [-0.14, 1.54, 0],
    mountOn: "struct.bellhousing",
    allowOverlap: ["struct.saddle.front", "struct.clutchFeed"]
  });

  // External structural gusset ribs along bellhousing back/bottom
  [235, 290, 345, 400].forEach((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    const rz = inZ - Math.cos(rad) * 0.75;
    const ry = inY + Math.sin(rad) * 0.75;
    reg.part(`struct.bell.rib.${i}`, new THREE.BoxGeometry(0.66, 0.055, 0.055), {
      parent: structGroup,
      pos: [-1.45, ry, rz],
      rot: [-rad, 0, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      detail: true,
      clippable: true,
      explode: [-0.14, 1.54, 0],
      mountOn: "struct.bellhousing"
    });
  });

  // Removable Front Cutaway Bellhousing Cover (closed when Cutaway=OFF)
  reg.part("struct.bell.cover", buildCutawayRingX(0.66, 0.74, 0.74, 85, 205, 24), {
    parent: structGroup,
    pos: [-1.45, inY, inZ],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    cutawayHide: true,
    explode: [-0.22, 1.88, -0.20],
    mountOn: "struct.bellhousing",
    allowOverlap: ["struct.bell.flange"]
  });

  // 5. Rear Cutaway Casing Wall & Removable Contoured Upper/Front Cutaway Shell
  // Built from circular clearance envelopes (R_in=0.80, R_out=1.05) grounded cleanly onto struct.sump.pan (y=-1.42)
  function buildContourArcPoints(cx, cy, r, aStartDeg, aEndDeg, steps = 16) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = ((aStartDeg + (aEndDeg - aStartDeg) * (i / steps)) * Math.PI) / 180;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  const backInner = [
    [-0.58, -1.42],
    ...buildContourArcPoints(outZ, outY, 1.00, 212, 165, 10),
    ...buildContourArcPoints(inZ, inY, 0.80, 185, 86, 14)
  ];
  const backOuter = [
    [-0.66, -1.42],
    ...buildContourArcPoints(outZ, outY, 1.08, 212, 165, 10),
    ...buildContourArcPoints(inZ, inY, 0.88, 185, 86, 14)
  ];
  reg.part("struct.case.backWall", buildCaseArchShellX(backOuter, backInner, 3.06), {
    parent: structGroup,
    pos: [0.53, 0, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "struct.sump.pan",
    allowOverlap: ["struct.bulkhead.front", "struct.bulkhead.mid", "struct.bulkhead.rear", "struct.case.cutawayShell"]
  });

  // Removable Front/Top Contoured Gearbox Shell (closes case when Cutaway=OFF)
  const frontInner = [
    ...buildContourArcPoints(inZ, inY, 0.80, 86, 15, 10),
    ...buildContourArcPoints(outZ, outY, 1.05, 34, -44, 14),
    [0.88, -1.42]
  ];
  const frontOuter = [
    ...buildContourArcPoints(inZ, inY, 0.88, 86, 15, 10),
    ...buildContourArcPoints(outZ, outY, 1.13, 34, -44, 14),
    [0.96, -1.42]
  ];
  reg.part("struct.case.cutawayShell", buildCaseArchShellX(frontOuter, frontInner, 3.06), {
    parent: structGroup,
    pos: [0.53, 0, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    cutawayHide: true,
    explode: [0, 1.95, -0.45],
    mountOn: "struct.sump.pan",
    allowOverlap: [
      "struct.bulkhead.front",
      "struct.bulkhead.mid",
      "struct.bulkhead.rear",
      "struct.shiftRail.odd",
      "struct.shiftRail.even",
      "struct.shiftRail.midBrkt",
      "struct.shiftRail.rearBrkt"
    ]
  });

  // 6. Dual Parallel Precision Shift Guide Rails (Odd Rail upper, Even Rail lower-front)
  const oddRailY = 0.14;
  const oddRailZ = 0.64;
  const evenRailY = -0.02;
  const evenRailZ = 0.76;

  // Front & Mid & Rear shift rail bearing brackets
  reg.part("struct.shiftRail.frontBrkt", new THREE.BoxGeometry(0.10, 0.34, 0.36), {
    parent: structGroup,
    pos: [-1.04, 0.04, 0.68],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.bulkhead.front"
  });
  reg.part("struct.shiftRail.midBrkt", new THREE.BoxGeometry(0.08, 0.34, 0.42), {
    parent: structGroup,
    pos: [0.36, 0.04, 0.64],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.bulkhead.mid"
  });
  reg.part("struct.shiftRail.rearBrkt", new THREE.BoxGeometry(0.11, 0.34, 0.40), {
    parent: structGroup,
    pos: [2.10, 0.04, 0.65],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.bulkhead.rear"
  });

  // Odd Shift Rail (serves Synchros O1 & O2: x = +0.20 .. +2.18)
  reg.part("struct.shiftRail.odd", buildCylinderGeometry(0.026, 0.026, 1.98, { segments: 14, axis: "x" }), {
    parent: structGroup,
    pos: [1.19, oddRailY, oddRailZ],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    explode: [0, 0.22, 0.22],
    mountOn: "struct.shiftRail.midBrkt",
    allowOverlap: ["struct.shiftRail.rearBrkt"]
  });

  // Even Shift Rail (serves Synchros E1 & E2: x = -1.08 .. +2.18)
  reg.part("struct.shiftRail.even", buildCylinderGeometry(0.026, 0.026, 3.26, { segments: 14, axis: "x" }), {
    parent: structGroup,
    pos: [0.55, evenRailY, evenRailZ],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    explode: [0, 0.16, 0.28],
    mountOn: "struct.shiftRail.frontBrkt",
    allowOverlap: ["struct.shiftRail.midBrkt", "struct.shiftRail.rearBrkt"]
  });

  // 7. Hydraulic Rotary Clutch Feed Union (mounted on front bellhousing flange shoulder)
  reg.part("struct.clutchFeed", new THREE.BoxGeometry(0.16, 0.22, 0.24), {
    parent: structGroup,
    pos: [-1.81, -0.58, 0.14],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    explode: [-0.14, 1.54, 0],
    mountOn: "struct.bell.flange",
    allowOverlap: ["struct.saddle.front"]
  });
  reg.anchor("clutch.feed.k1", -1.81, -0.56, 0.26, structGroup, { dir: [0, 0, 1] });
  reg.anchor("clutch.feed.k2", -1.75, -0.62, 0.26, structGroup, { dir: [0, 0, 1] });

  // 8. Detailed Mechatronics Hydraulic Valve Body (on base.mechaPad)
  const [mcX, , mcZ] = ANCHORS.mechatronicsMount;
  const mcPadTop = SPEC.BASE_Y + 0.11;

  reg.part("struct.mecha.body", buildSlabGeometry(1.24, 0.54, 0.17, {
    radius: 0.04,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  }), {
    parent: structGroup,
    pos: [mcX, mcPadTop + 0.17, mcZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.mechaPad"
  });

  // Cutaway Glass Oil Gallery Cover on top of Mechatronics Body
  reg.part("struct.mecha.cover", buildSlabGeometry(1.12, 0.34, 0.04, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 1
  }), {
    parent: structGroup,
    pos: [mcX, mcPadTop + 0.215, mcZ - 0.04],
    ramp: "glass",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.mecha.body"
  });

  // 4 Proportional Hydraulic Pressure Control Solenoid Cans (K1, K2, SYN-O, SYN-E)
  const solSpecs = [
    { id: "k1", x: mcX - 0.40, ramp: "lit" },
    { id: "k2", x: mcX - 0.14, ramp: "comp" },
    { id: "synE", x: mcX + 0.14, ramp: "brass" },
    { id: "synO", x: mcX + 0.40, ramp: "copper" }
  ];
  solSpecs.forEach((s) => {
    reg.part(`struct.mecha.sol.${s.id}`, buildCylinderGeometry(0.068, 0.068, 0.14, { segments: 16, axis: "y" }), {
      parent: structGroup,
      pos: [s.x, mcPadTop + 0.27, mcZ - 0.06],
      ramp: s.ramp,
      outline: "lo",
      crease: "faint",
      mountOn: "struct.mecha.cover"
    });
    reg.part(`struct.mecha.solCap.${s.id}`, buildCylinderGeometry(0.045, 0.045, 0.04, { segments: 14, axis: "y" }), {
      parent: structGroup,
      pos: [s.x, mcPadTop + 0.35, mcZ - 0.06],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: `struct.mecha.sol.${s.id}`
    });
  });

  // Hydraulic Manifold Outlet Anchors (with outward port normals)
  reg.anchor("mecha.out.k1", mcX - 0.62, mcPadTop + 0.10, mcZ - 0.14, structGroup, { dir: [-1, 0, 0] });
  reg.anchor("mecha.out.k2", mcX - 0.62, mcPadTop + 0.10, mcZ - 0.02, structGroup, { dir: [-1, 0, 0] });
  reg.anchor("mecha.out.synE", mcX + 0.62, mcPadTop + 0.10, mcZ - 0.14, structGroup, { dir: [1, 0, 0] });
  reg.anchor("mecha.out.synO", mcX + 0.62, mcPadTop + 0.10, mcZ - 0.02, structGroup, { dir: [1, 0, 0] });

  [[-0.50, 0.18], [0.50, 0.18], [-0.50, -0.18], [0.50, -0.18]].forEach(([dx, dz], i) => {
    reg.detail(`struct.mecha.screw.${i}`, makeScrewDetail(mcX + dx, mcPadTop + 0.185, mcZ + dz, 0.022, "y", kit), {
      parent: structGroup
    });
  });
  reg.tag("tag-mecha", "MECHATRONICS", mcX, mcPadTop + 0.22, mcZ + 0.20);
}
