import * as THREE from "three";
import {
  buildCylinderGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";

function buildHubYokeGeometry() {
  const shape = new THREE.Shape();
  const armR = SPEC.flapHingeR + 0.04;
  const armHalfW = 0.11;
  const hubR = 0.21;
  const segs = 36;

  // Build 3-arm rounded star yoke in XZ (shape XY -> rotateX(-PI/2) -> XZ)
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    // Smooth 3-lobed radius profile aligned with 0, 120, 240 deg
    const lobe = Math.pow(Math.max(0, Math.cos(1.5 * a)), 4);
    const r = hubR + (armR - hubR) * lobe + armHalfW * 0.15 * Math.cos(3 * a);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  pts.forEach(([x, y], idx) => {
    if (idx === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.135, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 24
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.07, 0);
  return geo;
}

function buildAirfoilBladeGeometry(spanLen, chord = 0.23, thickness = 0.044) {
  // Cambered NACA-style cross-section in YZ, extruded along +X
  const shape = new THREE.Shape();
  const halfC = chord * 0.5;
  const steps = 20;

  // Upper surface from leading edge (+halfC in z) to trailing edge (-halfC in z)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps; // 0 = LE, 1 = TE
    const z = halfC - u * chord;
    const yt = 5 * thickness * (
      0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u
    );
    const camber = 0.012 * Math.sin(u * Math.PI);
    const y = camber + yt;
    if (i === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  }
  // Lower surface back from TE to LE
  for (let i = steps - 1; i >= 0; i--) {
    const u = i / steps;
    const z = halfC - u * chord;
    const yt = 5 * thickness * (
      0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u
    );
    const camber = 0.012 * Math.sin(u * Math.PI);
    const y = camber - yt * 0.72;
    shape.lineTo(z, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: spanLen,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.008,
    curveSegments: 16
  });
  // Extrude is along +Z_shape; rotateY(+PI/2) maps +Z_shape -> +X_span, +X_shape -> -Z_chord
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildSubject(reg, kit) {
  const { numBlades, rotorR, flapHingeR, featherR, pitchHornZ, mastZ, hubY } = SPEC;

  const hubAssembly = reg.group("hub.assembly", {
    pos: [0, 0, mastZ],
    explode: [0, 0.66, 0],
    stage: "subject"
  });

  const hubSpinGroup = reg.group("hub.spin", {
    parent: hubAssembly,
    stage: "subject"
  });

  // 1. Central 3-arm Articulated Rotor Hub Yoke
  reg.part("hub.yoke", buildHubYokeGeometry(), {
    parent: hubSpinGroup,
    pos: [0, hubY, 0],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.019,
    mountOn: "coaxial",
    allowOverlap: [
      "mast.shaft",
      "hub.cap",
      "blade.flapPin.0",
      "blade.flapPin.1",
      "blade.flapPin.2",
      "blade.clevis.0",
      "blade.clevis.1",
      "blade.clevis.2"
    ]
  });

  // 2. Domed Brass Rotor Mast Cap & Retention Bolts
  const capGeo = buildCylinderGeometry(0.14, 0.20, 0.11, { segments: 24, axis: "y" });
  reg.part("hub.cap", capGeo, {
    parent: hubSpinGroup,
    pos: [0, hubY + 0.13, 0],
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    explode: [0, 0.24, 0],
    mountOn: "hub.yoke",
    allowOverlap: ["mast.shaft"]
  });

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    reg.detail(
      `hub.cap.bolt.${i}`,
      makeScrewDetail(Math.cos(a) * 0.11, hubY + 0.188, Math.sin(a) * 0.11, 0.022, "y", kit),
      { parent: hubSpinGroup }
    );
  }

  // 3. Three Articulated Rotor Blades (Flapping Hinge -> Feathering Cuff -> Pitch Horn -> Airfoil)
  const airfoilSpan = rotorR - featherR - 0.34;
  const airfoilGeo = buildAirfoilBladeGeometry(airfoilSpan, 0.23, 0.046);
  const tipCapGeo = buildAirfoilBladeGeometry(0.14, 0.21, 0.040);

  for (let k = 0; k < numBlades; k++) {
    const azimAngle = (k * 2 * Math.PI) / numBlades;
    const bladeAzimGroup = reg.group(`blade.azimuth.${k}`, {
      parent: hubSpinGroup,
      rot: [0, azimAngle, 0],
      explode: [Math.cos(azimAngle) * 0.24, 0.10, -Math.sin(azimAngle) * 0.24],
      stage: "subject"
    });

    // Horizontal brass flapping (coning) hinge pin
    const flapPinGeo = buildCylinderGeometry(0.032, 0.032, 0.21, { segments: 16, axis: "z" });
    reg.part(`blade.flapPin.${k}`, flapPinGeo, {
      parent: bladeAzimGroup,
      pos: [flapHingeR, hubY, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: "hub.yoke",
      allowOverlap: [`blade.clevis.${k}`, `blade.grip.${k}`]
    });

    // Flapping / Coning hinge group (rotates around local Z)
    const flapGroup = reg.group(`blade.flap.${k}`, {
      parent: bladeAzimGroup,
      pos: [flapHingeR, hubY, 0],
      stage: "subject"
    });

    // Articulated flapping yoke clevis
    const clevisGeo = new THREE.BoxGeometry(0.17, 0.11, 0.14);
    reg.part(`blade.clevis.${k}`, clevisGeo, {
      parent: flapGroup,
      pos: [0.06, 0, 0],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "hub.yoke",
      allowOverlap: [`blade.flapPin.${k}`, `blade.grip.${k}`]
    });

    // Lead-lag elastomeric damper strut beside clevis
    const damperGeo = buildCylinderGeometry(0.026, 0.026, 0.18, { segments: 12, axis: "x" });
    reg.part(`blade.damper.${k}`, damperGeo, {
      parent: flapGroup,
      pos: [0.08, 0.01, -0.095],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: `blade.clevis.${k}`
    });

    // Feathering / Pitch-change group (rotates around local X spanwise axis)
    const pitchGroup = reg.group(`blade.pitch.${k}`, {
      parent: flapGroup,
      pos: [featherR - flapHingeR, 0, 0],
      stage: "subject"
    });

    // Hero Lit Blade Retention Grip / Feathering Cuff
    const gripGeo = buildCylinderGeometry(0.064, 0.072, 0.25, { segments: 20, axis: "x" });
    reg.part(`blade.grip.${k}`, gripGeo, {
      parent: pitchGroup,
      pos: [0.10, 0, 0],
      ramp: "lit",
      outline: "lit",
      crease: "lo",
      outlineWidth: 0.018,
      mountOn: `blade.clevis.${k}`,
      allowOverlap: [`blade.pitchHorn.${k}`, `blade.airfoil.${k}`]
    });

    // Retention bolt details on grip top
    reg.detail(
      `blade.gripBolt.${k}`,
      makeScrewDetail(0.16, 0.068, 0, 0.026, "y", kit),
      { parent: pitchGroup }
    );

    // Brass Pitch Horn Arm projecting tangentially (+Z local) to meet Pitch Link
    const hornGeo = new THREE.BoxGeometry(0.065, 0.055, pitchHornZ + 0.04);
    reg.part(`blade.pitchHorn.${k}`, hornGeo, {
      parent: pitchGroup,
      pos: [0.08, -0.01, pitchHornZ * 0.5],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: `blade.grip.${k}`,
      allowOverlap: [`pitchLink.rod.${k}`, `pitchLink.topBall.${k}`]
    });

    // Anchor at exact pitch horn ball-joint center for Pitch Link kinematics & joint inspection
    reg.anchor(`blade.${k}.hornBall`, 0.08, -0.01, pitchHornZ, pitchGroup);

    // Hero Lit Swept Rotor Blade Airfoil
    reg.part(`blade.airfoil.${k}`, airfoilGeo, {
      parent: pitchGroup,
      pos: [0.21, 0, 0],
      ramp: "lit",
      outline: "lit",
      crease: "lo",
      creaseAngle: 30,
      outlineWidth: 0.020,
      topBias: 0.24,
      mountOn: `blade.grip.${k}`,
      allowOverlap: [`blade.tipCap.${k}`]
    });

    // High-contrast swept blade tip weight cap
    reg.part(`blade.tipCap.${k}`, tipCapGeo, {
      parent: pitchGroup,
      pos: [0.21 + airfoilSpan - 0.01, 0, 0],
      ramp: "hi",
      outline: "lit",
      crease: "lo",
      outlineWidth: 0.018,
      mountOn: `blade.airfoil.${k}`
    });

    // Spanwise leading-edge spar seam line along blade
    const sparPts = [
      new THREE.Vector3(0.22, 0.024, -0.055),
      new THREE.Vector3(0.21 + airfoilSpan + 0.12, 0.022, -0.052)
    ];
    reg.detail(
      `blade.sparLine.${k}`,
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(sparPts), kit.lineMaterials.lit),
      { parent: pitchGroup }
    );
  }
}
