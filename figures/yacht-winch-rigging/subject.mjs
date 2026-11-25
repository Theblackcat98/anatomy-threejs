import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  buildInternalGearRingGeometry,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC, TAU, getRigState, computeSailSurfaceOffset } from "./model.mjs";

const N_XI = 18;
const N_ETA = 24;
const SAIL_HALF_THICK = 0.007;
const BATTEN_ETAS = [0.22, 0.42, 0.62, 0.80];
const BATTEN_SEGS = 10;

/**
 * Builds a watertight thick-walled tapered cylindrical cutaway arc shell around Y.
 * Matches Three.js CylinderGeometry angle convention: x = r * sin(a), z = r * cos(a).
 */
function buildDrumArcShell(rOutTop, rOutBot, rInTop, rInBot, height, thetaStart, thetaLength, segs = 28) {
  const halfH = height * 0.5;
  const positions = [];
  const pushTri = (a, b, c) => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const pushQuad = (p0, p1, p2, p3) => {
    pushTri(p0, p1, p2);
    pushTri(p0, p2, p3);
  };

  const pt = (r, y, a) => [Math.sin(a) * r, y, Math.cos(a) * r];

  for (let i = 0; i < segs; i++) {
    const a0 = thetaStart + (thetaLength * i) / segs;
    const a1 = thetaStart + (thetaLength * (i + 1)) / segs;

    const ob0 = pt(rOutBot, -halfH, a0);
    const ob1 = pt(rOutBot, -halfH, a1);
    const ot0 = pt(rOutTop, halfH, a0);
    const ot1 = pt(rOutTop, halfH, a1);

    const ib0 = pt(rInBot, -halfH, a0);
    const ib1 = pt(rInBot, -halfH, a1);
    const it0 = pt(rInTop, halfH, a0);
    const it1 = pt(rInTop, halfH, a1);

    // Outer face (+r)
    pushQuad(ob0, ob1, ot1, ot0);
    // Inner face (-r)
    pushQuad(ib1, ib0, it0, it1);
    // Top annular cap (+Y)
    pushQuad(it0, ot0, ot1, it1);
    // Bottom annular cap (-Y)
    pushQuad(ob0, ib0, ib1, ob1);
  }

  // Vertical cutaway end caps at thetaStart and thetaStart + thetaLength
  const aS = thetaStart;
  const aE = thetaStart + thetaLength;
  pushQuad(
    pt(rInBot, -halfH, aS),
    pt(rOutBot, -halfH, aS),
    pt(rOutTop, halfH, aS),
    pt(rInTop, halfH, aS)
  );
  pushQuad(
    pt(rOutBot, -halfH, aE),
    pt(rInBot, -halfH, aE),
    pt(rInTop, halfH, aE),
    pt(rOutTop, halfH, aE)
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Watertight thin double-sheet cambered sail BufferGeometry with separate front (+Z) and back (-Z) vertices
 * plus perimeter edge skirt so cel shading and inverted-hull silhouettes never z-fight or bleed.
 */
export function createSailGeometry(st) {
  const geo = new THREE.BufferGeometry();
  const gridVerts = (N_XI + 1) * (N_ETA + 1);
  const positions = new Float32Array(gridVerts * 2 * 3);
  const indices = [];

  const idxF = (i, j) => j * (N_XI + 1) + i;
  const idxB = (i, j) => gridVerts + j * (N_XI + 1) + i;

  for (let j = 0; j < N_ETA; j++) {
    for (let i = 0; i < N_XI; i++) {
      const aF = idxF(i, j);
      const bF = idxF(i + 1, j);
      const cF = idxF(i, j + 1);
      const dF = idxF(i + 1, j + 1);
      indices.push(aF, bF, dF, aF, dF, cF);

      const aB = idxB(i, j);
      const bB = idxB(i + 1, j);
      const cB = idxB(i, j + 1);
      const dB = idxB(i + 1, j + 1);
      indices.push(aB, dB, bB, aB, cB, dB);
    }
  }

  // Stitch perimeter edges (foot j=0, headboard j=N_ETA, luff i=0, leech i=N_XI)
  for (let i = 0; i < N_XI; i++) {
    indices.push(idxF(i, 0), idxB(i, 0), idxB(i + 1, 0), idxF(i, 0), idxB(i + 1, 0), idxF(i + 1, 0));
    indices.push(
      idxF(i, N_ETA), idxF(i + 1, N_ETA), idxB(i + 1, N_ETA),
      idxF(i, N_ETA), idxB(i + 1, N_ETA), idxB(i, N_ETA)
    );
  }
  for (let j = 0; j < N_ETA; j++) {
    indices.push(idxF(0, j), idxF(0, j + 1), idxB(0, j + 1), idxF(0, j), idxB(0, j + 1), idxB(0, j));
    indices.push(
      idxF(N_XI, j), idxB(N_XI, j), idxB(N_XI, j + 1),
      idxF(N_XI, j), idxB(N_XI, j + 1), idxF(N_XI, j + 1)
    );
  }

  geo.setIndex(indices);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  fillSailVertices(geo, st);
  return geo;
}

export function fillSailVertices(geo, st) {
  const posAttr = geo.getAttribute("position");
  const arr = posAttr.array;
  const gridVerts = (N_XI + 1) * (N_ETA + 1);

  for (let j = 0; j <= N_ETA; j++) {
    const eta = j / N_ETA;
    const chordLen = SPEC.SAIL_FOOT_W * (1.0 - 0.86 * Math.pow(eta, 1.35));
    const y = 0.08 + eta * SPEC.SAIL_LUFF_H;

    for (let i = 0; i <= N_XI; i++) {
      const xi = i / N_XI;
      const off = computeSailSurfaceOffset(xi, eta, st.camberRatio, st.twistRad, st.mastPreBend);
      const x = 0.02 + xi * chordLen + off.dx;
      const z = off.dz;

      const fOff = (j * (N_XI + 1) + i) * 3;
      const bOff = (gridVerts + j * (N_XI + 1) + i) * 3;
      arr[fOff] = x;
      arr[fOff + 1] = y;
      arr[fOff + 2] = z + SAIL_HALF_THICK;

      arr[bOff] = x;
      arr[bOff + 1] = y;
      arr[bOff + 2] = z - SAIL_HALF_THICK;
    }
  }
  posAttr.needsUpdate = true;
  geo.computeVertexNormals();
}

function createBattenGeometry(eta, st) {
  const geo = new THREE.BufferGeometry();
  const cols = BATTEN_SEGS + 1;
  // 4 vertices per cross-section (+Y/+Z, +Y/-Z, -Y/-Z, -Y/+Z)
  const positions = new Float32Array(cols * 4 * 3);
  const indices = [];

  for (let i = 0; i < BATTEN_SEGS; i++) {
    const b0 = i * 4;
    const b1 = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const kn = (k + 1) % 4;
      indices.push(b0 + k, b1 + k, b1 + kn, b0 + k, b1 + kn, b0 + kn);
    }
  }
  // End caps
  indices.push(0, 3, 2, 0, 2, 1);
  const last = BATTEN_SEGS * 4;
  indices.push(last, last + 1, last + 2, last, last + 2, last + 3);

  geo.setIndex(indices);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  fillBattenVertices(geo, eta, st);
  return geo;
}

function fillBattenVertices(geo, eta, st) {
  const posAttr = geo.getAttribute("position");
  const arr = posAttr.array;
  const chordLen = SPEC.SAIL_FOOT_W * (1.0 - 0.86 * Math.pow(eta, 1.35));
  const y = 0.08 + eta * SPEC.SAIL_LUFF_H;
  const hy = 0.016;
  const hz = 0.015;
  const xiStart = 0.14;

  for (let i = 0; i <= BATTEN_SEGS; i++) {
    const xi = xiStart + ((1.0 - xiStart) * i) / BATTEN_SEGS;
    const off = computeSailSurfaceOffset(xi, eta, st.camberRatio, st.twistRad, st.mastPreBend);
    const x = 0.02 + xi * chordLen + off.dx;
    const z = off.dz;
    const base = i * 12;

    arr[base] = x; arr[base + 1] = y + hy; arr[base + 2] = z + hz;
    arr[base + 3] = x; arr[base + 4] = y + hy; arr[base + 5] = z - hz;
    arr[base + 6] = x; arr[base + 7] = y - hy; arr[base + 8] = z - hz;
    arr[base + 9] = x; arr[base + 10] = y - hy; arr[base + 11] = z + hz;
  }
  posAttr.needsUpdate = true;
  geo.computeVertexNormals();
}

export function buildSubject(reg, kit) {
  const initSt = getRigState(SPEC.initialTheta);
  const {
    WINCH_CX,
    WINCH_CZ,
    PLANET_Y,
    DRUM_R_TOP,
    DRUM_R_BOT,
    DRUM_H,
    JAWS_Y,
    HANDLE_Y,
    HANDLE_LEN,
    MAST_Z,
    GOOSENECK_Y,
    BOOM_LEN
  } = SPEC;

  // 1. Central Winch Input Spindle, Sun Gear & Lock-In Handle
  const shaftGroup = reg.group("subject.shaftGroup", {
    pos: [WINCH_CX, 0, WINCH_CZ],
    rot: [0, initSt.handleRad, 0],
    stage: "subject"
  });

  reg.part(
    "subject.mainShaft",
    buildCylinderGeometry(0.068, 0.068, 1.44, { segments: 20, axis: "y" }),
    {
      parent: shaftGroup,
      pos: [0, -0.20, 0],
      ramp: "hi",
      outline: "hi",
      noCrease: true,
      mountOn: "struct.winchCenterPost",
      allowOverlap: [
        "struct.winchBaseSkirt",
        "struct.planetCarrierPlate",
        "struct.stripperCollar",
        "struct.stripperArm",
        "subject.sunGear",
        "subject.drumCap",
        "subject.stJaws",
        "subject.handleHub"
      ]
    }
  );

  // 12-tooth copper sun gear (pitchR=0.153, boreR=0.068 -> boreFraction=0.444, width=0.16)
  reg.part(
    "subject.sunGear",
    buildExternalGearGeometry(0.153, 12, 0.024, 0.16, 0.068 / 0.153),
    {
      parent: shaftGroup,
      pos: [0, PLANET_Y, 0],
      rot: [Math.PI / 2, 0, 0],
      ramp: "copper",
      outline: "mid",
      crease: "faint",
      mountOn: "subject.mainShaft",
      allowOverlap: [
        "struct.winchCenterPost",
        "struct.planetCarrierPlate",
        "subject.planetGear.0",
        "subject.planetGear.1",
        "subject.planetGear.2"
      ]
    }
  );

  const handleGroup = reg.group("subject.handleGroup", {
    parent: shaftGroup,
    pos: [0, HANDLE_Y, 0],
    stage: "subject"
  });

  reg.part(
    "subject.handleHub",
    buildCylinderGeometry(0.11, 0.11, 0.10, { segments: 20, axis: "y" }),
    {
      parent: handleGroup,
      pos: [0, 0, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "subject.mainShaft",
      allowOverlap: ["struct.stripperCollar", "subject.drumCap"]
    }
  );

  reg.part(
    "subject.handleArm",
    new THREE.BoxGeometry(HANDLE_LEN, 0.07, 0.11),
    {
      parent: handleGroup,
      pos: [HANDLE_LEN * 0.5, 0.02, 0],
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      mountOn: "subject.handleHub"
    }
  );

  reg.part(
    "subject.handleGrip",
    buildCylinderGeometry(0.065, 0.055, 0.34, { segments: 18, axis: "y" }),
    {
      parent: handleGroup,
      pos: [HANDLE_LEN - 0.04, 0.20, 0],
      ramp: "lit",
      outline: "lit",
      noCrease: true,
      mountOn: "subject.handleArm"
    }
  );

  // 2. Planetary Gear Stage (3 orbiting 12T brass planet gears meshing between 12T sun and 36T ring)
  const carrierGroup = reg.group("subject.carrierGroup", {
    pos: [WINCH_CX, 0, WINCH_CZ],
    rot: [0, initSt.carrierRad, 0],
    stage: "subject"
  });

  const R_ORB = 0.307;
  const planetGeo = buildExternalGearGeometry(0.153, 12, 0.022, 0.14, 0.04 / 0.153);
  const planetPinGeo = buildCylinderGeometry(0.038, 0.038, 0.24, { segments: 14, axis: "y" });

  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    const px = Math.cos(a) * R_ORB;
    const pz = Math.sin(a) * R_ORB;

    reg.part(`subject.planetPin.${i}`, planetPinGeo, {
      parent: carrierGroup,
      pos: [px, -0.46, pz],
      ramp: "hi",
      outline: "lo",
      noCrease: true,
      mountOn: "struct.planetCarrierPlate",
      allowOverlap: [
        "struct.winchCenterPost",
        "subject.planetGear.0",
        "subject.planetGear.1",
        "subject.planetGear.2"
      ]
    });

    const pSpin = reg.group(`subject.planetSpin.${i}`, {
      parent: carrierGroup,
      pos: [px, PLANET_Y, pz],
      stage: "subject"
    });

    reg.part(`subject.planetGear.${i}`, planetGeo, {
      parent: pSpin,
      pos: [0, 0, 0],
      rot: [Math.PI / 2, 0, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: `subject.planetPin.${i}`,
      allowOverlap: [
        "struct.planetCarrierPlate",
        "subject.sunGear",
        "subject.drumRingGear",
        "subject.drumRear",
        "subject.drumFront",
        "struct.winchCenterPost"
      ]
    });
  }

  // 3. Cutaway Winch Drum, 36T Internal Ring Gear, Self-Tailing Jaws & Loaded Sheet Wraps
  const drumGroup = reg.group("subject.drumGroup", {
    pos: [WINCH_CX, 0, WINCH_CZ],
    rot: [0, initSt.drumRad, 0],
    stage: "subject"
  });

  // 36-tooth internal brass ring gear (outerR=0.56, pitchR=0.46, teeth=36, toothDepth=0.022, width=0.16)
  reg.part(
    "subject.drumRingGear",
    buildInternalGearRingGeometry(0.56, 0.46, 36, 0.022, 0.16),
    {
      parent: drumGroup,
      pos: [0, PLANET_Y, 0],
      rot: [Math.PI / 2, 0, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: "subject.drumRear",
      allowOverlap: [
        "struct.planetCarrierPlate",
        "subject.planetGear.0",
        "subject.planetGear.1",
        "subject.planetGear.2",
        "subject.drumFront",
        "struct.winchCenterPost"
      ]
    }
  );

  // Watertight thick-walled cutaway rear & removable front drum shells (window stays open toward +X/+Z viewer)
  const drumShellGroup = reg.group("subject.drumShellGroup", {
    pos: [WINCH_CX, -0.32, WINCH_CZ],
    stage: "subject"
  });

  reg.part(
    "subject.drumRear",
    buildDrumArcShell(DRUM_R_TOP, DRUM_R_BOT, 0.525, 0.575, DRUM_H, Math.PI * 0.72, Math.PI * 1.12, 28),
    {
      parent: drumShellGroup,
      pos: [0, 0, 0],
      ramp: "mid",
      outline: "hi",
      crease: "lo",
      mountOn: "struct.planetCarrierPlate",
      allowOverlap: [
        "struct.winchBaseSkirt",
        "struct.winchCenterPost",
        "subject.planetGear.0",
        "subject.planetGear.1",
        "subject.planetGear.2",
        "subject.stJaws",
        "subject.drumFront",
        "subject.drumRingGear",
        "mech.compoundShaft",
        "mech.compoundGear"
      ]
    }
  );

  reg.part(
    "subject.drumFront",
    buildDrumArcShell(DRUM_R_TOP, DRUM_R_BOT, 0.525, 0.575, DRUM_H, -Math.PI * 0.16, Math.PI * 0.88, 28),
    {
      parent: drumShellGroup,
      pos: [0, 0, 0],
      ramp: "mid",
      outline: "hi",
      crease: "lo",
      cutawayHide: true,
      mountOn: "subject.drumRingGear",
      allowOverlap: [
        "subject.drumRear",
        "struct.winchBaseSkirt",
        "struct.planetCarrierPlate",
        "struct.winchCenterPost",
        "subject.planetGear.0",
        "subject.planetGear.1",
        "subject.planetGear.2",
        "subject.stJaws",
        "mech.compoundShaft",
        "mech.compoundGear"
      ]
    }
  );

  reg.part(
    "subject.stJaws",
    buildCylinderGeometry(0.65, 0.56, 0.14, { segments: 28, axis: "y" }),
    {
      parent: drumGroup,
      pos: [0, JAWS_Y, 0],
      ramp: "brass",
      outline: "hi",
      crease: "lo",
      mountOn: "subject.drumRear",
      allowOverlap: [
        "subject.drumFront",
        "struct.winchCenterPost",
        "struct.stripperCollar",
        "struct.stripperArm",
        "struct.stripperTip",
        "subject.drumCap",
        "subject.mainShaft"
      ]
    }
  );
  reg.detail(
    "subject.stJaws.knurl",
    makeKnurlLines(0.61, 0.165, 0.295, 24, kit, { tone: "mid" }),
    { parent: drumGroup }
  );

  reg.part(
    "subject.drumCap",
    buildCylinderGeometry(0.46, 0.52, 0.06, { segments: 24, axis: "y" }),
    {
      parent: drumGroup,
      pos: [0, 0.33, 0],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      mountOn: "subject.stJaws",
      allowOverlap: [
        "struct.stripperCollar",
        "struct.stripperArm",
        "struct.stripperTip",
        "subject.mainShaft",
        "subject.handleHub"
      ]
    }
  );

  // 3 helical capstan barrel wraps + 1 self-tailing jaw crown wrap (ramp: "lit")
  [
    { y: -0.22, r: 0.635 },
    { y: -0.10, r: 0.625 },
    { y: 0.02, r: 0.615 },
    { y: 0.23, r: 0.605 }
  ].forEach((wrap, idx) => {
    reg.part(
      `subject.sheetWrap.${idx}`,
      new THREE.TorusGeometry(wrap.r, 0.036, 12, 36),
      {
        parent: drumGroup,
        pos: [0, wrap.y, 0],
        rot: [Math.PI / 2, 0.05, 0],
        ramp: "lit",
        outline: "lit",
        noCrease: true,
        detail: true,
        mountOn: "subject.drumRear"
      }
    );
  });

  // 4. Pivoting Boom, Rigid Vang, Mainsheet Bail & Dynamic Camber Sail Foil
  const boomGroup = reg.group("subject.boomGroup", {
    pos: [-1.06, GOOSENECK_Y, MAST_Z],
    rot: [0, -initSt.boomAngleRad, 0],
    stage: "subject"
  });

  reg.part(
    "subject.boomSpar",
    buildCylinderGeometry(0.052, 0.062, BOOM_LEN, { segments: 20, axis: "x" }),
    {
      parent: boomGroup,
      pos: [BOOM_LEN * 0.5, 0, 0],
      ramp: "hi",
      outline: "hi",
      noCrease: true,
      mountOn: "struct.gooseneck",
      allowOverlap: ["struct.mastLower"]
    }
  );

  reg.part(
    "subject.vangStrut",
    buildCylinderGeometry(0.034, 0.042, 0.72, { segments: 16, axis: "x" }),
    {
      parent: boomGroup,
      pos: [0.32, -0.20, 0],
      rot: [0, 0, 0.52],
      ramp: "comp",
      outline: "mid",
      noCrease: true,
      mountOn: "subject.boomSpar",
      allowOverlap: ["struct.mastLower", "struct.gooseneck"]
    }
  );

  reg.part("subject.mainsheetBail", new THREE.BoxGeometry(0.14, 0.12, 0.12), {
    parent: boomGroup,
    pos: [0.98, -0.08, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "subject.boomSpar"
  });
  reg.anchor("boom.mainsheet.bail", 0.98, -0.14, 0, boomGroup);

  // Dynamic 3D Wind-Pressure Sail Foil + 4 Live-Deforming Camber Battens
  const sailGeo = createSailGeometry(initSt);
  const sailPart = reg.part("subject.sailFoil", sailGeo, {
    parent: boomGroup,
    ramp: "lit",
    outline: "mid",
    noCrease: true,
    detail: true,
    mountOn: "subject.boomSpar"
  });

  const battenGeos = BATTEN_ETAS.map((eta, idx) => {
    const bGeo = createBattenGeometry(eta, initSt);
    reg.part(`subject.batten.${idx}`, bGeo, {
      parent: boomGroup,
      ramp: idx % 2 === 0 ? "comb" : "hi",
      outline: "lo",
      noCrease: true,
      detail: true,
      mountOn: "subject.sailFoil"
    });
    return { eta, geo: bGeo };
  });

  reg.root.userData.updateSail = (st) => {
    fillSailVertices(sailGeo, st);
    for (const b of battenGeos) {
      fillBattenVertices(b.geo, b.eta, st);
    }
  };
  reg.root.userData.sailMesh = sailPart;
}
