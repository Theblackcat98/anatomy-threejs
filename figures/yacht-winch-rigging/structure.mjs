import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

/**
 * Builds an annular cylinder arc extruded along +Y.
 * Under rotateX(-PI/2), shape angle `a` maps to XZ: x = r*cos(a), z = -r*sin(a).
 * Canonical ISO camera looks from (+0.509, +0.500, +0.701) -> a ≈ 306° (-54°).
 */
function buildArcWallGeometry(rInner, rOuter, height, aStartDeg, aEndDeg, segs = 32) {
  const shape = new THREE.Shape();
  const aStart = (aStartDeg * Math.PI) / 180;
  const aEnd = (aEndDeg * Math.PI) / 180;
  const span = Math.abs(aEnd - aStart);

  if (span >= Math.PI * 1.99) {
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
    depth: height,
    bevelEnabled: true,
    bevelSize: 0.007,
    bevelThickness: 0.007,
    bevelSegments: 1
  });
  geo.translate(0, 0, -height * 0.5);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function buildStructure(reg, kit) {
  const structGroup = reg.group("struct.group", { stage: "structure" });
  const {
    topSurfaceY,
    mastX,
    mastZ,
    mastHeight,
    spreaderY,
    spreaderHalfSpan,
    winchX,
    winchZ,
    winchBaseY,
    rRing
  } = SPEC;

  // 1. Mast Partner Collar, Bolted Flange, Tapered Spar, Spreaders & Masthead Crane
  reg.part("struct.mastPartner", buildCylinderGeometry(0.16, 0.22, 0.14, { segments: 24, axis: "y" }), {
    parent: structGroup,
    pos: [mastX, topSurfaceY + 0.07, mastZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "base.deckSection"
  });
  [0, 1, 2, 3].forEach((i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    reg.detail(
      `struct.mastPartner.bolt.${i}`,
      makeScrewDetail(mastX + Math.cos(a) * 0.18, topSurfaceY + 0.02, mastZ + Math.sin(a) * 0.18, 0.018, "y", kit),
      { parent: structGroup }
    );
  });

  const mastGroup = reg.group("struct.mast.group", {
    parent: structGroup,
    pos: [mastX, topSurfaceY + 0.14, mastZ],
    stage: "structure"
  });

  reg.part("struct.mast.spar", buildCylinderGeometry(0.062, 0.102, mastHeight, { segments: 24, axis: "y" }), {
    parent: mastGroup,
    pos: [0, mastHeight * 0.5, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.mastPartner"
  });

  // Sail track groove along aft face of mast
  const trackPts = [
    new THREE.Vector3(0.095, 0.20, 0),
    new THREE.Vector3(0.066, mastHeight - 0.12, 0)
  ];
  reg.detail("struct.mast.track", new THREE.Line(new THREE.BufferGeometry().setFromPoints(trackPts), kit.lineMaterials.lo), {
    parent: mastGroup
  });

  // Swept-aft Airfoil Spreaders at spreaderY
  const localSpreaderY = spreaderY - (topSurfaceY + 0.14);
  reg.part("struct.spreader.collar", buildCylinderGeometry(0.105, 0.105, 0.11, { segments: 18, axis: "y" }), {
    parent: mastGroup,
    pos: [0, localSpreaderY, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.mast.spar"
  });

  const sweepAft = 0.05;
  const sweepYaw = Math.atan2(sweepAft, spreaderHalfSpan);
  reg.part("struct.spreader.port", buildCylinderGeometry(0.022, 0.036, spreaderHalfSpan, { segments: 14, axis: "z" }), {
    parent: mastGroup,
    pos: [sweepAft * 0.5, localSpreaderY, -spreaderHalfSpan * 0.5 - 0.07],
    rot: [0, sweepYaw, 0],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.spreader.collar"
  });
  reg.part("struct.spreader.stbd", buildCylinderGeometry(0.036, 0.022, spreaderHalfSpan, { segments: 14, axis: "z" }), {
    parent: mastGroup,
    pos: [sweepAft * 0.5, localSpreaderY, spreaderHalfSpan * 0.5 + 0.07],
    rot: [0, -sweepYaw, 0],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.spreader.collar"
  });
  reg.part("struct.spreader.tipCap.port", buildCylinderGeometry(0.028, 0.028, 0.045, { segments: 12, axis: "y" }), {
    parent: mastGroup,
    pos: [sweepAft, localSpreaderY, -spreaderHalfSpan - 0.07],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true
  });
  reg.part("struct.spreader.tipCap.stbd", buildCylinderGeometry(0.028, 0.028, 0.045, { segments: 12, axis: "y" }), {
    parent: mastGroup,
    pos: [sweepAft, localSpreaderY, spreaderHalfSpan + 0.07],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true
  });

  // Machined Masthead Cap, Aft Crane & Halyard Sheave
  reg.part("struct.masthead.cap", buildCylinderGeometry(0.095, 0.075, 0.09, { segments: 18, axis: "y" }), {
    parent: mastGroup,
    pos: [0, mastHeight - 0.01, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.mast.spar"
  });
  reg.part(
    "struct.masthead.crane",
    buildSlabGeometry(0.28, 0.11, 0.055, { radius: 0.025, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: mastGroup,
      pos: [0.06, mastHeight + 0.025, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.masthead.cap"
    }
  );
  reg.part("struct.masthead.sheave", buildCylinderGeometry(0.048, 0.048, 0.032, { segments: 16, axis: "z" }), {
    parent: mastGroup,
    pos: [0.10, mastHeight - 0.045, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true
  });

  // Rotating Masthead Wind Vane / Windex (interactive wind indicator!)
  const vaneGroup = reg.group("struct.windVane.group", {
    parent: mastGroup,
    pos: [0, mastHeight + 0.05, 0],
    stage: "structure"
  });
  reg.part("struct.windVane.post", buildCylinderGeometry(0.015, 0.018, 0.13, { segments: 10, axis: "y" }), {
    parent: vaneGroup,
    pos: [0, 0.045, 0],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.masthead.crane"
  });
  reg.part(
    "struct.windVane.arm",
    buildSlabGeometry(0.32, 0.028, 0.022, { radius: 0.01, bevel: false }),
    {
      parent: vaneGroup,
      pos: [0.04, 0.115, 0],
      ramp: "lit",
      outline: "lo",
      crease: "faint",
      mountOn: "struct.windVane.post"
    }
  );
  reg.part(
    "struct.windVane.fin",
    buildSlabGeometry(0.09, 0.016, 0.065, { radius: 0.006, bevel: false }),
    {
      parent: vaneGroup,
      pos: [0.16, 0.135, 0],
      ramp: "comb",
      outline: "lo",
      crease: "faint",
      detail: true
    }
  );

  // Anchors on masthead & spreaders for shrouds/stays (outside mast spar radius!)
  reg.anchor("mast.top.port", 0.02, mastHeight - 0.01, -0.095, mastGroup);
  reg.anchor("mast.top.stbd", 0.02, mastHeight - 0.01, 0.095, mastGroup);
  reg.anchor("mast.top.fore", -0.075, mastHeight + 0.005, 0, mastGroup);
  reg.anchor("mast.top.aft", 0.185, mastHeight + 0.005, 0, mastGroup);
  reg.anchor("spreader.tip.port", sweepAft, localSpreaderY, -spreaderHalfSpan - 0.07, mastGroup);
  reg.anchor("spreader.tip.stbd", sweepAft, localSpreaderY, spreaderHalfSpan + 0.07, mastGroup);

  // 2. Deck Chainplates, Cylindrical Turnbuckles & Bow/Stern Stay Fittings
  const [spX, , spZ] = ANCHORS.shroudPort;
  const [ssX, , ssZ] = ANCHORS.shroudStbd;
  [
    { id: "port", x: spX, z: spZ },
    { id: "stbd", x: ssX, z: ssZ }
  ].forEach((cp) => {
    reg.part(
      `struct.chainplate.${cp.id}`,
      buildSlabGeometry(0.14, 0.085, 0.045, { radius: 0.02, bevel: true, bevelSize: 0.007, bevelThickness: 0.007 }),
      {
        parent: structGroup,
        pos: [cp.x, topSurfaceY + 0.045, cp.z],
        ramp: "brass",
        outline: "mid",
        crease: "lo",
        mountOn: "base.deckSection"
      }
    );
    reg.part(`struct.turnbuckle.${cp.id}`, buildCylinderGeometry(0.032, 0.038, 0.22, { segments: 14, axis: "y" }), {
      parent: structGroup,
      pos: [cp.x, topSurfaceY + 0.155, cp.z],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: `struct.chainplate.${cp.id}`
    });
    reg.part(`struct.turnbuckle.nut.${cp.id}`, buildCylinderGeometry(0.046, 0.046, 0.048, { segments: 6, axis: "y" }), {
      parent: structGroup,
      pos: [cp.x, topSurfaceY + 0.14, cp.z],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });
    reg.anchor(`chainplate.top.${cp.id}`, cp.x, topSurfaceY + 0.265, cp.z, structGroup);
  });

  // Bow Stemhead Fitting
  const [fsX, , fsZ] = ANCHORS.forestayDeck;
  reg.part(
    "struct.bowStem",
    buildSlabGeometry(0.20, 0.12, 0.055, { radius: 0.025, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: structGroup,
      pos: [fsX, topSurfaceY + 0.055, fsZ],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSection"
    }
  );
  reg.part("struct.bowStem.tang", buildCylinderGeometry(0.032, 0.040, 0.10, { segments: 12, axis: "y" }), {
    parent: structGroup,
    pos: [fsX + 0.02, topSurfaceY + 0.11, fsZ],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.bowStem"
  });
  reg.anchor("bowStem.top", fsX + 0.02, topSurfaceY + 0.16, fsZ, structGroup);

  // Stern Backstay Tang
  const [bsX, , bsZ] = ANCHORS.backstayDeck;
  reg.part(
    "struct.sternFit",
    buildSlabGeometry(0.18, 0.10, 0.05, { radius: 0.022, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: structGroup,
      pos: [bsX, topSurfaceY + 0.05, bsZ],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSection"
    }
  );
  reg.part("struct.sternFit.tang", buildCylinderGeometry(0.030, 0.038, 0.10, { segments: 12, axis: "y" }), {
    parent: structGroup,
    pos: [bsX, topSurfaceY + 0.105, bsZ],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.sternFit"
  });
  reg.anchor("sternFit.top", bsX, topSurfaceY + 0.155, bsZ, structGroup);

  // 3. Transverse Cockpit Mainsheet Traveler Track, Sliding Car & Deck Turning Block
  const [trX, , trZ] = ANCHORS.travelerCenter;
  reg.part(
    "struct.traveler.rail",
    buildSlabGeometry(0.085, 0.86, 0.042, { radius: 0.015, bevel: true, bevelSize: 0.006, bevelThickness: 0.006 }),
    {
      parent: structGroup,
      pos: [trX, topSurfaceY + 0.042, trZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSection"
    }
  );
  [-0.41, 0.41].forEach((dz, idx) => {
    reg.part(
      `struct.traveler.stop.${idx}`,
      buildCylinderGeometry(0.036, 0.042, 0.06, { segments: 10, axis: "y" }),
      {
        parent: structGroup,
        pos: [trX, topSurfaceY + 0.05, trZ + dz],
        ramp: "lo",
        outline: "lo",
        crease: "faint",
        detail: true
      }
    );
  });

  const travelerCarGroup = reg.group("struct.traveler.carGroup", {
    parent: structGroup,
    pos: [trX, topSurfaceY + 0.055, trZ],
    stage: "structure"
  });
  reg.part(
    "struct.traveler.car",
    buildSlabGeometry(0.13, 0.16, 0.065, { radius: 0.02, bevel: true, bevelSize: 0.007, bevelThickness: 0.007 }),
    {
      parent: travelerCarGroup,
      pos: [0, 0.03, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.traveler.rail"
    }
  );
  reg.part("struct.traveler.sheave", buildCylinderGeometry(0.052, 0.052, 0.034, { segments: 16, axis: "x" }), {
    parent: travelerCarGroup,
    pos: [0, 0.085, 0],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.traveler.car"
  });
  reg.anchor("traveler.car.top", 0, 0.135, 0, travelerCarGroup, { dir: [0, 1, 0] });
  reg.anchor("traveler.car.out", 0.06, 0.065, 0.06, travelerCarGroup, { dir: [0.45, 0.05, 0.89] });

  // Deck Mainsheet Turning Cheek Block (tangential feed to winch drum)
  const [tbX, , tbZ] = ANCHORS.turningBlock;
  reg.part(
    "struct.turningBlock.base",
    buildSlabGeometry(0.24, 0.24, 0.042, { radius: 0.05, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: structGroup,
      pos: [tbX, topSurfaceY + 0.042, tbZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSection"
    }
  );
  reg.part("struct.turningBlock.sheave", buildCylinderGeometry(0.105, 0.105, 0.052, { segments: 20, axis: "y" }), {
    parent: structGroup,
    pos: [tbX, topSurfaceY + 0.082, tbZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "struct.turningBlock.base"
  });
  reg.part(
    "struct.turningBlock.cap",
    buildSlabGeometry(0.14, 0.14, 0.022, { radius: 0.04, bevel: true, bevelSize: 0.005, bevelThickness: 0.005 }),
    {
      parent: structGroup,
      pos: [tbX, topSurfaceY + 0.132, tbZ],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: "struct.turningBlock.sheave"
    }
  );
  reg.anchor("turningBlock.in", tbX - 0.065, topSurfaceY + 0.082, tbZ - 0.085, structGroup, { dir: [-0.45, 0, -0.89] });
  reg.anchor("turningBlock.out", tbX + 0.10, topSurfaceY + 0.09, tbZ + 0.045, structGroup, { dir: [0.85, 0.34, 0.40] });

  // 4. Cutaway Planetary Winch Base Flange & Outer Cutaway Gearbox Skirt
  reg.part("struct.winch.baseFlange", buildCylinderGeometry(0.62, 0.66, 0.08, { segments: 36, axis: "y" }), {
    parent: structGroup,
    pos: [winchX, winchBaseY + 0.04, winchZ],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    mountOn: "base.winchCoaming"
  });

  [0, 1, 2, 3, 4, 5].forEach((i) => {
    const a = (i / 6) * Math.PI * 2;
    reg.detail(
      `struct.winch.bolt.${i}`,
      makeScrewDetail(winchX + Math.cos(a) * 0.59, winchBaseY + 0.082, winchZ + Math.sin(a) * 0.59, 0.024, "y", kit),
      { parent: structGroup }
    );
  });

  // Stationary outer cutaway pedestal housing (144° open window centered at a=306° facing ISO camera!)
  const skirtH = 0.28;
  reg.part("struct.winch.housingCut", buildArcWallGeometry(rRing + 0.095, rRing + 0.145, skirtH, 18, 234, 32), {
    parent: structGroup,
    pos: [winchX, winchBaseY + 0.08 + skirtH * 0.5, winchZ],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    clippable: true,
    explode: [0, 0, -0.92],
    mountOn: "struct.winch.baseFlange",
    allowOverlap: ["winch.ringGear", "winch.drivePost.0", "winch.drivePost.1", "winch.drivePost.2", "winch.planet.0", "winch.planet.1", "winch.planet.2"]
  });

  // Removable front cutaway cover shell (hidden when Cutaway=ON, seals full 360° skirt when Cutaway=OFF)
  reg.part("struct.winch.frontShield", buildArcWallGeometry(rRing + 0.095, rRing + 0.145, skirtH, 235, 377, 24), {
    parent: structGroup,
    pos: [winchX, winchBaseY + 0.08 + skirtH * 0.5, winchZ],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    clippable: true,
    cutawayHide: true,
    explode: [0, 0, 0.96],
    mountOn: "struct.winch.baseFlange",
    allowOverlap: ["struct.winch.housingCut", "winch.ringGear", "winch.drivePost.0", "winch.drivePost.1", "winch.drivePost.2", "winch.planet.0", "winch.planet.1", "winch.planet.2"]
  });

  reg.tag("tag-winch", "SELF-TAILER", winchX + 1.02, winchBaseY + 0.92, winchZ - 0.36);
}
