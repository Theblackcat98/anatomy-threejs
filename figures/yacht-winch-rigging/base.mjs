import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makePlanOutline,
  makeScrewDetail,
  makeRulerTicks,
  makeHaloMesh,
  makeDatumGrid
} from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });
  const {
    DECK_W,
    DECK_D,
    DECK_H,
    FLOOR_Y,
    DECK_SLAB_Y,
    topSurfaceY,
    WINCH_CX,
    WINCH_CZ,
    WINCH_PLINTH_H,
    WINCH_BASE_Y,
    MAST_X,
    MAST_Z,
    MAST_STEP_Y,
    CHAINPLATE_Z_WIND,
    CHAINPLATE_Z_LEE,
    STEMHEAD_X,
    STERN_BACKSTAY_X
  } = SPEC;

  // 1. Ground Shadow Halo & Orthographic Blueprint Datum Grid
  reg.detail(
    "base.halo",
    makeHaloMesh(5.10, 3.80, 0.36, [0, FLOOR_Y + 0.002, 0], kit),
    { parent: baseGroup, stage: "base" }
  );
  reg.detail(
    "base.datumGrid",
    makeDatumGrid(5.40, 4.10, 10, 8, FLOOR_Y + 0.004, kit, "faint"),
    { parent: baseGroup, stage: "base" }
  );

  // 2. Sliced Yacht Deck Section Structural Plinth (y in [-1.75, -1.42])
  const deckGeo = buildSlabGeometry(DECK_W, DECK_D, DECK_H, {
    radius: 0.24,
    bevel: true,
    bevelSize: 0.025,
    bevelThickness: 0.025
  });
  reg.part("base.deckSlab", deckGeo, {
    parent: baseGroup,
    pos: [0, DECK_SLAB_Y, 0],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "ground"
  });

  // Inset deck plank perimeter outline & teak plank seam lines
  reg.detail(
    "base.deckOutline",
    makePlanOutline(DECK_W - 0.32, DECK_D - 0.32, 0.16, topSurfaceY + 0.003, kit, "lo"),
    { parent: baseGroup }
  );
  const seamPts = [];
  for (let i = -3; i <= 3; i++) {
    const z = i * 0.36;
    seamPts.push(
      new THREE.Vector3(-DECK_W * 0.43, topSurfaceY + 0.0025, z),
      new THREE.Vector3(DECK_W * 0.43, topSurfaceY + 0.0025, z)
    );
  }
  reg.detail(
    "base.teakSeams",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seamPts), kit.lineMaterials.faint),
    { parent: baseGroup }
  );

  // 4 corner deck fastener details
  [
    [-2.05, 1.40],
    [2.05, 1.40],
    [-2.05, -1.40],
    [2.05, -1.40]
  ].forEach(([sx, sz], idx) => {
    reg.detail(
      `base.cornerBolt.${idx}`,
      makeScrewDetail(sx, topSurfaceY + 0.004, sz, 0.055, "y", kit),
      { parent: baseGroup }
    );
  });

  // 3. Starboard Cockpit Winch Coaming Pedestal (y in [-1.42, -1.18])
  reg.part(
    "base.winchPlinth",
    buildCylinderGeometry(0.84, 0.92, WINCH_PLINTH_H, { segments: 32, axis: "y" }),
    {
      parent: baseGroup,
      pos: [WINCH_CX, topSurfaceY + WINCH_PLINTH_H * 0.5, WINCH_CZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSlab"
    }
  );

  // 4. Fore/Port Mast Step & Rigging Chainplate Foundations
  reg.part(
    "base.mastStep",
    buildCylinderGeometry(0.28, 0.32, 0.12, { segments: 24, axis: "y" }),
    {
      parent: baseGroup,
      pos: [MAST_X, -1.36, MAST_Z],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSlab"
    }
  );

  reg.part("base.chainplate.windward", new THREE.BoxGeometry(0.20, 0.16, 0.16), {
    parent: baseGroup,
    pos: [MAST_X, -1.34, CHAINPLATE_Z_WIND],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });

  reg.part("base.chainplate.leeward", new THREE.BoxGeometry(0.20, 0.16, 0.16), {
    parent: baseGroup,
    pos: [MAST_X, -1.34, CHAINPLATE_Z_LEE],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });

  reg.part("base.stemhead", new THREE.BoxGeometry(0.24, 0.16, 0.16), {
    parent: baseGroup,
    pos: [STEMHEAD_X, -1.34, MAST_Z],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });

  reg.part("base.sternPad", new THREE.BoxGeometry(0.24, 0.16, 0.18), {
    parent: baseGroup,
    pos: [STERN_BACKSTAY_X, -1.34, MAST_Z],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });

  // 5. Front Apron Trim Scale & Engraved Brass Spec Plaque
  reg.part(
    "base.ruler",
    buildSlabGeometry(1.34, 0.18, 0.025, { radius: 0.03, bevel: false }),
    {
      parent: baseGroup,
      pos: [-1.28, -1.395, 1.42],
      ramp: "hi",
      outline: "lo",
      crease: "lo",
      mountOn: "base.deckSlab"
    }
  );
  reg.detail(
    "base.rulerTicks",
    makeRulerTicks(-1.28, 1.24, 1.42, 0.14, -1.392, 24, 4, kit),
    { parent: baseGroup }
  );

  reg.part(
    "base.plaque",
    buildSlabGeometry(1.24, 0.24, 0.03, { radius: 0.04, bevel: false }),
    {
      parent: baseGroup,
      pos: [1.16, -1.39, 1.42],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "base.deckSlab"
    }
  );
  reg.tag("tag-plate", "46ST 2-SPEED · 13.5:1 / 46:1 · MASTHEAD RIG", 1.16, -1.38, 1.44);

  // Stage 2 mounting anchors for downstream stages
  reg.anchor("winch.center", WINCH_CX, WINCH_BASE_Y, WINCH_CZ, baseGroup);
  reg.anchor("mast.step", MAST_X, MAST_STEP_Y, MAST_Z, baseGroup);
  reg.anchor("chainplate.windward", MAST_X, -1.26, CHAINPLATE_Z_WIND, baseGroup);
  reg.anchor("chainplate.leeward", MAST_X, -1.26, CHAINPLATE_Z_LEE, baseGroup);
  reg.anchor("stemhead.anchor", STEMHEAD_X, -1.26, MAST_Z, baseGroup);
  reg.anchor("stern.pad", STERN_BACKSTAY_X, -1.26, MAST_Z, baseGroup);
}
