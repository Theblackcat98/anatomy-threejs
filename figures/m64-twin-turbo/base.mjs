import * as THREE from "three";
import { SPEC } from "./model.mjs";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makePlanOutline,
  makeScrewDetail,
  makeHaloMesh,
  makeDatumGrid
} from "../../kit/primitives.mjs";

export function buildBase(reg, kit) {
  const gBase = reg.group("base", { stage: "base" });
  const floorY = SPEC.FLOOR_Y;

  // Ground datum halo, subtle grid & gantry footprint outline
  reg.detail("base.halo", makeHaloMesh(4.10, 3.25, 0.24, [0, floorY, 0.08], kit), { parent: gBase, stage: "base" });
  reg.detail("base.datumGrid", makeDatumGrid(4.00, 3.10, 10, 8, floorY + 0.002, kit, "faint"), { parent: gBase, stage: "base" });
  reg.detail("base.planOutline", makePlanOutline(SPEC.CRADLE_W, SPEC.CRADLE_D, 0.14, floorY + 0.004, kit, "faint"), {
    parent: gBase,
    stage: "base"
  });

  // 4 Machined Levelling Feet resting directly on FLOOR_Y (-1.68 .. -1.56)
  const footX = 1.48;
  const footZf = 0.96;
  const footZr = -1.02;
  const footPos = [
    ["fl", -footX, footZf],
    ["fr", footX, footZf],
    ["rl", -footX, footZr],
    ["rr", footX, footZr]
  ];
  const footGeo = buildCylinderGeometry(0.125, 0.155, 0.12, { segments: 24, axis: "y" });
  const footCollarGeo = buildCylinderGeometry(0.095, 0.11, 0.03, { segments: 20, axis: "y" });

  for (const [id, x, z] of footPos) {
    reg.part(`base.foot.${id}`, footGeo, {
      parent: gBase,
      pos: [x, floorY + 0.06, z],
      ramp: "lo",
      mountOn: "ground"
    });
    reg.part(`base.footCollar.${id}`, footCollarGeo, {
      parent: gBase,
      pos: [x, floorY + 0.135, z],
      ramp: "mid",
      detail: true,
      mountOn: `base.foot.${id}`
    });
    reg.detail(`base.footBolt.${id}`, makeScrewDetail(x, floorY + 0.15, z, 0.034, "y", kit), {
      parent: gBase,
      stage: "base"
    });
  }

  // Open tubular dyno cradle side rails (left & right, y ∈ [-1.56, -1.44])
  const railZCenter = (footZf + footZr) * 0.5;
  const railLen = footZf - footZr + 0.24;
  const railGeo = buildSlabGeometry(0.15, railLen, 0.10, {
    radius: 0.04,
    bevel: true,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    centerY: true
  });

  reg.part("base.rail.L", railGeo, {
    parent: gBase,
    pos: [-footX, -1.50, railZCenter],
    ramp: "mid",
    mountOn: "base.foot.fl",
    allowOverlap: ["base.foot.rl", "base.footCollar.fl", "base.footCollar.rl"]
  });
  reg.part("base.rail.R", railGeo, {
    parent: gBase,
    pos: [footX, -1.50, railZCenter],
    ramp: "mid",
    mountOn: "base.foot.fr",
    allowOverlap: ["base.foot.rr", "base.footCollar.fr", "base.footCollar.rr"]
  });

  // Transverse cradle crossbeams (spanning between inner rail faces, y ∈ [-1.56, -1.44])
  const crossGeo = buildSlabGeometry(footX * 2 - 0.14, 0.13, 0.10, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    centerY: true
  });
  reg.part("base.cross.front", crossGeo, {
    parent: gBase,
    pos: [0, -1.50, footZf],
    ramp: "mid",
    mountOn: "base.rail.L",
    allowOverlap: ["base.rail.R"]
  });
  reg.part("base.cross.rear", crossGeo, {
    parent: gBase,
    pos: [0, -1.50, footZr],
    ramp: "mid",
    mountOn: "base.rail.L",
    allowOverlap: ["base.rail.R"]
  });

  // 4 Tubular Crankcase Stanchions (|x| = 0.34, well inboard of under-bank headers & K16 turbos)
  // Span vertically from top of crossbeams (-1.44) to bottom of crankcase (-0.38)
  const stanchionX = 0.34;
  const stanchionH = 1.06;
  const stanchionY = -1.44 + stanchionH * 0.5; // -0.91
  const stanchionGeo = buildCylinderGeometry(0.052, 0.058, stanchionH, { segments: 20, axis: "y" });
  const saddleGeo = buildSlabGeometry(0.15, 0.15, 0.032, {
    radius: 0.025,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    centerY: true
  });

  const stanchions = [
    ["fl", -stanchionX, footZf, "base.cross.front"],
    ["fr", stanchionX, footZf, "base.cross.front"],
    ["rl", -stanchionX, footZr, "base.cross.rear"],
    ["rr", stanchionX, footZr, "base.cross.rear"]
  ];
  for (const [id, x, z, crossPart] of stanchions) {
    reg.part(`base.stanchion.${id}`, stanchionGeo, {
      parent: gBase,
      pos: [x, stanchionY, z],
      ramp: "lo",
      mountOn: crossPart
    });
    reg.part(`base.stanchionFoot.${id}`, saddleGeo, {
      parent: gBase,
      pos: [x, -1.42, z],
      ramp: "mid",
      detail: true,
      mountOn: `base.stanchion.${id}`,
      allowOverlap: [crossPart]
    });
    reg.part(`base.stanchionCap.${id}`, saddleGeo, {
      parent: gBase,
      pos: [x, -0.395, z],
      ramp: "mid",
      detail: true,
      mountOn: `base.stanchion.${id}`
    });
  }

  // Front Cantilever Console Apron (supports Bosch Motronic telemetry screen + brass M64/60 plaque)
  const armGeo = buildSlabGeometry(0.09, 0.44, 0.06, {
    radius: 0.02,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    centerY: true
  });
  reg.part("base.apronArm.L", armGeo, {
    parent: gBase,
    pos: [-0.84, -1.535, 1.18],
    rot: [0.06, 0, 0],
    ramp: "lo",
    mountOn: "base.cross.front"
  });
  reg.part("base.apronArm.R", armGeo, {
    parent: gBase,
    pos: [0.84, -1.535, 1.18],
    rot: [0.06, 0, 0],
    ramp: "lo",
    mountOn: "base.cross.front"
  });

  const apronTilt = 0.30;
  const apronGeo = buildSlabGeometry(2.32, 0.42, 0.07, {
    radius: 0.06,
    bevel: true,
    bevelSize: 0.014,
    bevelThickness: 0.012,
    centerY: true
  });
  reg.part("base.frontApron", apronGeo, {
    parent: gBase,
    pos: [0.0, -1.555, 1.58],
    rot: [apronTilt, 0, 0],
    ramp: "mid",
    mountOn: "base.apronArm.L",
    allowOverlap: ["base.apronArm.R"]
  });

  // Brass M64/60 Engine Specification Plaque flush on right wing of front console apron
  const cosA = Math.cos(apronTilt);
  const sinA = Math.sin(apronTilt);
  const plaqueLift = 0.047 + 0.012; // apron half-h (0.047) + plaque half-h (0.014) - 0.002 seat
  const plaqueGeo = buildSlabGeometry(0.76, 0.28, 0.018, {
    radius: 0.025,
    bevel: true,
    bevelSize: 0.006,
    bevelThickness: 0.005,
    centerY: true
  });
  const plaqueY = -1.555 + plaqueLift * cosA;
  const plaqueZ = 1.58 + plaqueLift * sinA;
  reg.part("base.plaque", plaqueGeo, {
    parent: gBase,
    pos: [0.74, plaqueY, plaqueZ],
    rot: [apronTilt, 0, 0],
    ramp: "brass",
    mountOn: "base.frontApron"
  });

  // Corner mounting rivets on brass plaque (along local tilted plane)
  for (const dx of [-0.33, 0.33]) {
    for (const dz of [-0.10, 0.10]) {
      reg.detail(
        `base.plaqueBolt.${dx > 0 ? "r" : "l"}${dz > 0 ? "f" : "b"}`,
        makeScrewDetail(
          0.74 + dx,
          plaqueY + 0.014 * cosA - dz * sinA,
          plaqueZ + 0.014 * sinA + dz * cosA,
          0.014,
          "y",
          kit
        ),
        { parent: gBase, stage: "base" }
      );
    }
  }
}
