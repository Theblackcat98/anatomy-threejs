import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makeHaloMesh,
  makePlanOutline,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });
  const { BASE_W, BASE_D, BASE_H, BASE_Y, topSurfaceY } = SPEC;

  const halo = makeHaloMesh(BASE_W + 0.3, BASE_D + 0.3, 0.34, [0, BASE_Y - 0.10, 0], kit);
  reg.detail("base.halo", halo, { parent: baseGroup, stage: "base" });

  // A compact appliance plinth grounds the cabinet without turning it into a bench rig.
  reg.part("base.plate", buildSlabGeometry(BASE_W, BASE_D, BASE_H, {
    radius: 0.28,
    bevel: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2
  }), {
    parent: baseGroup,
    pos: [0, BASE_Y + BASE_H, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    outlineWidth: 0.014,
    mountOn: "ground"
  });

  const corners = [
    [-BASE_W * 0.5 + 0.42, -BASE_D * 0.5 + 0.42],
    [ BASE_W * 0.5 - 0.42, -BASE_D * 0.5 + 0.42],
    [-BASE_W * 0.5 + 0.42,  BASE_D * 0.5 - 0.42],
    [ BASE_W * 0.5 - 0.42,  BASE_D * 0.5 - 0.42]
  ];
  corners.forEach(([x, z], i) => {
    const collarY = BASE_Y - 0.035;
    reg.part(`base.foot.collar.${i}`, buildCylinderGeometry(0.19, 0.19, 0.10, { axis: "y", segments: 24 }), {
      parent: baseGroup,
      pos: [x, collarY, z],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "base.plate"
    });
    reg.part(`base.foot.pad.${i}`, buildCylinderGeometry(0.22, 0.22, 0.09, { axis: "y", segments: 24 }), {
      parent: baseGroup,
      pos: [x, BASE_Y - 0.13, z],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: `base.foot.collar.${i}`
    });
    reg.detail(`base.foot.screw.${i}`, makeScrewDetail(x, topSurfaceY + 0.006, z, 0.055, "y", kit), { parent: baseGroup });
  });

  // Fine reveal around the plinth and two restrained front datum marks.
  reg.detail("base.outline", makePlanOutline(BASE_W - 0.20, BASE_D - 0.20, 0.20, topSurfaceY + 0.003, kit, "faint"), { parent: baseGroup });
  const markPts = [
    new THREE.Vector3(-0.42, topSurfaceY + 0.004, BASE_D * 0.5 - 0.34),
    new THREE.Vector3(0.42, topSurfaceY + 0.004, BASE_D * 0.5 - 0.34),
    new THREE.Vector3(-0.28, topSurfaceY + 0.004, BASE_D * 0.5 - 0.42),
    new THREE.Vector3(0.28, topSurfaceY + 0.004, BASE_D * 0.5 - 0.42)
  ];
  reg.detail("base.datum.marks", new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(markPts), kit.lineMaterials.lo), { parent: baseGroup });

  // Small brass maker’s plaque on the visible front shoulder.
  reg.part("base.plaque", new THREE.BoxGeometry(1.22, 0.035, 0.36), {
    parent: baseGroup,
    pos: [ANCHORS.plaqueCenter[0], topSurfaceY + 0.018, ANCHORS.plaqueCenter[2]],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "base.plate"
  });
  [[-0.52, -0.13], [0.52, -0.13], [-0.52, 0.13], [0.52, 0.13]].forEach(([dx, dz], i) => {
    const rivet = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), kit.dotMaterials.dot);
    rivet.rotation.x = -Math.PI / 2;
    rivet.position.set(ANCHORS.plaqueCenter[0] + dx, topSurfaceY + 0.039, ANCHORS.plaqueCenter[2] + dz);
    reg.detail(`base.plaque.rivet.${i}`, rivet, { parent: baseGroup });
  });
  reg.tag("tag-plate", "NO. 5 · QWERTY · ESCAPEMENT", ...ANCHORS.plaqueCenter);

  reg.anchor("base.top", ...ANCHORS.baseTop, baseGroup);
  reg.anchor("case.floor", ...ANCHORS.caseFloor, baseGroup);
  reg.anchor("plaque.center", ...ANCHORS.plaqueCenter, baseGroup);
}
