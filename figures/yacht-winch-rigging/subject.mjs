import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  buildExternalGearGeometry,
  buildInternalGearRingGeometry,
  makeRingLine,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC, getRigState } from "./model.mjs";

function buildHorizontalGear(pitchR, teeth, toothDepth, width, boreFraction) {
  const geo = buildExternalGearGeometry(pitchR, teeth, toothDepth, width, boreFraction);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function buildHorizontalInternalGear(outerR, pitchR, teeth, toothDepth, width) {
  const geo = buildInternalGearRingGeometry(outerR, pitchR, teeth, toothDepth, width);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function buildSubject(reg, kit) {
  const subjectGroup = reg.group("subject.group", { stage: "subject" });
  const {
    winchX,
    winchZ,
    winchBaseY,
    sunTeeth,
    planetTeeth,
    ringTeeth,
    rSun,
    rPlanet,
    rRing,
    gearToothDepth,
    mastX,
    mastZ,
    boomY,
    boomLength
  } = SPEC;

  // 1. Hero 2-Speed Self-Tailing Planetary Winch Assembly
  const winchRoot = reg.group("winch.root", {
    parent: subjectGroup,
    pos: [winchX, winchBaseY, winchZ],
    stage: "subject"
  });

  // Central Drive Spindle (rotates with handle)
  const spindleGroup = reg.group("winch.spindle.group", {
    parent: winchRoot,
    stage: "subject"
  });
  reg.part("winch.spindle", buildCylinderGeometry(0.058, 0.058, 0.96, { segments: 20, axis: "y" }), {
    parent: spindleGroup,
    pos: [0, 0.56, 0],
    ramp: "hi",
    outline: "hi",
    crease: "faint",
    mountOn: "struct.winch.baseFlange",
    allowOverlap: ["winch.drum", "winch.crownBot", "winch.crownTop", "winch.carrier", "winch.ratchetRing", "winch.sunGear"]
  });

  // 12T Sun Gear on Spindle inside Cutaway Planetary Bay (y = 0.24)
  reg.part("winch.sunGear", buildHorizontalGear(rSun, sunTeeth, gearToothDepth, 0.17, 0.40), {
    parent: spindleGroup,
    pos: [0, 0.24, 0],
    ramp: "lit",
    outline: "mid",
    crease: "faint",
    explode: [0, 0.20, 0],
    mountOn: "winch.spindle",
    allowOverlap: ["winch.planet.0", "winch.planet.1", "winch.planet.2", "winch.spindle"]
  });

  // Base 1-Way Ratchet Ring (holds carrier stationary during 3.5:1 CCW reduction)
  reg.part("winch.ratchetRing", buildHorizontalGear(0.24, 16, 0.024, 0.055, 0.45), {
    parent: winchRoot,
    pos: [0, 0.108, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.winch.baseFlange",
    allowOverlap: ["winch.spindle", "winch.carrier"]
  });

  // 3-Arm Planet Carrier Plate + 3 Ratchet Pawls + 3 Meshing 15T Brass Planet Gears
  const carrierGroup = reg.group("winch.carrier.group", {
    parent: winchRoot,
    pos: [0, 0.235, 0],
    stage: "subject"
  });
  reg.part("winch.carrier", buildCylinderGeometry(0.41, 0.41, 0.055, { segments: 28, axis: "y" }), {
    parent: carrierGroup,
    pos: [0, -0.105, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.winch.baseFlange",
    allowOverlap: ["winch.spindle", "winch.ratchetRing"]
  });

  const orbitR = rSun + rPlanet; // 0.3375
  const planetGeo = buildHorizontalGear(rPlanet, planetTeeth, gearToothDepth, 0.16, 0.28);
  const planetPinGeo = buildCylinderGeometry(0.048, 0.048, 0.20, { segments: 14, axis: "y" });
  const pawlGeo = buildSlabGeometry(0.095, 0.036, 0.038, { radius: 0.01, bevel: false });

  [0, 1, 2].forEach((idx) => {
    // a_0 = 60° places planet 0 dead-center in the open ISO cutaway window AND gives exact 12T/42T integer tooth alignment
    const a = Math.PI / 3 + (idx * 2 * Math.PI) / 3;
    const px = Math.cos(a) * orbitR;
    const pz = Math.sin(a) * orbitR;

    // Visible spring-loaded brass ratchet pawl on carrier edge
    reg.part(`winch.pawl.${idx}`, pawlGeo, {
      parent: carrierGroup,
      pos: [Math.cos(a + 0.52) * 0.28, -0.055, Math.sin(a + 0.52) * 0.28],
      rot: [0, -(a + 0.52) + 0.45, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    const pOrbitGroup = reg.group(`winch.planet.orbit.${idx}`, {
      parent: carrierGroup,
      pos: [px, 0, pz],
      rot: [0, -a, 0], // Align local +X radially outward so tooth gap faces sun cleanly
      stage: "subject"
    });
    const pSpinGroup = reg.group(`winch.planet.spin.${idx}`, {
      parent: pOrbitGroup,
      stage: "subject"
    });

    reg.part(`winch.planet.pin.${idx}`, planetPinGeo, {
      parent: pSpinGroup,
      pos: [0, -0.015, 0],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });

    reg.part(`winch.planet.${idx}`, planetGeo, {
      parent: pSpinGroup,
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      explode: [0.18, 0.20, 0], // Explodes radially outward along local +X!
      mountOn: "winch.carrier",
      allowOverlap: ["winch.sunGear", "winch.ringGear", "winch.carrier", "struct.winch.housingCut", "struct.winch.frontShield"]
    });
  });

  // Rotating Winch Drum + 42T Internal Ring Gear + Self-Tailing Jaws Crown
  const drumGroup = reg.group("winch.drum.group", {
    parent: winchRoot,
    stage: "subject"
  });

  // 42T Internal Ring Gear around lower half of planets (y = 0.185, height = 0.068 so sun & planets rise cleanly above!)
  reg.part("winch.ringGear", buildHorizontalInternalGear(rRing + 0.068, rRing, ringTeeth, gearToothDepth, 0.068), {
    parent: drumGroup,
    pos: [0, 0.185, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    explode: [0, 0.34, 0],
    mountOn: "struct.winch.housingCut",
    allowOverlap: ["winch.planet.0", "winch.planet.1", "winch.planet.2", "struct.winch.housingCut", "struct.winch.frontShield"]
  });

  // 3 Drive Pillars connecting the rotating Ring Gear up to the Winch Drum Waist (leaves front cutaway wide open!)
  [0, 1, 2].forEach((idx) => {
    const a = Math.PI * 0.72 + (idx * 2 * Math.PI) / 3;
    reg.part(`winch.drivePost.${idx}`, buildCylinderGeometry(0.036, 0.036, 0.18, { segments: 12, axis: "y" }), {
      parent: drumGroup,
      pos: [Math.cos(a) * (rRing + 0.032), 0.31, Math.sin(a) * (rRing + 0.032)],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      explode: [0, 0.44, 0],
      mountOn: "winch.ringGear",
      allowOverlap: ["struct.winch.housingCut", "struct.winch.frontShield", "winch.drumFlangeLow"]
    });
  });

  // Lower Drum Skirt Collar (y = 0.39..0.44)
  reg.part("winch.drumFlangeLow", buildCylinderGeometry(0.49, 0.59, 0.055, { segments: 32, axis: "y" }), {
    parent: drumGroup,
    pos: [0, 0.415, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    explode: [0, 0.54, 0],
    mountOn: "winch.drivePost.0",
    allowOverlap: ["winch.spindle", "winch.drivePost.0", "winch.drivePost.1", "winch.drivePost.2"]
  });

  // Main Knurled Winch Drum Waist (y = 0.44..0.80)
  reg.part("winch.drum", buildCylinderGeometry(0.42, 0.49, 0.37, { segments: 32, axis: "y" }), {
    parent: drumGroup,
    pos: [0, 0.625, 0],
    ramp: "lit",
    outline: "hi",
    crease: "lo",
    explode: [0, 0.62, 0],
    mountOn: "winch.drumFlangeLow",
    allowOverlap: ["winch.spindle"]
  });
  reg.detail("winch.drum.knurl", makeKnurlLines(0.445, 0.47, 0.77, 26, kit, { tone: "lo" }), {
    parent: drumGroup
  });

  // Self-Tailing V-Groove Top Crown (lower flared jaw + upper jaw cap)
  reg.part("winch.crownBot", buildCylinderGeometry(0.55, 0.42, 0.065, { segments: 32, axis: "y" }), {
    parent: drumGroup,
    pos: [0, 0.84, 0],
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    explode: [0, 0.80, 0],
    mountOn: "winch.drum",
    allowOverlap: ["winch.spindle"]
  });
  reg.part("winch.crownTop", buildCylinderGeometry(0.55, 0.49, 0.065, { segments: 32, axis: "y" }), {
    parent: drumGroup,
    pos: [0, 0.905, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    explode: [0, 0.90, 0],
    mountOn: "winch.crownBot",
    allowOverlap: ["winch.spindle"]
  });
  const crownRing = makeRingLine(0.54, 32, kit, "hi");
  crownRing.rotation.x = Math.PI / 2;
  crownRing.position.y = 0.942;
  reg.detail("winch.crown.ring", crownRing, { parent: drumGroup });

  // Fixed Self-Tailing Stripper Horn peeling sheet cleanly out of the V-groove crown
  reg.part(
    "winch.stripperArm",
    buildSlabGeometry(0.11, 0.28, 0.055, { radius: 0.03, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: winchRoot,
      pos: [0.50, 0.915, 0.16],
      rot: [0, -0.32, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      explode: [0.24, 0.92, 0.12],
      mountOn: "winch.crownTop",
      allowOverlap: ["winch.crownBot", "winch.crownTop"]
    }
  );
  reg.part("winch.stripperHorn", buildCylinderGeometry(0.030, 0.038, 0.18, { segments: 12, axis: "y" }), {
    parent: winchRoot,
    pos: [0.61, 0.80, 0.11],
    rot: [0.12, 0, -0.22],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    explode: [0.24, 0.92, 0.12],
    mountOn: "winch.stripperArm"
  });

  // Removable Locking Winch Handle (top of spindle y = 1.01, rotated by handleRotY)
  const handleGroup = reg.group("winch.handle.group", {
    parent: winchRoot,
    pos: [0, 1.00, 0],
    stage: "subject"
  });
  reg.part("winch.handle.hub", buildCylinderGeometry(0.11, 0.12, 0.08, { segments: 20, axis: "y" }), {
    parent: handleGroup,
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    explode: [0, 1.06, 0],
    mountOn: "winch.spindle"
  });
  reg.part("winch.handle.latch", buildCylinderGeometry(0.048, 0.048, 0.03, { segments: 14, axis: "y" }), {
    parent: handleGroup,
    pos: [0, 0.052, 0],
    ramp: "comb",
    outline: "lo",
    crease: "faint",
    explode: [0, 1.06, 0],
    detail: true
  });
  reg.part(
    "winch.handle.arm",
    buildSlabGeometry(0.84, 0.11, 0.055, { radius: 0.045, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: handleGroup,
      pos: [0.40, 0.03, 0],
      ramp: "lit",
      outline: "hi",
      crease: "lo",
      explode: [0, 1.06, 0],
      mountOn: "winch.handle.hub"
    }
  );
  reg.part("winch.handle.grip", buildCylinderGeometry(0.062, 0.050, 0.23, { segments: 18, axis: "y" }), {
    parent: handleGroup,
    pos: [0.76, 0.145, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    explode: [0, 1.06, 0],
    mountOn: "winch.handle.arm"
  });

  // 2. Articulated Boom, Rigid Telescopic Vang & Mainsail Clew Fiddle Block
  const restRig = getRigState({ theta: SPEC.initialTheta, rpm: SPEC.initialRpm, wind: 18, trim: 58 });
  const boomGroup = reg.group("boom.group", {
    parent: subjectGroup,
    pos: [mastX + 0.09, boomY, mastZ],
    rot: [0, restRig.boomAngleY, 0],
    stage: "subject"
  });

  reg.part(
    "boom.gooseneck",
    buildSlabGeometry(0.15, 0.11, 0.11, { radius: 0.03, bevel: true, bevelSize: 0.008, bevelThickness: 0.008 }),
    {
      parent: boomGroup,
      pos: [0, 0.04, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.mast.spar"
    }
  );
  reg.part("boom.spar", buildCylinderGeometry(0.052, 0.068, boomLength, { segments: 20, axis: "x" }), {
    parent: boomGroup,
    pos: [boomLength * 0.5 + 0.04, 0, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    mountOn: "boom.gooseneck"
  });
  reg.part("boom.endCap", buildCylinderGeometry(0.056, 0.056, 0.05, { segments: 16, axis: "x" }), {
    parent: boomGroup,
    pos: [boomLength + 0.05, 0, 0],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    detail: true
  });

  // Rigid Telescopic Boom Vang Strut (mast base swivel -> boom underside)
  const vangAngle = Math.atan2(0.32, 0.54);
  reg.part("boom.vangBracket", buildCylinderGeometry(0.036, 0.042, 0.08, { segments: 12, axis: "y" }), {
    parent: boomGroup,
    pos: [0.02, -0.34, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "struct.mast.spar"
  });
  reg.part("boom.vangOuter", buildCylinderGeometry(0.032, 0.036, 0.36, { segments: 12, axis: "x" }), {
    parent: boomGroup,
    pos: [0.18, -0.26, 0],
    rot: [0, 0, vangAngle],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "boom.vangBracket"
  });
  reg.part("boom.vangRod", buildCylinderGeometry(0.020, 0.020, 0.30, { segments: 10, axis: "x" }), {
    parent: boomGroup,
    pos: [0.40, -0.13, 0],
    rot: [0, 0, vangAngle],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "boom.vangOuter"
  });

  // Boom Clew Mainsheet Block + Sheave
  reg.part(
    "boom.clewBlock",
    buildSlabGeometry(0.13, 0.07, 0.12, { radius: 0.025, bevel: true, bevelSize: 0.007, bevelThickness: 0.007 }),
    {
      parent: boomGroup,
      pos: [boomLength - 0.12, -0.04, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "boom.spar"
    }
  );
  reg.part("boom.clewSheave", buildCylinderGeometry(0.045, 0.045, 0.032, { segments: 14, axis: "z" }), {
    parent: boomGroup,
    pos: [boomLength - 0.12, -0.11, 0],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    detail: true
  });
  reg.anchor("boom.clew", boomLength - 0.12, -0.145, 0, boomGroup);
}
