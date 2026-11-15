import * as THREE from "three";
import {
  buildCylinderGeometry,
  makeRingLine,
  makeScrewDetail,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, bandHalf, getPrintState } from "./model.mjs";

const FRONT_IDLER_Z = 1.56;
const SPOOL_POS = [0.58, 0.35, -2.25];
const BELT_UNIT_GEO = new THREE.BoxGeometry(1.0, 0.030, 0.018);

function makePtfeCurve(xt, zc) {
  const sx = xt * 0.42;
  const sz = -1.25 + (zc + 1.25) * 0.42;
  const apexY = 2.18;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 2.00, -1.805),
    new THREE.Vector3(xt * 0.08, 2.10, -1.58),
    new THREE.Vector3(sx, apexY, sz),
    new THREE.Vector3(xt, 2.14, zc - 0.04),
    new THREE.Vector3(xt, 2.03, zc)
  ]);
}

function positionBeltSegment(partObj, x1, y, z1, x2, z2) {
  if (!partObj) return;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.max(0.02, Math.hypot(dx, dz));
  partObj.position.set((x1 + x2) * 0.5, y, (z1 + z2) * 0.5);
  partObj.rotation.set(0, -Math.atan2(dz, dx), 0);
  partObj.scale.set(len, 1, 1);
}

function computeOutwardSegment(ax, az, bx, bz, offset) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  // Counterclockwise around XZ loop: right-hand normal points outward for our vertex order
  const nx = dz / len;
  const nz = -dx / len;
  return [ax + nx * offset, az + nz * offset, bx + nx * offset, bz + nz * offset];
}

function traceSuperSquarePoints(halfSize, twistRad, nPts = 28) {
  const pts = [];
  const c = Math.cos(twistRad);
  const s = Math.sin(twistRad);
  for (let i = 0; i <= nPts; i++) {
    const t = i / nPts;
    const per = t * 4;
    const side = Math.floor(per) % 4;
    const f = (per - Math.floor(per)) * 2 - 1;
    let lx = 0;
    let lz = 0;
    if (side === 0) {
      lx = -halfSize;
      lz = -f * halfSize;
    } else if (side === 1) {
      lx = f * halfSize;
      lz = -halfSize;
    } else if (side === 2) {
      lx = halfSize;
      lz = f * halfSize;
    } else {
      lx = -f * halfSize;
      lz = halfSize;
    }
    pts.push([lx * c - lz * s, lx * s + lz * c]);
  }
  return pts;
}

function drawP1sScreen(ctx, canvas, state, theme) {
  const w = canvas.width;
  const h = canvas.height;
  const css = (theme && theme.css) || {};
  const ch = (theme && theme.channels) || {};

  const bgCol = css.card || "#14171a";
  const borderCol = css.border || "#2a3038";
  const textCol = css.text || "#e6e4dd";
  const mutedCol = css.muted || "#889099";
  const litCol = css.lit || "#38bdf8";
  const intakeCol = ch.intake || "#38bdf8";
  const combCol = ch.comb || "#fb923c";
  const exhaustCol = ch.exhaust || "#f87171";

  const st = getPrintState(state?.theta ?? SPEC.initialTheta, state?.params || state, state?.triggers || {});

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  // Header strip
  ctx.fillStyle = textCol;
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.fillText("P1S COREXY · PRINT MON", 10, 19);

  ctx.fillStyle = st.mode === "PURGE CHUTE WIPE" ? combCol : litCol;
  ctx.textAlign = "right";
  ctx.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(st.mode, w - 10, 19);

  // Left quadrant: live 2D CoreXY XZ toolpath minimap
  const mapCx = 56;
  const mapCy = 76;
  const mapScale = 50;
  ctx.strokeStyle = mutedCol;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.strokeRect(mapCx - 42, mapCy - 40, 84, 80);
  ctx.globalAlpha = 1;

  const activeK = Math.min(SPEC.N_BANDS - 1, st.k);
  const sqPts = traceSuperSquarePoints(bandHalf(activeK) * 0.96, activeK * SPEC.PART_TWIST);
  ctx.strokeStyle = intakeCol;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  sqPts.forEach(([px, pz], idx) => {
    const sx = mapCx + px * mapScale;
    const sy = mapCy + pz * mapScale;
    if (idx === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();

  // Toolhead live dot
  const dotX = mapCx + (st.xt - SPEC.BED_CX) * mapScale;
  const dotY = mapCy + (st.zc - SPEC.BED_CZ) * mapScale;
  ctx.fillStyle = st.extruding ? combCol : litCol;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4.0, 0, Math.PI * 2);
  ctx.fill();

  // Right telemetry block
  const tx = 112;
  ctx.textAlign = "left";
  ctx.fillStyle = textCol;
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(
    `L${Math.min(SPEC.N_BANDS, st.bandsDone + 1)}/${SPEC.N_BANDS} · Z ${st.realZmm} mm`,
    tx,
    43
  );

  ctx.fillStyle = st.isFlowLimited ? exhaustCol : intakeCol;
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(
    `${st.speed.toFixed(0)} mm/s · ${st.volumetricFlow.toFixed(1)}/${st.flowLimit.toFixed(0)} mm³/s`,
    tx,
    63
  );

  ctx.fillStyle = combCol;
  ctx.fillText(`HOTEND ${st.nozzleT.toFixed(0)}°C  H:${st.layerH.toFixed(2)}`, tx, 83);

  ctx.fillStyle = mutedCol;
  ctx.fillText(`AUX FAN ${st.fan.toFixed(0)}% · 9:53 EXT`, tx, 102);

  // Progress bar along bottom edge
  const barX = tx;
  const barY = 110;
  const barW = w - tx - 12;
  ctx.fillStyle = borderCol;
  ctx.fillRect(barX, barY, barW, 8);
  ctx.fillStyle = litCol;
  ctx.fillRect(barX, barY, barW * (st.progressPct / 100), 8);
}

export function buildMechanism(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const mechGroup = reg.group("mech.group", { parent: baseGroup, stage: "mechanism" });
  const yGroup = reg.groups.get("gantry.yGroup")?.group || mechGroup;

  const initSt = getPrintState(SPEC.initialTheta, {}, {});

  // ---------------------------------------------------------------------------
  // 1. Upper CoreXY Stepper Motors (A Rear-Left, B Rear-Right) & Front Idlers
  // ---------------------------------------------------------------------------
  const motorSpecs = [
    {
      key: "A",
      x: -SPEC.MOTOR_X,
      z: SPEC.MOTOR_Z,
      mountPart: "struct.motorDeck.A",
      driveY: SPEC.BELT_A_Y,
      idlerY: SPEC.BELT_B_Y
    },
    {
      key: "B",
      x: SPEC.MOTOR_X,
      z: SPEC.MOTOR_Z,
      mountPart: "struct.motorDeck.B",
      driveY: SPEC.BELT_B_Y,
      idlerY: SPEC.BELT_A_Y
    }
  ];

  motorSpecs.forEach(({ key, x, z, mountPart, driveY, idlerY }) => {
    const flangeId = `mech.motor${key}.flange`;
    reg.part(flangeId, new THREE.BoxGeometry(0.22, 0.08, 0.22), {
      parent: mechGroup,
      pos: [x, 1.79, z],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: mountPart
    });

    const bodyId = `mech.motor${key}.body`;
    reg.part(bodyId, new THREE.BoxGeometry(0.36, 0.28, 0.36), {
      parent: mechGroup,
      pos: [x, 1.61, z],
      ramp: "lo",
      outline: "mid",
      crease: "lo",
      mountOn: flangeId
    });

    reg.part(`mech.motor${key}.coil`, buildCylinderGeometry(0.15, 0.15, 0.11, { segments: 20, axis: "y" }), {
      parent: mechGroup,
      pos: [x, 1.61, z],
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      detail: true,
      mountOn: bodyId,
      allowOverlap: [bodyId]
    });

    const shaftId = `mech.motor${key}.shaft`;
    reg.part(shaftId, buildCylinderGeometry(0.030, 0.030, 0.22, { segments: 16, axis: "y" }), {
      parent: mechGroup,
      pos: [x, 1.95, z],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: flangeId,
      allowOverlap: [mountPart]
    });

    // Driven brass CoreXY timing pulley
    const pulleyGroup = reg.group(`mech.pulleyGroup.${key}`, {
      parent: mechGroup,
      pos: [x, driveY, z],
      stage: "mechanism"
    });
    const pulleyGeo = buildCylinderGeometry(SPEC.PULLEY_R, SPEC.PULLEY_R, 0.044, {
      segments: 24,
      axis: "y"
    });
    reg.part(`mech.pulley.${key}`, pulleyGeo, {
      parent: pulleyGroup,
      ramp: "brass",
      outline: "mid",
      crease: "lo",
      mountOn: shaftId,
      allowOverlap: [mountPart]
    });
    const ringTop = makeRingLine(SPEC.PULLEY_R * 0.72, 18, kit, "hi");
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = 0.024;
    reg.detail(`mech.pulley.${key}.ring`, ringTop, { parent: pulleyGroup });
    reg.detail(`mech.pulley.${key}.screw`, makeScrewDetail(0, 0.025, 0, 0.022, "y", kit), {
      parent: pulleyGroup
    });

    // Freewheeling second-tier idler stacked on same rear corner shaft
    reg.part(`mech.idler.R${key}_opp`, buildCylinderGeometry(SPEC.PULLEY_R, SPEC.PULLEY_R, 0.040, {
      segments: 20,
      axis: "y"
    }), {
      parent: mechGroup,
      pos: [x, idlerY, z],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: shaftId,
      allowOverlap: [mountPart]
    });
  });

  // Front stacked idler assemblies hung cleanly from struct.topBeam.front
  [
    { side: "L", x: -SPEC.MOTOR_X },
    { side: "R", x: SPEC.MOTOR_X }
  ].forEach(({ side, x }) => {
    const bracketId = `mech.frontBracket.${side}`;
    reg.part(bracketId, new THREE.BoxGeometry(0.22, 0.05, 0.36), {
      parent: mechGroup,
      pos: [x, 2.055, 1.64],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "struct.topBeam.front"
    });

    const shaftId = `mech.frontShaft.${side}`;
    reg.part(shaftId, buildCylinderGeometry(0.024, 0.024, 0.14, { segments: 14, axis: "y" }), {
      parent: mechGroup,
      pos: [x, 1.965, FRONT_IDLER_Z],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: bracketId
    });

    reg.part(`mech.idler.F${side}_A`, buildCylinderGeometry(SPEC.PULLEY_R, SPEC.PULLEY_R, 0.040, {
      segments: 20,
      axis: "y"
    }), {
      parent: mechGroup,
      pos: [x, SPEC.BELT_A_Y, FRONT_IDLER_Z],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: shaftId
    });

    reg.part(`mech.idler.F${side}_B`, buildCylinderGeometry(SPEC.PULLEY_R, SPEC.PULLEY_R, 0.040, {
      segments: 20,
      axis: "y"
    }), {
      parent: mechGroup,
      pos: [x, SPEC.BELT_B_Y, FRONT_IDLER_Z],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: shaftId
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Stacked CoreXY Belt Circuits (Belt A = intake blue @ 2.00, Belt B = exhaust red @ 1.93)
  // ---------------------------------------------------------------------------
  const beltOpts = (ramp, parent, mountOn) => ({
    parent,
    ramp,
    outline: "lo",
    outlineWidth: 0.008,
    noCrease: true,
    detail: true,
    mountOn
  });

  // Belt A segments
  reg.part("mech.beltA.xLeft", BELT_UNIT_GEO, beltOpts("intake", yGroup, "gantry.yIdler.LA"));
  reg.part("mech.beltA.xRight", BELT_UNIT_GEO, beltOpts("intake", yGroup, "gantry.yIdler.RA"));
  reg.part("mech.beltA.zLeft", BELT_UNIT_GEO, beltOpts("intake", mechGroup, "mech.pulley.A"));
  reg.part("mech.beltA.back", BELT_UNIT_GEO, beltOpts("intake", mechGroup, "mech.pulley.A"));
  reg.part("mech.beltA.rightReturn", BELT_UNIT_GEO, beltOpts("intake", mechGroup, "mech.idler.FR_A"));
  reg.part("mech.beltA.zRight", BELT_UNIT_GEO, beltOpts("intake", mechGroup, "mech.idler.FR_A"));

  // Belt B segments
  reg.part("mech.beltB.xRight", BELT_UNIT_GEO, beltOpts("exhaust", yGroup, "gantry.yIdler.RB"));
  reg.part("mech.beltB.xLeft", BELT_UNIT_GEO, beltOpts("exhaust", yGroup, "gantry.yIdler.LB"));
  reg.part("mech.beltB.zRight", BELT_UNIT_GEO, beltOpts("exhaust", mechGroup, "mech.pulley.B"));
  reg.part("mech.beltB.back", BELT_UNIT_GEO, beltOpts("exhaust", mechGroup, "mech.pulley.B"));
  reg.part("mech.beltB.leftReturn", BELT_UNIT_GEO, beltOpts("exhaust", mechGroup, "mech.idler.FL_B"));
  reg.part("mech.beltB.zLeft", BELT_UNIT_GEO, beltOpts("exhaust", mechGroup, "mech.idler.FL_B"));

  // ---------------------------------------------------------------------------
  // 3. Lower Electronics Bay Z-Stepper Motor, 3 Brass Pulleys & Closed Z Timing Belt
  // ---------------------------------------------------------------------------
  const [zmX, , zmZ] = SPEC.Z_MOTOR_POS;
  reg.part("mech.zMotor.body", new THREE.BoxGeometry(0.32, 0.24, 0.32), {
    parent: mechGroup,
    pos: [zmX, -2.09, zmZ],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.bayFloor"
  });

  reg.part("mech.zMotor.shaft", buildCylinderGeometry(0.024, 0.024, 0.08, { segments: 14, axis: "y" }), {
    parent: mechGroup,
    pos: [zmX, -1.93, zmZ],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "mech.zMotor.body"
  });

  const zMotorPulleyGroup = reg.group("mech.zMotor.pulleyGroup", {
    parent: mechGroup,
    pos: [zmX, SPEC.Z_BELT_Y, zmZ],
    stage: "mechanism"
  });
  reg.part(
    "mech.zMotor.pulley",
    buildCylinderGeometry(0.072, 0.072, 0.042, { segments: 20, axis: "y" }),
    {
      parent: zMotorPulleyGroup,
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: "mech.zMotor.shaft"
    }
  );
  reg.detail("mech.zMotor.pulley.screw", makeScrewDetail(0, 0.023, 0, 0.020, "y", kit), {
    parent: zMotorPulleyGroup
  });

  const zPulleyDefs = [
    { key: "fl", groupId: "struct.zScrewGroup.fl", screwId: "struct.zScrew.fl", pos: SPEC.SCREW_FL },
    { key: "fr", groupId: "struct.zScrewGroup.fr", screwId: "struct.zScrew.fr", pos: SPEC.SCREW_FR },
    { key: "r", groupId: "struct.zScrewGroup.r", screwId: "struct.zScrew.r", pos: SPEC.SCREW_R }
  ];
  zPulleyDefs.forEach(({ key, groupId, screwId }) => {
    const grp = reg.groups.get(groupId)?.group || mechGroup;
    reg.part(
      `mech.zPulley.${key}`,
      buildCylinderGeometry(0.086, 0.086, 0.042, { segments: 24, axis: "y" }),
      {
        parent: grp,
        pos: [0, SPEC.Z_BELT_Y, 0],
        ramp: "brass",
        outline: "mid",
        crease: "faint",
        mountOn: screwId
      }
    );
  });

  // Closed 4-point timing belt loop around FL -> FR -> R -> ZMotor -> FL
  const zLoopPts = [
    SPEC.SCREW_FL,
    SPEC.SCREW_FR,
    SPEC.SCREW_R,
    [zmX, zmZ]
  ];
  for (let i = 0; i < zLoopPts.length; i++) {
    const [ax, az] = zLoopPts[i];
    const [bx, bz] = zLoopPts[(i + 1) % zLoopPts.length];
    const [ox1, oz1, ox2, oz2] = computeOutwardSegment(ax, az, bx, bz, -0.068);
    const beltObj = reg.part(`mech.zBelt.${i}`, BELT_UNIT_GEO, beltOpts("comp", mechGroup, "mech.zMotor.pulley"));
    positionBeltSegment(beltObj, ox1, SPEC.Z_BELT_Y, oz1, ox2, oz2);
  }

  // ---------------------------------------------------------------------------
  // 4. Rear Filament Spool Holder, Rotating Spool, & Audited External Tubes
  // ---------------------------------------------------------------------------
  const [spX, spY, spZ] = SPOOL_POS;
  reg.part("mech.spoolBracket", new THREE.BoxGeometry(0.14, 0.20, 0.19), {
    parent: mechGroup,
    pos: [spX, spY, -2.03],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "struct.wall.rear"
  });

  reg.part("mech.spoolAxle", buildCylinderGeometry(0.068, 0.068, 0.29, { segments: 18, axis: "z" }), {
    parent: mechGroup,
    pos: [spX, spY, spZ - 0.005],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "mech.spoolBracket"
  });

  const spoolGroup = reg.group("mech.spoolGroup", {
    parent: mechGroup,
    pos: [spX, spY, spZ],
    stage: "mechanism"
  });

  reg.part("mech.spool.flangeFront", buildCylinderGeometry(0.50, 0.50, 0.028, { segments: 32, axis: "z" }), {
    parent: spoolGroup,
    pos: [0, 0, 0.11],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "mech.spoolAxle"
  });
  reg.part("mech.spool.flangeBack", buildCylinderGeometry(0.50, 0.50, 0.028, { segments: 32, axis: "z" }), {
    parent: spoolGroup,
    pos: [0, 0, -0.11],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "mech.spoolAxle"
  });
  reg.part("mech.spool.filament", buildCylinderGeometry(0.42, 0.42, 0.19, { segments: 32, axis: "z" }), {
    parent: spoolGroup,
    pos: [0, 0, 0],
    ramp: "lit",
    outline: "mid",
    crease: "faint",
    mountOn: "mech.spool.flangeFront",
    allowOverlap: ["mech.spoolAxle", "mech.spool.flangeBack"]
  });

  // Radial spokes + winding lines on spool flange so spool rotation is immediately legible
  const spoolWrapRing = makeRingLine(0.32, 28, kit, "mid");
  spoolWrapRing.position.z = -0.127;
  reg.detail("mech.spool.ringBack", spoolWrapRing, { parent: spoolGroup });
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const a = (sIdx * Math.PI) / 2;
    const linePts = [
      new THREE.Vector3(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.128),
      new THREE.Vector3(Math.cos(a) * 0.45, Math.sin(a) * 0.45, -0.128)
    ];
    reg.detail(
      `mech.spool.spoke.${sIdx}`,
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), kit.lineMaterials.hi),
      { parent: spoolGroup }
    );
  }

  // Brass upper filament guide eyelet & external Bowden conduit -> inlet.outer
  const guidePart = reg.part(
    "mech.spoolGuide",
    buildCylinderGeometry(0.044, 0.044, 0.12, { segments: 14, axis: "z" }),
    {
      parent: mechGroup,
      pos: [spX, 1.12, -2.005],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "struct.wall.rear"
    }
  );
  reg.anchor("spool.guide.out", 0, 0, -0.06, guidePart, { dir: [-0.28, 0.90, -0.33] });

  reg.tube(
    "tube.filament.feed",
    "spool.guide.out",
    [
      [0.46, 1.56, -2.22],
      [0.04, 2.00, -2.30]
    ],
    "inlet.outer",
    {
      parent: mechGroup,
      radius: 0.022,
      segments: 34,
      radialSegments: 10,
      leadOut: 0.12,
      leadIn: 0.12,
      ramp: "lit",
      outline: "mid",
      fromPart: "mech.spoolGuide",
      toPart: "struct.inletFitting",
      allowOverlap: ["struct.wall.rear"]
    }
  );

  // Rear AP-board to toolhead CAN-bus / MC umbilical conduit
  reg.tube(
    "tube.umbilical.harness",
    "bay.umbilical.out",
    [
      [-1.18, -1.85, -2.24],
      [-1.22, -1.25, -2.52],
      [-1.24, -0.15, -2.58],
      [-1.22, 0.78, -2.32],
      [-1.19, 1.18, -2.10]
    ],
    "gantry.junction.in",
    {
      parent: mechGroup,
      radius: 0.032,
      segments: 48,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.14,
      ramp: "lo",
      outline: "mid",
      fromPart: "struct.bayPort",
      toPart: "struct.upperJunction",
      allowOverlap: ["base.baySkirtRear", "struct.wall.rear"]
    }
  );

  // Dynamic internal PTFE Bowden arch connecting rear bulkhead inlet.inner -> moving toolhead top
  const initPtfeGeo = new THREE.TubeGeometry(makePtfeCurve(initSt.xt, initSt.zc), 26, 0.024, 10, false);
  const ptfeObj = kit.createAnatomyPart(initPtfeGeo, {
    ramp: "hi",
    outline: "mid",
    noCrease: true,
    outlineWidth: 0.008
  });
  reg.detail("mech.ptfe.dynamic", ptfeObj, { parent: mechGroup });

  // ---------------------------------------------------------------------------
  // 5. Front Bezel P1S OLED Monitor & Rotary Speed Dial
  // ---------------------------------------------------------------------------
  reg.part("mech.screenBracket", new THREE.BoxGeometry(0.84, 0.14, 0.10), {
    parent: mechGroup,
    pos: [-1.05, -1.65, SPEC.HALF_D + 0.045],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.frontBezel"
  });

  reg.screen("p1s.screen", {
    parent: mechGroup,
    pos: [-1.05, -1.63, SPEC.HALF_D + 0.115],
    rot: [-0.24, 0, 0],
    width: 1.06,
    height: 0.44,
    depth: 0.06,
    resolution: [288, 128],
    ramp: "mid",
    outline: "hi",
    mountOn: "mech.screenBracket",
    draw: drawP1sScreen
  });

  // Click-wheel rotary speed encoder beside OLED screen
  reg.part(
    "mech.speedDial.boss",
    buildCylinderGeometry(0.11, 0.125, 0.06, { segments: 24, axis: "z" }),
    {
      parent: mechGroup,
      pos: [-0.08, -1.65, SPEC.HALF_D + 0.02],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "base.frontBezel"
    }
  );

  const speedDialGroup = reg.group("mech.speedDialGroup", {
    parent: mechGroup,
    pos: [-0.08, -1.65, SPEC.HALF_D + 0.07],
    stage: "mechanism"
  });
  reg.part(
    "mech.speedDial",
    buildCylinderGeometry(0.09, 0.095, 0.065, { segments: 24, axis: "z" }),
    {
      parent: speedDialGroup,
      ramp: "hi",
      outline: "hi",
      crease: "lo",
      mountOn: "mech.speedDial.boss"
    }
  );
  const dialKnurl = makeKnurlLines(0.092, -0.024, 0.024, 18, kit, { tone: "lo" });
  dialKnurl.rotation.x = Math.PI / 2;
  reg.detail("mech.speedDial.knurl", dialKnurl, { parent: speedDialGroup });
  const dialPtrGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.015, 0.036),
    new THREE.Vector3(0, 0.075, 0.036)
  ]);
  reg.detail("mech.speedDial.ptr", new THREE.Line(dialPtrGeo, kit.lineMaterials.lit), {
    parent: speedDialGroup
  });
  reg.detail("mech.speedDial.cap", makeScrewDetail(0, 0, 0.035, 0.028, "z", kit), {
    parent: speedDialGroup
  });

  // ---------------------------------------------------------------------------
  // 6. Direct 3D Interactions (Drag Toolhead, PEI Bed, CoreXY Pulleys, Speed Dial)
  // ---------------------------------------------------------------------------
  reg.interactable("subject.toolhead", {
    cursor: "grab",
    hint: "Drag printhead to scrub through CoreXY print path & layers",
    onDrag: ({ dx, dy, state }) => {
      state.theta -= (dx - dy * 0.45) * 0.045;
    }
  });

  reg.interactable("subject.bedGroup", {
    cursor: "ns-resize",
    hint: "Drag PEI build plate up/down to scrub 3-screw Z layer progress",
    onDrag: ({ dy, state }) => {
      state.theta -= dy * 0.055;
    }
  });

  reg.interactable("mech.pulleyGroup.A", {
    cursor: "grab",
    hint: "Spin Rear-Left Motor A pulley to drive CoreXY gantry",
    onDrag: ({ dx, dy, state }) => {
      state.theta -= (dx + dy) * 0.045;
    }
  });

  reg.interactable("mech.pulleyGroup.B", {
    cursor: "grab",
    hint: "Spin Rear-Right Motor B pulley to drive CoreXY gantry",
    onDrag: ({ dx, dy, state }) => {
      state.theta -= (dx - dy) * 0.045;
    }
  });

  reg.interactable("mech.speedDialGroup", {
    cursor: "ew-resize",
    hint: "Turn front encoder dial to adjust CoreXY speed (40–500 mm/s)",
    onDrag: ({ dx, dy, state, setParam }) => {
      const cur = state.params.rpm ?? 200;
      setParam("rpm", cur + (dx - dy) * 2.2);
    }
  });

  // Initialize exact Layer 5 kinematics right away for audit & static export
  updateKinematics(reg, {
    theta: SPEC.initialTheta,
    explode: 0,
    cutaway: true,
    shaderEnv: 1.0,
    params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 },
    triggers: { park: 0, retract: 0 }
  });
}

let lastPtfeKey = "";

export function updateKinematics(reg, state) {
  const params = state.params || state;
  const triggers = state.triggers || {};
  const st = getPrintState(state.theta ?? SPEC.initialTheta, params, triggers);
  const explode = state.explode ?? 0;

  // 1. CoreXY Gantry & Direct-Drive Toolhead Translation
  const yGroup = reg.groups.get("gantry.yGroup")?.group;
  if (yGroup) {
    yGroup.position.z = st.zc;
  }

  const thGroup = reg.groups.get("subject.toolhead")?.group;
  if (thGroup) {
    thGroup.position.x = st.xt;
  }

  // 2. Triple-Screw Z Build Plate Descent & Synced Lead Screws + Bay Pulleys
  const bedGroup = reg.groups.get("subject.bedGroup")?.group;
  if (bedGroup) {
    bedGroup.position.y = -st.bedDrop;
  }

  ["fl", "fr", "r"].forEach((key) => {
    const sg = reg.groups.get(`struct.zScrewGroup.${key}`)?.group;
    if (sg) sg.rotation.y = st.zScrewRad;
  });

  const zMotorPulley = reg.groups.get("mech.zMotor.pulleyGroup")?.group;
  if (zMotorPulley) {
    zMotorPulley.rotation.y = st.zScrewRad * 1.2;
  }

  // 3. CoreXY Pulleys, 9:53 Extruder Gears, Spool, & Front Rotary Dial
  const pulA = reg.groups.get("mech.pulleyGroup.A")?.group;
  if (pulA) pulA.rotation.y = st.motorARad;
  const pulB = reg.groups.get("mech.pulleyGroup.B")?.group;
  if (pulB) pulB.rotation.y = st.motorBRad;

  const extGear = reg.groups.get("subject.extGearGroup")?.group;
  if (extGear) extGear.rotation.z = st.extruderGearRad;
  const extPinion = reg.groups.get("subject.extPinionGroup")?.group;
  if (extPinion) extPinion.rotation.z = st.extruderPinionRad;

  const spoolGrp = reg.groups.get("mech.spoolGroup")?.group;
  if (spoolGrp) spoolGrp.rotation.z = st.spoolRad;

  const speedDial = reg.groups.get("mech.speedDialGroup")?.group;
  if (speedDial) {
    speedDial.rotation.z = -((st.speed - 40) / 460) * Math.PI * 1.5;
  }

  // 4. Stacked CoreXY Dynamic Belt Spans (Belt A @ y=2.00, Belt B @ y=1.93)
  const mx = SPEC.MOTOR_X;
  const mz = SPEC.MOTOR_Z;
  const fz = FRONT_IDLER_Z;

  // Belt A segments (y = 2.00, z-carriages shifted z = +0.09)
  positionBeltSegment(reg.parts.get("mech.beltA.xLeft")?.group, -1.52, SPEC.BELT_A_Y, 0.09, st.xt, 0.09);
  positionBeltSegment(reg.parts.get("mech.beltA.xRight")?.group, st.xt, SPEC.BELT_A_Y, 0.09, 1.52, 0.09);
  positionBeltSegment(
    reg.parts.get("mech.beltA.zLeft")?.group,
    -1.535,
    SPEC.BELT_A_Y,
    st.zc + 0.09,
    -1.535,
    mz
  );
  positionBeltSegment(reg.parts.get("mech.beltA.back")?.group, -mx, SPEC.BELT_A_Y, mz - 0.075, mx, mz - 0.075);
  positionBeltSegment(
    reg.parts.get("mech.beltA.rightReturn")?.group,
    mx + 0.075,
    SPEC.BELT_A_Y,
    mz,
    mx + 0.075,
    fz
  );
  positionBeltSegment(
    reg.parts.get("mech.beltA.zRight")?.group,
    mx - 0.065,
    SPEC.BELT_A_Y,
    fz,
    1.465,
    st.zc + 0.09
  );

  // Belt B segments (y = 1.93, z-carriages shifted z = -0.09)
  positionBeltSegment(reg.parts.get("mech.beltB.xRight")?.group, st.xt, SPEC.BELT_B_Y, -0.09, 1.52, -0.09);
  positionBeltSegment(reg.parts.get("mech.beltB.xLeft")?.group, -1.52, SPEC.BELT_B_Y, -0.09, st.xt, -0.09);
  positionBeltSegment(
    reg.parts.get("mech.beltB.zRight")?.group,
    1.535,
    SPEC.BELT_B_Y,
    st.zc - 0.09,
    1.535,
    mz
  );
  positionBeltSegment(reg.parts.get("mech.beltB.back")?.group, mx, SPEC.BELT_B_Y, mz - 0.075, -mx, mz - 0.075);
  positionBeltSegment(
    reg.parts.get("mech.beltB.leftReturn")?.group,
    -mx - 0.075,
    SPEC.BELT_B_Y,
    mz,
    -mx - 0.075,
    fz
  );
  positionBeltSegment(
    reg.parts.get("mech.beltB.zLeft")?.group,
    -mx + 0.065,
    SPEC.BELT_B_Y,
    fz,
    -1.465,
    st.zc - 0.09
  );

  // 5. Progressive Printed Geometric Vase Bands (0..13)
  for (let b = 0; b < SPEC.N_BANDS; b++) {
    const bandGroup = reg.parts.get(`subject.print.band.${b}`)?.group;
    if (!bandGroup) continue;
    if (b < st.bandsDone) {
      bandGroup.visible = true;
      bandGroup.scale.y = 1.0;
    } else if (b === st.bandsDone && st.bandFill > 0.01) {
      bandGroup.visible = true;
      bandGroup.scale.y = Math.max(0.02, st.bandFill);
    } else {
      bandGroup.visible = false;
      bandGroup.scale.y = 0.02;
    }
  }

  // 6. Dynamic Internal PTFE Bowden Arch
  const ptfeGroup = reg.root.getObjectByName("mech.ptfe.dynamic");
  const ptfeKey = `${st.xt.toFixed(3)},${st.zc.toFixed(3)}`;
  if (ptfeGroup && ptfeKey !== lastPtfeKey) {
    lastPtfeKey = ptfeKey;
    const nextGeo = new THREE.TubeGeometry(makePtfeCurve(st.xt, st.zc), 26, 0.024, 10, false);
    let oldGeo = null;
    ptfeGroup.traverse((child) => {
      if (child.isMesh && (child.name === "solid" || child.name === "outline")) {
        if (!oldGeo && child.geometry) oldGeo = child.geometry;
        child.geometry = nextGeo;
      }
    });
    if (oldGeo && oldGeo !== nextGeo) oldGeo.dispose();
  }

  // 7. Stage 6 Active Thermal Deposition & Aux Airflow Shader Uniforms
  const shaderGroup = reg.groups.get("p1s.shaderGroup")?.group || reg.root.getObjectByName("p1s.shaderGroup");
  if (shaderGroup) {
    const fadeOut = 1 - Math.max(0, Math.min(1, (explode - 0.05) / 0.3));
    const effEnv = (state.shaderEnv !== undefined ? state.shaderEnv : 1.0) * fadeOut;
    const activeHalf = bandHalf(Math.min(SPEC.N_BANDS - 1, st.k));
    shaderGroup.traverse((child) => {
      if (child.material && child.material.uniforms) {
        const u = child.material.uniforms;
        if (u.uTime) u.uTime.value = state.theta || 0;
        if (u.uXt) u.uXt.value = st.xt;
        if (u.uZc) u.uZc.value = st.zc;
        if (u.uNozzleT) u.uNozzleT.value = st.nozzleT;
        if (u.uFan) u.uFan.value = st.fan;
        if (u.uSpeed) u.uSpeed.value = st.speed;
        if (u.uLayerH) u.uLayerH.value = st.layerH;
        if (u.uBandHalf) u.uBandHalf.value = activeHalf;
        if (u.uExtruding) u.uExtruding.value = st.extruding ? 1.0 : 0.0;
        if (u.uBedTopY) u.uBedTopY.value = st.bedTopY;
        if (u.uEnvelope) u.uEnvelope.value = effEnv;
      }
    });
  }
}

export function tourAt(clock, _state) {
  const c = ((clock % 1) + 1) % 1;
  const thetaForProg = (p) => SPEC.initialTheta - (p - 4.35) * Math.PI * 2;

  if (c < 0.16) {
    const t = c / 0.16;
    return {
      caption: "LAYER 1 ADHESION · TEXTURED PEI PLATE HIGH · LOW FAN",
      theta: thetaForProg(0.2 + 0.55 * t),
      cutaway: true,
      params: { rpm: 120, nozzleT: 220, fan: 15, layerH: 0.20 },
      cameraView: "iso"
    };
  }
  if (c < 0.34) {
    const t = (c - 0.16) / 0.18;
    return {
      caption: "STACKED COREXY BELTS · DIFFERENTIAL A = ΔX+ΔZ, B = ΔX−ΔZ",
      theta: thetaForProg(3.1 + 1.5 * t),
      cutaway: true,
      params: { rpm: 240, nozzleT: 225, fan: 80, layerH: 0.20 },
      cameraView: "corexy"
    };
  }
  if (c < 0.52) {
    const t = (c - 0.34) / 0.18;
    return {
      caption: "9:53 DIRECT-DRIVE EXTRUDER · 380 mm/s GYROID INFILL",
      theta: thetaForProg(6.6 + 1.4 * t),
      cutaway: true,
      params: { rpm: 380, nozzleT: 245, fan: 95, layerH: 0.20 },
      cameraView: "toolhead"
    };
  }
  if (c < 0.68) {
    const t = (c - 0.52) / 0.16;
    return {
      caption: "3-SCREW CLOSED-LOOP Z BED · SYNCHRONIZED LAYER DROP",
      theta: thetaForProg(9.2 + 2.0 * t),
      cutaway: true,
      params: { rpm: 480, nozzleT: 265, fan: 100, layerH: 0.24 },
      cameraView: "zdrive"
    };
  }
  if (c < 0.84) {
    const t = (c - 0.68) / 0.16;
    return {
      caption: "REAR-LEFT PURGE CHUTE · NOZZLE WIPE & RETRACT",
      theta: thetaForProg(11.4 + 0.4 * t),
      cutaway: true,
      trigger: t > 0.15 && t < 0.72 ? "park" : null,
      params: { rpm: 200, nozzleT: 220, fan: 80, layerH: 0.20 },
      cameraView: "iso"
    };
  }
  return {
    caption: "FULL P1S ENCLOSURE · FRONT DOOR & GLASS LID INSTALLED",
    theta: thetaForProg(12.2),
    cutaway: false,
    params: { rpm: 220, nozzleT: 220, fan: 80, layerH: 0.20 },
    cameraView: "iso"
  };
}
