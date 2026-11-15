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

  // Soft ground shadow halo beneath bedplate
  const haloMesh = makeHaloMesh(BASE_W + 0.36, BASE_D + 0.36, 0.36, [0.06, BASE_Y - 0.22, 0.06], kit);
  reg.detail("base.halo", haloMesh, { parent: baseGroup, stage: "base" });

  // Precision beveled dynamometer test bedplate
  const baseGeo = buildSlabGeometry(BASE_W, BASE_D, BASE_H, {
    radius: 0.24,
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
    outlineWidth: 0.017,
    mountOn: "ground"
  });

  // Register base mounting anchors for downstream stages
  reg.anchor("base.top", ...ANCHORS.baseTop, baseGroup);
  reg.anchor("pedestal.front", ...ANCHORS.pedestalFront, baseGroup);
  reg.anchor("pedestal.rear", ...ANCHORS.pedestalRear, baseGroup);
  reg.anchor("turbo.mount.L", ...ANCHORS.turboMountL, baseGroup);
  reg.anchor("turbo.mount.R", ...ANCHORS.turboMountR, baseGroup);
  reg.anchor("throttle.mount", ...ANCHORS.throttleMount, baseGroup);
  reg.anchor("boostDial.mount", ...ANCHORS.boostDialMount, baseGroup);
  reg.anchor("dynoScreen.mount", ...ANCHORS.dynoScreenMount, baseGroup);

  // Dual perimeter datum grooves
  reg.detail(
    "base.groove.outer",
    makePlanOutline(BASE_W - 0.30, BASE_D - 0.30, 0.16, topSurfaceY + 0.003, kit, "faint"),
    { parent: baseGroup }
  );
  reg.detail(
    "base.groove.inner",
    makePlanOutline(BASE_W - 0.42, BASE_D - 0.42, 0.13, topSurfaceY + 0.003, kit, "faint"),
    { parent: baseGroup }
  );

  // Centerline datum crosshairs on deck under crankcase
  const datumPts = [
    new THREE.Vector3(-1.35, topSurfaceY + 0.003, 0),
    new THREE.Vector3( 1.35, topSurfaceY + 0.003, 0),
    new THREE.Vector3(0, topSurfaceY + 0.003, -1.25),
    new THREE.Vector3(0, topSurfaceY + 0.003,  1.25)
  ];
  reg.detail(
    "base.centerCross",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(datumPts), kit.lineMaterials.faint),
    { parent: baseGroup }
  );

  // 4 Turned leveling feet with isolation pads & counterbored deck bolts
  const cornerOffsets = [
    [-BASE_W * 0.5 + 0.34, -BASE_D * 0.5 + 0.34],
    [ BASE_W * 0.5 - 0.34, -BASE_D * 0.5 + 0.34],
    [-BASE_W * 0.5 + 0.34,  BASE_D * 0.5 - 0.34],
    [ BASE_W * 0.5 - 0.34,  BASE_D * 0.5 - 0.34]
  ];
  cornerOffsets.forEach(([cx, cz], idx) => {
    reg.part(`base.foot.collar.${idx}`, buildCylinderGeometry(0.20, 0.20, 0.11, { segments: 24, axis: "y" }), {
      parent: baseGroup,
      pos: [cx, BASE_Y - 0.055, cz],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "base.plate"
    });
    reg.part(`base.foot.pad.${idx}`, buildCylinderGeometry(0.25, 0.23, 0.07, { segments: 24, axis: "y" }), {
      parent: baseGroup,
      pos: [cx, BASE_Y - 0.145, cz],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: `base.foot.collar.${idx}`
    });
    reg.detail(`base.screw.${idx}`, makeScrewDetail(cx, topSurfaceY + 0.005, cz, 0.088, "y", kit), { parent: baseGroup });
  });

  // Graduated front datum ruler (centered cleanly between throttle lever & boost gauge)
  const [rx, , rz] = ANCHORS.rulerCenter;
  reg.detail("base.ruler", makeRulerTicks(rx, 1.15, rz, 0.12, topSurfaceY + 0.004, 15, 5, kit), {
    parent: baseGroup
  });

  // Front-left machined brass specification plaque
  const [pqX, , pqZ] = ANCHORS.plaqueCenter;
  const plaqueGeo = buildSlabGeometry(1.24, 0.32, 0.036, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  });
  reg.part("base.plaque", plaqueGeo, {
    parent: baseGroup,
    pos: [pqX, topSurfaceY + 0.036, pqZ],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  [[-0.51, -0.09], [0.51, -0.09], [-0.51, 0.09], [0.51, 0.09]].forEach(([dx, dz], idx) => {
    reg.detail(`base.plaque.screw.${idx}`, makeScrewDetail(pqX + dx, topSurfaceY + 0.045, pqZ + dz, 0.022, "y", kit), {
      parent: baseGroup
    });
  });

  reg.tag("tag-plate", "M64/60 · 3.6L F6 TT", pqX - 0.32, topSurfaceY + 0.01, pqZ + 0.25);
}
