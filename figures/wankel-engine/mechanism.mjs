import * as THREE from "three";
import {
  buildCylinderGeometry,
  makeRingLine,
  makeScrewDetail,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, getChamberState } from "./model.mjs";

function buildCounterweightGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.58, Math.PI * 0.55, Math.PI * 1.45, false);
  shape.absarc(0, 0, 0.23, Math.PI * 1.45, Math.PI * 0.55, true);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.13,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    curveSegments: 28
  });
  geo.translate(0, 0, -0.065);
  return geo;
}

export function buildMechanism(reg, kit) {
  const { e, depth, topSurfaceY } = SPEC;
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;

  // 1. Bench Throttle Control Knob
  const [knobBaseX, , knobBaseZ] = ANCHORS.knobMount;
  const bossGeo = buildCylinderGeometry(0.32, 0.35, 0.1, { segments: 28, axis: "y" });
  reg.part("knob.boss", bossGeo, {
    parent: baseGroup,
    pos: [knobBaseX, topSurfaceY + 0.05, knobBaseZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const throttleKnobGroup = reg.group("knob.group", {
    parent: baseGroup,
    pos: [knobBaseX, topSurfaceY + 0.22, knobBaseZ],
    stage: "mechanism"
  });

  const drumGeo = buildCylinderGeometry(0.25, 0.25, 0.24, { segments: 32, axis: "y" });
  reg.part("knob.drum", drumGeo, {
    parent: throttleKnobGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "knob.boss"
  });

  reg.detail(
    "knob.knurl",
    makeKnurlLines(0.25, -0.09, 0.09, 28, kit, {
      tone: "lo",
      pointer: { y: 0.123, z0: 0.07, z1: 0.23 }
    }),
    { parent: throttleKnobGroup }
  );
  reg.detail("knob.screw", makeScrewDetail(0, 0.123, 0, 0.07, "y", kit), {
    parent: throttleKnobGroup
  });
  reg.anchor("knob.top", 0, 0.12, 0, throttleKnobGroup);

  // 2. Ignition Coil Pack & Towers
  const [coilBoxX, , coilBoxZ] = ANCHORS.coilMount;
  const coilBoxGeo = new THREE.BoxGeometry(0.68, 0.46, 0.58);
  reg.part("coil.box", coilBoxGeo, {
    parent: baseGroup,
    pos: [coilBoxX, topSurfaceY + 0.23, coilBoxZ],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });

  ["leading", "trailing"].forEach((key, idx) => {
    const towerX = coilBoxX - 0.12 + idx * 0.24;
    const towerY = topSurfaceY + 0.51;
    const towerZ = coilBoxZ + (idx === 0 ? 0.12 : -0.12);

    const towerGeo = buildCylinderGeometry(0.065, 0.08, 0.14, { segments: 16, axis: "y" });
    const towerPart = reg.part(`coil.tower.${idx}`, towerGeo, {
      parent: baseGroup,
      pos: [towerX, towerY, towerZ],
      ramp: "copper",
      outline: "mid",
      crease: "faint",
      mountOn: "coil.box",
      allowOverlap: [`coil.tower.${idx === 0 ? 1 : 0}`]
    });

    reg.anchor(`coil.tower.${idx}.top`, 0, 0.07, 0, towerPart);

    const plugTipWorld = reg.getAnchorWorldPos(`plug.${key}.tip`);
    const p0y = towerY + 0.07;
    const waypoints = [
      [
        towerX + (plugTipWorld.x - towerX) * 0.38 + 0.03,
        p0y + (plugTipWorld.y - p0y) * 0.42,
        towerZ * 0.65
      ],
      [
        towerX + (plugTipWorld.x - towerX) * 0.74 + 0.04,
        p0y + (plugTipWorld.y - p0y) * 0.76,
        towerZ * 0.28
      ]
    ];

    reg.tube(`cable.spark.${key}`, `coil.tower.${idx}.top`, waypoints, `plug.${key}.tip`, {
      parent: baseGroup,
      radius: 0.032,
      ramp: idx === 0 ? "copper" : "mid",
      outline: "lo",
      fromPart: `coil.tower.${idx}`,
      toPart: `plug.${key}.boot`,
      allowOverlap: [
        "coil.box",
        "coil.tower.0",
        "coil.tower.1",
        "stator.housing",
        `plug.${key}.terminal`,
        `plug.${key}.insulator`,
        `plug.${key}.hex`,
        "cable.spark.leading",
        "cable.spark.trailing"
      ]
    });
  });

  // 3. Bourdon Chamber Pressure Gauge & Capillary Tube
  const [gaugeX, , gaugeZ] = ANCHORS.gaugeMount;
  const postCollarGeo = buildCylinderGeometry(0.18, 0.2, 0.12, { segments: 24, axis: "y" });
  reg.part("gauge.collar", postCollarGeo, {
    parent: baseGroup,
    pos: [gaugeX, topSurfaceY + 0.06, gaugeZ],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });

  const postGeo = buildCylinderGeometry(0.075, 0.09, 1.82, { segments: 20, axis: "y" });
  reg.part("gauge.post", postGeo, {
    parent: baseGroup,
    pos: [gaugeX, topSurfaceY + 0.91, gaugeZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "gauge.collar",
    allowOverlap: ["base.plate", "gauge.bezel"]
  });

  reg.anchor("gauge.tap", gaugeX, topSurfaceY + 1.48, gaugeZ, baseGroup);

  const gaugeHeadGroup = reg.group("gauge.head", {
    parent: baseGroup,
    pos: [gaugeX, topSurfaceY + 1.94, gaugeZ],
    stage: "mechanism"
  });

  const bezelGeo = buildCylinderGeometry(0.46, 0.46, 0.18, { segments: 36, axis: "z" });
  reg.part("gauge.bezel", bezelGeo, {
    parent: gaugeHeadGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "gauge.post"
  });
  reg.anchor("gauge.dial", 0, 0, 0.095, gaugeHeadGroup);

  const dialTickPts = [];
  for (let i = 0; i <= 20; i++) {
    const a = -Math.PI * 0.75 + (i / 20) * (Math.PI * 1.5);
    const rOuter = 0.37;
    const rInner = i % 5 === 0 ? 0.27 : 0.31;
    dialTickPts.push(
      new THREE.Vector3(Math.sin(a) * rInner, Math.cos(a) * rInner, 0.095),
      new THREE.Vector3(Math.sin(a) * rOuter, Math.cos(a) * rOuter, 0.095)
    );
  }
  reg.detail(
    "gauge.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dialTickPts), kit.lineMaterials.mid),
    { parent: gaugeHeadGroup }
  );

  const innerDialRing = makeRingLine(0.38, 32, kit, "lo");
  innerDialRing.position.z = 0.094;
  reg.detail("gauge.ring", innerDialRing, { parent: gaugeHeadGroup });

  const needleGroup = reg.group("gauge.needle", {
    parent: gaugeHeadGroup,
    pos: [0, 0, 0.1],
    stage: "mechanism"
  });
  const needlePts = [new THREE.Vector3(0, -0.07, 0), new THREE.Vector3(0, 0.33, 0)];
  const needleLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(needlePts), kit.lineMaterials.lit);
  const needleCap = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), kit.dotMaterials.lit);
  needleCap.position.z = 0.002;
  reg.detail("gauge.needle.line", needleLine, { parent: needleGroup });
  reg.detail("gauge.needle.cap", needleCap, { parent: needleGroup });

  reg.tag("tag-gauge", "BAR", gaugeX, topSurfaceY + 1.74, gaugeZ + 0.11);

  reg.tube(
    "tube.pressure.capillary",
    "gauge.tap",
    [[gaugeX + 0.28, 0.35, 0.22]],
    "stator.pressure.port",
    {
      parent: baseGroup,
      radius: 0.024,
      segments: 24,
      radialSegments: 10,
      ramp: "brass",
      outline: "lo",
      outlineWidth: 0.01,
      fromPart: "gauge.post",
      toPart: "stator.housing",
      allowOverlap: [
        "gauge.bezel",
        "rear.plate",
        "front.cover",
        "stator.intake.tube",
        "stator.exhaust.tube",
        "rotor.body",
        "rotor.apexSeal.0",
        "rotor.apexSeal.1",
        "rotor.apexSeal.2"
      ]
    }
  );

  // 4. Eccentric Output Shaft, Journal, Counterweights & Timing Pulley
  const shaftAssemblyGroup = reg.group("shaft.assembly", {
    explode: [0, 0, 0.68],
    stage: "mechanism"
  });

  const shaftSpinGroup = reg.group("shaft.spin", {
    parent: shaftAssemblyGroup,
    stage: "mechanism"
  });

  const mainShaftGeo = buildCylinderGeometry(0.18, 0.18, 2.45, { segments: 28, axis: "z" });
  reg.part("shaft.main", mainShaftGeo, {
    parent: shaftSpinGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    mountOn: "coaxial",
    allowOverlap: [
      "pedestal.rear.saddle",
      "pedestal.front.saddle",
      "pedestal.rear.column",
      "pedestal.front.column",
      "rear.plate",
      "rear.statGear",
      "stator.housing",
      "rotor.body",
      "rotor.internalGear",
      "front.cover"
    ]
  });

  const journalRadius = 3 * e - 0.195;
  const journalGeo = buildCylinderGeometry(journalRadius, journalRadius, depth * 0.62, {
    segments: 32,
    axis: "z"
  });
  reg.part("shaft.journal", journalGeo, {
    parent: shaftSpinGroup,
    pos: [e, 0, 0.06],
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    mountOn: "shaft.main",
    allowOverlap: [
      "rotor.body",
      "rotor.internalGear",
      "rear.statGear",
      "stator.housing",
      "front.cover",
      "rear.plate",
      "pedestal.front.saddle",
      "pedestal.front.column"
    ]
  });

  const oilHole = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), kit.dotMaterials.dot);
  oilHole.position.set(e + 0.12, 0, depth * 0.37 + 0.003);
  reg.detail("shaft.oilHole", oilHole, { parent: shaftSpinGroup });

  reg.part("shaft.rearWeight", buildCounterweightGeometry(), {
    parent: shaftSpinGroup,
    pos: [0, 0, -depth * 0.5 - 0.25],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "shaft.main",
    allowOverlap: [
      "rear.plate",
      "rear.statGear",
      "pedestal.rear.saddle",
      "pedestal.rear.column",
      "stator.housing",
      "rotor.body",
      "rotor.internalGear",
      "rotor.apexSeal.0",
      "rotor.apexSeal.1",
      "rotor.apexSeal.2"
    ]
  });

  reg.part("shaft.frontWeight", buildCounterweightGeometry(), {
    parent: shaftSpinGroup,
    pos: [0, 0, depth * 0.5 + 0.28],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "shaft.main",
    cutawayHide: true,
    allowOverlap: [
      "front.cover",
      "pedestal.front.saddle",
      "pedestal.front.column",
      "stator.housing"
    ]
  });

  const pulleyGroup = reg.group("shaft.pulleyGroup", {
    parent: shaftSpinGroup,
    pos: [0, 0, 1.18],
    cutawayHide: true,
    stage: "mechanism"
  });

  const pulleyGeo = buildCylinderGeometry(0.46, 0.46, 0.14, { segments: 36, axis: "z" });
  reg.part("shaft.pulley", pulleyGeo, {
    parent: pulleyGroup,
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "shaft.main",
    cutawayHide: true,
    allowOverlap: ["pedestal.front.saddle", "pedestal.front.column"]
  });

  const hubNutGeo = buildCylinderGeometry(0.13, 0.13, 0.19, { segments: 6, axis: "z" });
  reg.part("shaft.hubNut", hubNutGeo, {
    parent: pulleyGroup,
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "shaft.pulley",
    cutawayHide: true,
    allowOverlap: ["shaft.main", "pedestal.front.saddle"]
  });

  const pulleyMinorPts = [];
  const pulleyMajorPts = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const rOut = 0.43;
    const rIn = i % 3 === 0 ? 0.32 : 0.37;
    const target = i % 3 === 0 ? pulleyMajorPts : pulleyMinorPts;
    target.push(
      new THREE.Vector3(Math.cos(a) * rIn, Math.sin(a) * rIn, 0.073),
      new THREE.Vector3(Math.cos(a) * rOut, Math.sin(a) * rOut, 0.073)
    );
  }
  const ticksMinor = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pulleyMinorPts),
    kit.lineMaterials.lo
  );
  const ticksMajor = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pulleyMajorPts),
    kit.lineMaterials.hi
  );
  ticksMinor.userData.cutawayHide = true;
  ticksMajor.userData.cutawayHide = true;
  reg.detail("shaft.pulley.ticksMinor", ticksMinor, { parent: pulleyGroup });
  reg.detail("shaft.pulley.ticksMajor", ticksMajor, { parent: pulleyGroup });
}

export function updateKinematics(reg, state) {
  const { theta, rpm, shaderEnv } = state;
  const alpha = theta / 3;

  // 1. Update Rotor Orbit & Rotor Spin (exact 1:3 ratio)
  const rotorOrbit = reg.groups.get("rotor.orbit")?.group;
  const rotorSpin = reg.groups.get("rotor.spin")?.group;
  if (rotorOrbit) {
    rotorOrbit.position.x = SPEC.e * Math.cos(theta);
    rotorOrbit.position.y = SPEC.e * Math.sin(theta);
  }
  if (rotorSpin) {
    rotorSpin.rotation.z = alpha;
  }

  // 2. Update Eccentric Shaft & Counterweight rotation
  const shaftSpin = reg.groups.get("shaft.spin")?.group;
  if (shaftSpin) {
    shaftSpin.rotation.z = theta;
  }

  // 3. Update Throttle Knob rotation
  const knobGroup = reg.groups.get("knob.group")?.group;
  if (knobGroup) {
    knobGroup.rotation.y = -((rpm / 2400) * Math.PI * 1.5);
  }

  // 4. Update Chamber State, Bourdon Gauge Needle, & Shader Uniforms
  const chA = getChamberState(theta, 0);
  const gaugeAngle = Math.PI * 0.72 - Math.min(chA.pressure / 32, 1.0) * (Math.PI * 1.44);
  const needleGroup = reg.groups.get("gauge.needle")?.group;
  if (needleGroup) {
    needleGroup.rotation.z = gaugeAngle;
  }

  const shaderPlane = reg.root.getObjectByName("chamber.shaderPlane");
  if (shaderPlane && shaderPlane.material && shaderPlane.material.uniforms) {
    shaderPlane.material.uniforms.uTheta.value = theta;
    shaderPlane.material.uniforms.uEnvelope.value = shaderEnv;
  }
}
