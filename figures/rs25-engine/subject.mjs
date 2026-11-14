import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, nozzleInnerRadiusAtY } from "./model.mjs";

/**
 * Builds a watertight, outward-wound revolved solid sector (or full 360° annulus when phiLength >= 2π)
 * from profile rings [{ y, rInner, rOuter }...] sorted bottom-to-top (increasing y).
 * Smoothly shades outer/inner curved walls while keeping end/cut caps flat with crisp creases.
 */
function buildRevolvedSectorGeometry(rings, phiStart, phiLength, segsPhi = 36) {
  const isFull = phiLength >= Math.PI * 2 - 1e-4;
  const actualPhiLen = isFull ? Math.PI * 2 : phiLength;
  const ny = rings.length;

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

  // 1. Outer curved wall (+r normal): u = y index (0..ny-1), v = phi index (0..segsPhi)
  addGridFace(
    (i, j) => {
      const a = phiAt(j);
      const r = rings[i].rOuter;
      return [r * Math.sin(a), rings[i].y, r * Math.cos(a)];
    },
    ny,
    segsPhi + 1,
    false
  );

  // 2. Inner curved wall (-r normal)
  addGridFace(
    (i, j) => {
      const a = phiAt(j);
      const r = rings[i].rInner;
      return [r * Math.sin(a), rings[i].y, r * Math.cos(a)];
    },
    ny,
    segsPhi + 1,
    true
  );

  // 3. Top annular cap (+Y normal)
  const topRing = rings[ny - 1];
  addGridFace(
    (k, j) => {
      const a = phiAt(j);
      const r = k === 0 ? topRing.rInner : topRing.rOuter;
      return [r * Math.sin(a), topRing.y, r * Math.cos(a)];
    },
    2,
    segsPhi + 1,
    true
  );

  // 4. Bottom annular cap (-Y normal)
  const botRing = rings[0];
  addGridFace(
    (k, j) => {
      const a = phiAt(j);
      const r = k === 0 ? botRing.rInner : botRing.rOuter;
      return [r * Math.sin(a), botRing.y, r * Math.cos(a)];
    },
    2,
    segsPhi + 1,
    false
  );

  // 5. Cut-face meridian caps when sector < 360°
  if (!isFull) {
    // Start cut plane at phiStart (normal -phi)
    addGridFace(
      (i, k) => {
        const r = k === 0 ? rings[i].rInner : rings[i].rOuter;
        return [r * Math.sin(phiStart), rings[i].y, r * Math.cos(phiStart)];
      },
      ny,
      2,
      true
    );
    // End cut plane at phiStart + actualPhiLen (normal +phi)
    const phiEnd = phiStart + actualPhiLen;
    addGridFace(
      (i, k) => {
        const r = k === 0 ? rings[i].rInner : rings[i].rOuter;
        return [r * Math.sin(phiEnd), rings[i].y, r * Math.cos(phiEnd)];
      },
      ny,
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
 * Builds a complete 360° ring profile (for hatbands and stiffening collars on the nozzle).
 */
function buildTorusCollarGeometry(rInner, rOuter, height, yCenter, segsPhi = 36) {
  return buildRevolvedSectorGeometry(
    [
      { y: yCenter - height * 0.5, rInner, rOuter },
      { y: yCenter + height * 0.5, rInner, rOuter }
    ],
    0,
    Math.PI * 2,
    segsPhi
  );
}

/**
 * Builds a spinning multi-stage turbopump rotor (shaft + 3 impeller/turbine discs + axial blades).
 */
function buildTurbopumpRotor(reg, kit, parentGroup, prefix, opts = {}) {
  const {
    mountOn = "gimbal.ring",
    allowOverlap = [],
    shaftLen = 0.64,
    discRadii = [0.155, 0.145, 0.165],
    discYs = [-0.14, 0.0, 0.14],
    bladeCount = 8
  } = opts;

  const spinGroup = reg.group(`${prefix}.spin`, { parent: parentGroup, stage: "subject" });

  const shaftGeo = buildCylinderGeometry(0.042, 0.042, shaftLen, { segments: 18, axis: "y" });
  reg.part(`${prefix}.shaft`, shaftGeo, {
    parent: spinGroup,
    pos: [0, 0, 0],
    ramp: "lit",
    outline: "mid",
    crease: "faint",
    mountOn,
    allowOverlap
  });

  discRadii.forEach((r, sIdx) => {
    const dy = discYs[sIdx];
    const discGeo = buildCylinderGeometry(r, r * 0.96, 0.055, { segments: 24, axis: "y" });
    reg.part(`${prefix}.stage.${sIdx}`, discGeo, {
      parent: spinGroup,
      pos: [0, dy, 0],
      ramp: "lit",
      outline: "mid",
      crease: "lo",
      mountOn: `${prefix}.shaft`,
      allowOverlap
    });

    // Impeller / turbine vanes protruding slightly on disc rim for clear visual rotation
    const vaneGeo = new THREE.BoxGeometry(0.022, 0.046, 0.036);
    for (let b = 0; b < bladeCount; b++) {
      const ang = (b / bladeCount) * Math.PI * 2;
      reg.part(`${prefix}.stage.${sIdx}.vane.${b}`, vaneGeo, {
        parent: spinGroup,
        pos: [Math.sin(ang) * (r + 0.004), dy, Math.cos(ang) * (r + 0.004)],
        rot: [0, ang, 0],
        ramp: "brass",
        outline: "lo",
        crease: "faint",
        detail: true,
        mountOn: `${prefix}.stage.${sIdx}`
      });
    }
  });

  return spinGroup;
}

export function buildSubject(reg, kit) {
  const {
    engineZ,
    enginePivotY,
    powerheadTopY,
    mccTopY,
    mccThroatY,
    mccExitY,
    nozzleExitY,
    mccOuterR,
    hpftpX,
    hpftpY,
    hpotpX,
    hpotpY
  } = SPEC;

  // Root gimbaled assembly pivoted at universal cross-bearing [0, enginePivotY, engineZ]
  const engineGimbal = reg.group("engine.gimbal", {
    pos: [0, enginePivotY, engineZ],
    stage: "subject"
  });
  engineGimbal.rotation.order = "XZY";

  // ---------------------------------------------------------------------------
  // 1. Universal 2-Axis Cross-Gimbal Bearing & Gimbal Ring
  // ---------------------------------------------------------------------------
  const crossPinGeo = buildCylinderGeometry(0.072, 0.072, 0.80, { segments: 20, axis: "x" });
  reg.part("gimbal.crossPin", crossPinGeo, {
    parent: engineGimbal,
    pos: [0, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "stand.gimbalEar.L",
    allowOverlap: ["stand.gimbalEar.R", "gimbal.ring", "powerhead.dome"]
  });

  const gimbalRingGeo = buildCylinderGeometry(0.26, 0.32, 0.12, { segments: 28, axis: "y" });
  reg.part("gimbal.ring", gimbalRingGeo, {
    parent: engineGimbal,
    pos: [0, -0.10, 0],
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "gimbal.crossPin"
  });

  // ---------------------------------------------------------------------------
  // 2. Powerhead & Hot-Gas Manifold (HGM) + Preburner Oxidizer Valve
  // ---------------------------------------------------------------------------
  const powerheadGeo = buildCylinderGeometry(0.36, 0.42, 0.40, { segments: 32, axis: "y" });
  reg.part("powerhead.dome", powerheadGeo, {
    parent: engineGimbal,
    pos: [0, -0.34, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "gimbal.ring",
    allowOverlap: [
      "powerhead.hgmCollar",
      "powerhead.duct.L",
      "powerhead.duct.R",
      "mcc.jacket.back",
      "mcc.jacket.front",
      "mcc.liner.back",
      "mcc.liner.front",
      "injector.plate"
    ]
  });

  const hgmCollarGeo = buildCylinderGeometry(0.45, 0.45, 0.14, { segments: 32, axis: "y" });
  reg.part("powerhead.hgmCollar", hgmCollarGeo, {
    parent: engineGimbal,
    pos: [0, -0.51, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "powerhead.dome",
    allowOverlap: [
      "powerhead.duct.L",
      "powerhead.duct.R",
      "mcc.jacket.back",
      "mcc.jacket.front",
      "mcc.liner.back",
      "mcc.liner.front",
      "mcc.manifold.top"
    ]
  });

  // Twin lateral hot-gas transfer ducts bridging powerhead to HPFTP (-X) and HPOTP (+X)
  for (const [side, sx] of [["L", -0.46], ["R", 0.46]]) {
    const ductGeo = buildCylinderGeometry(0.105, 0.105, 0.22, { segments: 20, axis: "x" });
    reg.part(`powerhead.duct.${side}`, ductGeo, {
      parent: engineGimbal,
      pos: [sx, -0.40, 0],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      mountOn: "powerhead.hgmCollar",
      allowOverlap: [
        "powerhead.dome",
        "hpftp.casing.back",
        "hpftp.casing.front",
        "hpotp.casing.back",
        "hpotp.casing.front"
      ]
    });
  }

  // Front-mounted Main Oxidizer / Preburner Control Valve on +Z powerhead face
  const oxValveGeo = buildCylinderGeometry(0.085, 0.095, 0.14, { segments: 20, axis: "z" });
  reg.part("powerhead.oxValve", oxValveGeo, {
    parent: engineGimbal,
    pos: [0, -0.26, 0.41],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "powerhead.dome"
  });

  const oxValveArmGroup = reg.group("powerhead.oxValveArm", {
    parent: engineGimbal,
    pos: [0, -0.26, 0.50],
    stage: "subject"
  });
  const oxStemGeo = buildCylinderGeometry(0.032, 0.032, 0.07, { segments: 14, axis: "z" });
  reg.part("powerhead.oxStem", oxStemGeo, {
    parent: oxValveArmGroup,
    pos: [0, 0, -0.01],
    ramp: "lit",
    outline: "lo",
    crease: "faint",
    mountOn: "powerhead.oxValve"
  });
  const oxLeverGeo = new THREE.BoxGeometry(0.20, 0.036, 0.028);
  reg.part("powerhead.oxLever", oxLeverGeo, {
    parent: oxValveArmGroup,
    pos: [0.07, 0, 0.015],
    ramp: "lit",
    outline: "lo",
    crease: "faint",
    mountOn: "powerhead.oxStem"
  });

  // ---------------------------------------------------------------------------
  // 3. Fuel Preburner + High-Pressure Fuel Turbopump (HPFTP, -X side)
  // ---------------------------------------------------------------------------
  const hpftpGroup = reg.group("hpftp.group", {
    parent: engineGimbal,
    pos: [hpftpX, hpftpY, 0],
    stage: "subject"
  });

  // Open cutaway window centered toward canonical iso camera (+X/+Z, ~0.60 rad)
  const hpftpCutCenter = 0.42;
  const hpotpCutCenter = 0.76;
  const pumpCutSpan = 2.02; // ~116 deg open cutaway window
  const hpftpBackStart = hpftpCutCenter + pumpCutSpan * 0.5;
  const hpotpBackStart = hpotpCutCenter + pumpCutSpan * 0.5;
  const pumpBackLen = Math.PI * 2 - pumpCutSpan;

  const pumpRings = [
    { y: -0.34, rInner: 0.185, rOuter: 0.245 },
    { y: 0.24, rInner: 0.185, rOuter: 0.245 }
  ];
  const pumpBackGeo = buildRevolvedSectorGeometry(pumpRings, hpftpBackStart, pumpBackLen, 28);
  reg.part("hpftp.casing.back", pumpBackGeo, {
    parent: hpftpGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    clippable: true,
    mountOn: "powerhead.duct.L",
    allowOverlap: ["hpftp.rotor.shaft", "hpftp.preburner", "hpftp.bottomCap"]
  });

  const pumpFrontGeo = buildRevolvedSectorGeometry(pumpRings, hpftpCutCenter - pumpCutSpan * 0.5, pumpCutSpan, 14);
  reg.part("hpftp.casing.front", pumpFrontGeo, {
    parent: hpftpGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "hpftp.casing.back"
  });

  const hpftpTopGeo = buildCylinderGeometry(0.16, 0.22, 0.20, { segments: 24, axis: "y" });
  reg.part("hpftp.preburner", hpftpTopGeo, {
    parent: hpftpGroup,
    pos: [0, 0.34, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "hpftp.casing.back",
    allowOverlap: ["hpftp.casing.front", "hpftp.rotor.shaft"]
  });

  const hpftpBotGeo = buildCylinderGeometry(0.22, 0.15, 0.14, { segments: 24, axis: "y" });
  reg.part("hpftp.bottomCap", hpftpBotGeo, {
    parent: hpftpGroup,
    pos: [0, -0.41, 0],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "hpftp.casing.back",
    allowOverlap: ["hpftp.casing.front", "hpftp.rotor.shaft"]
  });

  buildTurbopumpRotor(reg, kit, hpftpGroup, "hpftp.rotor", {
    mountOn: "hpftp.bottomCap",
    allowOverlap: ["hpftp.casing.back", "hpftp.casing.front", "hpftp.preburner"],
    shaftLen: 0.68,
    discRadii: [0.155, 0.145, 0.162],
    discYs: [-0.17, 0.0, 0.16],
    bladeCount: 8
  });

  // ---------------------------------------------------------------------------
  // 4. Oxidizer Preburner + High-Pressure Oxidizer Turbopump (HPOTP, +X side)
  // ---------------------------------------------------------------------------
  const hpotpGroup = reg.group("hpotp.group", {
    parent: engineGimbal,
    pos: [hpotpX, hpotpY, 0],
    stage: "subject"
  });

  const hpotpBackGeo = buildRevolvedSectorGeometry(pumpRings, hpotpBackStart, pumpBackLen, 28);
  const hpotpFrontGeo = buildRevolvedSectorGeometry(pumpRings, hpotpCutCenter - pumpCutSpan * 0.5, pumpCutSpan, 14);

  reg.part("hpotp.casing.back", hpotpBackGeo, {
    parent: hpotpGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.017,
    clippable: true,
    mountOn: "powerhead.duct.R",
    allowOverlap: ["hpotp.rotor.shaft", "hpotp.preburner", "hpotp.bottomCap"]
  });

  reg.part("hpotp.casing.front", hpotpFrontGeo, {
    parent: hpotpGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "hpotp.casing.back"
  });

  reg.part("hpotp.preburner", hpftpTopGeo, {
    parent: hpotpGroup,
    pos: [0, 0.34, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "hpotp.casing.back",
    allowOverlap: ["hpotp.casing.front", "hpotp.rotor.shaft"]
  });

  reg.part("hpotp.bottomCap", hpftpBotGeo, {
    parent: hpotpGroup,
    pos: [0, -0.41, 0],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "hpotp.casing.back",
    allowOverlap: ["hpotp.casing.front", "hpotp.rotor.shaft"]
  });

  buildTurbopumpRotor(reg, kit, hpotpGroup, "hpotp.rotor", {
    mountOn: "hpotp.bottomCap",
    allowOverlap: ["hpotp.casing.back", "hpotp.casing.front", "hpotp.preburner"],
    shaftLen: 0.68,
    discRadii: [0.16, 0.145, 0.155],
    discYs: [-0.16, 0.01, 0.16],
    bladeCount: 8
  });

  // ---------------------------------------------------------------------------
  // 5. Main Injector Plate & Coaxial Swirl Elements (visible inside MCC cutaway)
  // ---------------------------------------------------------------------------
  const injPlateGeo = buildCylinderGeometry(0.288, 0.288, 0.08, { segments: 28, axis: "y" });
  reg.part("injector.plate", injPlateGeo, {
    parent: engineGimbal,
    pos: [0, mccTopY + 0.02, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "powerhead.hgmCollar",
    allowOverlap: ["mcc.liner.back", "mcc.liner.front", "mcc.jacket.back", "mcc.jacket.front"]
  });

  const elemGeo = buildCylinderGeometry(0.032, 0.024, 0.07, { segments: 12, axis: "y" });
  const elemOffsets = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    elemOffsets.push([Math.sin(a) * 0.14, Math.cos(a) * 0.14]);
  }
  elemOffsets.forEach(([ex, ez], idx) => {
    reg.part(`injector.elem.${idx}`, elemGeo, {
      parent: engineGimbal,
      pos: [ex, mccTopY - 0.04, ez],
      ramp: "lit",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: "injector.plate"
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Main Combustion Chamber (MCC): Copper NARloy-Z Liner + Structural Jacket
  // ---------------------------------------------------------------------------
  const mccCutCenter = 0.58;
  const mccCutSpan = 2.02; // ~116 deg open window facing canonical iso viewer
  const mccBackStart = mccCutCenter + mccCutSpan * 0.5;
  const mccBackLen = Math.PI * 2 - mccCutSpan;

  const mccRingsLiner = [];
  const mccRingsJacket = [];
  const mccSteps = 14;
  for (let i = 0; i <= mccSteps; i++) {
    const u = i / mccSteps;
    const y = mccExitY + u * (mccTopY - mccExitY); // bottom-to-top
    const rIn = nozzleInnerRadiusAtY(y);
    const rLinerOut = rIn + 0.044;
    const rJackOut = Math.max(rLinerOut + 0.045, mccOuterR - 0.06 * Math.exp(-Math.pow((y - mccThroatY) / 0.22, 2)));
    mccRingsLiner.push({ y, rInner: rIn, rOuter: rLinerOut });
    mccRingsJacket.push({ y, rInner: rLinerOut + 0.002, rOuter: rJackOut });
  }

  reg.part("mcc.liner.back", buildRevolvedSectorGeometry(mccRingsLiner, mccBackStart, mccBackLen, 30), {
    parent: engineGimbal,
    ramp: "copper",
    outline: "mid",
    crease: "lo",
    mountOn: "powerhead.hgmCollar",
    allowOverlap: [
      "mcc.jacket.back",
      "mcc.jacket.front",
      "mcc.manifold.top",
      "injector.plate",
      "nozzle.upper.back",
      "nozzle.upper.front"
    ]
  });

  reg.part("mcc.liner.front", buildRevolvedSectorGeometry(mccRingsLiner, mccCutCenter - mccCutSpan * 0.5, mccCutSpan, 14), {
    parent: engineGimbal,
    ramp: "copper",
    outline: "mid",
    crease: "lo",
    cutawayHide: true,
    mountOn: "mcc.liner.back",
    allowOverlap: [
      "mcc.jacket.back",
      "mcc.jacket.front",
      "mcc.manifold.top",
      "injector.plate",
      "nozzle.upper.back",
      "nozzle.upper.front"
    ]
  });

  reg.part("mcc.jacket.back", buildRevolvedSectorGeometry(mccRingsJacket, mccBackStart, mccBackLen, 30), {
    parent: engineGimbal,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "powerhead.hgmCollar",
    allowOverlap: ["mcc.liner.back", "mcc.liner.front", "nozzle.upper.back", "nozzle.upper.front", "mcc.manifold.top"]
  });

  reg.part("mcc.jacket.front", buildRevolvedSectorGeometry(mccRingsJacket, mccCutCenter - mccCutSpan * 0.5, mccCutSpan, 14), {
    parent: engineGimbal,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    cutawayHide: true,
    mountOn: "mcc.jacket.back",
    allowOverlap: ["mcc.liner.back", "mcc.liner.front", "nozzle.upper.back", "nozzle.upper.front", "mcc.manifold.top"]
  });

  // MCC Coolant Manifold Ring around upper chamber
  reg.part("mcc.manifold.top", buildTorusCollarGeometry(0.37, 0.45, 0.09, mccTopY - 0.06, 36), {
    parent: engineGimbal,
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    mountOn: "mcc.jacket.back",
    allowOverlap: ["mcc.jacket.front"]
  });

  // ---------------------------------------------------------------------------
  // 7. 77.5:1 Regeneratively Cooled Bell Nozzle + Stiffening Hatbands + Coolant Lines
  // ---------------------------------------------------------------------------
  const nozzleSplitY = -1.78;
  const buildNozzleRings = (yBot, yTop, steps) => {
    const list = [];
    for (let i = 0; i <= steps; i++) {
      const y = yBot + (i / steps) * (yTop - yBot);
      const rIn = nozzleInnerRadiusAtY(y);
      list.push({ y, rInner: rIn, rOuter: rIn + 0.042 });
    }
    return list;
  };

  const upperNozzleRings = buildNozzleRings(nozzleSplitY, mccExitY, 10);
  reg.part("nozzle.upper.back", buildRevolvedSectorGeometry(upperNozzleRings, mccBackStart, mccBackLen, 32), {
    parent: engineGimbal,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.019,
    clippable: true,
    mountOn: "mcc.jacket.back",
    allowOverlap: ["mcc.liner.back", "nozzle.lower"]
  });

  reg.part("nozzle.upper.front", buildRevolvedSectorGeometry(upperNozzleRings, mccCutCenter - mccCutSpan * 0.5, mccCutSpan, 14), {
    parent: engineGimbal,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    cutawayHide: true,
    mountOn: "nozzle.upper.back",
    allowOverlap: ["mcc.liner.front", "nozzle.lower"]
  });

  const lowerNozzleRings = buildNozzleRings(nozzleExitY, nozzleSplitY, 14);
  reg.part("nozzle.lower", buildRevolvedSectorGeometry(lowerNozzleRings, 0, Math.PI * 2, 42), {
    parent: engineGimbal,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.020,
    clippable: true,
    mountOn: "nozzle.upper.back",
    allowOverlap: ["nozzle.upper.front"]
  });

  // Stiffening hatband rings circling the parabolic bell
  [-1.44, -1.72, -2.02, -2.32, -2.58].forEach((by, bIdx) => {
    const rBellOut = nozzleInnerRadiusAtY(by) + 0.040;
    const bandGeo = buildTorusCollarGeometry(rBellOut - 0.008, rBellOut + 0.036, 0.045, by, 38);
    reg.part(`nozzle.hatband.${bIdx}`, bandGeo, {
      parent: engineGimbal,
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: bIdx < 2 ? "nozzle.upper.back" : "nozzle.lower",
      allowOverlap: ["nozzle.upper.front", "nozzle.lower", "nozzle.coolantPipe.L", "nozzle.coolantPipe.R"]
    });
  });

  // Copper Exit Coolant Manifold Ring at nozzle lip
  const exitLipR = nozzleInnerRadiusAtY(nozzleExitY + 0.02) + 0.04;
  reg.part("nozzle.exitManifold", buildTorusCollarGeometry(exitLipR - 0.01, exitLipR + 0.048, 0.065, nozzleExitY + 0.02, 40), {
    parent: engineGimbal,
    ramp: "copper",
    outline: "mid",
    crease: "faint",
    mountOn: "nozzle.lower",
    allowOverlap: ["nozzle.coolantPipe.L", "nozzle.coolantPipe.R"]
  });

  // Left & Right Regenerative LH2 Coolant Downcomer Pipes hugging outside the nozzle contour inside engine.gimbal
  for (const [side, dirX] of [["L", -1], ["R", 1]]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const py = mccTopY - 0.06 + u * (nozzleExitY + 0.02 - (mccTopY - 0.06));
      const rIn = nozzleInnerRadiusAtY(py);
      const rOuterSurface =
        py >= mccExitY
          ? Math.max(rIn + 0.089, mccOuterR - 0.06 * Math.exp(-Math.pow((py - mccThroatY) / 0.22, 2)))
          : rIn + 0.042;
      const pr = rOuterSurface + 0.070;
      pts.push(new THREE.Vector3(dirX * pr * 0.924, py, -pr * 0.383));
    }
    const coolCurve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const coolGeo = new THREE.TubeGeometry(coolCurve, 28, 0.026, 10, false);
    reg.part(`nozzle.coolantPipe.${side}`, coolGeo, {
      parent: engineGimbal,
      ramp: "copper",
      outline: "lo",
      noCrease: true,
      mountOn: "mcc.manifold.top",
      allowOverlap: [
        "mcc.liner.back",
        "mcc.jacket.back",
        "nozzle.upper.back",
        "nozzle.lower",
        "nozzle.exitManifold",
        "nozzle.hatband.0",
        "nozzle.hatband.1",
        "nozzle.hatband.2",
        "nozzle.hatband.3",
        "nozzle.hatband.4"
      ]
    });
  }

  // TVC Actuator Engine-Side Mounting Lugs (anchored on upper MCC / powerhead collar)
  const [px, py, pz] = SPEC.pitchEngineLugLocal;
  const pitchLugGeo = new THREE.BoxGeometry(0.14, 0.12, 0.18);
  reg.part("engine.pitchLug", pitchLugGeo, {
    parent: engineGimbal,
    pos: [px, py, pz],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "powerhead.hgmCollar",
    allowOverlap: ["mcc.jacket.back", "powerhead.dome"]
  });
  reg.anchor("tvc.pitch.engine", px, py, pz - 0.06, engineGimbal, { dir: [0, 1, -0.3] });

  const [yx, yy, yz] = SPEC.yawEngineLugLocal;
  const yawLugGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  reg.part("engine.yawLug", yawLugGeo, {
    parent: engineGimbal,
    pos: [yx, yy, yz],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "powerhead.hgmCollar",
    allowOverlap: ["mcc.jacket.back", "powerhead.dome"]
  });
  reg.anchor("tvc.yaw.engine", yx - 0.05, yy, yz - 0.04, engineGimbal, { dir: [-0.4, 1, -0.3] });
}
