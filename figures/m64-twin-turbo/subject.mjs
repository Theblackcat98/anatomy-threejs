import * as THREE from "three";
import { SPEC, BANK_SIGN, CYL_Z, CRANK_THROW_PHASE, getCylinderKinematics } from "./model.mjs";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeScrewDetail
} from "../../kit/primitives.mjs";

function makeBeltLoopGeo(yTop, rTop, yBot, rBot, width, thickness) {
  const outer = new THREE.Shape();
  const dy = yTop - yBot;
  const sinA = (rBot - rTop) / dy;
  const ang = Math.asin(Math.max(-0.95, Math.min(0.95, sinA)));

  // Outer belt profile
  const rT = rTop + thickness;
  const rB = rBot + thickness;
  outer.absarc(0, yTop, rT, Math.PI - ang, ang, true);
  outer.absarc(0, yBot, rB, ang, Math.PI - ang, true);
  outer.closePath();

  const inner = new THREE.Path();
  inner.absarc(0, yTop, rTop, Math.PI - ang, ang, true);
  inner.absarc(0, yBot, rBot, ang, Math.PI - ang, true);
  inner.closePath();
  outer.holes.push(inner);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: width,
    bevelEnabled: false,
    curveSegments: 32
  });
  geo.translate(0, 0, -width * 0.5);
  return geo;
}

export function buildSubject(reg, kit) {
  const gSubj = reg.group("subject", { stage: "subject" });
  const initTheta = SPEC.initialTheta;

  // ---------------------------------------------------------------------------
  // 1. Forged 6-Throw 180° Boxer Crankshaft + Main Journals + Flywheel + Pulley
  // ---------------------------------------------------------------------------
  const gCrank = reg.group("subject.crankshaftGroup", {
    parent: gSubj,
    pos: [0, 0, 0],
    rot: [0, 0, -initTheta],
    stage: "subject"
  });

  const spineGeo = buildCylinderGeometry(0.068, 0.068, 2.46, { segments: 24, axis: "z" });
  reg.part("subject.crankSpine", spineGeo, {
    parent: gCrank,
    pos: [0, 0, 0.02],
    ramp: "lit",
    mountOn: "coaxial",
    allowOverlap: ["struct.bulkhead.front", "struct.bulkhead.rear"]
  });

  // 4 Main Bearing Journals along crankshaft Z spine
  const mainJournalGeo = buildCylinderGeometry(0.092, 0.092, 0.075, { segments: 24, axis: "z" });
  for (const [idx, jz] of [
    [0, -0.80],
    [1, -0.34],
    [2, 0.34],
    [3, 0.80]
  ]) {
    reg.part(`subject.mainJournal.${idx}`, mainJournalGeo, {
      parent: gCrank,
      pos: [0, 0, jz],
      ramp: "lit",
      detail: true,
      mountOn: "subject.crankSpine"
    });
  }

  // 6 Individual Crankpin Journals + Forged Counterweight Crank Webs
  const pinGeo = buildCylinderGeometry(0.044, 0.044, 0.064, { segments: 20, axis: "z" });
  const webGeo = buildSlabGeometry(SPEC.R_CRANK + 0.09, 0.028, 0.115, {
    radius: 0.02,
    bevel: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    centerY: true
  });

  for (let i = 0; i < 6; i++) {
    const s = BANK_SIGN[i];
    const psi = CRANK_THROW_PHASE[i];
    const cosP = Math.cos(-psi);
    const sinP = Math.sin(-psi);
    const px = s * SPEC.R_CRANK * cosP;
    const py = s * SPEC.R_CRANK * sinP;
    const webAngle = Math.atan2(py, px);
    const cz = CYL_Z[i];

    reg.part(`subject.crankPin.${i}`, pinGeo, {
      parent: gCrank,
      pos: [px, py, cz],
      ramp: "lit",
      detail: true,
      mountOn: "subject.crankSpine"
    });

    // Cheek web connecting crankpin back to central crankSpine
    const webZ = cz + (s < 0 ? -0.048 : 0.048);
    reg.part(`subject.crankWeb.${i}`, webGeo, {
      parent: gCrank,
      pos: [px * 0.52, py * 0.52, webZ],
      rot: [0, 0, webAngle],
      ramp: "lit",
      detail: true,
      mountOn: "subject.crankSpine"
    });
  }

  // Rear Dual-Mass Flywheel & Starter Ring Gear (z = -1.16)
  const flywheelGeo = buildCylinderGeometry(0.34, 0.35, 0.085, { segments: 36, axis: "z" });
  const starterGearGeo = buildExternalGearGeometry(0.365, 34, 0.024, 0.032, 0.86);
  reg.part("subject.flywheel", flywheelGeo, {
    parent: gCrank,
    pos: [0, 0, -1.14],
    ramp: "lit",
    mountOn: "subject.crankSpine"
  });
  reg.part("subject.starterRingGear", starterGearGeo, {
    parent: gCrank,
    pos: [0, 0, -1.11],
    ramp: "brass",
    detail: true,
    mountOn: "subject.flywheel"
  });
  for (let b = 0; b < 6; b++) {
    const a = (b * Math.PI) / 3;
    reg.detail(
      `subject.flywheelBolt.${b}`,
      makeScrewDetail(Math.cos(a) * 0.14, Math.sin(a) * 0.14, -1.185, 0.016, "z", kit),
      { parent: gCrank, stage: "subject" }
    );
  }

  // Front Crankshaft Harmonic Damper & V-Belt Pulley (z = +1.15)
  const crankPulleyGeo = buildCylinderGeometry(0.175, 0.175, 0.085, { segments: 32, axis: "z" });
  const crankFlangeGeo = buildCylinderGeometry(0.195, 0.195, 0.022, { segments: 32, axis: "z" });
  reg.part("subject.crankPulley", crankPulleyGeo, {
    parent: gCrank,
    pos: [0, 0, 1.15],
    ramp: "lit",
    mountOn: "subject.crankSpine"
  });
  reg.part("subject.crankPulleyRim", crankFlangeGeo, {
    parent: gCrank,
    pos: [0, 0, 1.195],
    ramp: "brass",
    detail: true,
    mountOn: "subject.crankPulley"
  });
  reg.detail("subject.crankBolt", makeScrewDetail(0, 0, 1.21, 0.032, "z", kit), {
    parent: gCrank,
    stage: "subject"
  });

  // ---------------------------------------------------------------------------
  // 2. 6 Forged Boxer Pistons & 6 H-Beam Connecting Rods (Hierarchical Linkage)
  // ---------------------------------------------------------------------------
  const pistonCrownGeo = buildCylinderGeometry(0.184, 0.184, 0.145, { segments: 28, axis: "x" });
  const wristPinGeo = buildCylinderGeometry(0.032, 0.032, 0.25, { segments: 16, axis: "z" });

  // H-beam connecting rod built along +X from wrist-pin (0,0) to crankpin (L_ROD, 0)
  const rodBeamGeo = buildSlabGeometry(SPEC.L_ROD - 0.04, 0.032, 0.042, {
    radius: 0.008,
    bevel: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    centerY: true
  });
  rodBeamGeo.translate(SPEC.L_ROD * 0.5, 0, 0);
  const smallEndGeo = buildCylinderGeometry(0.048, 0.048, 0.044, { segments: 18, axis: "z" });
  const bigEndGeo = buildCylinderGeometry(0.068, 0.068, 0.052, { segments: 22, axis: "z" });

  for (let i = 0; i < 6; i++) {
    const ck = getCylinderKinematics(initTheta, i);
    const s = ck.bankSign;

    const gPiston = reg.group(`subject.pistonGroup.${i}`, {
      parent: gSubj,
      pos: [ck.xPiston, 0, ck.cz],
      stage: "subject"
    });

    reg.part(`subject.piston.${i}`, pistonCrownGeo, {
      parent: gPiston,
      pos: [s * 0.015, 0, 0],
      ramp: "lit",
      mountOn: `struct.cylBarrel.${i}`,
      insideBoreOf: `struct.cylBarrel.${i}`,
      boreClearanceFn: (_lx, ly, lz) => SPEC.BORE_R - Math.hypot(ly, lz)
    });

    reg.part(`subject.wristPin.${i}`, wristPinGeo, {
      parent: gPiston,
      pos: [0, 0, 0],
      ramp: "brass",
      detail: true,
      mountOn: `subject.piston.${i}`
    });

    // Piston compression ring accents near outer crown face
    for (const rx of [0.055, 0.074]) {
      const ring = makeRingLine(0.187, 24, kit, "brass");
      ring.rotation.set(0, Math.PI / 2, 0);
      ring.position.set(s * rx, 0, 0);
      reg.detail(`subject.pistonRing.${i}.${rx > 0.06 ? 1 : 0}`, ring, {
        parent: gPiston,
        stage: "subject"
      });
    }

    // Connecting rod group pivots at local wrist-pin [0,0,0] toward crankpin (xPin, yPin)
    const gRod = reg.group(`subject.rodGroup.${i}`, {
      parent: gPiston,
      pos: [0, 0, 0],
      rot: [0, 0, ck.rodAngle],
      stage: "subject"
    });

    reg.part(`subject.rod.${i}`, rodBeamGeo, {
      parent: gRod,
      ramp: "lit",
      mountOn: `subject.piston.${i}`,
      allowOverlap: ["subject.crankSpine"]
    });
    reg.part(`subject.rodSmallEnd.${i}`, smallEndGeo, {
      parent: gRod,
      pos: [0, 0, 0],
      ramp: "lit",
      detail: true,
      mountOn: `subject.rod.${i}`
    });
    reg.part(`subject.rodBigEnd.${i}`, bigEndGeo, {
      parent: gRod,
      pos: [SPEC.L_ROD, 0, 0],
      ramp: "lit",
      detail: true,
      mountOn: `subject.rod.${i}`
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Top-Center 11-Blade Axial Cooling Fan (1.62:1 Belt Drive) & V-Belt
  // ---------------------------------------------------------------------------
  const gFan = reg.group("subject.coolingFanGroup", {
    parent: gSubj,
    pos: [0, SPEC.FAN_Y, SPEC.FAN_Z],
    rot: [0, 0, -initTheta * SPEC.FAN_RATIO],
    stage: "subject"
  });

  const fanHubGeo = buildCylinderGeometry(0.125, 0.138, 0.13, { segments: 28, axis: "z" });
  const fanPulleyGeo = buildCylinderGeometry(0.108, 0.108, 0.24, { segments: 26, axis: "z" });
  const bladeGeo = buildSlabGeometry(0.245, 0.016, 0.064, {
    radius: 0.008,
    bevel: true,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    centerY: true
  });

  reg.part("subject.fanHub", fanHubGeo, {
    parent: gFan,
    pos: [0, 0, 0.055],
    ramp: "lit",
    mountOn: "struct.alternatorHub"
  });
  reg.part("subject.fanPulley", fanPulleyGeo, {
    parent: gFan,
    pos: [0, 0, 0.24],
    ramp: "brass",
    mountOn: "subject.fanHub"
  });
  reg.detail("subject.fanNut", makeScrewDetail(0, 0, 0.365, 0.026, "z", kit), {
    parent: gFan,
    stage: "subject"
  });

  // 11 pitched axial blades radiating from r = 0.115 to r = 0.370 inside r = 0.41 shroud
  for (let b = 0; b < 11; b++) {
    const a = (b * Math.PI * 2) / 11;
    const gBladePivot = reg.group(`subject.fanBladePivot.${b}`, {
      parent: gFan,
      pos: [0, 0, 0.065],
      rot: [0, 0, a],
      stage: "subject"
    });
    reg.part(`subject.fanBlade.${b}`, bladeGeo, {
      parent: gBladePivot,
      pos: [0.242, 0, 0],
      rot: [0.46, 0, 0],
      ramp: "lit",
      mountOn: "subject.fanHub"
    });
  }

  // Crankshaft-to-Cooling-Fan V-Belt in the z = +1.15 plane
  const beltGeo = makeBeltLoopGeo(SPEC.FAN_Y, 0.112, 0.0, 0.178, 0.038, 0.022);
  reg.part("subject.fanBelt", beltGeo, {
    parent: gSubj,
    pos: [0, 0, 1.15],
    ramp: "lo",
    detail: true,
    mountOn: "subject.crankPulley"
  });
}
