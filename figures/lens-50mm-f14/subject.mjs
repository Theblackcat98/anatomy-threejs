import * as THREE from "three";
import { SPEC } from "./model.mjs";
import { buildAxialSectorGeometry } from "./structure.mjs";

/**
 * Builds a watertight revolved optical glass lens element around the +X optical axis.
 * r1, r2 follow optical sign convention: positive R = center of curvature to +X (right),
 * negative R = center of curvature to -X (left), |R| > 50 = flat plano surface.
 */
export function buildOpticalLensGeometry({
  xCenter = 0,
  rOuter = 0.45,
  tCenter = 0.10,
  r1 = 1.2,
  r2 = -1.2,
  radialSegs = 12,
  phiSegs = 36
}) {
  const sag = (r, R) => {
    if (!Number.isFinite(R) || Math.abs(R) > 50) return 0;
    const absR = Math.max(Math.abs(R), rOuter * 1.03);
    const s = absR - Math.sqrt(Math.max(0, absR * absR - r * r));
    return Math.sign(R) * s;
  };

  const x1 = xCenter - tCenter * 0.5;
  const x2 = xCenter + tCenter * 0.5;

  const frontXs = [];
  const backXs = [];
  const radii = [];
  for (let i = 0; i <= radialSegs; i++) {
    const r = (i / radialSegs) * rOuter;
    radii.push(r);
    const xf = x1 + sag(r, r1);
    let xb = x2 + sag(r, r2);
    if (xb - xf < 0.024) {
      xb = xf + 0.024;
    }
    frontXs.push(xf);
    backXs.push(xb);
  }

  const positions = [];
  const indices = [];

  function addGridFace(getPt, nu, nv, flipWinding) {
    const base = positions.length / 3;
    for (let u = 0; u < nu; u++) {
      for (let v = 0; v < nv; v++) {
        const p = getPt(u, v);
        positions.push(p[0], p[1], p[2]);
      }
    }
    for (let u = 0; u < nu - 1; u++) {
      for (let v = 0; v < nv - 1; v++) {
        const a = base + u * nv + v;
        const b = base + (u + 1) * nv + v;
        const c = base + (u + 1) * nv + (v + 1);
        const d = base + u * nv + (v + 1);
        if (!flipWinding) {
          indices.push(a, c, b, a, d, c);
        } else {
          indices.push(a, b, c, a, c, d);
        }
      }
    }
  }

  const phiAt = (j) => (j / phiSegs) * Math.PI * 2;

  // Front spherical surface (-X facing)
  addGridFace(
    (i, j) => {
      const a = phiAt(j);
      const r = radii[i];
      return [frontXs[i], r * Math.sin(a), r * Math.cos(a)];
    },
    radialSegs + 1,
    phiSegs + 1,
    true
  );

  // Back spherical surface (+X facing)
  addGridFace(
    (i, j) => {
      const a = phiAt(j);
      const r = radii[i];
      return [backXs[i], r * Math.sin(a), r * Math.cos(a)];
    },
    radialSegs + 1,
    phiSegs + 1,
    false
  );

  // Cylindrical outer ground edge (+r facing)
  const xRimFront = frontXs[radialSegs];
  const xRimBack = backXs[radialSegs];
  addGridFace(
    (u, j) => {
      const a = phiAt(j);
      const x = u === 0 ? xRimFront : xRimBack;
      return [x, rOuter * Math.sin(a), rOuter * Math.cos(a)];
    },
    2,
    phiSegs + 1,
    true
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a single thin crescent iris blade shape lying in YZ centered at its pivot pin.
 */
function buildIrisBladeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.025, -0.025);
  shape.lineTo(0.26, 0.01);
  shape.quadraticCurveTo(0.32, 0.14, 0.18, 0.24);
  shape.quadraticCurveTo(0.04, 0.16, -0.025, -0.025);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
    curveSegments: 10
  });
  geo.translate(0, 0, -0.006);
  geo.rotateY(Math.PI / 2); // Align blade flat in YZ plane, thickness along X
  return geo;
}

export function buildSubject(reg, kit) {
  const { opticalAxisY, opticalAxisZ, irisX } = SPEC;
  const lensAxisGroup = reg.groups.get("lens.axisGroup")?.group || reg.root;

  const subjectRoot = reg.group("subject.group", {
    parent: lensAxisGroup,
    pos: [0, 0, 0],
    stage: "subject"
  });

  const phiCutStart = -0.40;
  const phiCutLen = 2.08;
  const phiBackStart = phiCutStart + phiCutLen;
  const phiBackLen = Math.PI * 2 - phiCutLen;

  // ---------------------------------------------------------------------------
  // 1. Rotating Knurled Focus Ring & Brass Multi-Start Helicoid Sleeve
  // ---------------------------------------------------------------------------
  const helicoidGroup = reg.group("helicoid.group", {
    parent: subjectRoot,
    pos: [0, 0, 0],
    stage: "subject"
  });

  const focusRings = [
    { x: -0.54, rInner: 0.728, rOuter: 0.805 },
    { x: 0.15, rInner: 0.728, rOuter: 0.805 }
  ];
  const focusBackGeo = buildAxialSectorGeometry(focusRings, phiBackStart, phiBackLen, 36);
  reg.part("focus.ring.back", focusBackGeo, {
    parent: helicoidGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.outer.front", "helicoid.sleeve", "unit.tube", "cradle.front", "cradle.rear"]
  });

  const focusFrontGeo = buildAxialSectorGeometry(focusRings, phiCutStart, phiCutLen, 20);
  reg.part("focus.ring.front", focusFrontGeo, {
    parent: helicoidGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    explode: [-0.18, 1.12, -0.06],
    mountOn: "focus.ring.back",
    allowOverlap: ["barrel.outer.front", "helicoid.sleeve", "unit.tube", "cradle.front", "cradle.rear"]
  });

  // Knurled axial grip ribs around outer focus ring
  const knurlPts = [];
  for (let i = 0; i <= 36; i++) {
    const a = phiBackStart + (i / 36) * phiBackLen;
    const r = 0.808;
    knurlPts.push(
      new THREE.Vector3(-0.50, Math.sin(a) * r, Math.cos(a) * r),
      new THREE.Vector3(0.11, Math.sin(a) * r, Math.cos(a) * r)
    );
  }
  reg.detail(
    "focus.ring.knurl",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(knurlPts), kit.lineMaterials.lo),
    { parent: helicoidGroup }
  );

  // Brass multi-start helicoid sleeve coupling focus ring rotation to axial optical shift
  const helicoidRings = [
    { x: -0.62, rInner: 0.61, rOuter: 0.68 },
    { x: 0.22, rInner: 0.61, rOuter: 0.68 }
  ];
  const helicoidGeo = buildAxialSectorGeometry(helicoidRings, phiBackStart, phiBackLen, 36);
  reg.part("helicoid.sleeve", helicoidGeo, {
    parent: helicoidGroup,
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: [
      "focus.ring.back",
      "unit.tube",
      "barrel.outer.front",
      "cell.el1",
      "cell.el2",
      "cell.el3",
      "cell.doublet",
      "cell.el6",
      "cell.el7",
      "iris.housingRing"
    ]
  });

  // Multi-start helical thread lines etched along inner bore of helicoid sleeve
  const threadPts = [];
  for (let s = 0; s < 6; s++) {
    const basePhi = phiBackStart + 0.15 + (s / 6) * (phiBackLen - 0.30);
    for (let k = 0; k < 12; k++) {
      const t0 = k / 12;
      const t1 = (k + 1) / 12;
      const x0 = -0.58 + t0 * 0.76;
      const x1 = -0.58 + t1 * 0.76;
      const a0 = basePhi + t0 * 0.55;
      const a1 = basePhi + t1 * 0.55;
      if (a1 < phiBackStart + phiBackLen - 0.05) {
        const r = 0.606;
        threadPts.push(
          new THREE.Vector3(x0, Math.sin(a0) * r, Math.cos(a0) * r),
          new THREE.Vector3(x1, Math.sin(a1) * r, Math.cos(a1) * r)
        );
      }
    }
  }
  reg.detail(
    "helicoid.threads",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(threadPts), kit.lineMaterials.mid),
    { parent: helicoidGroup }
  );

  // ---------------------------------------------------------------------------
  // 2. Translating Double-Gauss Optical Unit Carriage (7 Elements + 9-Blade Iris)
  // ---------------------------------------------------------------------------
  const carriageGroup = reg.group("unit.carriageGroup", {
    parent: subjectRoot,
    pos: [0, 0, 0],
    stage: "subject"
  });

  // Lit inner master optical barrel holding all 6 groups & iris diaphragm
  const unitTubeRings = [
    { x: -0.96, rInner: 0.54, rOuter: 0.605 },
    { x: 0.78, rInner: 0.54, rOuter: 0.605 }
  ];
  const unitTubeGeo = buildAxialSectorGeometry(unitTubeRings, phiBackStart, phiBackLen, 36);
  reg.part("unit.tube", unitTubeGeo, {
    parent: carriageGroup,
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "helicoid.sleeve",
    allowOverlap: [
      "barrel.outer.back",
      "barrel.filterRing",
      "mount.bayonet",
      "cell.el1",
      "cell.el2",
      "cell.el3",
      "iris.housingRing",
      "cell.doublet",
      "cell.el6",
      "cell.el7"
    ]
  });

  const lensSpecs = [
    {
      id: "el1",
      cellId: "cell.el1",
      x: -0.82,
      rOuter: 0.515,
      tCenter: 0.13,
      r1: 1.05,
      r2: 2.40,
      cellSpan: [-0.88, -0.74],
      explode: [-0.85, 0, 0]
    },
    {
      id: "el2",
      cellId: "cell.el2",
      x: -0.56,
      rOuter: 0.465,
      tCenter: 0.14,
      r1: 0.85,
      r2: 1.75,
      cellSpan: [-0.62, -0.48],
      explode: [-0.60, 0, 0]
    },
    {
      id: "el3",
      cellId: "cell.el3",
      x: -0.30,
      rOuter: 0.39,
      tCenter: 0.065,
      r1: 1.30,
      r2: 0.56,
      cellSpan: [-0.36, -0.22],
      explode: [-0.34, 0, 0]
    },
    {
      id: "el6",
      cellId: "cell.el6",
      x: 0.52,
      rOuter: 0.445,
      tCenter: 0.12,
      r1: -1.90,
      r2: -0.82,
      cellSpan: [0.46, 0.58],
      explode: [0.28, 0, 0]
    },
    {
      id: "el7",
      cellId: "cell.el7",
      x: 0.72,
      rOuter: 0.46,
      tCenter: 0.11,
      r1: 1.45,
      r2: -1.55,
      cellSpan: [0.66, 0.78],
      explode: [0.40, 0, 0]
    }
  ];

  for (const ls of lensSpecs) {
    const cellGeo = buildAxialSectorGeometry(
      [
        { x: ls.cellSpan[0], rInner: ls.rOuter - 0.008, rOuter: 0.542 },
        { x: ls.cellSpan[1], rInner: ls.rOuter - 0.008, rOuter: 0.542 }
      ],
      phiBackStart,
      phiBackLen,
      32
    );
    reg.part(ls.cellId, cellGeo, {
      parent: carriageGroup,
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      clippable: true,
      explode: ls.explode,
      mountOn: "unit.tube",
      allowOverlap: [`lens.${ls.id}`, "barrel.outer.back", "barrel.filterRing", "mount.bayonet"]
    });

    const lensGeo = buildOpticalLensGeometry({
      xCenter: ls.x,
      rOuter: ls.rOuter,
      tCenter: ls.tCenter,
      r1: ls.r1,
      r2: ls.r2,
      radialSegs: 12,
      phiSegs: 36
    });
    reg.part(`lens.${ls.id}`, lensGeo, {
      parent: carriageGroup,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      explode: ls.explode,
      mountOn: ls.cellId,
      allowOverlap: ["unit.tube", "barrel.outer.back", "barrel.filterRing", "mount.bayonet"]
    });
  }

  // Cemented Rear Doublet (L4 negative flint + L5 positive crown) in shared brass cell
  const doubletCellGeo = buildAxialSectorGeometry(
    [
      { x: 0.12, rInner: 0.395, rOuter: 0.542 },
      { x: 0.37, rInner: 0.395, rOuter: 0.542 }
    ],
    phiBackStart,
    phiBackLen,
    32
  );
  reg.part("cell.doublet", doubletCellGeo, {
    parent: carriageGroup,
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    clippable: true,
    explode: [0.14, 0, 0],
    mountOn: "unit.tube",
    allowOverlap: ["lens.el4", "lens.el5", "barrel.outer.back"]
  });

  reg.part(
    "lens.el4",
    buildOpticalLensGeometry({
      xCenter: 0.18,
      rOuter: 0.405,
      tCenter: 0.055,
      r1: -0.62,
      r2: 1.15,
      radialSegs: 12,
      phiSegs: 36
    }),
    {
      parent: carriageGroup,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      explode: [0.14, 0, 0],
      mountOn: "cell.doublet",
      allowOverlap: ["lens.el5", "unit.tube"]
    }
  );

  reg.part(
    "lens.el5",
    buildOpticalLensGeometry({
      xCenter: 0.295,
      rOuter: 0.42,
      tCenter: 0.125,
      r1: 1.15,
      r2: -0.92,
      radialSegs: 12,
      phiSegs: 36
    }),
    {
      parent: carriageGroup,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      explode: [0.14, 0, 0],
      mountOn: "cell.doublet",
      allowOverlap: ["lens.el4", "unit.tube"]
    }
  );

  // ---------------------------------------------------------------------------
  // 3. 9-Blade Iris Diaphragm Assembly at Optical Stop (x = irisX)
  // ---------------------------------------------------------------------------
  const irisGroup = reg.group("iris.group", {
    parent: carriageGroup,
    pos: [irisX, 0, 0],
    stage: "subject"
  });

  const irisRingGeo = buildAxialSectorGeometry(
    [
      { x: -0.04, rInner: 0.365, rOuter: 0.542 },
      { x: 0.04, rInner: 0.365, rOuter: 0.542 }
    ],
    0,
    Math.PI * 2,
    36
  );
  reg.part("iris.housingRing", irisRingGeo, {
    parent: irisGroup,
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    clippable: true,
    mountOn: "unit.tube",
    allowOverlap: ["barrel.outer.back"]
  });

  const bladeGeo = buildIrisBladeGeometry();
  const numBlades = 9;
  for (let b = 0; b < numBlades; b++) {
    const az = (b / numBlades) * Math.PI * 2;
    const pivotGroup = reg.group(`iris.bladePivot.${b}`, {
      parent: irisGroup,
      pos: [((b % 2) - 0.5) * 0.014, Math.sin(az) * 0.405, Math.cos(az) * 0.405],
      rot: [-az, 0, 0],
      stage: "subject"
    });
    reg.part(`iris.blade.${b}`, bladeGeo, {
      parent: pivotGroup,
      ramp: "lit",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "iris.housingRing"
    });
  }

  // Register anchor at center of iris pupil
  reg.anchor("iris.center", 0, 0, 0, irisGroup);
  reg.anchor("lens.front.center", -0.88, 0, 0, carriageGroup);
}
