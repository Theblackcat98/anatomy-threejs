import * as THREE from "three";
import {
  buildSlabGeometry,
  makeDatumGrid,
  makePlanOutline,
  makeScrewDetail,
  makeHaloMesh
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });
  const { deckW, deckD, deckH, deckY, topSurfaceY } = SPEC;

  // Ground shadow halo + blueprint datum grid beneath sliced yacht hull section
  reg.detail("base.halo", makeHaloMesh(deckW + 0.40, deckD + 0.40, 0.38, [0.04, deckY - 0.14, 0.04], kit), {
    parent: baseGroup,
    stage: "base"
  });
  reg.detail("base.datumGrid", makeDatumGrid(deckW + 0.85, deckD + 0.80, 14, 9, deckY - 0.08, kit, "faint"), {
    parent: baseGroup,
    stage: "base"
  });

  // Lower hull chine plinth (gives authentic sliced boat-section depth under the deck)
  const hullChineH = 0.10;
  reg.part(
    "base.hullChine",
    buildSlabGeometry(deckW - 0.24, deckD - 0.24, hullChineH, {
      radius: 0.28,
      bevel: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 1
    }),
    {
      parent: baseGroup,
      pos: [0, deckY + 0.04, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      clippable: true,
      mountOn: "ground"
    }
  );

  // Main Sliced Yacht Foredeck & Cockpit Deck Slab
  const deckGeo = buildSlabGeometry(deckW, deckD, deckH, {
    radius: 0.34,
    bevel: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2
  });
  reg.part("base.deckSection", deckGeo, {
    parent: baseGroup,
    pos: [0, deckY + deckH, 0],
    ramp: "mid",
    outline: "mid",
    crease: "faint",
    outlineWidth: 0.018,
    clippable: true,
    mountOn: "base.hullChine"
  });

  // Port & Starboard Raised Bulwark Toe-Rails along deck edges
  const railW = deckW - 0.88;
  const railH = 0.065;
  const railD = 0.07;
  const railGeo = buildSlabGeometry(railW, railD, railH, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    bevelSegments: 1
  });
  reg.part("base.toeRail.port", railGeo, {
    parent: baseGroup,
    pos: [0, topSurfaceY + railH - 0.01, -1.22],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    clippable: true,
    mountOn: "base.deckSection"
  });
  reg.part("base.toeRail.stbd", railGeo, {
    parent: baseGroup,
    pos: [0, topSurfaceY + railH - 0.01, 1.23],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    clippable: true,
    mountOn: "base.deckSection"
  });

  // Teak deck planking seam lines along X (stop cleanly inside toe-rails)
  const plankPts = [];
  for (let i = -3; i <= 3; i++) {
    const pz = i * 0.28;
    plankPts.push(
      new THREE.Vector3(-deckW * 0.42, topSurfaceY + 0.003, pz),
      new THREE.Vector3(deckW * 0.42, topSurfaceY + 0.003, pz)
    );
  }
  reg.detail("base.teakSeams", new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(plankPts), kit.lineMaterials.faint), {
    parent: baseGroup
  });

  reg.detail("base.groove.outer", makePlanOutline(deckW - 0.30, deckD - 0.30, 0.24, topSurfaceY + 0.003, kit, "faint"), {
    parent: baseGroup
  });

  // Two-tier Sculpted Cockpit Winch Coaming Pedestal (right-front, top exact at SPEC.winchBaseY)
  const lowerH = 0.12;
  reg.part(
    "base.winchCoamingLower",
    buildSlabGeometry(1.64, 1.54, lowerH, {
      radius: 0.24,
      bevel: true,
      bevelSize: 0.016,
      bevelThickness: 0.016
    }),
    {
      parent: baseGroup,
      pos: [SPEC.winchX, topSurfaceY + lowerH - 0.016, SPEC.winchZ],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      clippable: true,
      mountOn: "base.deckSection"
    }
  );

  const upperH = 0.12;
  reg.part(
    "base.winchCoaming",
    buildSlabGeometry(1.46, 1.38, upperH, {
      radius: 0.22,
      bevel: true,
      bevelSize: 0.016,
      bevelThickness: 0.016
    }),
    {
      parent: baseGroup,
      pos: [SPEC.winchX, topSurfaceY + lowerH + upperH - 0.016, SPEC.winchZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      clippable: true,
      mountOn: "base.winchCoamingLower"
    }
  );

  // Register section anchors
  reg.anchor("base.top", ...ANCHORS.baseTop, baseGroup);
  reg.anchor("mast.step", ...ANCHORS.mastStep, baseGroup);
  reg.anchor("shroud.port", ...ANCHORS.shroudPort, baseGroup);
  reg.anchor("shroud.stbd", ...ANCHORS.shroudStbd, baseGroup);
  reg.anchor("forestay.deck", ...ANCHORS.forestayDeck, baseGroup);
  reg.anchor("backstay.deck", ...ANCHORS.backstayDeck, baseGroup);
  reg.anchor("traveler.center", ...ANCHORS.travelerCenter, baseGroup);
  reg.anchor("turningBlock", ...ANCHORS.turningBlock, baseGroup);
  reg.anchor("winch.base", ...ANCHORS.winchBase, baseGroup);
  reg.anchor("screen.mount", ...ANCHORS.screenMount, baseGroup);

  // Brass Spec Plaque on front apron between cockpit console and winch coaming
  const [pqX, , pqZ] = ANCHORS.plaqueCenter;
  const plaqueGeo = buildSlabGeometry(1.12, 0.28, 0.036, {
    radius: 0.04,
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
    mountOn: "base.deckSection"
  });
  [[-0.46, -0.08], [0.46, -0.08], [-0.46, 0.08], [0.46, 0.08]].forEach(([dx, dz], idx) => {
    reg.detail(`base.plaque.screw.${idx}`, makeScrewDetail(pqX + dx, topSurfaceY + 0.045, pqZ + dz, 0.020, "y", kit), {
      parent: baseGroup
    });
  });

  reg.tag("tag-plate", "2-SPD · 3.5:1", pqX, topSurfaceY + 0.048, pqZ + 0.01);
}
