import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makePlanOutline,
  makeDatumGrid,
  makeHaloMesh,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });
  const { CH_W, CH_D, FLOOR_Y, FOOT_H, FOOT_R, FOOT_INSET, CH_Y0, HALF_W, HALF_D, POST_W, POST_OFFSET, WALL_T, DECK_Y, DECK_H } = SPEC;

  // Soft ground shadow halo & orthographic blueprint datum grid
  reg.detail("base.halo", makeHaloMesh(4.24, 4.24, 0.36, [0.04, FLOOR_Y + 0.002, 0.04], kit), {
    parent: baseGroup,
    stage: "base"
  });
  reg.detail("base.datumGrid", makeDatumGrid(4.52, 4.52, 10, 10, FLOOR_Y + 0.004, kit, "faint"), {
    parent: baseGroup,
    stage: "base"
  });

  // 4 Rubber isolation feet mounted directly to ground (no heavy bench slab)
  const footGeo = buildCylinderGeometry(FOOT_R, FOOT_R * 0.88, FOOT_H, { segments: 20, axis: "y" });
  const footCoords = [
    ["fl", -(HALF_W - FOOT_INSET), HALF_D - FOOT_INSET],
    ["fr", HALF_W - FOOT_INSET, HALF_D - FOOT_INSET],
    ["rl", -(HALF_W - FOOT_INSET), -(HALF_D - FOOT_INSET)],
    ["rr", HALF_W - FOOT_INSET, -(HALF_D - FOOT_INSET)]
  ];
  for (const [key, fx, fz] of footCoords) {
    reg.part(`base.foot.${key}`, footGeo, {
      parent: baseGroup,
      pos: [fx, FLOOR_Y + FOOT_H * 0.5, fz],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: "ground"
    });
  }

  // Lower electronics bay bottom pan (top at -2.21, bottom including bevel at -2.29 = CH_Y0)
  const panBevel = 0.012;
  const panCoreH = 0.056;
  const panGeo = buildSlabGeometry(CH_W, CH_D, panCoreH, {
    radius: 0.14,
    bevel: true,
    bevelSize: panBevel,
    bevelThickness: panBevel,
    bevelSegments: 2
  });
  reg.part("base.bayFloor", panGeo, {
    parent: baseGroup,
    pos: [0, CH_Y0 + panCoreH + panBevel, 0],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    outlineWidth: 0.014,
    mountOn: "base.foot.fl",
    allowOverlap: ["base.foot.fr", "base.foot.rl", "base.foot.rr"]
  });

  // 4 Lower corner plinth columns connecting bayFloor (-2.21) to chamberDeck (-1.55)
  const riserH = 0.66;
  const riserY = -1.88;
  const riserGeo = new THREE.BoxGeometry(POST_W, riserH, POST_W);
  const riserCoords = [
    ["fl", -POST_OFFSET, POST_OFFSET],
    ["fr", POST_OFFSET, POST_OFFSET],
    ["rl", -POST_OFFSET, -POST_OFFSET],
    ["rr", POST_OFFSET, -POST_OFFSET]
  ];
  for (const [key, rx, rz] of riserCoords) {
    reg.part(`base.riser.${key}`, riserGeo, {
      parent: baseGroup,
      pos: [rx, riserY, rz],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.bayFloor"
    });
  }

  // Bay side skirts: rear & left stay visible; right hides in cutaway so 3-screw Z-belt loop is clear
  const skirtSpan = CH_W - POST_W * 2;
  reg.part("base.baySkirtRear", new THREE.BoxGeometry(skirtSpan, riserH, WALL_T), {
    parent: baseGroup,
    pos: [0, riserY, -HALF_D + WALL_T * 0.5],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.bayFloor",
    allowOverlap: ["base.riser.rl", "base.riser.rr"]
  });
  reg.part("base.baySkirtLeft", new THREE.BoxGeometry(WALL_T, riserH, skirtSpan), {
    parent: baseGroup,
    pos: [-HALF_W + WALL_T * 0.5, riserY, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "base.bayFloor",
    allowOverlap: ["base.riser.fl", "base.riser.rl"]
  });
  reg.part("base.baySkirtRight", new THREE.BoxGeometry(WALL_T, riserH, skirtSpan), {
    parent: baseGroup,
    pos: [HALF_W - WALL_T * 0.5, riserY, 0],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    cutawayHide: true,
    mountOn: "base.bayFloor",
    allowOverlap: ["base.riser.fr", "base.riser.rr"]
  });

  // Chamber floor deck (spans y = -1.55 .. -1.47)
  const deckGeo = buildSlabGeometry(CH_W, CH_D, DECK_H, {
    radius: 0.14,
    bevel: false
  });
  reg.part("base.chamberDeck", deckGeo, {
    parent: baseGroup,
    pos: [0, DECK_Y, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.riser.fl",
    allowOverlap: [
      "base.riser.fr",
      "base.riser.rl",
      "base.riser.rr",
      "base.baySkirtRear",
      "base.baySkirtLeft",
      "base.baySkirtRight"
    ]
  });
  reg.detail("base.deckOutline", makePlanOutline(CH_W - 0.36, CH_D - 0.36, 0.10, DECK_Y + 0.003, kit, "lo"), {
    parent: baseGroup
  });

  // Front lower control fascia bezel (spans y = -1.75 .. -1.55, leaving lower bay opening below)
  reg.part("base.frontBezel", new THREE.BoxGeometry(skirtSpan, 0.20, 0.08), {
    parent: baseGroup,
    pos: [0, -1.65, HALF_D - 0.04],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.chamberDeck",
    allowOverlap: ["base.riser.fl", "base.riser.fr"]
  });

  // Front-right engraved brass specification plaque
  reg.part("base.plaque", new THREE.BoxGeometry(1.22, 0.14, 0.03), {
    parent: baseGroup,
    pos: [ANCHORS.plaqueCenter[0], ANCHORS.plaqueCenter[1], HALF_D + 0.015],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.frontBezel"
  });
  for (const sx of [ANCHORS.plaqueCenter[0] - 0.54, ANCHORS.plaqueCenter[0] + 0.54]) {
    reg.detail(`base.plaqueScrew.${sx > 1 ? "r" : "l"}`, makeScrewDetail(sx, ANCHORS.plaqueCenter[1], HALF_D + 0.032, 0.018, "z", kit), {
      parent: baseGroup
    });
  }

  reg.tag("tag-plate", "BAMBU LAB P1S · 256³ mm · 20 m/s²", 1.05, FLOOR_Y - 0.14, HALF_D + 0.56);

  // Register Stage 2 grounding & bay anchors
  reg.anchor("deck.center", ...ANCHORS.deckCenter, baseGroup);
  reg.anchor("zMotor.mount", ...ANCHORS.zMotorMount, baseGroup);
  reg.anchor("screw.fl.base", ...ANCHORS.screwFLBase, baseGroup);
  reg.anchor("screw.fr.base", ...ANCHORS.screwFRBase, baseGroup);
  reg.anchor("screw.r.base", ...ANCHORS.screwRBase, baseGroup);
  reg.anchor("front.screen.mount", ...ANCHORS.frontScreenMount, baseGroup);
}
