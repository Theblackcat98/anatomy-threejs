import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry
} from "../../kit/primitives.mjs";
import { SPEC, getRigState } from "./model.mjs";

const _rodOrigin = new THREE.Vector3(0, 1, 0);
const _rodDelta = new THREE.Vector3();
const _rodMid = new THREE.Vector3();
const _rodDir = new THREE.Vector3();
const _rodPosA = new THREE.Vector3();
const _rodPosB = new THREE.Vector3();
const _bailPos = new THREE.Vector3();
const _blockPos = new THREE.Vector3();
const _offA = new THREE.Vector3(0, 0, -0.045);
const _offB = new THREE.Vector3(0, 0, +0.045);
const _invRig = new THREE.Matrix4();

/**
 * Orients a unit-length Y cylinder mesh to span cleanly between world points A and B.
 */
function orientRodBetween(mesh, posA, posB, radiusScale = 1) {
  if (!mesh) return;
  _rodDelta.subVectors(posB, posA);
  const dist = _rodDelta.length();
  if (dist < 1e-4) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  _rodMid.addVectors(posA, posB).multiplyScalar(0.5);
  _rodDir.copy(_rodDelta).multiplyScalar(1 / dist);
  mesh.position.copy(_rodMid);
  mesh.quaternion.setFromUnitVectors(_rodOrigin, _rodDir);
  mesh.scale.set(radiusScale, dist, radiusScale);
}

/**
 * Draws the diegetic 2D telemetry canvas mounted on the yacht cockpit coaming.
 */
function drawRigScreen(ctx, width, height, state) {
  const st = getRigState(state.theta ?? SPEC.initialTheta, state.params || state, state.triggers || {});

  // Deep instrument panel background
  ctx.fillStyle = "#0e131a";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#2b394a";
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  // Header strip with active gear badge
  ctx.fillStyle = "#18222f";
  ctx.fillRect(6, 6, width - 12, 24);

  ctx.fillStyle = st.isGear2 ? "#f97316" : "#38bdf8";
  ctx.font = "bold 11px ui-monospace, Menlo, monospace";
  ctx.fillText(
    `GEAR ${st.activeGear} · ${st.isGear2 ? "CCW 46:1 GRIND" : "CW 13.5:1 TRIM"}`,
    12,
    22
  );

  // Top-right wind readout
  ctx.fillStyle = st.gustEnv > 0.25 ? "#ef4444" : "#cbd5e1";
  ctx.textAlign = "right";
  ctx.fillText(`WIND ${Math.round(st.effWindKt)} KT`, width - 12, 22);
  ctx.textAlign = "left";

  // Left half: Force & ratio telemetry bars
  const barX = 12;
  const barW = 124;
  const rows = [
    {
      label: `SHEET ${st.sheetLoadKn.toFixed(1)} kN`,
      frac: Math.min(1, st.sheetLoadKn / 10),
      color: "#f59e0b"
    },
    {
      label: `V1 SHROUD ${st.windwardShroudKn.toFixed(1)} kN`,
      frac: Math.min(1, st.windwardShroudKn / 18.5),
      color: "#ef4444"
    },
    {
      label: `BACKSTAY ${st.backstayKn.toFixed(1)} kN`,
      frac: Math.min(1, st.backstayKn / 14.5),
      color: "#a855f7"
    },
    {
      label: `CAMBER f/c ${st.camberPct.toFixed(1)}%`,
      frac: Math.min(1, st.camberPct / 18),
      color: "#38bdf8"
    }
  ];

  rows.forEach((row, idx) => {
    const y = 40 + idx * 22;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px ui-monospace, Menlo, monospace";
    ctx.fillText(row.label, barX, y + 7);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(barX, y + 10, barW, 5);
    ctx.fillStyle = row.color;
    ctx.fillRect(barX, y + 10, Math.max(2, barW * row.frac), 5);
  });

  // Right half: Live NACA airfoil camber profile & load readout
  const plotX = 154;
  const plotY = 38;
  const plotW = width - plotX - 12;
  const plotH = 66;

  ctx.fillStyle = "#121a24";
  ctx.fillRect(plotX, plotY, plotW, plotH);
  ctx.strokeStyle = "#263344";
  ctx.lineWidth = 1;
  ctx.strokeRect(plotX, plotY, plotW, plotH);

  // Dashed chord line
  const chordY = plotY + plotH * 0.72;
  ctx.strokeStyle = "#475569";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(plotX + 8, chordY);
  ctx.lineTo(plotX + plotW - 8, chordY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Camber curve (draft peaks at 38% chord)
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const p = 0.38;
  const amp = plotH * (st.camberRatio * 2.85);
  for (let i = 0; i <= 24; i++) {
    const xi = i / 24;
    const prof =
      xi < p
        ? (2 * p * xi - xi * xi) / (p * p)
        : (1 - 2 * p + 2 * p * xi - xi * xi) / ((1 - p) * (1 - p));
    const px = plotX + 8 + xi * (plotW - 16);
    const py = chordY - amp * prof;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Bottom footer line on screen
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "9px ui-monospace, Menlo, monospace";
  ctx.fillText(`CAPSTAN ${SPEC.CAPSTAN_TURNS.toFixed(1)}T -> TAIL ${st.tailLoadN.toFixed(0)} N`, plotX, plotY + plotH + 16);
}

export function buildMechanism(reg, kit) {
  const {
    WINCH_CX,
    WINCH_CZ,
    COMPOUND_Y,
    MAST_Z,
    STERN_BACKSTAY_X
  } = SPEC;

  const initSt = getRigState(SPEC.initialTheta, {}, {});

  // 1. 2nd-Speed Compound Reduction Pinion (mounted on rotating shaftGroup)
  const shaftGroup = reg.groups.get("subject.shaftGroup")?.group;
  reg.part(
    "mech.shaftPinion",
    buildExternalGearGeometry(0.145, 12, 0.020, 0.12, 0.068 / 0.145),
    {
      parent: shaftGroup,
      pos: [0, COMPOUND_Y, 0],
      rot: [Math.PI / 2, 0, 0],
      ramp: "copper",
      outline: "mid",
      crease: "faint",
      stage: "mechanism",
      mountOn: "subject.mainShaft",
      allowOverlap: ["struct.winchCenterPost", "mech.compoundGear"]
    }
  );

  // Compound Reduction Shaft & 18T Idler / 10T Pawl Gear (center dist = 0.336 vs 0.145 + 0.19)
  const compoundGroup = reg.group("mech.compoundGroup", {
    pos: [WINCH_CX - 0.31, COMPOUND_Y, WINCH_CZ + 0.13],
    rot: [0, initSt.compoundRad, 0],
    stage: "mechanism"
  });

  reg.part(
    "mech.compoundShaft",
    buildCylinderGeometry(0.045, 0.045, 0.44, { segments: 16, axis: "y" }),
    {
      parent: compoundGroup,
      pos: [0, 0, 0],
      ramp: "hi",
      outline: "mid",
      noCrease: true,
      mountOn: "struct.winchBaseSkirt",
      allowOverlap: [
        "struct.planetCarrierPlate",
        "subject.drumRear",
        "subject.drumFront"
      ]
    }
  );

  reg.part(
    "mech.compoundGear",
    buildExternalGearGeometry(0.19, 18, 0.020, 0.11, 0.045 / 0.19),
    {
      parent: compoundGroup,
      pos: [0, 0, 0],
      rot: [Math.PI / 2, 0, 0],
      ramp: "comp",
      outline: "mid",
      crease: "faint",
      mountOn: "mech.compoundShaft",
      allowOverlap: [
        "mech.shaftPinion",
        "subject.drumRear",
        "subject.drumFront",
        "struct.winchBaseSkirt"
      ]
    }
  );

  reg.part(
    "mech.compoundPawlGear",
    buildExternalGearGeometry(0.11, 10, 0.018, 0.10, 0.045 / 0.11),
    {
      parent: compoundGroup,
      pos: [0, 0.105, 0],
      rot: [Math.PI / 2, 0, 0],
      ramp: "copper",
      outline: "mid",
      crease: "faint",
      mountOn: "mech.compoundShaft",
      allowOverlap: ["struct.planetCarrierPlate"]
    }
  );

  // 2. Hydraulic Backstay Cylinder & Handwheel on Stern Pad (top at y=-0.96 clears swinging boom y_min=-0.882)
  const backstayGroup = reg.group("mech.backstayGroup", { stage: "mechanism" });
  reg.part(
    "mech.backstayCylinder",
    buildCylinderGeometry(0.068, 0.078, 0.30, { segments: 20, axis: "y" }),
    {
      parent: backstayGroup,
      pos: [STERN_BACKSTAY_X, -1.11, MAST_Z],
      ramp: "comp",
      outline: "hi",
      crease: "lo",
      mountOn: "base.sternPad"
    }
  );
  reg.anchor("backstay.cylinder.top", STERN_BACKSTAY_X, -0.96, MAST_Z, backstayGroup);

  reg.part(
    "mech.backstayWheel",
    buildCylinderGeometry(0.092, 0.092, 0.04, { segments: 18, axis: "y" }),
    {
      parent: backstayGroup,
      pos: [STERN_BACKSTAY_X, -1.06, MAST_Z + 0.085],
      rot: [Math.PI / 2, 0, 0],
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: "mech.backstayCylinder"
    }
  );

  // 3. Dynamic Standing Rigging Shrouds, Forestay, Backstay & Mainsheet Tackle (detail: true)
  const riggingGroup = reg.group("mech.riggingGroup", { stage: "mechanism" });
  const rodSpec = [
    { name: "mech.shroud.windwardV1", ramp: "comb", radius: 0.020 },
    { name: "mech.shroud.windwardUpper", ramp: "comb", radius: 0.019 },
    { name: "mech.shroud.windwardD1", ramp: "comb", radius: 0.017 },
    { name: "mech.shroud.leewardV1", ramp: "intake", radius: 0.016 },
    { name: "mech.shroud.leewardUpper", ramp: "intake", radius: 0.015 },
    { name: "mech.shroud.leewardD1", ramp: "intake", radius: 0.014 },
    { name: "mech.forestayRod", ramp: "hi", radius: 0.019 },
    { name: "mech.backstayRod", ramp: "comp", radius: 0.019 },
    { name: "mech.mainsheetSpan1", ramp: "lit", radius: 0.020 },
    { name: "mech.mainsheetSpan2", ramp: "lit", radius: 0.020 }
  ];

  const rodMeshes = {};
  rodSpec.forEach((spec) => {
    const rodGroup = reg.group(`${spec.name}.group`, {
      parent: riggingGroup,
      stage: "mechanism"
    });
    const rodUnitGeo = buildCylinderGeometry(spec.radius, spec.radius, 1, { segments: 10, axis: "y" });
    reg.part(spec.name, rodUnitGeo, {
      parent: rodGroup,
      pos: [0, 0, 0],
      ramp: spec.ramp,
      outline: "lo",
      noCrease: true,
      detail: true,
      mountOn: "struct.turnbuckle.windward"
    });
    rodMeshes[spec.name] = { mesh: rodGroup };
  });
  reg.root.userData.rigRods = rodMeshes;

  // 4. Audited Sheet Line Conduits (block -> winch entry fairlead; stripper tip -> cockpit cleat)
  reg.tube(
    "tube.sheet.lead",
    "block.sheet.out",
    [
      [-0.22, -1.04, 1.00],
      [0.00, -0.96, 1.02],
      [0.18, -0.92, 0.82]
    ],
    "winch.sheet.in",
    {
      parent: riggingGroup,
      stage: "mechanism",
      fromPart: "struct.turningSheave",
      toPart: "struct.sheetEntryGuide",
      leadOut: 0.22,
      leadIn: 0.22,
      radius: 0.032,
      segments: 34,
      radialSegments: 10,
      ramp: "lit",
      outline: "lit"
    }
  );

  reg.tube(
    "tube.sheet.tail",
    "winch.tail.exit",
    [
      [1.48, -0.15, 1.24],
      [1.84, -0.72, 1.26]
    ],
    "cleat.tail.in",
    {
      parent: riggingGroup,
      stage: "mechanism",
      fromPart: "struct.stripperTip",
      toPart: "struct.tailCleat",
      leadOut: 0.20,
      leadIn: 0.20,
      radius: 0.032,
      segments: 38,
      radialSegments: 10,
      ramp: "lit",
      outline: "lit"
    }
  );

  // 5. Diegetic Cockpit Force & Camber Monitor Pedestal + Screen
  const screenGroup = reg.group("mech.screenGroup", { stage: "mechanism" });
  reg.part("mech.screenPedestal", new THREE.BoxGeometry(0.42, 0.10, 0.16), {
    parent: screenGroup,
    pos: [-0.04, -1.37, 1.36],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSlab"
  });

  reg.screen("rig.screen", {
    parent: screenGroup,
    pos: [-0.04, -1.14, 1.36],
    rot: [-0.30, 0, 0],
    width: 0.96,
    height: 0.46,
    depth: 0.06,
    resolution: [288, 136],
    ramp: "lo",
    outline: "mid",
    stage: "mechanism",
    mountOn: "mech.screenPedestal",
    draw: drawRigScreen
  });

  // Sync #leg-comp swatch with active theme (runtime.mjs syncs lit/intake/comb/exhaust only)
  const legCompEl = typeof document !== "undefined" ? document.getElementById("leg-comp") : null;
  if (legCompEl) {
    const syncComp = (theme) => {
      if (theme?.channels?.comp) {
        legCompEl.style.background = theme.channels.comp;
      }
    };
    if (kit?.theme) syncComp(kit.theme);
    if (kit?.onThemeChange) kit.onThemeChange(syncComp);
  }

  // 6. Direct 3D Interactable Drag Controls
  reg.interactable("subject.handleGroup", {
    cursor: "grab",
    hint: "Drag sideways to crank 46ST winch handle (cranks drum / adjusts cadence)",
    onDrag: ({ dx, state, setParam }) => {
      state.theta -= dx * 0.022;
      if (setParam) {
        setParam("rpm", Math.round((state.params.rpm ?? 55) + dx * 0.12));
      }
    }
  });

  reg.interactable("subject.drumGroup", {
    cursor: "ew-resize",
    hint: "Drag drum horizontally to crank sheet wraps clockwise",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.016;
    }
  });

  reg.interactable("subject.boomGroup", {
    cursor: "ns-resize",
    hint: "Drag boom or sail to adjust apparent wind load & trim camber",
    onDrag: ({ dx, dy, state, setParam }) => {
      if (setParam) {
        setParam("windKt", Math.round((state.params.windKt ?? 18) - dy * 0.08 + dx * 0.04));
      }
    }
  });

  reg.interactable("mech.backstayCylinder", {
    cursor: "ns-resize",
    hint: "Drag hydraulic backstay vertically to pump mast bend & flatten camber",
    onDrag: ({ dy, state, setParam }) => {
      if (setParam) {
        setParam("backstay", Math.round((state.params.backstay ?? 45) - dy * 0.35));
      }
    }
  });

  // Perform initial rod placement so initial pose matches exact deformed state
  updateKinematics(reg, {
    theta: SPEC.initialTheta,
    params: { rpm: 55, gearMode: 1, windKt: 18, backstay: 45 },
    triggers: {}
  });
}

export function updateKinematics(reg, state) {
  const st = getRigState(state.theta ?? SPEC.initialTheta, state.params || state, state.triggers || {});

  // 1. Planetary & 2nd-Speed Compound Winch Kinematics
  const shaftGroup = reg.groups.get("subject.shaftGroup")?.group;
  const carrierGroup = reg.groups.get("subject.carrierGroup")?.group;
  const drumGroup = reg.groups.get("subject.drumGroup")?.group;
  const compoundGroup = reg.groups.get("mech.compoundGroup")?.group;

  if (shaftGroup) shaftGroup.rotation.y = st.handleRad;
  if (carrierGroup) carrierGroup.rotation.y = st.carrierRad;
  if (drumGroup) drumGroup.rotation.y = st.drumRad;
  if (compoundGroup) compoundGroup.rotation.y = st.compoundRad;

  for (let i = 0; i < 3; i++) {
    const pSpin = reg.groups.get(`subject.planetSpin.${i}`)?.group;
    if (pSpin) pSpin.rotation.y = st.planetSelfRad;
  }

  // 2. Deflecting Masthead & Pivoting Boom
  const mastTopGroup = reg.groups.get("struct.mastTopGroup")?.group;
  if (mastTopGroup) {
    mastTopGroup.rotation.z = -st.mastAftBendRad;
    mastTopGroup.rotation.x = -st.mastLeewardDropRad;
  }

  const boomGroup = reg.groups.get("subject.boomGroup")?.group;
  if (boomGroup) {
    boomGroup.rotation.y = -st.boomAngleRad;
  }

  // 3. Real-Time Aerodynamic Sail Camber & Leech Twist Vertex Deformation
  if (typeof reg.root.userData.updateSail === "function") {
    reg.root.userData.updateSail(st);
  }

  // Propagate matrix updates before reading world positions of moving rigging anchors
  reg.root.updateMatrixWorld(true);
  const riggingGroup = reg.groups.get("mech.riggingGroup")?.group || reg.root;
  _invRig.copy(riggingGroup.matrixWorld).invert();

  const toRigLocal = (anchorId, outVec) => {
    const obj = reg.joints.get(anchorId);
    if (!obj) return outVec.set(0, 0, 0);
    return obj.getWorldPosition(outVec).applyMatrix4(_invRig);
  };

  const rods = reg.root.userData.rigRods;
  if (rods) {
    const setRod = (name, anchorA, anchorB, scaleMul = 1) => {
      const entry = rods[name];
      if (!entry) return;
      toRigLocal(anchorA, _rodPosA);
      toRigLocal(anchorB, _rodPosB);
      orientRodBetween(entry.mesh, _rodPosA, _rodPosB, scaleMul);
    };

    const windThick = 0.92 + 0.34 * ((st.windwardShroudKn - 2.5) / 16.0);
    setRod("mech.shroud.windwardV1", "turnbuckle.windward.top", "spreader.tip.windward", windThick);
    setRod("mech.shroud.windwardUpper", "spreader.tip.windward", "masthead.windward", windThick);
    setRod("mech.shroud.windwardD1", "turnbuckle.windward.top", "spreader.root.windward", windThick * 0.95);

    setRod("mech.shroud.leewardV1", "turnbuckle.leeward.top", "spreader.tip.leeward", 0.9);
    setRod("mech.shroud.leewardUpper", "spreader.tip.leeward", "masthead.leeward", 0.9);
    setRod("mech.shroud.leewardD1", "turnbuckle.leeward.top", "spreader.root.leeward", 0.85);

    setRod("mech.forestayRod", "forestay.turnbuckle.top", "masthead.fore", 1.0);
    setRod("mech.backstayRod", "backstay.cylinder.top", "masthead.aft", 0.95 + 0.25 * st.backstayNorm);

    // Two-part mainsheet tackle between boom bail and deck turning block sheave
    toRigLocal("boom.mainsheet.bail", _bailPos);
    toRigLocal("block.sheet.out", _blockPos);
    orientRodBetween(rods["mech.mainsheetSpan1"]?.mesh, _rodPosA.copy(_bailPos).add(_offA), _rodPosB.copy(_blockPos).add(_offA), 0.9);
    orientRodBetween(rods["mech.mainsheetSpan2"]?.mesh, _rodPosA.copy(_bailPos).add(_offB), _rodPosB.copy(_blockPos).add(_offB), 0.9);
  }

  // 4. Update Stage 6 GLSL Aerodynamic Wind-Flow Shader Uniforms
  const shaderMat = reg.root.userData.windShaderMat;
  if (shaderMat?.uniforms) {
    shaderMat.uniforms.uTime.value = Math.abs(state.theta ?? SPEC.initialTheta) * 0.45;
    shaderMat.uniforms.uWindSpeed.value = 0.6 + st.windNorm * 1.6;
    shaderMat.uniforms.uCamber.value = st.camberRatio;
    shaderMat.uniforms.uGust.value = st.gustEnv;
    shaderMat.uniforms.uEnvelope.value = state.shaderEnv !== undefined ? state.shaderEnv : 1.0;
  }
}

export function tourAt(clock, _state) {
  return {
    azimOffsetDeg: Math.sin(clock * 0.22) * 8.0,
    elevOffsetDeg: Math.sin(clock * 0.14 + 0.6) * 3.0
  };
}
