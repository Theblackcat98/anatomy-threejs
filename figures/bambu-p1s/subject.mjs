import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeDatumGrid
} from "../../kit/primitives.mjs";
import { SPEC, getPrintState, bandHalf, bandRot } from "./model.mjs";

function buildSpiderBedFrameGeometry(thickness) {
  const s = new THREE.Shape();
  s.moveTo(-0.22, -1.68);
  s.lineTo(0.22, -1.68);
  s.lineTo(0.22, -0.96);
  s.lineTo(1.22, -0.96);
  s.lineTo(1.22, 0.80);
  s.lineTo(1.68, 0.80);
  s.lineTo(1.68, 1.12);
  s.lineTo(-1.68, 1.12);
  s.lineTo(-1.68, 0.80);
  s.lineTo(-1.22, 0.80);
  s.lineTo(-1.22, -0.96);
  s.lineTo(-0.22, -0.96);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 8
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}

export function buildSubject(reg, kit) {
  const initSt = getPrintState(SPEC.initialTheta);
  const {
    Y_ROD_X,
    X_ROD_Y_UP,
    X_ROD_Y_LO,
    X_ROD_R,
    X_ROD_SPAN,
    BED_CX,
    BED_CZ,
    PLATE_SIZE,
    PLATE_T,
    HEATBED_SIZE,
    HEATBED_T,
    BED_FRAME_T,
    BED_TOP_Y0,
    N_BANDS,
    BAND_H,
    RAFT_H,
    PART_HALF
  } = SPEC;

  // 1. Y-Gantry Group (translates along Z with st.zc)
  const yGroup = reg.group("gantry.yGroup", {
    pos: [0, 0, initSt.zc],
    stage: "subject"
  });

  const carrGeo = new THREE.BoxGeometry(0.26, 0.42, 0.36);
  reg.part("gantry.yCarriage.L", carrGeo, {
    parent: yGroup,
    pos: [-Y_ROD_X, 1.82, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.yRod.L"
  });
  reg.part("gantry.yCarriage.R", carrGeo, {
    parent: yGroup,
    pos: [Y_ROD_X, 1.82, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.yRod.R"
  });

  // Twin ultralight carbon-fiber X-axis rods bridging the Y-carriages
  const xRodGeo = buildCylinderGeometry(X_ROD_R, X_ROD_R, X_ROD_SPAN, { segments: 20, axis: "x" });
  reg.part("gantry.xRod.upper", xRodGeo, {
    parent: yGroup,
    pos: [0, X_ROD_Y_UP, 0],
    ramp: "comp",
    outline: "mid",
    noCrease: true,
    mountOn: "gantry.yCarriage.L",
    allowOverlap: ["gantry.yCarriage.R", "subject.thCarriage"]
  });
  reg.part("gantry.xRod.lower", xRodGeo, {
    parent: yGroup,
    pos: [0, X_ROD_Y_LO, 0],
    ramp: "comp",
    outline: "mid",
    noCrease: true,
    mountOn: "gantry.yCarriage.L",
    allowOverlap: ["gantry.yCarriage.R", "subject.thCarriage"]
  });

  // Four CoreXY idler pulleys mounted on the Y-carriages
  const idlerGeo = buildCylinderGeometry(0.065, 0.065, 0.055, { segments: 16, axis: "y" });
  const idlers = [
    ["LA", -1.52, SPEC.BELT_A_Y, 0.09, "gantry.yCarriage.L"],
    ["LB", -1.52, SPEC.BELT_B_Y, -0.09, "gantry.yCarriage.L"],
    ["RA", 1.52, SPEC.BELT_A_Y, 0.09, "gantry.yCarriage.R"],
    ["RB", 1.52, SPEC.BELT_B_Y, -0.09, "gantry.yCarriage.R"]
  ];
  for (const [key, ix, iy, iz, mOn] of idlers) {
    reg.part(`gantry.yIdler.${key}`, idlerGeo, {
      parent: yGroup,
      pos: [ix, iy, iz],
      ramp: "brass",
      outline: "lo",
      noCrease: true,
      mountOn: mOn
    });
  }

  // 2. Direct-Drive Toolhead Assembly (child of yGroup, translates along X with st.xt)
  const thGroup = reg.group("subject.toolhead", {
    parent: yGroup,
    pos: [initSt.xt, 0, 0],
    stage: "subject"
  });

  reg.part("subject.thCarriage", new THREE.BoxGeometry(0.46, 0.34, 0.22), {
    parent: thGroup,
    pos: [0, 1.75, 0],
    ramp: "lo",
    outline: "hi",
    crease: "lo",
    mountOn: "gantry.xRod.upper",
    allowOverlap: ["gantry.xRod.lower"]
  });

  reg.part("subject.thBackplate", new THREE.BoxGeometry(0.48, 0.56, 0.10), {
    parent: thGroup,
    pos: [0, 1.82, -0.15],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "subject.thCarriage",
    allowOverlap: ["gantry.xRod.upper", "gantry.xRod.lower"]
  });

  reg.part("subject.thFrontCover", new THREE.BoxGeometry(0.48, 0.58, 0.22), {
    parent: thGroup,
    pos: [0, 1.80, 0.15],
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    cutawayHide: true,
    mountOn: "subject.thCarriage",
    allowOverlap: [
      "subject.thBackplate",
      "subject.extGearLarge",
      "subject.extPinion",
      "subject.filamentStrand",
      "subject.heatsink",
      "subject.hotendFan",
      "subject.partDuct"
    ]
  });

  // 9:53 Dual-Gear Direct-Drive Extruder
  const extGearGroup = reg.group("subject.extGearGroup", {
    parent: thGroup,
    pos: [-0.07, 1.94, 0.12],
    stage: "subject"
  });
  reg.part("subject.extGearLarge", buildExternalGearGeometry(0.13, 24, 0.020, 0.05, 0.34), {
    parent: extGearGroup,
    pos: [0, 0, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "subject.thCarriage",
    allowOverlap: ["subject.thBackplate", "subject.extPinion", "subject.filamentStrand"]
  });

  const extPinionGroup = reg.group("subject.extPinionGroup", {
    parent: thGroup,
    pos: [0.11, 1.99, 0.12],
    stage: "subject"
  });
  reg.part("subject.extPinion", buildExternalGearGeometry(0.052, 10, 0.016, 0.05, 0.28), {
    parent: extPinionGroup,
    pos: [0, 0, 0],
    ramp: "copper",
    outline: "mid",
    crease: "lo",
    mountOn: "subject.extGearLarge",
    allowOverlap: ["subject.thCarriage", "subject.thBackplate", "subject.filamentStrand"]
  });

  reg.part(
    "subject.filamentStrand",
    buildCylinderGeometry(0.022, 0.022, 0.34, { segments: 12, axis: "y" }),
    {
      parent: thGroup,
      pos: [0, 1.93, 0],
      ramp: "lit",
      outline: "lit",
      noCrease: true,
      mountOn: "subject.thCarriage",
      allowOverlap: [
        "subject.extGearLarge",
        "subject.extPinion",
        "subject.thBackplate",
        "subject.thFrontCover",
        "subject.heatsink"
      ]
    }
  );

  // All-metal heatsink, axial fan, 300C ceramic heater block, nozzle & cooling duct (centered on z = 0)
  reg.part("subject.heatsink", new THREE.BoxGeometry(0.20, 0.18, 0.16), {
    parent: thGroup,
    pos: [0, 1.60, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "subject.thCarriage",
    allowOverlap: ["subject.thBackplate"]
  });

  const finPts = [];
  for (let i = -2; i <= 2; i++) {
    const fy = 1.60 + i * 0.03;
    finPts.push(new THREE.Vector3(-0.102, fy, 0.082), new THREE.Vector3(0.102, fy, 0.082));
  }
  reg.detail("subject.heatsink.fins", new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(finPts), kit.lineMaterials.mid), {
    parent: thGroup
  });

  reg.part("subject.hotendFan", new THREE.BoxGeometry(0.16, 0.16, 0.05), {
    parent: thGroup,
    pos: [0, 1.60, 0.105],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "subject.heatsink",
    allowOverlap: ["subject.thFrontCover"]
  });

  reg.part("subject.heaterBlock", new THREE.BoxGeometry(0.15, 0.10, 0.15), {
    parent: thGroup,
    pos: [0, 1.46, 0],
    ramp: "comb",
    outline: "hi",
    crease: "lo",
    mountOn: "subject.heatsink"
  });

  reg.part(
    "subject.nozzleTip",
    buildCylinderGeometry(0.042, 0.013, 0.06, { segments: 16, axis: "y" }),
    {
      parent: thGroup,
      pos: [0, 1.38, 0],
      ramp: "brass",
      outline: "mid",
      noCrease: true,
      mountOn: "subject.heaterBlock"
    }
  );

  reg.part("subject.partDuct", new THREE.BoxGeometry(0.36, 0.11, 0.16), {
    parent: thGroup,
    pos: [0, 1.46, -0.12],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "subject.thBackplate",
    allowOverlap: ["subject.heatsink", "subject.heaterBlock"]
  });

  // 3. Synchronized 3-Lead-Screw Bed Assembly & Growing Printed Vase
  const bedGroup = reg.group("subject.bedGroup", {
    pos: [0, -initSt.bedDrop, 0],
    stage: "subject"
  });

  reg.part("subject.bedFrame", buildSpiderBedFrameGeometry(BED_FRAME_T), {
    parent: bedGroup,
    pos: [0, 1.251, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.zScrew.r",
    allowOverlap: ["struct.zScrew.fl", "struct.zScrew.fr"]
  });

  reg.part(
    "subject.heatbed",
    buildSlabGeometry(HEATBED_SIZE, HEATBED_SIZE, HEATBED_T, { radius: 0.12, bevel: false }),
    {
      parent: bedGroup,
      pos: [BED_CX, 1.311, BED_CZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "subject.bedFrame"
    }
  );

  reg.part(
    "subject.peiPlate",
    buildSlabGeometry(PLATE_SIZE, PLATE_SIZE, PLATE_T - 0.008, {
      radius: 0.10,
      bevel: true,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      bevelSegments: 1
    }),
    {
      parent: bedGroup,
      pos: [BED_CX, BED_TOP_Y0 - 0.004, BED_CZ],
      ramp: "brass",
      outline: "hi",
      crease: "lo",
      mountOn: "subject.heatbed"
    }
  );

  const peiGrid = makeDatumGrid(2.32, 2.32, 6, 6, BED_TOP_Y0 + 0.002, kit, "lo");
  peiGrid.position.set(BED_CX, 0, BED_CZ);
  reg.detail("subject.peiGrid", peiGrid, { parent: bedGroup });

  // Printed vase raft + 14 stacked twisting bands (pivot at bottom of each band so scale.y grows upward)
  reg.part(
    "subject.print.raft",
    buildSlabGeometry(PART_HALF * 2.10, PART_HALF * 2.10, RAFT_H, { radius: 0.16, bevel: false }),
    {
      parent: bedGroup,
      pos: [BED_CX, BED_TOP_Y0 + RAFT_H, BED_CZ],
      ramp: "lit",
      outline: "lit",
      crease: "faint",
      mountOn: "subject.peiPlate",
      allowOverlap: ["subject.nozzleTip", "subject.heaterBlock", "subject.partDuct"]
    }
  );

  for (let k = 0; k < N_BANDS; k++) {
    const w = bandHalf(k) * 2;
    const bandGeo = buildSlabGeometry(w, w, BAND_H, { radius: 0.14, bevel: false });
    bandGeo.translate(0, BAND_H, 0);
    reg.part(`subject.print.band.${k}`, bandGeo, {
      parent: bedGroup,
      pos: [BED_CX, BED_TOP_Y0 + RAFT_H + k * BAND_H, BED_CZ],
      rot: [0, bandRot(k), 0],
      ramp: "lit",
      outline: "lit",
      outlineWidth: 0.015,
      crease: "faint",
      detail: true
    });
  }
}
