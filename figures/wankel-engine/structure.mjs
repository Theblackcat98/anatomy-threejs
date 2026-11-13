import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, epitrochoidPoint } from "./model.mjs";

function buildEpitrochoidHousingGeometry(thickness) {
  const outerShape = new THREE.Shape();
  const segs = 128;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [ex, ey] = epitrochoidPoint(t, 0.42);
    if (i === 0) outerShape.moveTo(ex, ey);
    else outerShape.lineTo(ex, ey);
  }

  const borePath = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [bx, by] = epitrochoidPoint(t, 0.018);
    if (i === 0) borePath.moveTo(bx, by);
    else borePath.lineTo(bx, by);
  }
  outerShape.holes.push(borePath);

  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2 + 0.1;
    const deg = ((t * 180) / Math.PI) % 360;
    if ((deg > 130 && deg < 165) || (deg > 195 && deg < 230) || deg > 335 || deg < 25) continue;
    const [cx, cy] = epitrochoidPoint(t, 0.22);
    const hole = new THREE.Path();
    hole.absarc(cx, cy, 0.055, 0, Math.PI * 2, false);
    outerShape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(outerShape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    curveSegments: 64
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function buildRearEndPlateGeometry() {
  const shape = new THREE.Shape();
  const segs = 96;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [px, py] = epitrochoidPoint(t, 0.40);
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.25, 0, Math.PI * 2, false);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 48
  });
  geo.translate(0, 0, -0.08);
  return geo;
}

function buildFrontCoverRingGeometry() {
  const shape = new THREE.Shape();
  const segs = 96;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [px, py] = epitrochoidPoint(t, 0.40);
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  const windowHole = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [wx, wy] = epitrochoidPoint(t, 0.14);
    if (i === 0) windowHole.moveTo(wx, wy);
    else windowHole.lineTo(wx, wy);
  }
  shape.holes.push(windowHole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    curveSegments: 48
  });
  geo.translate(0, 0, -0.06);
  return geo;
}

export function buildStructure(reg, kit) {
  const { topSurfaceY, depth } = SPEC;
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;

  // 1. Support Pedestals (Rear & Front)
  [
    { tag: "rear", zPos: -0.98 },
    { tag: "front", zPos: 0.98 }
  ].forEach(({ tag, zPos }) => {
    const pedGroup = reg.group(`pedestal.${tag}`, {
      parent: baseGroup,
      pos: [0, 0, zPos],
      stage: "structure"
    });

    const flangeGeo = new THREE.BoxGeometry(1.75, 0.11, 0.42);
    reg.part(`pedestal.${tag}.flange`, flangeGeo, {
      parent: pedGroup,
      pos: [0, topSurfaceY + 0.055, 0],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "base.plate"
    });

    [-0.72, -0.35, 0.35, 0.72].forEach((bx, bIdx) => {
      reg.detail(
        `pedestal.${tag}.bolt.${bIdx}`,
        makeScrewDetail(bx, topSurfaceY + 0.112, 0, 0.048, "y", kit),
        { parent: pedGroup }
      );
    });

    const colShape = new THREE.Shape();
    colShape.moveTo(-0.58, topSurfaceY + 0.11);
    colShape.lineTo(0.58, topSurfaceY + 0.11);
    colShape.lineTo(0.34, -0.18);
    colShape.lineTo(-0.34, -0.18);
    colShape.closePath();

    const colGeo = new THREE.ExtrudeGeometry(colShape, { depth: 0.22, bevelEnabled: false });
    colGeo.translate(0, 0, -0.11);
    reg.part(`pedestal.${tag}.column`, colGeo, {
      parent: pedGroup,
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: `pedestal.${tag}.flange`
    });

    const saddleGeo = buildCylinderGeometry(0.38, 0.38, 0.28, { segments: 28, axis: "z" });
    reg.part(`pedestal.${tag}.saddle`, saddleGeo, {
      parent: pedGroup,
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: `pedestal.${tag}.column`,
      allowOverlap: ["shaft.main", "rear.plate", "front.cover", "shaft.rearWeight", "shaft.frontWeight"]
    });
  });

  // 2. Main Epitrochoid Stator Housing
  const statorGroup = reg.group("stator.group", { stage: "structure" });
  const housingGeo = buildEpitrochoidHousingGeometry(depth);
  reg.part("stator.housing", housingGeo, {
    parent: statorGroup,
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    creaseAngle: 22,
    outlineWidth: 0.02,
    mountOn: "ground",
    allowOverlap: ["rear.plate", "front.cover", "shaft.main", "shaft.journal", "rear.statGear"]
  });

  // Cooling fin loops around housing perimeter
  [-0.22, 0, 0.22].forEach((fz, idx) => {
    const finPts = [];
    const segs = 96;
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      const [fx, fy] = epitrochoidPoint(t, 0.435);
      finPts.push(new THREE.Vector3(fx, fy, fz));
    }
    const finLoop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(finPts), kit.lineMaterials.lo);
    reg.detail(`stator.fin.${idx}`, finLoop, { parent: statorGroup });
  });

  // Pressure tap anchor on housing upper-left lobe
  reg.anchor("stator.pressure.port", -1.35, 0.85, -0.18, statorGroup, {
    dir: [-0.78, 0.62, 0]
  });

  // 3. Intake Manifold (top-left lobe, pointing radially up-left)
  const [inX, inY] = epitrochoidPoint(2.42, 0.42);
  const intakeGroup = reg.group("stator.intake", {
    parent: statorGroup,
    pos: [inX - 0.14, inY + 0.14, 0],
    rot: [0, 0, 0.68],
    stage: "structure"
  });

  const intakeTubeGeo = buildCylinderGeometry(0.22, 0.2, 0.62, { segments: 24, axis: "y" });
  reg.part("stator.intake.tube", intakeTubeGeo, {
    parent: intakeGroup,
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.housing"
  });

  const intakeFlangeGeo = new THREE.BoxGeometry(0.64, 0.09, 0.62);
  reg.part("stator.intake.flange", intakeFlangeGeo, {
    parent: intakeGroup,
    pos: [0, 0.31, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.intake.tube"
  });

  const intakeBore = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), kit.dotMaterials.dot);
  intakeBore.rotation.x = -Math.PI / 2;
  intakeBore.position.set(0, 0.358, 0);
  reg.detail("stator.intake.bore", intakeBore, { parent: intakeGroup });
  reg.anchor("port.intake", 0, 0.35, 0, intakeGroup, { dir: [0, 1, 0] });

  // 4. Exhaust Manifold (bottom-left lobe, pointing radially down-left)
  const [exX, exY] = epitrochoidPoint(3.62, 0.42);
  const exhaustGroup = reg.group("stator.exhaust", {
    parent: statorGroup,
    pos: [exX - 0.16, exY - 0.08, 0],
    rot: [0, 0, 1.98],
    stage: "structure"
  });

  const exhTubeGeo = buildCylinderGeometry(0.21, 0.19, 0.66, { segments: 24, axis: "y" });
  reg.part("stator.exhaust.tube", exhTubeGeo, {
    parent: exhaustGroup,
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.housing"
  });

  const exhCollarGeo = buildCylinderGeometry(0.26, 0.26, 0.18, { segments: 24, axis: "y" });
  reg.part("stator.exhaust.collar", exhCollarGeo, {
    parent: exhaustGroup,
    pos: [0, 0.12, 0],
    ramp: "copper",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.exhaust.tube"
  });

  const exhFlangeGeo = buildCylinderGeometry(0.32, 0.32, 0.08, { segments: 24, axis: "y" });
  reg.part("stator.exhaust.flange", exhFlangeGeo, {
    parent: exhaustGroup,
    pos: [0, 0.33, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.exhaust.tube"
  });
  reg.anchor("port.exhaust", 0, 0.35, 0, exhaustGroup, { dir: [0, 1, 0] });

  // 5. Dual Spark Plugs (Leading & Trailing) with registered terminal anchors
  [
    { key: "leading", angleParam: -0.28, yOffset: -0.05 },
    { key: "trailing", angleParam: 0.28, yOffset: 0.05 }
  ].forEach(({ key, angleParam, yOffset }) => {
    const [wx, wy] = epitrochoidPoint(angleParam, 0.38);
    const spGroup = reg.group(`plug.${key}`, {
      parent: statorGroup,
      pos: [wx + 0.05, wy + yOffset, 0],
      rot: [0, 0, -Math.PI / 2 + angleParam * 0.35],
      stage: "structure"
    });

    const hexGeo = buildCylinderGeometry(0.14, 0.14, 0.18, { segments: 6, axis: "y" });
    reg.part(`plug.${key}.hex`, hexGeo, {
      parent: spGroup,
      pos: [0, 0.09, 0],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "stator.housing",
      allowOverlap: [`plug.${key === "leading" ? "trailing" : "leading"}.hex`]
    });

    const insGeo = buildCylinderGeometry(0.1, 0.105, 0.34, { segments: 20, axis: "y" });
    reg.part(`plug.${key}.insulator`, insGeo, {
      parent: spGroup,
      pos: [0, 0.35, 0],
      ramp: "hi",
      outline: "mid",
      crease: "faint",
      mountOn: `plug.${key}.hex`
    });

    [0.26, 0.35, 0.44].forEach((ry, rIdx) => {
      const rLoop = makeRingLine(0.104, 20, kit, "lo");
      rLoop.rotation.x = Math.PI / 2;
      rLoop.position.y = ry;
      reg.detail(`plug.${key}.rib.${rIdx}`, rLoop, { parent: spGroup });
    });

    const termGeo = buildCylinderGeometry(0.048, 0.048, 0.11, { segments: 16, axis: "y" });
    reg.part(`plug.${key}.terminal`, termGeo, {
      parent: spGroup,
      pos: [0, 0.56, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: `plug.${key}.insulator`
    });

    const bootGeo = buildCylinderGeometry(0.075, 0.065, 0.12, { segments: 16, axis: "y" });
    reg.part(`plug.${key}.boot`, bootGeo, {
      parent: spGroup,
      pos: [0, 0.62, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: `plug.${key}.terminal`
    });

    // Register exact 3D tip anchor so mechanism.mjs can route spark cables without magic numbers
    reg.anchor(`plug.${key}.tip`, 0, 0.68, 0, spGroup, { dir: [0, 1, 0] });
  });

  // 6. Rear Endplate & Stationary 34-Tooth Phasing Gear
  const rearPlateGroup = reg.group("rear.group", {
    explode: [0, 0, -0.95],
    stage: "structure"
  });

  reg.part("rear.plate", buildRearEndPlateGeometry(), {
    parent: rearPlateGroup,
    pos: [0, 0, -depth * 0.5 - 0.09],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.housing",
    allowOverlap: ["shaft.main", "shaft.rearWeight"]
  });

  const statPitchR = 2 * SPEC.e;
  const statGearGeo = buildExternalGearGeometry(statPitchR, SPEC.stationaryTeeth, 0.036, 0.34, 0.56);
  reg.part("rear.statGear", statGearGeo, {
    parent: rearPlateGroup,
    pos: [0, 0, -depth * 0.25],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    creaseAngle: 35,
    mountOn: "rear.plate",
    allowOverlap: [
      "rotor.body",
      "rotor.internalGear",
      "shaft.main",
      "shaft.journal",
      "pedestal.rear.saddle",
      "pedestal.rear.column"
    ]
  });
  reg.anchor("gear.mesh.point", statPitchR, 0, -depth * 0.25, rearPlateGroup);

  // 7. Front Cutaway Cover Ring
  const frontCoverGroup = reg.group("front.group", {
    explode: [0, 0, 1.12],
    stage: "structure"
  });

  reg.part("front.cover", buildFrontCoverRingGeometry(), {
    parent: frontCoverGroup,
    pos: [0, 0, depth * 0.5 + 0.07],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "stator.housing",
    allowOverlap: ["shaft.main", "shaft.frontWeight"]
  });

  // 8. Perimeter Tie Rods & Front Hex Nuts
  const tieBoltsGroup = reg.group("tieBolts.group", {
    explode: [0, 0, 1.38],
    stage: "structure"
  });

  const tieRodAngles = [0.38, 1.05, 1.95, 2.88, 3.4, 4.32, 5.22, 5.9];
  tieRodAngles.forEach((t, idx) => {
    const [bx, by] = epitrochoidPoint(t, 0.29);
    const rodGeo = buildCylinderGeometry(0.036, 0.036, depth + 0.44, { segments: 12, axis: "z" });
    reg.part(`stator.tieRod.${idx}`, rodGeo, {
      parent: statorGroup,
      pos: [bx, by, 0],
      ramp: "mid",
      outline: "lo",
      noCrease: true,
      outlineWidth: 0.01,
      mountOn: "stator.housing",
      detail: true
    });

    const nutGeo = buildCylinderGeometry(0.072, 0.072, 0.07, { segments: 6, axis: "z" });
    reg.part(`tieBolts.nut.${idx}`, nutGeo, {
      parent: tieBoltsGroup,
      pos: [bx, by, depth * 0.5 + 0.16],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      outlineWidth: 0.012,
      mountOn: "front.cover",
      detail: true
    });
  });
}
