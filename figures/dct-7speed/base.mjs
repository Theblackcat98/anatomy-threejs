import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makeDatumGrid,
  makeScrewDetail,
  makeRulerTicks,
  makeHaloMesh
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });
  const { BASE_Y, railTopY } = SPEC;

  // 1. Subtle Blueprint Datum Grid & Soft Ground Shadow Halo (plateless dyno cradle)
  reg.detail("base.halo", makeHaloMesh(5.3, 3.3, 0.36, [0.10, BASE_Y - 0.02, 0.24], kit), {
    parent: baseGroup,
    stage: "base"
  });
  reg.detail("base.grid", makeDatumGrid(5.8, 3.6, 14, 9, BASE_Y, kit, "faint"), {
    parent: baseGroup,
    stage: "base"
  });

  // 2. Longitudinal Dyno Test-Bed Rails (back z=-0.66, front z=+0.66; x = -1.78 .. +2.26)
  const railLen = 4.04;
  const railCenterX = 0.24;
  const padH = 0.06;
  const railH = railTopY - (BASE_Y + padH); // 0.14
  const railCenterY = BASE_Y + padH + railH * 0.5;
  const railZs = [-0.66, 0.66];
  const railNames = ["back", "front"];

  railZs.forEach((rz, idx) => {
    const rName = `base.rail.${railNames[idx]}`;
    reg.part(rName, buildSlabGeometry(railLen, 0.18, railH - 0.02, {
      radius: 0.04,
      bevel: true,
      bevelSize: 0.01,
      bevelThickness: 0.01,
      bevelSegments: 1
    }), {
      parent: baseGroup,
      pos: [railCenterX, railTopY - 0.01, rz],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: `base.foot.${railNames[idx]}.0`,
      allowOverlap: [`base.foot.${railNames[idx]}.1`]
    });

    // Machined corner leveling pads grounding the dyno cradle onto BASE_Y
    [-1.58, 2.06].forEach((fx, fi) => {
      const fId = `base.foot.${railNames[idx]}.${fi}`;
      reg.part(fId, buildCylinderGeometry(0.15, 0.17, padH, { segments: 20, axis: "y" }), {
        parent: baseGroup,
        pos: [fx, BASE_Y + padH * 0.5, rz],
        ramp: "mid",
        outline: "lo",
        crease: "faint",
        mountOn: "ground"
      });
      reg.detail(`base.foot.screw.${idx}.${fi}`, makeScrewDetail(fx, railTopY + 0.002, rz, 0.045, "y", kit), {
        parent: baseGroup
      });
    });
  });

  // 3. Cross-Tie Dyno Bridge Beams spanning back-to-front rails
  const ties = [
    { id: "front", x: ANCHORS.cradleFrontMount[0], w: 0.24 },
    { id: "mid", x: ANCHORS.cradleMidMount[0], w: 0.20 },
    { id: "rear", x: ANCHORS.cradleRearMount[0], w: 0.24 }
  ];
  ties.forEach((t) => {
    reg.part(`base.tie.${t.id}`, new THREE.BoxGeometry(t.w, railH * 0.78, 1.32), {
      parent: baseGroup,
      pos: [t.x, railCenterY, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: "base.rail.front",
      allowOverlap: ["base.rail.back"]
    });
  });

  // 4. Compact Front Outrigger Arms & Instrument Mounting Pads (cleanly separated along X)
  const padTopY = BASE_Y + 0.11;
  const padSlabH = 0.09;

  // Outrigger Arm A: Left Plaque & Sequential Gate Pad (x = -2.12 plaque, -1.14 paddle)
  reg.part("base.arm.plaque", new THREE.BoxGeometry(0.14, 0.07, 0.72), {
    parent: baseGroup,
    pos: [-1.74, BASE_Y + 0.065, 0.96],
    rot: [0, 0.42, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.rail.front",
    allowOverlap: ["base.plaquePad"]
  });
  const [pqX, , pqZ] = ANCHORS.plaqueCenter;
  reg.part("base.plaquePad", buildSlabGeometry(1.16, 0.40, padSlabH, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  }), {
    parent: baseGroup,
    pos: [pqX, padTopY - 0.008, pqZ],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.arm.plaque"
  });

  // Brass Specification Plaque (cleanly isolated from shift gate)
  reg.part("base.plaque", buildSlabGeometry(1.06, 0.30, 0.032, {
    radius: 0.04,
    bevel: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 1
  }), {
    parent: baseGroup,
    pos: [pqX, padTopY + 0.032, pqZ],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plaquePad"
  });
  [[-0.42, -0.09], [0.42, -0.09], [-0.42, 0.09], [0.42, 0.09]].forEach(([dx, dz], i) => {
    reg.detail(`base.plaque.screw.${i}`, makeScrewDetail(pqX + dx, padTopY + 0.04, pqZ + dz, 0.02, "y", kit), {
      parent: baseGroup
    });
  });
  reg.tag("tag-plate", "7-DCT · WET", pqX - 0.04, padTopY + 0.045, pqZ + 0.03);

  // Outrigger Arm B: Selector Paddle Pad
  const [pdX, , pdZ] = ANCHORS.paddleMount;
  reg.part("base.arm.paddle", new THREE.BoxGeometry(0.16, 0.08, 0.66), {
    parent: baseGroup,
    pos: [pdX, BASE_Y + 0.07, (0.66 + pdZ) * 0.5],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.rail.front",
    allowOverlap: ["base.paddlePad"]
  });
  reg.part("base.paddlePad", buildSlabGeometry(0.62, 0.44, padSlabH, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  }), {
    parent: baseGroup,
    pos: [pdX, padTopY - 0.008, pdZ],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.arm.paddle"
  });

  // Outrigger Arm C: Mechatronics Valve-Body Deck
  const [mcX, , mcZ] = ANCHORS.mechatronicsMount;
  [-0.36, 0.36].forEach((ox, i) => {
    reg.part(`base.arm.mecha.${i}`, new THREE.BoxGeometry(0.16, 0.08, 0.52), {
      parent: baseGroup,
      pos: [mcX + ox, BASE_Y + 0.07, (0.66 + mcZ) * 0.5],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: "base.rail.front",
      allowOverlap: ["base.mechaPad"]
    });
  });
  reg.part("base.mechaPad", buildSlabGeometry(1.36, 0.66, padSlabH, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  }), {
    parent: baseGroup,
    pos: [mcX, padTopY - 0.008, mcZ],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.arm.mecha.0",
    allowOverlap: ["base.arm.mecha.1"]
  });

  // Outrigger Arm D: Telemetry Screen Pad
  const [scX, , scZ] = ANCHORS.screenMount;
  reg.part("base.arm.screen", new THREE.BoxGeometry(0.18, 0.08, 0.92), {
    parent: baseGroup,
    pos: [scX, BASE_Y + 0.07, (0.66 + scZ) * 0.5],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.rail.front",
    allowOverlap: ["base.screenPad"]
  });
  reg.part("base.screenPad", buildSlabGeometry(0.56, 0.44, padSlabH, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  }), {
    parent: baseGroup,
    pos: [scX, padTopY - 0.008, scZ],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.arm.screen"
  });

  // Front Datum Scale Ruler
  const [rx, , rz] = ANCHORS.rulerCenter;
  reg.detail("base.ruler", makeRulerTicks(rx, 2.2, rz, 0.14, BASE_Y + 0.004, 22, 5, kit), {
    parent: baseGroup
  });

  // Register Mounting Anchors
  reg.anchor("cradle.front", ...ANCHORS.cradleFrontMount, baseGroup);
  reg.anchor("cradle.mid", ...ANCHORS.cradleMidMount, baseGroup);
  reg.anchor("cradle.rear", ...ANCHORS.cradleRearMount, baseGroup);
  reg.anchor("mechatronics.mount", mcX, padTopY, mcZ, baseGroup);
  reg.anchor("paddle.mount", pdX, padTopY, pdZ, baseGroup);
  reg.anchor("screen.mount", scX, padTopY, scZ, baseGroup);
}
