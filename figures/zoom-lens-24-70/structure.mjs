import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";

/**
 * Builds a watertight, outward-wound revolved solid sector (or full 360° annulus)
 * revolved around the +X optical axis from profile rings [{ x, rInner, rOuter }...].
 */
export function buildAxialSectorGeometry(rings, phiStart, phiLength, segsPhi = 36) {
  const isFull = phiLength >= Math.PI * 2 - 1e-4;
  const actualPhiLen = isFull ? Math.PI * 2 : phiLength;
  const nx = rings.length;

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

  const phiAt = (j) => phiStart + (j / segsPhi) * actualPhiLen;

  addGridFace(
    (i, j) => {
      const a = phiAt(j);
      const r = rings[i].rOuter;
      return [rings[i].x, r * Math.sin(a), r * Math.cos(a)];
    },
    nx,
    segsPhi + 1,
    true
  );

  addGridFace(
    (i, j) => {
      const a = phiAt(j);
      const r = rings[i].rInner;
      return [rings[i].x, r * Math.sin(a), r * Math.cos(a)];
    },
    nx,
    segsPhi + 1,
    false
  );

  const rightRing = rings[nx - 1];
  addGridFace(
    (k, j) => {
      const a = phiAt(j);
      const r = k === 0 ? rightRing.rInner : rightRing.rOuter;
      return [rightRing.x, r * Math.sin(a), r * Math.cos(a)];
    },
    2,
    segsPhi + 1,
    false
  );

  const leftRing = rings[0];
  addGridFace(
    (k, j) => {
      const a = phiAt(j);
      const r = k === 0 ? leftRing.rInner : leftRing.rOuter;
      return [leftRing.x, r * Math.sin(a), r * Math.cos(a)];
    },
    2,
    segsPhi + 1,
    true
  );

  if (!isFull) {
    addGridFace(
      (i, k) => {
        const r = k === 0 ? rings[i].rInner : rings[i].rOuter;
        return [rings[i].x, r * Math.sin(phiStart), r * Math.cos(phiStart)];
      },
      nx,
      2,
      true
    );
    const phiEnd = phiStart + actualPhiLen;
    addGridFace(
      (i, k) => {
        const r = k === 0 ? rings[i].rInner : rings[i].rOuter;
        return [rings[i].x, r * Math.sin(phiEnd), r * Math.cos(phiEnd)];
      },
      nx,
      2,
      false
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildRailCradleGeometry(cradleR, yBase, halfW, thickness) {
  const shape = new THREE.Shape();
  const aLeft = -Math.PI * 0.5 - 0.70;
  const aRight = -Math.PI * 0.5 + 0.70;
  const cheekTopY = Math.sin(aRight) * cradleR;

  shape.moveTo(-halfW, yBase);
  shape.lineTo(halfW, yBase);
  shape.lineTo(halfW, cheekTopY + 0.04);
  shape.lineTo(Math.cos(aRight) * cradleR, cheekTopY);

  const arcSegs = 20;
  for (let i = 1; i <= arcSegs; i++) {
    const a = aRight + (i / arcSegs) * (aLeft - aRight);
    shape.lineTo(Math.cos(a) * cradleR, Math.sin(a) * cradleR);
  }
  shape.lineTo(-halfW, cheekTopY + 0.04);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 16
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildStructure(reg, kit) {
  const { railRodY, railTopY, opticalAxisY, opticalAxisZ } = SPEC;
  const structGroup = reg.group("structure.group", { stage: "structure" });

  const zoomAxisGroup = reg.group("zoom.axisGroup", {
    parent: structGroup,
    pos: [0, opticalAxisY, opticalAxisZ],
    stage: "structure"
  });

  // 1. Twin Rod-Mounted Lens Support Saddles clamping onto 15mm studio rails
  const yRodClampBase = railRodY - 0.055 - opticalAxisY; // wraps below rod centerline
  const cradleGeo = buildRailCradleGeometry(0.775, yRodClampBase, 0.56, 0.24);
  const cradleSpecs = [
    { id: "cradle.front", x: -0.96 },
    { id: "cradle.rear", x: 0.94 }
  ];
  for (const c of cradleSpecs) {
    reg.part(c.id, cradleGeo, {
      parent: zoomAxisGroup,
      pos: [c.x, 0, 0],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      mountOn: "base.railRod.F",
      allowOverlap: ["base.railRod.R", "barrel.outer.back", "barrel.outer.front", "cam.barrel"]
    });
    [-0.46, 0.46].forEach((cz, idx) => {
      reg.detail(
        `${c.id}.bolt.${idx}`,
        makeScrewDetail(c.x, yRodClampBase + 0.28, cz, 0.025, "y", kit),
        { parent: zoomAxisGroup }
      );
    });
  }

  // 2. Stationary Outer Zoom Chassis Barrel (cutaway window toward +Z/+Y)
  const phiCutStart = -0.40;
  const phiCutLen = 2.08;
  const phiBackStart = phiCutStart + phiCutLen;
  const phiBackLen = Math.PI * 2 - phiCutLen;

  const outerRings = [
    { x: -1.54, rInner: 0.72, rOuter: 0.80 },
    { x: -1.04, rInner: 0.72, rOuter: 0.80 },
    { x: -1.03, rInner: 0.72, rOuter: 0.76 },
    { x: 0.54, rInner: 0.72, rOuter: 0.76 },
    { x: 0.55, rInner: 0.60, rOuter: 0.785 },
    { x: 1.14, rInner: 0.60, rOuter: 0.785 }
  ];

  const barrelBackGeo = buildAxialSectorGeometry(outerRings, phiBackStart, phiBackLen, 36);
  reg.part("barrel.outer.back", barrelBackGeo, {
    parent: zoomAxisGroup,
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "cradle.front",
    allowOverlap: [
      "cradle.rear",
      "barrel.frontHood",
      "mount.bayonet",
      "guide.bulkhead.front",
      "guide.bulkhead.rear",
      "guide.rod.top",
      "guide.rod.bot",
      "cam.barrel",
      "zoom.ring.back",
      "zoom.ring.front",
      "zoom.g1.cell",
      "zoom.g2.carriage",
      "zoom.g3.carriage",
      "zoom.g4.cell",
      "zoom.iris.ring"
    ]
  });

  const barrelFrontGeo = buildAxialSectorGeometry(outerRings, phiCutStart, phiCutLen, 20);
  reg.part("barrel.outer.front", barrelFrontGeo, {
    parent: zoomAxisGroup,
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "barrel.outer.back",
    allowOverlap: [
      "cradle.front",
      "cradle.rear",
      "barrel.frontHood",
      "mount.bayonet",
      "cam.barrel",
      "zoom.ring.back",
      "zoom.g2.carriage",
      "zoom.g3.carriage",
      "zoom.g4.cell",
      "zoom.iris.ring"
    ]
  });

  // Front Filter & Hood Flange Ring
  const hoodRings = [
    { x: -1.68, rInner: 0.67, rOuter: 0.825 },
    { x: -1.53, rInner: 0.67, rOuter: 0.825 }
  ];
  const hoodGeo = buildAxialSectorGeometry(hoodRings, 0, Math.PI * 2, 40);
  reg.part("barrel.frontHood", hoodGeo, {
    parent: zoomAxisGroup,
    ramp: "lo",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.outer.front"]
  });

  // Servo zoom port boss on stationary front barrel skirt (clear of rotating zoom ring)
  const zoomBossGeo = buildCylinderGeometry(0.065, 0.075, 0.12, { segments: 16, axis: "y" });
  reg.part("barrel.zoomBoss", zoomBossGeo, {
    parent: zoomAxisGroup,
    pos: [-1.30, -0.76, 0.24],
    rot: [0.35, 0, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "barrel.outer.back"
  });
  reg.anchor("barrel.port.zoom", -1.30, -0.82, 0.26, zoomAxisGroup, { dir: [0, -0.94, 0.34] });

  // 3. Internal Twin Precision Linear Guide Rods for G2 Variator & G3 Compensator
  const rodAngles = [
    { id: "top", phi: 1.86 },
    { id: "bot", phi: -0.66 }
  ];
  const bulkheadGeo = buildAxialSectorGeometry(
    [
      { x: -0.98, rInner: 0.50, rOuter: 0.72 },
      { x: -0.90, rInner: 0.50, rOuter: 0.72 }
    ],
    phiBackStart,
    phiBackLen,
    28
  );
  reg.part("guide.bulkhead.front", bulkheadGeo, {
    parent: zoomAxisGroup,
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "barrel.outer.back",
    allowOverlap: ["cam.barrel", "barrel.outer.front", "cradle.front"]
  });

  const bulkheadRearGeo = buildAxialSectorGeometry(
    [
      { x: 0.50, rInner: 0.50, rOuter: 0.72 },
      { x: 0.58, rInner: 0.50, rOuter: 0.72 }
    ],
    phiBackStart,
    phiBackLen,
    28
  );
  reg.part("guide.bulkhead.rear", bulkheadRearGeo, {
    parent: zoomAxisGroup,
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "barrel.outer.back",
    allowOverlap: ["cam.barrel", "zoom.iris.ring", "barrel.outer.front", "cradle.rear"]
  });

  const guideRodR = 0.54;
  const guideLen = 1.50;
  const guideGeo = buildCylinderGeometry(0.024, 0.024, guideLen, { segments: 14, axis: "x" });
  for (const ra of rodAngles) {
    reg.part(`guide.rod.${ra.id}`, guideGeo, {
      parent: zoomAxisGroup,
      pos: [-0.20, Math.sin(ra.phi) * guideRodR, Math.cos(ra.phi) * guideRodR],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "guide.bulkhead.front",
      allowOverlap: [
        "guide.bulkhead.rear",
        "barrel.outer.back",
        "cam.barrel",
        "zoom.g2.carriage",
        "zoom.g3.carriage"
      ]
    });
  }

  // 4. Rear Brass Bayonet Flange & Electronic Contacts
  const bayonetRings = [
    { x: 1.14, rInner: 0.54, rOuter: 0.79 },
    { x: 1.28, rInner: 0.54, rOuter: 0.79 }
  ];
  const bayonetGeo = buildAxialSectorGeometry(bayonetRings, 0, Math.PI * 2, 40);
  reg.part("mount.bayonet", bayonetGeo, {
    parent: zoomAxisGroup,
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.outer.front", "sensor.throat.back", "sensor.throat.front"]
  });

  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.5 - 0.40 + (i / 5) * 0.80;
    const pinGeo = buildCylinderGeometry(0.016, 0.016, 0.04, { segments: 10, axis: "x" });
    reg.part(`mount.contactPin.${i}`, pinGeo, {
      parent: zoomAxisGroup,
      pos: [1.285, Math.sin(a) * 0.61, Math.cos(a) * 0.61],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "mount.bayonet"
    });
  }

  // 5. Rear Flange Throat & Full-Frame CMOS Sensor Chamber
  const throatRings = [
    { x: 1.28, rInner: 0.54, rOuter: 0.69 },
    { x: 1.65, rInner: 0.54, rOuter: 0.69 }
  ];
  const throatBackGeo = buildAxialSectorGeometry(throatRings, phiBackStart, phiBackLen, 36);
  reg.part("sensor.throat.back", throatBackGeo, {
    parent: zoomAxisGroup,
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "mount.bayonet",
    allowOverlap: ["sensor.housing"]
  });

  const throatFrontGeo = buildAxialSectorGeometry(throatRings, phiCutStart, phiCutLen, 18);
  reg.part("sensor.throat.front", throatFrontGeo, {
    parent: zoomAxisGroup,
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "sensor.throat.back"
  });

  // Sensor Pedestal seated on rear rail bridge (flush with sensor.housing front x=1.66)
  const yBridgeLocal = railTopY - opticalAxisY; // -1.385 - (-0.14) = -1.245
  const sensorPedH = 0.68; // rises to -0.565 (touches sensor.housing bottom -0.58)
  const sensorPedGeo = new THREE.BoxGeometry(0.24, sensorPedH, 0.94);
  reg.part("sensor.pedestal", sensorPedGeo, {
    parent: zoomAxisGroup,
    pos: [1.79, yBridgeLocal + sensorPedH * 0.5, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.railBridge.rear"
  });

  const housingGeo = new THREE.BoxGeometry(0.28, 1.18, 1.34);
  reg.part("sensor.housing", housingGeo, {
    parent: zoomAxisGroup,
    pos: [1.79, 0, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "sensor.pedestal",
    allowOverlap: ["sensor.throat.back", "sensor.throat.front"]
  });

  const cmosGeo = new THREE.BoxGeometry(0.026, 0.48, 0.72);
  reg.part("sensor.cmosDie", cmosGeo, {
    parent: zoomAxisGroup,
    pos: [1.64, 0, 0],
    ramp: "intake",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.014,
    mountOn: "sensor.housing"
  });

  const olpfGeo = new THREE.BoxGeometry(0.020, 0.54, 0.78);
  reg.part("sensor.glassFilter", olpfGeo, {
    parent: zoomAxisGroup,
    pos: [1.614, 0, 0],
    ramp: "glass",
    outline: "lo",
    crease: "faint",
    mountOn: "sensor.cmosDie",
    allowOverlap: ["sensor.housing"]
  });

  for (let i = -3; i <= 3; i++) {
    const finGeo = new THREE.BoxGeometry(0.055, 0.96, 0.045);
    reg.part(`sensor.heatsink.${i + 3}`, finGeo, {
      parent: zoomAxisGroup,
      pos: [1.955, 0, i * 0.16],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "sensor.housing"
    });
  }

  const dataPortGeo = buildCylinderGeometry(0.055, 0.06, 0.08, { segments: 14, axis: "z" });
  reg.part("sensor.portBoss", dataPortGeo, {
    parent: zoomAxisGroup,
    pos: [1.79, -0.36, 0.69],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "sensor.housing"
  });
  reg.anchor("sensor.port.in", 1.79, -0.36, 0.73, zoomAxisGroup, { dir: [0, 0, 1] });
}
