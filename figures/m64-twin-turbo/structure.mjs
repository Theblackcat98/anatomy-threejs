import * as THREE from "three";
import { SPEC, BANK_SIGN, CYL_Z } from "./model.mjs";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makeRingLine,
  makeScrewDetail
} from "../../kit/primitives.mjs";

function makeHollowCylinderGeo(rIn, rOut, length, axis = "x", segments = 32) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: segments
  });
  geo.translate(0, 0, -length * 0.5);
  if (axis === "x") {
    geo.rotateY(Math.PI / 2);
  } else if (axis === "y") {
    geo.rotateX(Math.PI / 2);
  }
  return geo;
}

function makePerforatedBulkheadGeo(w, h, thickness, boreR) {
  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = 0.06;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - r);
  shape.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw + r, hh);
  shape.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hh + r);
  shape.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);

  const bore = new THREE.Path();
  bore.absarc(0, 0, boreR, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.008,
    bevelSegments: 2,
    curveSegments: 24
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function makeCurvedRunnerGeo(points, radius, tubularSegments = 20, radialSegments = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
}

export function buildStructure(reg, kit) {
  const gStruct = reg.group("structure", { stage: "structure" });

  // ---------------------------------------------------------------------------
  // 1. Horizontally Split Aluminum Crankcase (hollow central crank bay)
  // ---------------------------------------------------------------------------
  const sumpGeo = buildSlabGeometry(0.90, 2.06, 0.075, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    centerY: true
  });
  reg.part("struct.sumpPan", sumpGeo, {
    parent: gStruct,
    pos: [0, -0.342, -0.02],
    ramp: "lo",
    mountOn: "base.stanchion.fl",
    allowOverlap: [
      "base.stanchion.fr",
      "base.stanchion.rl",
      "base.stanchion.rr"
    ]
  });

  // Front & rear main bearing bulkheads (with 0.145 radial crank bore around Z axis)
  const bulkheadGeo = makePerforatedBulkheadGeo(0.90, 0.58, 0.12, 0.145);
  reg.part("struct.bulkhead.front", bulkheadGeo, {
    parent: gStruct,
    pos: [0, 0.0, 0.93],
    ramp: "mid",
    mountOn: "struct.sumpPan"
  });
  reg.part("struct.bulkhead.rear", bulkheadGeo, {
    parent: gStruct,
    pos: [0, 0.0, -0.94],
    ramp: "mid",
    mountOn: "struct.sumpPan"
  });

  // Lower & upper longitudinal crankcase skirt rails (clear of all 6 cylinder bores)
  const skirtGeo = buildSlabGeometry(0.095, 1.76, 0.065, {
    radius: 0.02,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    centerY: true
  });
  for (const [side, sx] of [["L", -1], ["R", 1]]) {
    reg.part(`struct.skirtLower.${side}`, skirtGeo, {
      parent: gStruct,
      pos: [sx * 0.405, -0.26, -0.005],
      ramp: "mid",
      mountOn: "struct.sumpPan",
      allowOverlap: ["struct.bulkhead.front", "struct.bulkhead.rear"]
    });
    reg.part(`struct.skirtUpper.${side}`, skirtGeo, {
      parent: gStruct,
      pos: [sx * 0.405, 0.255, -0.005],
      ramp: "mid",
      mountOn: "struct.bulkhead.front",
      allowOverlap: ["struct.bulkhead.rear"]
    });
  }

  // Inter-cylinder crankcase webs bridging lower & upper skirts between barrel openings
  const webGeo = buildSlabGeometry(0.095, 0.13, 0.44, {
    radius: 0.015,
    bevel: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    centerY: true
  });
  const webPositions = [
    ["L0", -0.405, -0.375, "L"],
    ["L1", -0.405, 0.295, "L"],
    ["R0", 0.405, -0.295, "R"],
    ["R1", 0.405, 0.375, "R"]
  ];
  for (const [id, x, z, side] of webPositions) {
    reg.part(`struct.web.${id}`, webGeo, {
      parent: gStruct,
      pos: [x, 0.0, z],
      ramp: "lo",
      mountOn: `struct.skirtLower.${side}`,
      allowOverlap: [`struct.skirtUpper.${side}`]
    });
  }

  // Cutaway-hide upper crankcase spine roof bridging Left & Right cylinder banks behind fan housing
  const roofGeo = buildSlabGeometry(0.90, 1.61, 0.055, {
    radius: 0.04,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.008,
    centerY: true
  });
  reg.part("struct.crankcaseRoof", roofGeo, {
    parent: gStruct,
    pos: [0, 0.325, -0.155],
    ramp: "mid",
    cutawayHide: true,
    mountOn: "struct.skirtUpper.L",
    allowOverlap: ["struct.skirtUpper.R", "struct.bulkhead.rear"]
  });

  // ---------------------------------------------------------------------------
  // 2. 6 Finned Nikasil Cylinder Barrels (glass cutaway sleeves) & SOHC Heads
  // ---------------------------------------------------------------------------
  const barrelLen = SPEC.BARREL_X_OUTER - SPEC.BARREL_X_INNER; // 0.68
  const barrelMidX = (SPEC.BARREL_X_INNER + SPEC.BARREL_X_OUTER) * 0.5; // 0.78
  const barrelGeo = makeHollowCylinderGeo(SPEC.BORE_R, SPEC.BARREL_R, barrelLen, "x", 28);

  for (let i = 0; i < 6; i++) {
    const s = BANK_SIGN[i];
    const side = s < 0 ? "L" : "R";
    const cz = CYL_Z[i];
    reg.part(`struct.cylBarrel.${i}`, barrelGeo, {
      parent: gStruct,
      pos: [s * barrelMidX, 0, cz],
      ramp: "glass",
      opacity: 0.26,
      mountOn: `struct.skirtLower.${side}`,
      allowOverlap: [`struct.skirtUpper.${side}`]
    });

    // 8 air-cooled cylinder fin rings around each Nikasil barrel
    for (let f = 0; f < 8; f++) {
      const fx = s * (SPEC.BARREL_X_INNER + 0.05 + f * 0.082);
      const ring = makeRingLine(SPEC.BARREL_R + 0.028, 24, kit, "lo");
      ring.rotation.set(0, Math.PI / 2, 0);
      ring.position.set(fx, 0, cz);
      reg.detail(`struct.cylFin.${i}.${f}`, ring, { parent: gStruct, stage: "structure" });
    }
  }

  // SOHC Finned Aluminum Cylinder Heads & Cutaway Valve Covers
  const headGeo = buildSlabGeometry(0.24, 1.80, 0.42, {
    radius: 0.035,
    bevel: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    centerY: true
  });
  const camBoxGeo = buildSlabGeometry(0.14, 1.74, 0.30, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    centerY: true
  });
  const valveCoverGeo = buildSlabGeometry(0.06, 1.70, 0.32, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    centerY: true
  });

  const bankMountInfo = [
    ["L", -1, -0.04, 0],
    ["R", 1, 0.04, 3]
  ];
  for (const [side, s, zCenter, firstCyl] of bankMountInfo) {
    reg.part(`struct.cylHead.${side}`, headGeo, {
      parent: gStruct,
      pos: [s * SPEC.HEAD_X_CENTER, 0, zCenter],
      ramp: "mid",
      mountOn: `struct.cylBarrel.${firstCyl}`,
      allowOverlap: [`struct.cylBarrel.${firstCyl + 1}`, `struct.cylBarrel.${firstCyl + 2}`]
    });
    reg.part(`struct.camBox.${side}`, camBoxGeo, {
      parent: gStruct,
      pos: [s * 1.44, 0, zCenter],
      ramp: "lo",
      mountOn: `struct.cylHead.${side}`
    });
    reg.part(`struct.valveCover.${side}`, valveCoverGeo, {
      parent: gStruct,
      pos: [s * 1.545, 0, zCenter],
      ramp: "hi",
      cutawayHide: true,
      mountOn: `struct.camBox.${side}`
    });

    // Horizontal head cooling fin ribs along outer perimeter (cosmetic detail)
    for (let f = -2; f <= 2; f++) {
      const fin = makeRingLine(0.01, 4, kit, "lo");
      void fin; // Replaced with clean flange bolts below
    }
    for (let k = 0; k < 3; k++) {
      const cz = CYL_Z[firstCyl + k];
      reg.detail(`struct.headBolt.${side}.${k}`, makeScrewDetail(s * 1.38, 0.16, cz, 0.022, "x", kit), {
        parent: gStruct,
        stage: "structure"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Top-Center 11-Blade Axial Cooling Fan Shroud & Alternator Stator Hub
  // ---------------------------------------------------------------------------
  const shroudGeo = makeHollowCylinderGeo(0.41, 0.49, 0.34, "z", 36);
  const shroudCollarGeo = buildCylinderGeometry(0.42, 0.46, 0.16, { segments: 28, axis: "y" });
  const altHubGeo = buildCylinderGeometry(0.14, 0.145, 0.22, { segments: 24, axis: "z" });
  const strutGeo = buildSlabGeometry(0.036, 0.07, 0.28, {
    radius: 0.01,
    bevel: false,
    centerY: true
  });

  reg.part("struct.fanHousingBase", shroudCollarGeo, {
    parent: gStruct,
    pos: [0, 0.36, SPEC.FAN_Z],
    ramp: "mid",
    mountOn: "struct.bulkhead.front",
    allowOverlap: ["struct.crankcaseRoof"]
  });
  reg.part("struct.fanShroud", shroudGeo, {
    parent: gStruct,
    pos: [0, SPEC.FAN_Y, SPEC.FAN_Z],
    ramp: "hi",
    mountOn: "struct.fanHousingBase"
  });
  reg.part("struct.alternatorHub", altHubGeo, {
    parent: gStruct,
    pos: [0, SPEC.FAN_Y, SPEC.FAN_Z - 0.05],
    ramp: "copper",
    mountOn: "struct.fanShroud"
  });
  // 3 stator struts anchoring alternator hub inside fiberglass fan shroud
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 6;
    const rm = 0.275;
    reg.part(`struct.fanStrut.${i}`, strutGeo, {
      parent: gStruct,
      pos: [Math.cos(a) * rm, SPEC.FAN_Y + Math.sin(a) * rm, SPEC.FAN_Z - 0.06],
      rot: [0, 0, a - Math.PI / 2],
      ramp: "lo",
      detail: true,
      mountOn: "struct.fanShroud"
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Central 74 mm Throttle Body & 6-Runner Spider Intake Plenum (ramp: "intake")
  // ---------------------------------------------------------------------------
  const plenumGeo = buildSlabGeometry(0.68, 0.52, 0.20, {
    radius: 0.09,
    bevel: true,
    bevelSize: 0.016,
    bevelThickness: 0.014,
    centerY: true
  });
  const plenumCapGeo = buildSlabGeometry(0.58, 0.42, 0.055, {
    radius: 0.06,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.008,
    centerY: true
  });
  const throttleGeo = buildCylinderGeometry(0.115, 0.115, 0.24, { segments: 24, axis: "z" });
  const throttleFlangeGeo = buildCylinderGeometry(0.145, 0.145, 0.036, { segments: 24, axis: "z" });
  const logGeo = buildCylinderGeometry(0.105, 0.105, 1.66, { segments: 22, axis: "z" });

  // Plenum stays directly atop the intake struts from upper crankcase rails
  const plenumStayGeo = buildCylinderGeometry(0.038, 0.042, 0.36, { segments: 14, axis: "y" });
  reg.part("struct.plenumStay.L", plenumStayGeo, {
    parent: gStruct,
    pos: [-0.405, 0.46, -0.26],
    ramp: "lo",
    mountOn: "struct.skirtUpper.L"
  });
  reg.part("struct.plenumStay.R", plenumStayGeo, {
    parent: gStruct,
    pos: [0.405, 0.46, -0.26],
    ramp: "lo",
    mountOn: "struct.skirtUpper.R"
  });

  reg.part("struct.plenum", plenumGeo, {
    parent: gStruct,
    pos: [0.0, 0.72, -0.28],
    ramp: "intake",
    mountOn: "struct.plenumStay.L",
    allowOverlap: ["struct.plenumStay.R", "struct.crankcaseRoof"]
  });
  reg.part("struct.plenumCap", plenumCapGeo, {
    parent: gStruct,
    pos: [0.0, 0.86, -0.28],
    ramp: "hi",
    cutawayHide: true,
    mountOn: "struct.plenum"
  });

  reg.part("struct.throttleBody", throttleGeo, {
    parent: gStruct,
    pos: [0.0, 0.80, 0.09],
    rot: [-0.52, 0, 0],
    ramp: "brass",
    mountOn: "struct.plenum"
  });
  reg.part("struct.throttleFlange", throttleFlangeGeo, {
    parent: gStruct,
    pos: [0.0, 0.74, -0.01],
    rot: [-0.52, 0, 0],
    ramp: "mid",
    detail: true,
    mountOn: "struct.throttleBody"
  });

  // Left & Right distribution logs & cross-feed elbows from central plenum
  const logBranchGeo = buildCylinderGeometry(0.082, 0.082, 0.34, { segments: 18, axis: "x" });
  const bossGeo = buildCylinderGeometry(0.088, 0.098, 0.12, { segments: 18, axis: "y" });

  for (const [side, s, zLog] of [["L", -1, -0.04], ["R", 1, 0.04]]) {
    reg.part(`struct.plenumArm.${side}`, logBranchGeo, {
      parent: gStruct,
      pos: [s * 0.40, 0.66, -0.28],
      ramp: "intake",
      mountOn: "struct.plenum"
    });
    reg.part(`struct.intakeLog.${side}`, logGeo, {
      parent: gStruct,
      pos: [s * 0.56, 0.62, zLog],
      ramp: "intake",
      mountOn: `struct.plenumArm.${side}`
    });
    reg.anchor(`plenum.tap.${side}`, s * 0.56, 0.55, -0.82, gStruct, { dir: [s * 0.35, -0.75, -0.55] });
  }

  for (let i = 0; i < 6; i++) {
    const s = BANK_SIGN[i];
    const side = s < 0 ? "L" : "R";
    const cz = CYL_Z[i];
    reg.part(`struct.intakeBoss.${i}`, bossGeo, {
      parent: gStruct,
      pos: [s * SPEC.HEAD_X_CENTER, 0.25, cz],
      ramp: "mid",
      mountOn: `struct.cylHead.${side}`
    });
    const runnerGeo = makeCurvedRunnerGeo(
      [
        [s * 0.56, 0.62, cz],
        [s * 0.94, 0.57, cz],
        [s * 1.18, 0.42, cz],
        [s * SPEC.HEAD_X_CENTER, 0.27, cz]
      ],
      0.068
    );
    reg.part(`struct.intakeRunner.${i}`, runnerGeo, {
      parent: gStruct,
      ramp: "intake",
      mountOn: `struct.intakeLog.${side}`,
      allowOverlap: [`struct.intakeBoss.${i}`, `struct.cylHead.${side}`]
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Top-Mounted Dual-Inlet Air-to-Air Intercooler (y = 1.18, z = -0.52)
  // ---------------------------------------------------------------------------
  const icCoreGeo = buildSlabGeometry(1.56, 0.78, 0.16, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    centerY: true
  });
  const icCoverGeo = buildSlabGeometry(1.52, 0.74, 0.045, {
    radius: 0.03,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    centerY: true
  });
  const icTankGeo = buildSlabGeometry(0.28, 0.66, 0.22, {
    radius: 0.08,
    bevel: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    centerY: true
  });
  const icSnoutGeo = buildCylinderGeometry(0.082, 0.094, 0.15, { segments: 20, axis: "y" });
  const icOutletDuctGeo = makeCurvedRunnerGeo(
    [
      [0.0, 1.13, -0.15],
      [0.0, 1.02, 0.03],
      [0.0, 0.87, 0.14]
    ],
    0.105,
    18,
    18
  );
  const icStayGeo = buildCylinderGeometry(0.034, 0.038, 0.84, { segments: 14, axis: "y" });

  // Intercooler rear stays anchoring core directly onto rear crankcase bulkhead
  reg.part("struct.icStay.L", icStayGeo, {
    parent: gStruct,
    pos: [-0.36, 0.70, -0.88],
    ramp: "lo",
    mountOn: "struct.bulkhead.rear",
    allowOverlap: ["struct.crankcaseRoof"]
  });
  reg.part("struct.icStay.R", icStayGeo, {
    parent: gStruct,
    pos: [0.36, 0.70, -0.88],
    ramp: "lo",
    mountOn: "struct.bulkhead.rear",
    allowOverlap: ["struct.crankcaseRoof"]
  });

  reg.part("struct.intercooler.core", icCoreGeo, {
    parent: gStruct,
    pos: [0.0, SPEC.IC_Y, SPEC.IC_Z],
    ramp: "comp",
    mountOn: "struct.icStay.L",
    allowOverlap: ["struct.icStay.R"]
  });
  reg.part("struct.intercooler.cover", icCoverGeo, {
    parent: gStruct,
    pos: [0.0, SPEC.IC_Y + 0.11, SPEC.IC_Z],
    ramp: "mid",
    cutawayHide: true,
    mountOn: "struct.intercooler.core"
  });

  // Bar-and-plate louver lines across top of intercooler core
  for (let r = -6; r <= 6; r++) {
    const pts = [
      new THREE.Vector3(-0.74, SPEC.IC_Y + 0.095, SPEC.IC_Z + r * 0.055),
      new THREE.Vector3(0.74, SPEC.IC_Y + 0.095, SPEC.IC_Z + r * 0.055)
    ];
    const lGeo = new THREE.BufferGeometry().setFromPoints(pts);
    reg.detail(`struct.icFin.${r + 6}`, new THREE.Line(lGeo, kit.lineMaterials.lo), {
      parent: gStruct,
      stage: "structure"
    });
  }

  reg.part("struct.intercooler.outletDuct", icOutletDuctGeo, {
    parent: gStruct,
    ramp: "comp",
    mountOn: "struct.intercooler.core",
    allowOverlap: ["struct.throttleBody"]
  });

  // Twin copper/bronze intercooler end-tanks & downward inlet snouts matching ANCHORS.icInletL/R
  for (const [side, s] of [["L", -1], ["R", 1]]) {
    reg.part(`struct.intercooler.tank${side}`, icTankGeo, {
      parent: gStruct,
      pos: [s * 0.91, SPEC.IC_Y - 0.03, SPEC.IC_Z],
      ramp: "copper",
      mountOn: "struct.intercooler.core"
    });
    reg.part(`struct.intercooler.snout${side}`, icSnoutGeo, {
      parent: gStruct,
      pos: [s * 1.01, SPEC.IC_Y - 0.14, SPEC.IC_Z],
      rot: [0, 0, s * 0.42],
      ramp: "copper",
      mountOn: `struct.intercooler.tank${side}`
    });
    reg.anchor(`icInlet${side}`, s * 1.06, 0.98, SPEC.IC_Z, gStruct, { dir: [s * 0.41, -0.91, 0.0] });
  }
}
