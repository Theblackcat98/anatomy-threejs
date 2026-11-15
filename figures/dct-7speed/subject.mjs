import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";

/**
 * Builds a hollow cylindrical tube along X (for concentric outer shaft, synchro sleeves, clutch drums).
 */
function buildHollowShaftX(rInner, rOuter, length, segs = 28) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 1,
    curveSegments: segs
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/**
 * Builds a cutaway rotating clutch drum/basket around X axis so internal multi-plate discs remain visible.
 */
function buildCutawayClutchBasketX(rInner, rOuter, length, aStartDeg = 195, aEndDeg = 455, segs = 30) {
  const shape = new THREE.Shape();
  const aStart = (aStartDeg * Math.PI) / 180;
  const aEnd = (aEndDeg * Math.PI) / 180;
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

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 1,
    curveSegments: segs
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildXGear(pitchR, teeth, addendum, boreR, thickness) {
  const boreFrac = Math.min(0.90, Math.max(0, boreR / pitchR));
  const geo = buildExternalGearGeometry(pitchR, teeth, addendum, thickness, boreFrac);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildSubject(reg, kit) {
  const subjectGroup = reg.group("subject.group", { stage: "subject" });
  const { inY, inZ, outY, outZ } = SPEC;

  // 1. Concentric Input Axis (Flywheel, K1/K2 Multi-Plate Wet Clutches, Nested Odd/Even Shafts)
  const inAxisGroup = reg.group("inAxis.group", {
    parent: subjectGroup,
    pos: [0, inY, inZ],
    stage: "subject"
  });

  // Engine Flywheel Group (always spins at engine theta)
  const flywheelSpin = reg.group("shaft.flywheel.spin", {
    parent: inAxisGroup,
    stage: "subject"
  });

  // Dual-Mass Flywheel Body + Starter Ring Gear at x = -1.96
  reg.part("shaft.flywheel", buildCylinderGeometry(0.49, 0.49, 0.09, { segments: 32, axis: "x" }), {
    parent: flywheelSpin,
    pos: [-1.96, 0, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    explode: [-1.15, 0, 0],
    mountOn: "coaxial",
    allowOverlap: ["shaft.in.odd", "shaft.flywheel.ring", "shaft.flywheel.hub", "struct.bell.flange"]
  });
  reg.part("shaft.flywheel.ring", buildXGear(0.55, 44, 0.016, 0.47, 0.055), {
    parent: flywheelSpin,
    pos: [-1.94, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    explode: [-1.15, 0, 0],
    mountOn: "shaft.flywheel",
    allowOverlap: ["struct.bell.flange"]
  });
  reg.part("shaft.flywheel.hub", buildCylinderGeometry(0.24, 0.24, 0.13, { segments: 24, axis: "x" }), {
    parent: flywheelSpin,
    pos: [-1.96, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    explode: [-1.15, 0, 0],
    mountOn: "shaft.flywheel",
    allowOverlap: ["shaft.in.odd"]
  });
  const fwMark = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.015, 0.18, 0),
      new THREE.Vector3(-2.015, 0.45, 0)
    ]),
    kit.lineMaterials.lit
  );
  reg.detail("shaft.flywheel.mark", fwMark, { parent: flywheelSpin });

  // Inner Solid Input Shaft (Odd Gears 1, 3, 5, 7 + K1 Clutch)
  const oddSpinGroup = reg.group("shaft.odd.spin", {
    parent: inAxisGroup,
    stage: "subject"
  });

  reg.part("shaft.in.odd", buildCylinderGeometry(0.068, 0.068, 4.16, { segments: 20, axis: "x" }), {
    parent: oddSpinGroup,
    pos: [0.06, 0, 0],
    ramp: "lit",
    outline: "hi",
    crease: "faint",
    mountOn: "coaxial",
    allowOverlap: [
      "shaft.flywheel",
      "shaft.flywheel.hub",
      "shaft.in.even",
      "struct.bulkhead.front",
      "struct.bulkhead.mid",
      "struct.bulkhead.rear",
      "struct.bearing.frontIn",
      "struct.bearing.midIn",
      "struct.bearing.rearIn",
      "clutch.k1.drum",
      "clutch.k1.piston",
      "clutch.k1.plate.0",
      "clutch.k1.plate.1",
      "clutch.k1.plate.2",
      "clutch.k1.plate.3"
    ]
  });

  // Outer Hollow Input Shaft (Even Gears 2, 4, 6 + K2 Clutch): spans x = -1.26 .. +0.26
  const evenSpinGroup = reg.group("shaft.even.spin", {
    parent: inAxisGroup,
    stage: "subject"
  });
  reg.part("shaft.in.even", buildHollowShaftX(0.088, 0.132, 1.52, 24), {
    parent: evenSpinGroup,
    pos: [-0.50, 0, 0],
    ramp: "comp",
    outline: "hi",
    crease: "faint",
    explode: [0, 0, 0],
    mountOn: "coaxial",
    allowOverlap: [
      "shaft.in.odd",
      "struct.bulkhead.front",
      "struct.bearing.frontIn",
      "clutch.k2.basket"
    ]
  });

  // 2. Twin Concentric Multi-Plate Wet Clutches (K2 Outer + K1 Inner around x = -1.44)
  // Explode order from flywheel side: Flywheel -> K1 Inner -> K2 Outer
  reg.part("clutch.k2.basket", buildCutawayClutchBasketX(0.45, 0.56, 0.42, 200, 450, 30), {
    parent: evenSpinGroup,
    pos: [-1.42, 0, 0],
    ramp: "comp",
    outline: "hi",
    crease: "lo",
    explode: [-0.14, 0, 0],
    mountOn: "shaft.in.even",
    allowOverlap: [
      "struct.bellhousing",
      "struct.bell.cover",
      "clutch.k2.plate.0",
      "clutch.k2.plate.1",
      "clutch.k2.plate.2",
      "clutch.k2.plate.3",
      "clutch.k2.piston",
      "clutch.k1.drum",
      "clutch.k1.web"
    ]
  });
  // K2 Backing Web connecting basket to hollow even shaft at x = -1.23
  reg.part("clutch.k2.web", buildHollowShaftX(0.13, 0.54, 0.045, 28), {
    parent: evenSpinGroup,
    pos: [-1.23, 0, 0],
    ramp: "comp",
    outline: "mid",
    crease: "faint",
    explode: [-0.14, 0, 0],
    mountOn: "clutch.k2.basket",
    allowOverlap: ["shaft.in.even", "struct.bellhousing", "struct.bell.cover", "clutch.k1.drum"]
  });

  // 4 Alternating Steel/Friction Wet Clutch Discs visible inside K2 Cutaway Basket
  for (let i = 0; i < 4; i++) {
    const px = -1.52 + i * 0.072;
    reg.part(`clutch.k2.plate.${i}`, buildHollowShaftX(0.36, 0.47, 0.024, 28), {
      parent: evenSpinGroup,
      pos: [px, 0, 0],
      ramp: i % 2 === 0 ? "hi" : "brass",
      outline: "lo",
      crease: "faint",
      explode: [-0.20 - i * 0.03, 0, 0],
      mountOn: "clutch.k2.basket",
      allowOverlap: ["struct.bellhousing", "struct.bell.cover", "clutch.k1.drum"]
    });
  }

  // K2 Hydraulic Apply Piston (slides axially along X on clamp)
  const k2PistonGroup = reg.group("clutch.k2.pistonGroup", {
    parent: evenSpinGroup,
    pos: [-1.62, 0, 0],
    stage: "subject"
  });
  reg.part("clutch.k2.piston", buildHollowShaftX(0.36, 0.48, 0.045, 28), {
    parent: k2PistonGroup,
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    explode: [-0.34, 0, 0],
    mountOn: "clutch.k2.basket",
    allowOverlap: ["struct.bellhousing", "struct.bell.cover", "clutch.k1.drum", "clutch.k1.piston"]
  });

  // K1 Inner Cutaway Drum (Odd Shaft, ramp: lit, nested visibly inside K2!)
  reg.part("clutch.k1.drum", buildCutawayClutchBasketX(0.26, 0.34, 0.38, 200, 450, 26), {
    parent: oddSpinGroup,
    pos: [-1.43, 0, 0],
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    explode: [-0.56, 0, 0],
    mountOn: "shaft.in.odd",
    allowOverlap: [
      "struct.bellhousing",
      "struct.bell.cover",
      "clutch.k2.basket",
      "clutch.k2.web",
      "clutch.k2.plate.0",
      "clutch.k2.plate.1",
      "clutch.k2.plate.2",
      "clutch.k2.plate.3",
      "clutch.k2.piston",
      "clutch.k1.plate.0",
      "clutch.k1.plate.1",
      "clutch.k1.plate.2",
      "clutch.k1.plate.3",
      "clutch.k1.piston"
    ]
  });
  reg.part("clutch.k1.web", buildHollowShaftX(0.068, 0.30, 0.045, 24), {
    parent: oddSpinGroup,
    pos: [-1.26, 0, 0],
    ramp: "lit",
    outline: "mid",
    crease: "faint",
    explode: [-0.56, 0, 0],
    mountOn: "clutch.k1.drum",
    allowOverlap: ["shaft.in.odd", "struct.bellhousing", "struct.bell.cover", "clutch.k2.basket"]
  });

  // 4 Alternating Inner Multi-Plate Discs inside K1 Drum
  for (let i = 0; i < 4; i++) {
    const px = -1.52 + i * 0.068;
    reg.part(`clutch.k1.plate.${i}`, buildHollowShaftX(0.14, 0.27, 0.022, 24), {
      parent: oddSpinGroup,
      pos: [px, 0, 0],
      ramp: i % 2 === 0 ? "hi" : "brass",
      outline: "lo",
      crease: "faint",
      explode: [-0.62 - i * 0.03, 0, 0],
      mountOn: "clutch.k1.drum",
      allowOverlap: ["shaft.in.odd", "struct.bellhousing", "struct.bell.cover"]
    });
  }

  // K1 Inner Hydraulic Apply Piston
  const k1PistonGroup = reg.group("clutch.k1.pistonGroup", {
    parent: oddSpinGroup,
    pos: [-1.61, 0, 0],
    stage: "subject"
  });
  reg.part("clutch.k1.piston", buildHollowShaftX(0.14, 0.28, 0.045, 24), {
    parent: k1PistonGroup,
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    explode: [-0.80, 0, 0],
    mountOn: "clutch.k1.drum",
    allowOverlap: ["shaft.in.odd", "struct.bellhousing", "struct.bell.cover", "clutch.k2.piston"]
  });

  // 3. Output Countershaft & Companion Flange (y = outY, z = outZ)
  const outAxisGroup = reg.group("outAxis.group", {
    parent: subjectGroup,
    pos: [0, outY, outZ],
    stage: "subject"
  });
  const outSpinGroup = reg.group("shaft.out.spin", {
    parent: outAxisGroup,
    stage: "subject"
  });

  // Precision Machined Steel Output Shaft (hi ramp contrasts cleanly with intake gear rims & brass synchros!)
  reg.part("shaft.out", buildCylinderGeometry(0.084, 0.084, 3.38, { segments: 20, axis: "x" }), {
    parent: outSpinGroup,
    pos: [0.58, 0, 0],
    ramp: "hi",
    outline: "hi",
    crease: "faint",
    explode: [0, 0, 0.56],
    mountOn: "coaxial",
    allowOverlap: [
      "struct.bulkhead.front",
      "struct.bulkhead.mid",
      "struct.bulkhead.rear",
      "struct.bearing.frontOut",
      "struct.bearing.midOut",
      "struct.bearing.rearOut",
      "shaft.out.flange"
    ]
  });

  reg.part("shaft.out.flange", buildCylinderGeometry(0.26, 0.26, 0.085, { segments: 24, axis: "x" }), {
    parent: outSpinGroup,
    pos: [2.24, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    explode: [0, 0, 0.56],
    mountOn: "shaft.out",
    allowOverlap: ["struct.bulkhead.rear"]
  });
  const outMark = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(2.29, 0.04, 0),
      new THREE.Vector3(2.29, 0.24, 0)
    ]),
    kit.lineMaterials.lit
  );
  reg.detail("shaft.out.mark", outMark, { parent: outSpinGroup });

  // 4. All 7 Machined Gear Pairs (Stepped Input Gear + Output Gear Ring, Steel Hub, and Brass Dog-Clutch Cone)
  SPEC.gears.forEach((g) => {
    const isOdd = g.shaft === "odd";
    const inParent = isOdd ? oddSpinGroup : evenSpinGroup;
    const inMount = isOdd ? "shaft.in.odd" : "shaft.in.even";
    const inRamp = isOdd ? "lit" : "comp";
    const inExplode = [0, 0, 0];

    const inGearId = `gear.in.${g.gear}`;
    const outGearId = `gear.out.${g.gear}`;
    const outHubId = `gear.outHub.${g.gear}`;
    const outDogId = `gear.dog.${g.gear}`;

    reg.part(inGearId, buildXGear(g.rIn, g.tIn, 0.020, isOdd ? 0.068 : 0.132, 0.085), {
      parent: inParent,
      pos: [g.x, 0, 0],
      ramp: inRamp,
      outline: "mid",
      crease: "faint",
      explode: inExplode,
      mountOn: inMount,
      allowOverlap: [outGearId, "shaft.in.odd", "shaft.in.even"]
    });

    // Machined center hub shoulder on larger input gears
    if (g.rIn > 0.32) {
      reg.part(`gear.inHub.${g.gear}`, buildHollowShaftX(isOdd ? 0.068 : 0.132, g.rIn * 0.58, 0.105, 20), {
        parent: inParent,
        pos: [g.x, 0, 0],
        ramp: "hi",
        outline: "lo",
        crease: "faint",
        explode: inExplode,
        mountOn: inGearId,
        allowOverlap: ["shaft.in.odd", "shaft.in.even"]
      });
    }

    // Individual spin group for each freewheeling output gear (spins at true ratio until synchro locks it!)
    const outGearSpin = reg.group(`gear.outSpin.${g.gear}`, {
      parent: outAxisGroup,
      pos: [g.x, 0, 0],
      stage: "subject"
    });

    reg.part(outGearId, buildXGear(g.rOut, g.tOut, 0.020, 0.086, 0.085), {
      parent: outGearSpin,
      rot: [Math.PI / g.tOut, 0, 0],
      ramp: "intake",
      outline: "mid",
      crease: "faint",
      explode: [0, 0, 0.56],
      mountOn: "shaft.out",
      allowOverlap: [inGearId, outHubId, outDogId, `synchro.sleeve.${g.synchro}`]
    });

    // Recessed CNC-machined steel inner gear web/hub (breaks up flat blue disc wall!)
    reg.part(outHubId, buildHollowShaftX(0.086, g.rOut * 0.62, 0.098, 22), {
      parent: outGearSpin,
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      explode: [0, 0, 0.56],
      mountOn: outGearId,
      allowOverlap: ["shaft.out", outDogId]
    });

    // Brass Dog-Clutch Teeth Ring facing the gear's synchronizer sleeve
    const synSpec = SPEC.synchros.find((s) => s.id === g.synchro);
    const dogDir = synSpec ? Math.sign(synSpec.x - g.x) : 1;
    reg.part(outDogId, buildXGear(0.162, 16, 0.015, 0.090, 0.042), {
      parent: outGearSpin,
      pos: [dogDir * 0.065, 0, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      explode: [0, 0, 0.56],
      mountOn: outHubId,
      allowOverlap: ["shaft.out", outGearId, `synchro.sleeve.${g.synchro}`]
    });
  });

  // 5. Four Sliding Brass Dog-Ring Synchronizers (Fixed Inner Hub + Sliding Grooved Brass Sleeve)
  SPEC.synchros.forEach((syn) => {
    // Fixed inner splined synchronizer hub on output shaft
    reg.part(`synchro.hub.${syn.id}`, buildHollowShaftX(0.084, 0.168, 0.095, 20), {
      parent: outSpinGroup,
      pos: [syn.x, 0, 0],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      explode: [0, 0, 0.56],
      mountOn: "shaft.out",
      allowOverlap: [`synchro.sleeve.${syn.id}`]
    });

    const synGroup = reg.group(`synchro.group.${syn.id}`, {
      parent: outAxisGroup,
      pos: [syn.x, 0, 0],
      stage: "subject"
    });
    const synSpin = reg.group(`synchro.spin.${syn.id}`, {
      parent: synGroup,
      stage: "subject"
    });
    const allowGears = syn.gears.flatMap((gn) => [`gear.out.${gn}`, `gear.dog.${gn}`]);

    // Sliding Outer Brass Synchronizer Sleeve (twin shoulders framing shift-fork groove)
    reg.part(`synchro.sleeve.${syn.id}`, buildHollowShaftX(0.155, 0.238, 0.115, 24), {
      parent: synSpin,
      ramp: "brass",
      outline: "hi",
      crease: "lo",
      explode: [0, 0, 0.56],
      mountOn: `synchro.hub.${syn.id}`,
      allowOverlap: allowGears
    });
    const grooveRing = makeRingLine(0.242, 24, kit, "lo");
    grooveRing.rotation.y = Math.PI / 2;
    reg.detail(`synchro.groove.${syn.id}`, grooveRing, { parent: synSpin });
  });
}
