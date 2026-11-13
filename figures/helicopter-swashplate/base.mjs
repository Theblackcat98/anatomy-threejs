import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makePlanOutline,
  makeScrewDetail,
  makeRulerTicks,
  makeHaloMesh
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });

  const { BASE_W, BASE_D, BASE_H, BASE_Y, topSurfaceY } = SPEC;

  // Soft ground shadow halo under bedplate
  const haloMesh = makeHaloMesh(BASE_W + 0.35, BASE_D + 0.35, 0.38, [0.08, BASE_Y - 0.24, 0.08], kit);
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
  reg.anchor("mast.center", ...ANCHORS.mastCenter, baseGroup);
  reg.anchor("servo.0.mount", ...ANCHORS.servo0Mount, baseGroup);
  reg.anchor("servo.1.mount", ...ANCHORS.servo1Mount, baseGroup);
  reg.anchor("servo.2.mount", ...ANCHORS.servo2Mount, baseGroup);
  reg.anchor("knob.mount", ...ANCHORS.knobMount, baseGroup);
  reg.anchor("manifold.mount", ...ANCHORS.manifoldMount, baseGroup);
  reg.anchor("gauge.mount", ...ANCHORS.gaugeMount, baseGroup);

  // Dual inset perimeter grooves
  reg.detail("base.groove.outer", makePlanOutline(BASE_W - 0.32, BASE_D - 0.32, 0.16, topSurfaceY + 0.003, kit, "faint"), {
    parent: baseGroup
  });
  reg.detail("base.groove.inner", makePlanOutline(BASE_W - 0.42, BASE_D - 0.42, 0.13, topSurfaceY + 0.003, kit, "faint"), {
    parent: baseGroup
  });

  // 4 Turned corner feet with collars, pads, and top counterbored screws
  const cornerOffsets = [
    [-BASE_W * 0.5 + 0.38, -BASE_D * 0.5 + 0.38],
    [ BASE_W * 0.5 - 0.38, -BASE_D * 0.5 + 0.38],
    [-BASE_W * 0.5 + 0.38,  BASE_D * 0.5 - 0.38],
    [ BASE_W * 0.5 - 0.38,  BASE_D * 0.5 - 0.38]
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

  // Graduated pitch/azimuth bench scale strip on front apron
  const rulerW = 1.88;
  const rulerD = 0.26;
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
    makeRulerTicks(rulerX, rulerW, rulerZ, rulerD, topSurfaceY + 0.032, 30, 5, kit),
    { parent: baseGroup }
  );

  // Brass specification plaque on front-left apron with rule lines and corner rivets
  const plaqueW = 1.16;
  const plaqueD = 0.44;
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
    new THREE.Vector3(plaqueX - 0.40, topSurfaceY + 0.038, plaqueZ - 0.09),
    new THREE.Vector3(plaqueX + 0.40, topSurfaceY + 0.038, plaqueZ - 0.09),
    new THREE.Vector3(plaqueX - 0.40, topSurfaceY + 0.038, plaqueZ + 0.02),
    new THREE.Vector3(plaqueX + 0.30, topSurfaceY + 0.038, plaqueZ + 0.02),
    new THREE.Vector3(plaqueX - 0.40, topSurfaceY + 0.038, plaqueZ + 0.12),
    new THREE.Vector3(plaqueX + 0.20, topSurfaceY + 0.038, plaqueZ + 0.12)
  ];
  reg.detail(
    "base.plaque.rules",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rulePts), kit.lineMaterials.lo),
    { parent: baseGroup }
  );

  [[-0.48, -0.15], [0.48, -0.15], [-0.48, 0.15], [0.48, 0.15]].forEach(([rx, rz], idx) => {
    const rDot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), kit.dotMaterials.dot);
    rDot.rotation.x = -Math.PI / 2;
    rDot.position.set(plaqueX + rx, topSurfaceY + 0.039, plaqueZ + rz);
    reg.detail(`base.plaque.rivet.${idx}`, rDot, { parent: baseGroup });
  });

  reg.tag("tag-plate", "MRH-3 · CCPM 120° · 4:1", plaqueX, topSurfaceY + 0.05, plaqueZ);
}
