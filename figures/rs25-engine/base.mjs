import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makePlanOutline,
  makeRingLine,
  makeScrewDetail,
  makeRulerTicks,
  makeHaloMesh
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });

  const { BASE_W, BASE_D, BASE_H, BASE_Y, topSurfaceY } = SPEC;

  // Soft ground shadow halo under bedplate
  const haloMesh = makeHaloMesh(BASE_W + 0.38, BASE_D + 0.38, 0.40, [0.08, BASE_Y - 0.24, 0.08], kit);
  reg.detail("base.halo", haloMesh, { parent: baseGroup, stage: "base" });

  // Heavy datum instrument bedplate
  const baseGeo = buildSlabGeometry(BASE_W, BASE_D, BASE_H, {
    radius: 0.26,
    bevel: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2
  });
  reg.part("base.plate", baseGeo, {
    parent: baseGroup,
    pos: [0, BASE_Y + BASE_H, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    outlineWidth: 0.018,
    mountOn: "ground"
  });

  // Register mounting anchors on base.plate for downstream stages
  reg.anchor("base.top", ...ANCHORS.baseTop, baseGroup);
  reg.anchor("deflector.center", ...ANCHORS.deflectorCenter, baseGroup);
  reg.anchor("gantry.mount.L", ...ANCHORS.gantryMountL, baseGroup);
  reg.anchor("gantry.mount.R", ...ANCHORS.gantryMountR, baseGroup);
  reg.anchor("tvcStick.mount", ...ANCHORS.tvcStickMount, baseGroup);
  reg.anchor("throttle.mount", ...ANCHORS.throttleMount, baseGroup);
  reg.anchor("gauge.mount", ...ANCHORS.gaugeMount, baseGroup);

  // Dual inset perimeter grooves
  reg.detail(
    "base.groove.outer",
    makePlanOutline(BASE_W - 0.32, BASE_D - 0.32, 0.16, topSurfaceY + 0.003, kit, "faint"),
    { parent: baseGroup }
  );
  reg.detail(
    "base.groove.inner",
    makePlanOutline(BASE_W - 0.44, BASE_D - 0.44, 0.13, topSurfaceY + 0.003, kit, "faint"),
    { parent: baseGroup }
  );

  // 4 Turned corner feet with collars, pads, and top counterbored screws
  const cornerOffsets = [
    [-BASE_W * 0.5 + 0.38, -BASE_D * 0.5 + 0.38],
    [BASE_W * 0.5 - 0.38, -BASE_D * 0.5 + 0.38],
    [-BASE_W * 0.5 + 0.38, BASE_D * 0.5 - 0.38],
    [BASE_W * 0.5 - 0.38, BASE_D * 0.5 - 0.38]
  ];
  cornerOffsets.forEach(([cx, cz], idx) => {
    const colGeo = buildCylinderGeometry(0.22, 0.22, 0.12, { segments: 24, axis: "y" });
    reg.part(`base.foot.collar.${idx}`, colGeo, {
      parent: baseGroup,
      pos: [cx, BASE_Y - 0.06, cz],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "base.plate"
    });

    const padGeo = buildCylinderGeometry(0.27, 0.25, 0.08, { segments: 24, axis: "y" });
    reg.part(`base.foot.pad.${idx}`, padGeo, {
      parent: baseGroup,
      pos: [cx, BASE_Y - 0.16, cz],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: `base.foot.collar.${idx}`
    });

    reg.detail(
      `base.screw.${idx}`,
      makeScrewDetail(cx, topSurfaceY + 0.005, cz, 0.095, "y", kit),
      { parent: baseGroup }
    );
  });

  // Refractory Flame-Trench Blast Deflector Pad under the nozzle
  const [defX, , defZ] = ANCHORS.deflectorCenter;
  const defRimGeo = buildCylinderGeometry(0.92, 1.02, 0.06, { segments: 36, axis: "y" });
  reg.part("base.deflector.rim", defRimGeo, {
    parent: baseGroup,
    pos: [defX, topSurfaceY + 0.03, defZ],
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "base.plate"
  });

  const defCoreGeo = buildCylinderGeometry(0.72, 0.78, 0.035, { segments: 32, axis: "y" });
  reg.part("base.deflector.core", defCoreGeo, {
    parent: baseGroup,
    pos: [defX, topSurfaceY + 0.075, defZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "base.deflector.rim"
  });

  // Concentric calibration rings and crosshairs on blast deflector
  const ringOuter = makeRingLine(0.64, 36, kit, "lo");
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.set(defX, topSurfaceY + 0.095, defZ);
  reg.detail("base.deflector.ringOuter", ringOuter, { parent: baseGroup });

  const ringInner = makeRingLine(0.36, 28, kit, "faint");
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.set(defX, topSurfaceY + 0.095, defZ);
  reg.detail("base.deflector.ringInner", ringInner, { parent: baseGroup });

  const defCrossPts = [
    new THREE.Vector3(defX - 0.68, topSurfaceY + 0.095, defZ),
    new THREE.Vector3(defX + 0.68, topSurfaceY + 0.095, defZ),
    new THREE.Vector3(defX, topSurfaceY + 0.095, defZ - 0.68),
    new THREE.Vector3(defX, topSurfaceY + 0.095, defZ + 0.68)
  ];
  reg.detail(
    "base.deflector.cross",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(defCrossPts), kit.lineMaterials.lo),
    { parent: baseGroup }
  );

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    reg.detail(
      `base.deflector.bolt.${i}`,
      makeScrewDetail(defX + Math.cos(a) * 0.85, topSurfaceY + 0.063, defZ + Math.sin(a) * 0.85, 0.036, "y", kit),
      { parent: baseGroup }
    );
  }

  // Cryogenic LH2 Supply Manifold Block (rear-left)
  const [lh2X, , lh2Z] = ANCHORS.lh2Manifold;
  const lh2BlockGeo = new THREE.BoxGeometry(0.42, 0.22, 0.42);
  reg.part("base.lh2.manifold", lh2BlockGeo, {
    parent: baseGroup,
    pos: [lh2X, topSurfaceY + 0.11, lh2Z],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  const lh2FlangeGeo = buildCylinderGeometry(0.13, 0.15, 0.08, { segments: 20, axis: "y" });
  reg.part("base.lh2.flange", lh2FlangeGeo, {
    parent: baseGroup,
    pos: [lh2X, topSurfaceY + 0.26, lh2Z],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "base.lh2.manifold"
  });
  reg.anchor("lh2.supply.out", lh2X, topSurfaceY + 0.295, lh2Z, baseGroup, { dir: [0, 1, 0] });
  [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([bx, bz], i) => {
    reg.detail(
      `base.lh2.bolt.${i}`,
      makeScrewDetail(lh2X + bx, topSurfaceY + 0.223, lh2Z + bz, 0.028, "y", kit),
      { parent: baseGroup }
    );
  });

  // Cryogenic LOX Supply Manifold Block (rear-right)
  const [loxX, , loxZ] = ANCHORS.loxManifold;
  const loxBlockGeo = new THREE.BoxGeometry(0.42, 0.22, 0.42);
  reg.part("base.lox.manifold", loxBlockGeo, {
    parent: baseGroup,
    pos: [loxX, topSurfaceY + 0.11, loxZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  const loxFlangeGeo = buildCylinderGeometry(0.13, 0.15, 0.08, { segments: 20, axis: "y" });
  reg.part("base.lox.flange", loxFlangeGeo, {
    parent: baseGroup,
    pos: [loxX, topSurfaceY + 0.26, loxZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "base.lox.manifold"
  });
  reg.anchor("lox.supply.out", loxX, topSurfaceY + 0.295, loxZ, baseGroup, { dir: [0, 1, 0] });
  [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([bx, bz], i) => {
    reg.detail(
      `base.lox.bolt.${i}`,
      makeScrewDetail(loxX + bx, topSurfaceY + 0.223, loxZ + bz, 0.028, "y", kit),
      { parent: baseGroup }
    );
  });

  // Hydraulic Power Unit (HPU) Manifold Block for TVC Actuators (mid-left)
  const [hpuX, , hpuZ] = ANCHORS.hpuMount;
  const hpuGeo = new THREE.BoxGeometry(0.36, 0.19, 0.40);
  reg.part("base.hpu.box", hpuGeo, {
    parent: baseGroup,
    pos: [hpuX, topSurfaceY + 0.095, hpuZ],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  const hpuPortGeo = buildCylinderGeometry(0.055, 0.065, 0.07, { segments: 16, axis: "y" });
  reg.part("base.hpu.port.0", hpuPortGeo, {
    parent: baseGroup,
    pos: [hpuX, topSurfaceY + 0.225, hpuZ - 0.10],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "base.hpu.box"
  });
  reg.part("base.hpu.port.1", hpuPortGeo, {
    parent: baseGroup,
    pos: [hpuX, topSurfaceY + 0.225, hpuZ + 0.10],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "base.hpu.box"
  });
  reg.anchor("hpu.pitch.out", hpuX, topSurfaceY + 0.258, hpuZ - 0.10, baseGroup, { dir: [0, 1, 0] });
  reg.anchor("hpu.yaw.out", hpuX, topSurfaceY + 0.258, hpuZ + 0.10, baseGroup, { dir: [0, 1, 0] });

  // Graduated Bench Scale Strip on front apron
  const rulerW = 1.40;
  const rulerD = 0.24;
  const [rulerX, , rulerZ] = ANCHORS.rulerCenter;
  const rulerGeo = new THREE.BoxGeometry(rulerW, 0.03, rulerD);
  reg.part("base.ruler", rulerGeo, {
    parent: baseGroup,
    pos: [rulerX, topSurfaceY + 0.015, rulerZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "base.plate"
  });
  reg.detail(
    "base.ruler.ticks",
    makeRulerTicks(rulerX, rulerW, rulerZ, rulerD, topSurfaceY + 0.032, 25, 5, kit),
    { parent: baseGroup }
  );

  // Brass Specification Plaque on front apron
  const plaqueW = 1.24;
  const plaqueD = 0.42;
  const [plaqueX, , plaqueZ] = ANCHORS.plaqueCenter;
  const plaqueGeo = new THREE.BoxGeometry(plaqueW, 0.035, plaqueD);
  reg.part("base.plaque", plaqueGeo, {
    parent: baseGroup,
    pos: [plaqueX, topSurfaceY + 0.018, plaqueZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "base.plate"
  });

  const rulePts = [
    new THREE.Vector3(plaqueX - 0.44, topSurfaceY + 0.038, plaqueZ - 0.09),
    new THREE.Vector3(plaqueX + 0.44, topSurfaceY + 0.038, plaqueZ - 0.09),
    new THREE.Vector3(plaqueX - 0.44, topSurfaceY + 0.038, plaqueZ + 0.02),
    new THREE.Vector3(plaqueX + 0.34, topSurfaceY + 0.038, plaqueZ + 0.02),
    new THREE.Vector3(plaqueX - 0.44, topSurfaceY + 0.038, plaqueZ + 0.12),
    new THREE.Vector3(plaqueX + 0.24, topSurfaceY + 0.038, plaqueZ + 0.12)
  ];
  reg.detail(
    "base.plaque.rules",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rulePts), kit.lineMaterials.lo),
    { parent: baseGroup }
  );

  [[-0.52, -0.15], [0.52, -0.15], [-0.52, 0.15], [0.52, 0.15]].forEach(([rx, rz], idx) => {
    const rDot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), kit.dotMaterials.dot);
    rDot.rotation.x = -Math.PI / 2;
    rDot.position.set(plaqueX + rx, topSurfaceY + 0.039, plaqueZ + rz);
    reg.detail(`base.plaque.rivet.${idx}`, rDot, { parent: baseGroup });
  });

  reg.tag("tag-plate", "RS-25D · 77.5:1", plaqueX, topSurfaceY + 0.05, plaqueZ);
}
