import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";

/**
 * Builds a watertight, outward-wound revolved solid sector (or full 360° annulus when phiLength >= 2π)
 * revolved around the +X optical axis from profile rings [{ x, rInner, rOuter }...] sorted -X to +X.
 * phi = 0 points along +Z (toward viewer); phi = PI/2 points along +Y (upward).
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

  // 1. Outer curved wall (+r normal)
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

  // 2. Inner curved wall (-r normal)
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

  // 3. Right annular cap at xMax (+X normal)
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

  // 4. Left annular cap at xMin (-X normal)
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

  // 5. Cut-face meridian caps when sector < 360°
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

/**
 * Builds a V-block optical bench saddle block in YZ extruded along X,
 * cradling radius `cradleR` from `yBase` up around the barrel sides.
 */
function buildCradleSaddleGeometry(cradleR, yBase, halfW, thickness) {
  const shape = new THREE.Shape();
  const aLeft = -Math.PI * 0.5 - 0.72;
  const aRight = -Math.PI * 0.5 + 0.72;
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
  // ExtrudeGeometry builds in XY (depth along Z). RotateY(+PI/2) maps shape X->-Z, shape Y->+Y, depth Z->+X.
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildStructure(reg, kit) {
  const { railTopY, opticalAxisY, opticalAxisZ } = SPEC;
  const structGroup = reg.group("structure.group", { stage: "structure" });

  // Main optical axis frame centered at [0, opticalAxisY, opticalAxisZ]
  const lensAxisGroup = reg.group("lens.axisGroup", {
    parent: structGroup,
    pos: [0, opticalAxisY, opticalAxisZ],
    stage: "structure"
  });

  // 1. Front & Rear V-Block Optical Bench Cradles resting on base.opticalRailCap
  const yRailLocal = railTopY - opticalAxisY; // -1.385 - (-0.18) = -1.205
  const cradleGeo = buildCradleSaddleGeometry(0.755, yRailLocal, 0.58, 0.22);

  const cradleSpecs = [
    { id: "cradle.front", x: -0.78 },
    { id: "cradle.rear", x: 0.68 }
  ];
  for (const c of cradleSpecs) {
    reg.part(c.id, cradleGeo, {
      parent: lensAxisGroup,
      pos: [c.x, 0, 0],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      mountOn: "base.opticalRailCap",
      allowOverlap: ["barrel.outer.back", "barrel.outer.front"]
    });

    // Side rail clamp screws on each cradle shoulder
    [-0.52, 0.52].forEach((cz, idx) => {
      reg.detail(
        `${c.id}.bolt.${idx}`,
        makeScrewDetail(c.x, yRailLocal + 0.34, cz, 0.026, "y", kit),
        { parent: lensAxisGroup }
      );
    });
  }

  // 2. Stationary Outer Lens Barrel (cutaway window facing +Z / +Y)
  const phiCutStart = -0.40;
  const phiCutLen = 2.08;
  const phiBackStart = phiCutStart + phiCutLen;
  const phiBackLen = Math.PI * 2 - phiCutLen;

  const outerBarrelRings = [
    { x: -1.08, rInner: 0.685, rOuter: 0.765 },
    { x: -0.56, rInner: 0.685, rOuter: 0.765 },
    { x: -0.55, rInner: 0.685, rOuter: 0.725 },
    { x: 0.16, rInner: 0.685, rOuter: 0.725 },
    { x: 0.17, rInner: 0.685, rOuter: 0.765 },
    { x: 0.92, rInner: 0.685, rOuter: 0.765 }
  ];

  const barrelBackGeo = buildAxialSectorGeometry(outerBarrelRings, phiBackStart, phiBackLen, 36);
  reg.part("barrel.outer.back", barrelBackGeo, {
    parent: lensAxisGroup,
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "cradle.front",
    allowOverlap: [
      "cradle.rear",
      "barrel.filterRing",
      "mount.bayonet",
      "helicoid.sleeve",
      "focus.ring.back",
      "focus.ring.front",
      "unit.tube"
    ]
  });

  const barrelFrontGeo = buildAxialSectorGeometry(outerBarrelRings, phiCutStart, phiCutLen, 20);
  reg.part("barrel.outer.front", barrelFrontGeo, {
    parent: lensAxisGroup,
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    explode: [0, 0.96, -0.22],
    mountOn: "barrel.outer.back",
    allowOverlap: ["cradle.front", "cradle.rear", "barrel.filterRing", "mount.bayonet", "helicoid.sleeve", "focus.ring.back", "unit.tube"]
  });

  // Aperture linkage port boss on lower-front shoulder of barrel.outer.back
  const apBossGeo = buildCylinderGeometry(0.065, 0.075, 0.12, { segments: 16, axis: "y" });
  reg.part("barrel.apertureBoss", apBossGeo, {
    parent: lensAxisGroup,
    pos: [0.42, -0.76, 0.24],
    rot: [0.35, 0, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "barrel.outer.back"
  });
  reg.anchor("barrel.port.aperture", 0.42, -0.81, 0.26, lensAxisGroup, { dir: [0, -0.94, 0.34] });

  // 3. Front Ø58mm Filter Thread Bezel
  const filterRings = [
    { x: -1.25, rInner: 0.635, rOuter: 0.785 },
    { x: -1.08, rInner: 0.635, rOuter: 0.785 }
  ];
  const filterGeo = buildAxialSectorGeometry(filterRings, 0, Math.PI * 2, 40);
  reg.part("barrel.filterRing", filterGeo, {
    parent: lensAxisGroup,
    ramp: "lo",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    explode: [-1.10, 0, 0],
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.outer.front"]
  });

  // Fine filter thread rings inside front lip
  [-1.22, -1.18, -1.14].forEach((tx, idx) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push(new THREE.Vector3(tx, Math.sin(a) * 0.638, Math.cos(a) * 0.638));
    }
    reg.detail(
      `barrel.filterThread.${idx}`,
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), kit.lineMaterials.lo),
      { parent: lensAxisGroup }
    );
  });

  // 4. Rear Brass F/EF Bayonet Flange Mount
  const bayonetRings = [
    { x: 0.92, rInner: 0.54, rOuter: 0.79 },
    { x: 1.08, rInner: 0.54, rOuter: 0.79 }
  ];
  const bayonetGeo = buildAxialSectorGeometry(bayonetRings, 0, Math.PI * 2, 40);
  reg.part("mount.bayonet", bayonetGeo, {
    parent: lensAxisGroup,
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    explode: [0.62, 0, 0],
    mountOn: "barrel.outer.back",
    allowOverlap: ["barrel.outer.front", "sensor.throat.back", "sensor.throat.front"]
  });

  // Gold electronic bayonet contact pins along lower mounting flange
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.5 - 0.40 + (i / 5) * 0.80;
    const pinGeo = buildCylinderGeometry(0.016, 0.016, 0.04, { segments: 10, axis: "x" });
    reg.part(`mount.contactPin.${i}`, pinGeo, {
      parent: lensAxisGroup,
      pos: [1.085, Math.sin(a) * 0.61, Math.cos(a) * 0.61],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true,
      explode: [0.62, 0, 0],
      mountOn: "mount.bayonet"
    });
  }

  // 5. Rear Camera Mirror-Box Throat & Full-Frame 36x24mm CMOS Sensor Chamber
  const throatRings = [
    { x: 1.08, rInner: 0.54, rOuter: 0.69 },
    { x: 1.44, rInner: 0.54, rOuter: 0.69 }
  ];
  const throatBackGeo = buildAxialSectorGeometry(throatRings, phiBackStart, phiBackLen, 36);
  reg.part("sensor.throat.back", throatBackGeo, {
    parent: lensAxisGroup,
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    clippable: true,
    explode: [0.86, 0, 0],
    mountOn: "mount.bayonet",
    allowOverlap: ["sensor.housing"]
  });

  const throatFrontGeo = buildAxialSectorGeometry(throatRings, phiCutStart, phiCutLen, 18);
  reg.part("sensor.throat.front", throatFrontGeo, {
    parent: lensAxisGroup,
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    explode: [0.86, 0.30, 0.46],
    mountOn: "sensor.throat.back"
  });

  const sensorGroup = reg.group("sensor.group", {
    parent: lensAxisGroup,
    pos: [0, 0, 0],
    explode: [1.12, 0, 0],
    stage: "structure"
  });

  // Sensor Pedestal mounted on base.opticalRailCap (slides rearward with sensorGroup when exploded)
  const sensorPedH = 0.64; // rises from yRailLocal (-1.205) to -0.565 (touches sensor.housing bottom -0.58)
  const sensorPedGeo = new THREE.BoxGeometry(0.32, sensorPedH, 0.92);
  reg.part("sensor.pedestal", sensorPedGeo, {
    parent: sensorGroup,
    pos: [1.58, yRailLocal + sensorPedH * 0.5, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.opticalRailCap"
  });

  const housingGeo = new THREE.BoxGeometry(0.28, 1.18, 1.34);
  reg.part("sensor.housing", housingGeo, {
    parent: sensorGroup,
    pos: [1.58, 0, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "sensor.pedestal",
    allowOverlap: ["sensor.throat.back", "sensor.throat.front"]
  });

  // Full-frame 36x24mm (2:3) CMOS Sensor Silicon Die on -X face of sensor housing
  const cmosGeo = new THREE.BoxGeometry(0.026, 0.48, 0.72);
  reg.part("sensor.cmosDie", cmosGeo, {
    parent: sensorGroup,
    pos: [1.43, 0, 0],
    ramp: "intake",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.014,
    mountOn: "sensor.housing"
  });

  // Optical Low-Pass / IR-Cut Glass Filter directly in front of CMOS die
  const olpfGeo = new THREE.BoxGeometry(0.020, 0.54, 0.78);
  reg.part("sensor.glassFilter", olpfGeo, {
    parent: sensorGroup,
    pos: [1.404, 0, 0],
    ramp: "glass",
    outline: "lo",
    crease: "faint",
    mountOn: "sensor.cmosDie",
    allowOverlap: ["sensor.housing"]
  });

  // Rear heat-sink fins on +X back of sensor housing
  for (let i = -3; i <= 3; i++) {
    const finGeo = new THREE.BoxGeometry(0.055, 0.96, 0.045);
    reg.part(`sensor.heatsink.${i + 3}`, finGeo, {
      parent: sensorGroup,
      pos: [1.745, 0, i * 0.16],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "sensor.housing"
    });
  }

  // Data readout port boss on front (+Z) face of sensor housing
  const dataPortGeo = buildCylinderGeometry(0.055, 0.06, 0.08, { segments: 14, axis: "z" });
  reg.part("sensor.portBoss", dataPortGeo, {
    parent: sensorGroup,
    pos: [1.58, -0.36, 0.69],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "sensor.housing"
  });
  reg.anchor("sensor.port.out", 1.58, -0.36, 0.73, sensorGroup, { dir: [0, 0, 1] });
}
