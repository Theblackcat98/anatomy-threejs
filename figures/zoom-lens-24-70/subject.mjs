import * as THREE from "three";
import { buildCylinderGeometry } from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";
import { buildAxialSectorGeometry } from "./structure.mjs";

export function buildZoomOpticalLensGeometry({
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
    if (xb - xf < 0.024) xb = xf + 0.024;
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

function buildZoomIrisBladeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.025, -0.025);
  shape.lineTo(0.25, 0.01);
  shape.quadraticCurveTo(0.30, 0.13, 0.17, 0.22);
  shape.quadraticCurveTo(0.03, 0.15, -0.025, -0.025);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
    curveSegments: 10
  });
  geo.translate(0, 0, -0.006);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildSubject(reg, kit) {
  const { irisX, g4X } = SPEC;
  const zoomAxisGroup = reg.groups.get("zoom.axisGroup")?.group || reg.root;

  const subjectRoot = reg.group("subject.group", {
    parent: zoomAxisGroup,
    pos: [0, 0, 0],
    stage: "subject"
  });

  const phiCutStart = -0.40;
  const phiCutLen = 2.08;
  const phiBackStart = phiCutStart + phiCutLen;
  const phiBackLen = Math.PI * 2 - phiCutLen;

  // ---------------------------------------------------------------------------
  // 1. Rotating Slotted Brass Zoom Cam Barrel & Outer Knurled Zoom Ring
  // ---------------------------------------------------------------------------
  const camBarrelGroup = reg.group("cam.barrelGroup", {
    parent: subjectRoot,
    pos: [0, 0, 0],
    stage: "subject"
  });

  const zoomRingGeoBack = buildAxialSectorGeometry(
    [
      { x: -0.92, rInner: 0.764, rOuter: 0.835 },
      { x: 0.36, rInner: 0.764, rOuter: 0.835 }
    ],
    phiBackStart,
    phiBackLen,
    36
  );
  reg.part("zoom.ring.back", zoomRingGeoBack, {
    parent: camBarrelGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.outer.front", "cam.barrel", "cradle.front"]
  });

  const zoomRingGeoFront = buildAxialSectorGeometry(
    [
      { x: -0.92, rInner: 0.764, rOuter: 0.835 },
      { x: 0.36, rInner: 0.764, rOuter: 0.835 }
    ],
    phiCutStart,
    phiCutLen,
    20
  );
  reg.part("zoom.ring.front", zoomRingGeoFront, {
    parent: camBarrelGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "zoom.ring.back",
    allowOverlap: ["barrel.outer.front", "cam.barrel", "cradle.front", "guide.bulkhead.front", "guide.bulkhead.rear"]
  });

  const knurlPts = [];
  for (let i = 0; i <= 36; i++) {
    const a = phiBackStart + (i / 36) * phiBackLen;
    const r = 0.838;
    knurlPts.push(
      new THREE.Vector3(-0.86, Math.sin(a) * r, Math.cos(a) * r),
      new THREE.Vector3(0.30, Math.sin(a) * r, Math.cos(a) * r)
    );
  }
  reg.detail(
    "zoom.ring.knurl",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(knurlPts), kit.lineMaterials.lo),
    { parent: camBarrelGroup }
  );

  // Brass slotted cam drum inside outer barrel
  const camDrumGeo = buildAxialSectorGeometry(
    [
      { x: -0.92, rInner: 0.63, rOuter: 0.71 },
      { x: 0.50, rInner: 0.63, rOuter: 0.71 }
    ],
    phiBackStart,
    phiBackLen,
    36
  );
  reg.part("cam.barrel", camDrumGeo, {
    parent: camBarrelGroup,
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: [
      "guide.bulkhead.front",
      "guide.bulkhead.rear",
      "guide.rod.top",
      "guide.rod.bot",
      "zoom.ring.back",
      "zoom.g2.carriage",
      "zoom.g3.carriage"
    ]
  });

  // Engraved helical variator cam track & parabolic compensator cam track along brass drum inner wall
  const camTrackPts = [];
  const trackR = 0.626;
  for (let k = 0; k < 24; k++) {
    const u0 = k / 24;
    const u1 = (k + 1) / 24;
    // Variator track (phi spans 2.4 -> 3.55 along back wall)
    const xV0 = -0.72 + 0.60 * (0.85 * u0 + 0.15 * u0 * u0);
    const xV1 = -0.72 + 0.60 * (0.85 * u1 + 0.15 * u1 * u1);
    const phiV0 = 2.45 + u0 * 1.18;
    const phiV1 = 2.45 + u1 * 1.18;
    camTrackPts.push(
      new THREE.Vector3(xV0, Math.sin(phiV0) * trackR, Math.cos(phiV0) * trackR),
      new THREE.Vector3(xV1, Math.sin(phiV1) * trackR, Math.cos(phiV1) * trackR)
    );
    // Compensator parabolic U-track
    const xC0 = 0.34 - 0.22 * Math.sin(Math.PI * u0) + 0.08 * u0;
    const xC1 = 0.34 - 0.22 * Math.sin(Math.PI * u1) + 0.08 * u1;
    const phiC0 = 2.45 + u0 * 1.18;
    const phiC1 = 2.45 + u1 * 1.18;
    camTrackPts.push(
      new THREE.Vector3(xC0, Math.sin(phiC0) * trackR, Math.cos(phiC0) * trackR),
      new THREE.Vector3(xC1, Math.sin(phiC1) * trackR, Math.cos(phiC1) * trackR)
    );
  }
  reg.detail(
    "cam.tracks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(camTrackPts), kit.lineMaterials.hi),
    { parent: camBarrelGroup }
  );

  // ---------------------------------------------------------------------------
  // 2. Group 1 — Front Collector & Focus Group (translates with focusDist)
  // ---------------------------------------------------------------------------
  const g1Group = reg.group("zoom.g1.group", {
    parent: subjectRoot,
    pos: [-1.26, 0, 0],
    stage: "subject"
  });

  const g1CellGeo = buildAxialSectorGeometry(
    [
      { x: -0.13, rInner: 0.56, rOuter: 0.65 },
      { x: 0.15, rInner: 0.56, rOuter: 0.65 }
    ],
    phiBackStart,
    phiBackLen,
    32
  );
  reg.part("zoom.g1.cell", g1CellGeo, {
    parent: g1Group,
    ramp: "intake",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.frontHood", "g1.el1", "g1.el2"]
  });

  reg.part(
    "g1.el1",
    buildZoomOpticalLensGeometry({
      xCenter: -0.05,
      rOuter: 0.565,
      tCenter: 0.06,
      r1: 1.85,
      r2: 0.72
    }),
    {
      parent: g1Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g1.cell"
    }
  );

  reg.part(
    "g1.el2",
    buildZoomOpticalLensGeometry({
      xCenter: 0.09,
      rOuter: 0.555,
      tCenter: 0.13,
      r1: 0.92,
      r2: -2.40
    }),
    {
      parent: g1Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g1.cell",
      allowOverlap: ["g1.el1"]
    }
  );
  reg.anchor("zoom.g1.center", 0, 0, 0, g1Group);

  // ---------------------------------------------------------------------------
  // 3. Group 2 — Lit Variator Carriage sliding on Twin Guide Rods
  // ---------------------------------------------------------------------------
  const g2Group = reg.group("zoom.g2.group", {
    parent: subjectRoot,
    pos: [-0.56, 0, 0],
    stage: "subject"
  });

  const g2CarriageGeo = buildAxialSectorGeometry(
    [
      { x: -0.12, rInner: 0.415, rOuter: 0.49 },
      { x: 0.12, rInner: 0.415, rOuter: 0.49 }
    ],
    phiBackStart,
    phiBackLen,
    32
  );
  reg.part("zoom.g2.carriage", g2CarriageGeo, {
    parent: g2Group,
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "guide.rod.bot",
    allowOverlap: ["guide.rod.top", "barrel.outer.back", "cam.barrel", "g2.el1", "g2.el2", "g2.el3"]
  });

  const bushingGeo = buildCylinderGeometry(0.044, 0.044, 0.22, { segments: 14, axis: "x" });
  [
    { id: "top", phi: 1.86 },
    { id: "bot", phi: -0.66 }
  ].forEach((b) => {
    reg.part(`g2.bushing.${b.id}`, bushingGeo, {
      parent: g2Group,
      pos: [0, Math.sin(b.phi) * 0.54, Math.cos(b.phi) * 0.54],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "zoom.g2.carriage"
    });
  });

  // Radial brass cam follower pin riding in variator slot
  const followerGeo = buildCylinderGeometry(0.026, 0.026, 0.16, { segments: 12, axis: "y" });
  reg.part("g2.camFollower", followerGeo, {
    parent: g2Group,
    pos: [0, 0.55, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true,
    mountOn: "zoom.g2.carriage"
  });

  reg.part(
    "g2.el1",
    buildZoomOpticalLensGeometry({ xCenter: -0.08, rOuter: 0.415, tCenter: 0.048, r1: -0.95, r2: 0.85 }),
    {
      parent: g2Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g2.carriage"
    }
  );
  reg.part(
    "g2.el2",
    buildZoomOpticalLensGeometry({ xCenter: 0.01, rOuter: 0.41, tCenter: 0.052, r1: 1.40, r2: 0.65 }),
    {
      parent: g2Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g2.carriage",
      allowOverlap: ["g2.el1"]
    }
  );
  reg.part(
    "g2.el3",
    buildZoomOpticalLensGeometry({ xCenter: 0.09, rOuter: 0.415, tCenter: 0.075, r1: 0.78, r2: 2.20 }),
    {
      parent: g2Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g2.carriage",
      allowOverlap: ["g2.el2"]
    }
  );
  reg.anchor("zoom.g2.center", 0, 0, 0, g2Group);

  // ---------------------------------------------------------------------------
  // 4. Group 3 — Lit Parabolic Compensator Carriage sliding on Twin Guide Rods
  // ---------------------------------------------------------------------------
  const g3Group = reg.group("zoom.g3.group", {
    parent: subjectRoot,
    pos: [0.22, 0, 0],
    stage: "subject"
  });

  const g3CarriageGeo = buildAxialSectorGeometry(
    [
      { x: -0.09, rInner: 0.43, rOuter: 0.50 },
      { x: 0.09, rInner: 0.43, rOuter: 0.50 }
    ],
    phiBackStart,
    phiBackLen,
    32
  );
  reg.part("zoom.g3.carriage", g3CarriageGeo, {
    parent: g3Group,
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "guide.rod.bot",
    allowOverlap: ["guide.rod.top", "barrel.outer.back", "cam.barrel", "g3.el1", "g3.el2"]
  });

  [
    { id: "top", phi: 1.86 },
    { id: "bot", phi: -0.66 }
  ].forEach((b) => {
    reg.part(`g3.bushing.${b.id}`, bushingGeo, {
      parent: g3Group,
      pos: [0, Math.sin(b.phi) * 0.54, Math.cos(b.phi) * 0.54],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "zoom.g3.carriage"
    });
  });

  reg.part("g3.camFollower", followerGeo, {
    parent: g3Group,
    pos: [0, 0.56, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true,
    mountOn: "zoom.g3.carriage"
  });

  reg.part(
    "g3.el1",
    buildZoomOpticalLensGeometry({ xCenter: -0.035, rOuter: 0.43, tCenter: 0.095, r1: 0.85, r2: -1.10 }),
    {
      parent: g3Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g3.carriage"
    }
  );
  reg.part(
    "g3.el2",
    buildZoomOpticalLensGeometry({ xCenter: 0.05, rOuter: 0.43, tCenter: 0.055, r1: -1.10, r2: 1.95 }),
    {
      parent: g3Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g3.carriage",
      allowOverlap: ["g3.el1", "guide.bulkhead.rear"]
    }
  );
  reg.anchor("zoom.g3.center", 0, 0, 0, g3Group);

  // ---------------------------------------------------------------------------
  // 5. EMD 9-Blade Iris Stop & Group 4 Rear Master Relay
  // ---------------------------------------------------------------------------
  const irisGroup = reg.group("zoom.iris.group", {
    parent: subjectRoot,
    pos: [irisX, 0, 0],
    stage: "subject"
  });

  const irisRingGeo = buildAxialSectorGeometry(
    [
      { x: -0.04, rInner: 0.35, rOuter: 0.595 },
      { x: 0.04, rInner: 0.35, rOuter: 0.595 }
    ],
    0,
    Math.PI * 2,
    36
  );
  reg.part("zoom.iris.ring", irisRingGeo, {
    parent: irisGroup,
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: ["guide.bulkhead.rear"]
  });

  const bladeGeo = buildZoomIrisBladeGeometry();
  for (let b = 0; b < 9; b++) {
    const az = (b / 9) * Math.PI * 2;
    const pivotGroup = reg.group(`zoom.iris.bladePivot.${b}`, {
      parent: irisGroup,
      pos: [((b % 2) - 0.5) * 0.014, Math.sin(az) * 0.39, Math.cos(az) * 0.39],
      rot: [-az, 0, 0],
      stage: "subject"
    });
    reg.part(`zoom.iris.blade.${b}`, bladeGeo, {
      parent: pivotGroup,
      ramp: "lit",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "zoom.iris.ring"
    });
  }
  reg.anchor("zoom.iris.center", 0, 0, 0, irisGroup);

  const g4Group = reg.group("zoom.g4.group", {
    parent: subjectRoot,
    pos: [g4X, 0, 0],
    stage: "subject"
  });

  const g4CellGeo = buildAxialSectorGeometry(
    [
      { x: -0.15, rInner: 0.455, rOuter: 0.595 },
      { x: 0.16, rInner: 0.455, rOuter: 0.595 }
    ],
    phiBackStart,
    phiBackLen,
    32
  );
  reg.part("zoom.g4.cell", g4CellGeo, {
    parent: g4Group,
    ramp: "comp",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    clippable: true,
    mountOn: "barrel.outer.back",
    allowOverlap: ["g4.el1", "g4.el2"]
  });

  reg.part(
    "g4.el1",
    buildZoomOpticalLensGeometry({ xCenter: -0.06, rOuter: 0.455, tCenter: 0.115, r1: 1.05, r2: -1.60 }),
    {
      parent: g4Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g4.cell"
    }
  );
  reg.part(
    "g4.el2",
    buildZoomOpticalLensGeometry({ xCenter: 0.09, rOuter: 0.465, tCenter: 0.09, r1: -1.45, r2: -0.95 }),
    {
      parent: g4Group,
      ramp: "glass",
      outline: "lo",
      outlineWidth: 0.009,
      crease: "faint",
      clippable: true,
      mountOn: "zoom.g4.cell",
      allowOverlap: ["g4.el1"]
    }
  );
}
