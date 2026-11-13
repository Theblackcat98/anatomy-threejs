import * as THREE from "three";
import {
  buildInternalGearRingGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, epitrochoidBoreClearance } from "./model.mjs";

function buildWankelRotorGeometry() {
  const R = SPEC.R - 0.025;
  const bow = 0.255;
  const shape = new THREE.Shape();
  const segsPerSide = 44;

  for (let k = 0; k < 3; k++) {
    const a0 = (k * 2 * Math.PI) / 3;
    const a1 = ((k + 1) * 2 * Math.PI) / 3;
    const midA = a0 + Math.PI / 3;

    const p0 = [R * Math.cos(a0), R * Math.sin(a0)];
    const p1 = [R * Math.cos(a1), R * Math.sin(a1)];
    const normal = [Math.cos(midA), Math.sin(midA)];

    for (let s = 0; s < segsPerSide; s++) {
      const u = s / segsPerSide;
      const lx = p0[0] * (1 - u) + p1[0] * u;
      const ly = p0[1] * (1 - u) + p1[1] * u;
      const arcOffset = Math.sin(u * Math.PI) * bow;
      const pocket =
        u > 0.30 && u < 0.70
          ? -0.042 * Math.pow(Math.sin(((u - 0.30) / 0.40) * Math.PI), 1.6)
          : 0;
      const px = lx + normal[0] * (arcOffset + pocket);
      const py = ly + normal[1] * (arcOffset + pocket);
      if (k === 0 && s === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
  }
  shape.closePath();

  const boreR = 3 * SPEC.e + 0.035;
  const borePath = new THREE.Path();
  borePath.absarc(0, 0, boreR, 0, Math.PI * 2, false);
  shape.holes.push(borePath);

  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    const [hx, hy] = [0.84 * Math.cos(a), 0.84 * Math.sin(a)];
    const pHole = new THREE.Path();
    pHole.absarc(hx, hy, 0.13, 0, Math.PI * 2, false);
    shape.holes.push(pHole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: SPEC.depth - 0.04,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    curveSegments: 64
  });
  geo.translate(0, 0, -(SPEC.depth - 0.04) * 0.5);
  return geo;
}

export function buildSubject(reg, kit) {
  const { R, e, depth, rotorTeeth } = SPEC;

  const rotorOrbitGroup = reg.group("rotor.orbit", {
    explode: [0, 0, 0.25],
    stage: "subject"
  });

  const rotorSpinGroup = reg.group("rotor.spin", {
    parent: rotorOrbitGroup,
    stage: "subject"
  });

  // 1. Primary Lit Subject: Triangular Wankel Rotor
  reg.part("rotor.body", buildWankelRotorGeometry(), {
    parent: rotorSpinGroup,
    ramp: "lit",
    outline: "lit",
    crease: "lit",
    creaseAngle: 24,
    outlineWidth: 0.022,
    topBias: 0.55,
    mountOn: "coaxial",
    insideBoreOf: "stator.housing",
    boreClearanceFn: epitrochoidBoreClearance,
    allowOverlap: ["rear.statGear", "shaft.main", "shaft.journal", "rear.plate", "front.cover"]
  });

  // 2. 51-Tooth Internal Phasing Gear Ring
  const outerR = 3 * e + 0.042;
  const pitchR = 3 * e;
  const internalGearGeo = buildInternalGearRingGeometry(
    outerR,
    pitchR,
    rotorTeeth,
    0.034,
    depth * 0.48,
    -depth * 0.46
  );
  reg.part("rotor.internalGear", internalGearGeo, {
    parent: rotorSpinGroup,
    ramp: "hi",
    outline: "lit",
    crease: "lo",
    creaseAngle: 35,
    outlineWidth: 0.012,
    mountOn: "rotor.body",
    allowOverlap: ["rear.statGear", "shaft.main", "shaft.journal", "stator.housing", "rear.plate"]
  });

  // 3. Three Apex Seal Blades, Corner Seal Pins & Side Seal Arcs
  const sideSealPts = [];
  for (let k = 0; k < 3; k++) {
    const a0 = (k * 2 * Math.PI) / 3;
    const a1 = ((k + 1) * 2 * Math.PI) / 3;

    const bladeGeo = new THREE.BoxGeometry(0.068, 0.036, depth - 0.01);
    reg.part(`rotor.apexSeal.${k}`, bladeGeo, {
      parent: rotorSpinGroup,
      pos: [Math.cos(a0) * (R - 0.032), Math.sin(a0) * (R - 0.032), 0],
      rot: [0, 0, a0],
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      outlineWidth: 0.014,
      mountOn: "rotor.body",
      insideBoreOf: "stator.housing",
      boreClearanceFn: epitrochoidBoreClearance,
      allowOverlap: ["rear.plate", "front.cover"]
    });

    const cPin = makeScrewDetail(
      Math.cos(a0) * (R - 0.14),
      Math.sin(a0) * (R - 0.14),
      depth * 0.5 + 0.004,
      0.052,
      "z",
      kit
    );
    reg.detail(`rotor.cornerPin.${k}`, cPin, { parent: rotorSpinGroup });

    const midA = a0 + Math.PI / 3;
    const p0 = [(R - 0.14) * Math.cos(a0), (R - 0.14) * Math.sin(a0)];
    const p1 = [(R - 0.14) * Math.cos(a1), (R - 0.14) * Math.sin(a1)];
    const normal = [Math.cos(midA), Math.sin(midA)];
    for (let s = 0; s < 24; s++) {
      const u0 = s / 24;
      const u1 = (s + 1) / 24;
      const x0 = p0[0] * (1 - u0) + p1[0] * u0 + normal[0] * Math.sin(u0 * Math.PI) * 0.21;
      const y0 = p0[1] * (1 - u0) + p1[1] * u0 + normal[1] * Math.sin(u0 * Math.PI) * 0.21;
      const x1 = p0[0] * (1 - u1) + p1[0] * u1 + normal[0] * Math.sin(u1 * Math.PI) * 0.21;
      const y1 = p0[1] * (1 - u1) + p1[1] * u1 + normal[1] * Math.sin(u1 * Math.PI) * 0.21;
      sideSealPts.push(
        new THREE.Vector3(x0, y0, depth * 0.5 + 0.003),
        new THREE.Vector3(x1, y1, depth * 0.5 + 0.003)
      );
    }
  }

  reg.detail(
    "rotor.sideSeals",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sideSealPts), kit.lineMaterials.lit),
    { parent: rotorSpinGroup }
  );

  // Register anchor at Apex 0 for joint inspection
  reg.anchor("rotor.apex.0", R - 0.02, 0, depth * 0.35, rotorSpinGroup);
}
