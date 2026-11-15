import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makeRingLine
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildStructure(reg, kit) {
  const structGroup = reg.group("struct.group", { stage: "structure" });
  const {
    CH_W,
    CH_D,
    CH_Y1,
    HALF_W,
    HALF_D,
    POST_W,
    POST_OFFSET,
    WALL_T,
    DECK_Y,
    Y_ROD_X,
    Y_ROD_Y,
    Y_ROD_R,
    MOTOR_X,
    MOTOR_Z,
    BED_CZ,
    SCREW_R_RAD,
    SCREW_FL,
    SCREW_FR,
    SCREW_R,
    PARK_POS
  } = SPEC;

  // 1. Four vertical steel corner columns (DECK_Y = -1.47 .. TOP_RING_Y0 = 2.07 -> h = 3.54, center = 0.30)
  const postH = 3.54;
  const postY = 0.30;
  const postGeo = new THREE.BoxGeometry(POST_W, postH, POST_W);
  const postCoords = [
    ["fl", -POST_OFFSET, POST_OFFSET],
    ["fr", POST_OFFSET, POST_OFFSET],
    ["rl", -POST_OFFSET, -POST_OFFSET],
    ["rr", POST_OFFSET, -POST_OFFSET]
  ];
  for (const [key, px, pz] of postCoords) {
    reg.part(`struct.post.${key}`, postGeo, {
      parent: structGroup,
      pos: [px, postY, pz],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.chamberDeck",
      allowOverlap: ["base.frontBezel"]
    });
  }

  // 2. Upper perimeter frame ring (y = 2.07 .. 2.23, center = 2.15)
  const ringH = 0.16;
  const ringY = 2.15;
  reg.part("struct.topBeam.rear", new THREE.BoxGeometry(CH_W, ringH, POST_W), {
    parent: structGroup,
    pos: [0, ringY, -POST_OFFSET],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.post.rl",
    allowOverlap: ["struct.post.rr"]
  });
  reg.part("struct.topBeam.front", new THREE.BoxGeometry(CH_W, ringH, POST_W), {
    parent: structGroup,
    pos: [0, ringY, POST_OFFSET],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.post.fl",
    allowOverlap: ["struct.post.fr"]
  });
  reg.part("struct.topBeam.left", new THREE.BoxGeometry(POST_W, ringH, CH_D - POST_W * 2), {
    parent: structGroup,
    pos: [-POST_OFFSET, ringY, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.post.fl",
    allowOverlap: ["struct.post.rl", "struct.topBeam.front", "struct.topBeam.rear"]
  });
  reg.part("struct.topBeam.right", new THREE.BoxGeometry(POST_W, ringH, CH_D - POST_W * 2), {
    parent: structGroup,
    pos: [POST_OFFSET, ringY, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.post.fr",
    allowOverlap: ["struct.post.rr", "struct.topBeam.front", "struct.topBeam.rear"]
  });

  reg.tag("tag-corexy", "COREXY · A/B BELTS · 9:53 EXT", -1.45, 2.66, -1.25);

  // 3. Enclosure walls, cutaway glass door, and cutaway glass top lid
  const innerSpan = CH_W - POST_W * 2;
  reg.part("struct.wall.rear", new THREE.BoxGeometry(innerSpan, postH, WALL_T), {
    parent: structGroup,
    pos: [0, postY, -HALF_D + WALL_T * 0.5],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "base.chamberDeck",
    allowOverlap: ["struct.post.rl", "struct.post.rr", "struct.topBeam.rear"]
  });
  reg.part("struct.wall.left", new THREE.BoxGeometry(WALL_T, postH, innerSpan), {
    parent: structGroup,
    pos: [-HALF_W + WALL_T * 0.5, postY, 0],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "base.chamberDeck",
    allowOverlap: ["struct.post.fl", "struct.post.rl", "struct.topBeam.left"]
  });
  reg.part("struct.wall.right", new THREE.BoxGeometry(WALL_T, postH, innerSpan), {
    parent: structGroup,
    pos: [HALF_W - WALL_T * 0.5, postY, 0],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    cutawayHide: true,
    mountOn: "base.chamberDeck",
    allowOverlap: ["struct.post.fr", "struct.post.rr", "struct.topBeam.right"]
  });

  reg.part("struct.glass.door", new THREE.BoxGeometry(CH_W - 0.34, 3.52, 0.04), {
    parent: structGroup,
    pos: [0, postY, HALF_D - 0.03],
    ramp: "glass",
    opacity: 0.28,
    outline: "lo",
    crease: "faint",
    cutawayHide: true,
    mountOn: "base.chamberDeck",
    allowOverlap: ["struct.post.fl", "struct.post.fr", "struct.topBeam.front", "base.frontBezel"]
  });
  reg.part("struct.door.handle", new THREE.BoxGeometry(0.10, 0.64, 0.06), {
    parent: structGroup,
    pos: [1.52, 0.45, HALF_D + 0.02],
    ramp: "hi",
    outline: "mid",
    cutawayHide: true,
    mountOn: "struct.glass.door"
  });

  reg.part(
    "struct.glass.lid",
    buildSlabGeometry(CH_W - 0.08, CH_D - 0.08, 0.06, { radius: 0.12, bevel: false }),
    {
      parent: structGroup,
      pos: [0, CH_Y1, 0],
      ramp: "glass",
      opacity: 0.28,
      outline: "lo",
      crease: "faint",
      cutawayHide: true,
      mountOn: "struct.topBeam.front",
      allowOverlap: ["struct.topBeam.rear", "struct.topBeam.left", "struct.topBeam.right"]
    }
  );
  reg.part("struct.lid.handle", new THREE.BoxGeometry(0.90, 0.06, 0.14), {
    parent: structGroup,
    pos: [0, CH_Y1 + 0.03, 1.35],
    ramp: "lo",
    outline: "lo",
    cutawayHide: true,
    mountOn: "struct.glass.lid"
  });

  // 4. Left-wall Auxiliary Part Cooling Blower Fan (aligned with bed center BED_CZ = 0.18)
  reg.part(
    "struct.auxFan.scroll",
    buildCylinderGeometry(0.40, 0.40, 0.14, { segments: 24, axis: "x" }),
    {
      parent: structGroup,
      pos: [-1.815, 0.90, BED_CZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.wall.left"
    }
  );
  reg.part("struct.auxFan.duct", new THREE.BoxGeometry(0.14, 0.44, 0.84), {
    parent: structGroup,
    pos: [-1.815, 1.18, BED_CZ],
    ramp: "intake",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.auxFan.scroll",
    allowOverlap: ["struct.wall.left"]
  });
  reg.part("struct.auxFan.nozzle", new THREE.BoxGeometry(0.16, 0.08, 0.88), {
    parent: structGroup,
    pos: [-1.76, 1.38, BED_CZ],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.auxFan.duct",
    allowOverlap: ["struct.wall.left"]
  });
  reg.anchor("aux.fan.nozzle", -1.68, 1.38, BED_CZ, structGroup, { dir: [1, 0, 0] });

  // 5. Rear Chamber Exhaust Fan & Rear-Left Purge Chute + Wiper Station
  reg.part("struct.chamberFan", new THREE.BoxGeometry(0.64, 0.64, 0.12), {
    parent: structGroup,
    pos: [-0.36, 1.38, -1.825],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.wall.rear"
  });
  const fanGrille = makeRingLine(0.25, 24, kit, "lo");
  fanGrille.position.set(-0.36, 1.38, -1.762);
  reg.detail("struct.chamberFan.grille", fanGrille, { parent: structGroup });

  reg.part("struct.purgeChute", new THREE.BoxGeometry(0.28, 2.71, 0.32), {
    parent: structGroup,
    pos: [PARK_POS[0], -0.115, -1.48],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.chamberDeck"
  });
  reg.part("struct.purgeWiper", new THREE.BoxGeometry(0.32, 0.06, 0.36), {
    parent: structGroup,
    pos: [PARK_POS[0], 1.27, -1.35],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.purgeChute"
  });
  reg.anchor("purge.chute.top", PARK_POS[0], 1.30, -1.35, structGroup, { dir: [0, 1, 0] });

  // 6. Y-Axis Linear Steel Rods, End Brackets & Rear CoreXY Motor Brackets
  const yBrkGeo = new THREE.BoxGeometry(0.30, 0.22, 0.24);
  reg.part("struct.yBracket.rl", yBrkGeo, {
    parent: structGroup,
    pos: [-1.72, Y_ROD_Y, -1.71],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.post.rl",
    allowOverlap: ["struct.wall.rear", "struct.wall.left"]
  });
  reg.part("struct.yBracket.rr", yBrkGeo, {
    parent: structGroup,
    pos: [1.72, Y_ROD_Y, -1.71],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.post.rr",
    allowOverlap: ["struct.wall.rear", "struct.wall.right"]
  });
  reg.part("struct.yBracket.fl", yBrkGeo, {
    parent: structGroup,
    pos: [-1.72, Y_ROD_Y, 1.71],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.post.fl",
    allowOverlap: ["struct.wall.left"]
  });
  reg.part("struct.yBracket.fr", yBrkGeo, {
    parent: structGroup,
    pos: [1.72, Y_ROD_Y, 1.71],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.post.fr",
    allowOverlap: ["struct.wall.right"]
  });

  const yRodGeo = buildCylinderGeometry(Y_ROD_R, Y_ROD_R, 3.44, { segments: 20, axis: "z" });
  reg.part("struct.yRod.L", yRodGeo, {
    parent: structGroup,
    pos: [-Y_ROD_X, Y_ROD_Y, 0.0],
    ramp: "hi",
    outline: "mid",
    noCrease: true,
    mountOn: "struct.yBracket.rl",
    allowOverlap: ["struct.yBracket.fl"]
  });
  reg.part("struct.yRod.R", yRodGeo, {
    parent: structGroup,
    pos: [Y_ROD_X, Y_ROD_Y, 0.0],
    ramp: "hi",
    outline: "mid",
    noCrease: true,
    mountOn: "struct.yBracket.rr",
    allowOverlap: ["struct.yBracket.fr"]
  });

  const motorDeckGeo = new THREE.BoxGeometry(0.64, 0.06, 0.44);
  reg.part("struct.motorDeck.A", motorDeckGeo, {
    parent: structGroup,
    pos: [-1.50, 1.86, MOTOR_Z],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.post.rl",
    allowOverlap: ["struct.wall.rear", "struct.yBracket.rl"]
  });
  reg.part("struct.motorDeck.B", motorDeckGeo, {
    parent: structGroup,
    pos: [1.50, 1.86, MOTOR_Z],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.post.rr",
    allowOverlap: ["struct.wall.rear", "struct.yBracket.rr"]
  });
  reg.anchor("motor.A.mount", -MOTOR_X, 1.88, MOTOR_Z, structGroup);
  reg.anchor("motor.B.mount", MOTOR_X, 1.88, MOTOR_Z, structGroup);

  // 7. Three Synchronized TR8x8 Z Lead Screws (extend from lower bay y=-2.15 through chamberDeck to y=1.44)
  const screwLen = 3.59;
  const screwCenterY = -0.355;
  const screwGeo = buildCylinderGeometry(SCREW_R_RAD, SCREW_R_RAD, screwLen, { segments: 18, axis: "y" });
  const bearingGeo = buildCylinderGeometry(0.085, 0.095, 0.06, { segments: 16, axis: "y" });
  const screwCoords = [
    ["fl", SCREW_FL[0], SCREW_FL[1]],
    ["fr", SCREW_FR[0], SCREW_FR[1]],
    ["r", SCREW_R[0], SCREW_R[1]]
  ];
  for (const [key, sx, sz] of screwCoords) {
    const sGroup = reg.group(`struct.zScrewGroup.${key}`, {
      parent: structGroup,
      pos: [sx, 0, sz],
      stage: "structure"
    });
    reg.part(`struct.zScrew.${key}`, screwGeo, {
      parent: sGroup,
      pos: [0, screwCenterY, 0],
      ramp: "brass",
      outline: "lo",
      noCrease: true,
      mountOn: "base.chamberDeck",
      allowOverlap: ["base.bayFloor"]
    });
    reg.part(`struct.zBearing.${key}`, bearingGeo, {
      parent: structGroup,
      pos: [sx, DECK_Y + 0.03, sz],
      ramp: "mid",
      outline: "lo",
      mountOn: "base.chamberDeck",
      allowOverlap: [`struct.zScrew.${key}`]
    });
  }

  // 8. Rear Filament Inlet Pass-Through & Lower Bay Umbilical Ports
  reg.part(
    "struct.inletFitting",
    buildCylinderGeometry(0.08, 0.08, 0.22, { segments: 16, axis: "z" }),
    {
      parent: structGroup,
      pos: [0.0, 2.00, -1.915],
      ramp: "hi",
      outline: "mid",
      noCrease: true,
      mountOn: "struct.wall.rear",
      allowOverlap: ["struct.topBeam.rear"]
    }
  );
  reg.anchor("inlet.outer", 0.0, 2.00, -2.025, structGroup, { dir: [0, 0, -1] });
  reg.anchor("inlet.inner", 0.0, 2.00, -1.805, structGroup, { dir: [0, 0, 1] });

  reg.part(
    "struct.bayPort",
    buildCylinderGeometry(0.08, 0.08, 0.16, { segments: 16, axis: "z" }),
    {
      parent: structGroup,
      pos: [-1.18, -1.88, -1.94],
      ramp: "mid",
      outline: "lo",
      noCrease: true,
      mountOn: "base.baySkirtRear"
    }
  );
  reg.anchor("bay.umbilical.out", -1.18, -1.88, -2.02, structGroup, { dir: [0, 0, -1] });

  reg.part("struct.upperJunction", new THREE.BoxGeometry(0.28, 0.24, 0.14), {
    parent: structGroup,
    pos: [-1.18, 1.52, -1.96],
    ramp: "mid",
    outline: "mid",
    mountOn: "struct.wall.rear"
  });
  reg.anchor("gantry.junction.in", -1.18, 1.40, -2.02, structGroup, { dir: [0, -1, -0.2] });
}
