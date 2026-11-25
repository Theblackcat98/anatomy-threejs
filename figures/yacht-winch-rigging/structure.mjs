import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC } from "./model.mjs";

export function buildStructure(reg, kit) {
  const structGroup = reg.group("struct.group", { stage: "structure" });
  const {
    WINCH_CX,
    WINCH_CZ,
    WINCH_BASE_Y,
    SKIRT_H,
    CARRIER_Y,
    MAST_X,
    MAST_Z,
    GOOSENECK_Y,
    SPREADER_Y,
    SPREADER_SPAN,
    CHAINPLATE_Z_WIND,
    CHAINPLATE_Z_LEE,
    STEMHEAD_X
  } = SPEC;

  // 1. 46ST Winch Stationary Support Structure
  reg.part(
    "struct.winchBaseSkirt",
    buildCylinderGeometry(0.76, 0.80, SKIRT_H, { segments: 32, axis: "y" }),
    {
      parent: structGroup,
      pos: [WINCH_CX, WINCH_BASE_Y + SKIRT_H * 0.5, WINCH_CZ],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      mountOn: "base.winchPlinth"
    }
  );

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    reg.detail(
      `struct.winchBaseBolt.${i}`,
      makeScrewDetail(
        WINCH_CX + Math.cos(a) * 0.71,
        WINCH_BASE_Y + SKIRT_H + 0.004,
        WINCH_CZ + Math.sin(a) * 0.71,
        0.028,
        "y",
        kit
      ),
      { parent: structGroup }
    );
  }

  // Slender stationary stator sleeve (r = 0.095..0.105) so sunGear (r=0.16) and shaftPinion (r=0.13) remain cleanly exposed
  reg.part(
    "struct.winchCenterPost",
    buildCylinderGeometry(0.095, 0.105, 1.32, { segments: 24, axis: "y" }),
    {
      parent: structGroup,
      pos: [WINCH_CX, -0.34, WINCH_CZ],
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      mountOn: "struct.winchBaseSkirt"
    }
  );

  reg.part(
    "struct.planetCarrierPlate",
    buildCylinderGeometry(0.56, 0.56, 0.08, { segments: 28, axis: "y" }),
    {
      parent: structGroup,
      pos: [WINCH_CX, CARRIER_Y, WINCH_CZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.winchCenterPost",
      allowOverlap: ["struct.winchBaseSkirt"]
    }
  );

  reg.part(
    "struct.stripperCollar",
    buildCylinderGeometry(0.26, 0.26, 0.11, { segments: 24, axis: "y" }),
    {
      parent: structGroup,
      pos: [WINCH_CX, 0.355, WINCH_CZ],
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      mountOn: "struct.winchCenterPost"
    }
  );

  // Stationary chrome self-tailing peeler arm clears drumCap (y<=0.36) and stays below handleArm (y>=0.525)
  reg.part(
    "struct.stripperArm",
    new THREE.BoxGeometry(0.14, 0.07, 0.68),
    {
      parent: structGroup,
      pos: [WINCH_CX, 0.36, WINCH_CZ + 0.31],
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      mountOn: "struct.stripperCollar",
      allowOverlap: ["struct.winchCenterPost"]
    }
  );

  // Chrome peeler finger dipping into the self-tailing brass jaw groove at z = 0.82
  reg.part(
    "struct.stripperTip",
    new THREE.BoxGeometry(0.12, 0.12, 0.16),
    {
      parent: structGroup,
      pos: [WINCH_CX, 0.29, 0.80],
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      mountOn: "struct.stripperArm",
      allowOverlap: ["subject.stJaws", "subject.drumCap"]
    }
  );
  reg.anchor("winch.tail.exit", WINCH_CX + 0.05, 0.28, 0.88, structGroup, {
    dir: [0.32, -0.58, 0.75]
  });

  // Bronze sheet-entry fairlead guide on lower-left winch plinth rim
  reg.part(
    "struct.sheetEntryGuide",
    buildCylinderGeometry(0.08, 0.08, 0.22, { segments: 18, axis: "y" }),
    {
      parent: structGroup,
      pos: [0.34, -1.07, 0.56],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "base.winchPlinth",
      allowOverlap: ["struct.winchBaseSkirt"]
    }
  );
  reg.anchor("winch.sheet.in", 0.34, -0.96, 0.56, structGroup, {
    dir: [-0.58, 0.08, 0.81]
  });

  // 2. Deck Sheet Turning Block & Cockpit Tail Cleat
  reg.part("struct.turningBlockBase", new THREE.BoxGeometry(0.26, 0.16, 0.26), {
    parent: structGroup,
    pos: [-0.58, -1.34, 0.88],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });

  reg.part(
    "struct.turningSheave",
    buildCylinderGeometry(0.14, 0.14, 0.08, { segments: 20, axis: "y" }),
    {
      parent: structGroup,
      pos: [-0.58, -1.22, 0.88],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.turningBlockBase"
    }
  );
  reg.anchor("block.sheet.out", -0.44, -1.22, 0.88, structGroup, {
    dir: [0.78, 0.42, 0.46]
  });

  reg.part("struct.tailCleat", new THREE.BoxGeometry(0.32, 0.14, 0.22), {
    parent: structGroup,
    pos: [1.92, -1.35, 1.02],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });
  reg.anchor("cleat.tail.in", 1.92, -1.28, 1.02, structGroup, {
    dir: [-0.22, 0.95, 0.20]
  });

  // 3. Tapered Aluminum Mast Spar, Gooseneck, Swept Spreaders & Deflecting Masthead
  reg.part(
    "struct.mastLower",
    buildCylinderGeometry(0.095, 0.11, 1.86, { segments: 24, axis: "y" }),
    {
      parent: structGroup,
      pos: [MAST_X, -0.37, MAST_Z],
      ramp: "hi",
      outline: "hi",
      noCrease: true,
      mountOn: "base.mastStep"
    }
  );

  reg.part("struct.gooseneck", new THREE.BoxGeometry(0.24, 0.18, 0.18), {
    parent: structGroup,
    pos: [-1.06, GOOSENECK_Y, MAST_Z],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.mastLower"
  });
  reg.anchor("mast.gooseneck", -1.06, GOOSENECK_Y, MAST_Z, structGroup);

  reg.part("struct.spreaderBracket", new THREE.BoxGeometry(0.22, 0.14, 0.32), {
    parent: structGroup,
    pos: [MAST_X, SPREADER_Y, MAST_Z],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.mastLower"
  });

  reg.part(
    "struct.spreader.windward",
    buildCylinderGeometry(0.032, 0.048, SPREADER_SPAN, { segments: 16, axis: "z" }),
    {
      parent: structGroup,
      pos: [MAST_X, SPREADER_Y, 0.38],
      ramp: "hi",
      outline: "mid",
      noCrease: true,
      mountOn: "struct.spreaderBracket"
    }
  );
  reg.anchor("spreader.tip.windward", MAST_X, SPREADER_Y, 0.86, structGroup);
  reg.anchor("spreader.root.windward", MAST_X, SPREADER_Y - 0.02, -0.06, structGroup);

  reg.part(
    "struct.spreader.leeward",
    buildCylinderGeometry(0.048, 0.032, SPREADER_SPAN, { segments: 16, axis: "z" }),
    {
      parent: structGroup,
      pos: [MAST_X, SPREADER_Y, -0.74],
      ramp: "hi",
      outline: "mid",
      noCrease: true,
      mountOn: "struct.spreaderBracket"
    }
  );
  reg.anchor("spreader.tip.leeward", MAST_X, SPREADER_Y, -1.22, structGroup);
  reg.anchor("spreader.root.leeward", MAST_X, SPREADER_Y - 0.02, -0.30, structGroup);

  // Upper Mast Group (pivoted at spreader root for live aft bend & leeward deflection)
  const mastTopGroup = reg.group("struct.mastTopGroup", {
    parent: structGroup,
    pos: [MAST_X, SPREADER_Y, MAST_Z],
    stage: "structure"
  });

  reg.part(
    "struct.mastUpper",
    buildCylinderGeometry(0.072, 0.095, 1.66, { segments: 24, axis: "y" }),
    {
      parent: mastTopGroup,
      pos: [0, 0.83, 0],
      ramp: "hi",
      outline: "hi",
      noCrease: true,
      mountOn: "struct.spreaderBracket",
      allowOverlap: ["struct.mastLower"]
    }
  );

  reg.part("struct.mastheadCrane", new THREE.BoxGeometry(0.32, 0.14, 0.24), {
    parent: mastTopGroup,
    pos: [0, 1.68, 0],
    ramp: "brass",
    outline: "hi",
    crease: "lo",
    mountOn: "struct.mastUpper"
  });
  reg.anchor("masthead.windward", 0, 1.68, 0.08, mastTopGroup);
  reg.anchor("masthead.leeward", 0, 1.68, -0.08, mastTopGroup);
  reg.anchor("masthead.fore", -0.14, 1.68, 0, mastTopGroup);
  reg.anchor("masthead.aft", 0.14, 1.68, 0, mastTopGroup);

  reg.tag("tag-masthead", "MASTHEAD RIG · V1/D1 SHROUDS", MAST_X, 2.44, MAST_Z);

  // 4. Chainplate Turnbuckle Cylinders (solid mount bases for Stage 5 shrouds & forestay)
  reg.part(
    "struct.turnbuckle.windward",
    buildCylinderGeometry(0.045, 0.045, 0.28, { segments: 14, axis: "y" }),
    {
      parent: structGroup,
      pos: [MAST_X, -1.12, CHAINPLATE_Z_WIND],
      ramp: "brass",
      outline: "lo",
      noCrease: true,
      mountOn: "base.chainplate.windward"
    }
  );
  reg.anchor("turnbuckle.windward.top", MAST_X, -0.98, CHAINPLATE_Z_WIND, structGroup);

  reg.part(
    "struct.turnbuckle.leeward",
    buildCylinderGeometry(0.045, 0.045, 0.28, { segments: 14, axis: "y" }),
    {
      parent: structGroup,
      pos: [MAST_X, -1.12, CHAINPLATE_Z_LEE],
      ramp: "brass",
      outline: "lo",
      noCrease: true,
      mountOn: "base.chainplate.leeward"
    }
  );
  reg.anchor("turnbuckle.leeward.top", MAST_X, -0.98, CHAINPLATE_Z_LEE, structGroup);

  reg.part(
    "struct.forestayTurnbuckle",
    buildCylinderGeometry(0.045, 0.045, 0.28, { segments: 14, axis: "y" }),
    {
      parent: structGroup,
      pos: [STEMHEAD_X, -1.12, MAST_Z],
      ramp: "brass",
      outline: "lo",
      noCrease: true,
      mountOn: "base.stemhead"
    }
  );
  reg.anchor("forestay.turnbuckle.top", STEMHEAD_X, -0.98, MAST_Z, structGroup);
}
