import * as THREE from "three";
import { SPEC, BANK_SIGN, CYL_Z, FIRING_ORDER, getEngineState } from "./model.mjs";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";

function makeCurvedPipeGeo(points, radius, tubularSegments = 20, radialSegments = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
}

function makeHollowCollarGeo(rIn, rOut, length, segments = 24) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    curveSegments: segments
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function drawM64Screen(ctx, canvas, state, theme) {
  const w = canvas.width;
  const h = canvas.height;
  const isDark = theme?.name === "dark" || theme?.name === "blueprint";

  const params = state.params || state || {};
  const eng = getEngineState(state.theta ?? SPEC.initialTheta, params, state.triggers || {});

  // Background & crisp instrumentation bezel
  ctx.fillStyle = isDark ? "#0d1118" : "#151922";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = isDark ? "#334155" : "#475569";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Header strip: Bosch Motronic M5.2
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 14px ui-monospace, monospace";
  ctx.fillText("BOSCH MOTRONIC M5.2 · PORSCHE M64/60", 16, 24);

  ctx.fillStyle = eng.overboostEnv > 0.15 ? "#f97316" : eng.wastegateEnv > 0.15 ? "#38bdf8" : "#fbbf24";
  ctx.textAlign = "right";
  ctx.font = "bold 15px ui-monospace, monospace";
  ctx.fillText(`${Math.round(eng.rpm)} RPM · +${eng.effectiveBoost.toFixed(2)} BAR`, w - 16, 24);
  ctx.textAlign = "left";

  // Left panel: 6-Cylinder Firing Order Bar Graph (1 - 6 - 2 - 4 - 3 - 5)
  const panelX = 16;
  const panelY = 40;
  const barW = 28;
  const barGap = 8;
  const maxBarH = 104;

  ctx.fillStyle = "#64748b";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("4-STROKE FIRING 1-6-2-4-3-5", panelX, panelY + 12);

  for (let k = 0; k < FIRING_ORDER.length; k++) {
    const cylNum = FIRING_ORDER[k];
    const ck = eng.cylinders[cylNum - 1];
    const bx = panelX + k * (barW + barGap);
    const byBottom = panelY + 24 + maxBarH;

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(bx, panelY + 24, barW, maxBarH);

    let level = 0.25;
    let color = "#3b82f6"; // intake
    if (ck.combIntensity > 0.05) {
      level = 0.3 + 0.7 * ck.combIntensity;
      color = ck.combIntensity > 0.55 ? "#fb923c" : "#f97316";
    } else if (ck.exhWeight > 0.05) {
      level = 0.25 + 0.45 * ck.exhWeight;
      color = "#ef4444";
    } else if (ck.compWeight > 0.05) {
      level = 0.25 + 0.65 * ck.compWeight;
      color = "#a855f7";
    } else {
      level = 0.2 + 0.45 * ck.intakeWeight;
      color = "#38bdf8";
    }

    const fillH = Math.max(8, Math.round(maxBarH * level));
    ctx.fillStyle = color;
    ctx.fillRect(bx + 2, byBottom - fillH, barW - 4, fillH);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`C${cylNum}`, bx + barW * 0.5, byBottom + 16);
  }
  ctx.textAlign = "left";

  // Center panel: Boost & Wastegate Pressure Gauge
  const boostX = 248;
  const boostY = 42;
  const boostW = 190;
  ctx.fillStyle = "#64748b";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("TWIN KKK K16 BOOST (BAR)", boostX, boostY + 10);

  const gaugeY = boostY + 22;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(boostX, gaugeY, boostW, 24);
  const boostFrac = Math.min(1, eng.effectiveBoost / 1.25);
  ctx.fillStyle = eng.overboostEnv > 0.15 ? "#f97316" : eng.wastegateEnv > 0.15 ? "#38bdf8" : "#a855f7";
  ctx.fillRect(boostX + 2, gaugeY + 2, Math.max(4, (boostW - 4) * boostFrac), 20);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 16px ui-monospace, monospace";
  ctx.fillText(`+${eng.effectiveBoost.toFixed(2)} BAR`, boostX, gaugeY + 46);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`THR ${Math.round(eng.throttle)}%  ·  ADV ${Math.round(eng.timingAdv)}°`, boostX, gaugeY + 68);
  ctx.fillText(`FAN ${Math.round(eng.rpm * SPEC.FAN_RATIO)} RPM (1.62x)`, boostX, gaugeY + 88);
  ctx.fillStyle = eng.wastegateEnv > 0.15 ? "#38bdf8" : "#f59e0b";
  ctx.fillText(eng.modeLabel.slice(0, 26), boostX, gaugeY + 110);

  // Right panel: Dyno Power / Torque Plot (408 PS / 540 Nm)
  const plotX = 468;
  const plotY = 48;
  const plotW = w - plotX - 18;
  const plotH = 102;

  ctx.fillStyle = "#64748b";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(`DYNO: ${eng.powerPs} PS / ${eng.torqueNm} Nm`, plotX, plotY + 4);

  ctx.fillStyle = "#111827";
  ctx.fillRect(plotX, plotY + 14, plotW, plotH);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(plotX, plotY + 14, plotW, plotH);

  // Torque curve (cyan) & Power curve (amber)
  ctx.beginPath();
  for (let s = 0; s <= 24; s++) {
    const r = 600 + (s / 24) * 6200;
    const shape = 0.62 + 0.38 * Math.exp(-Math.pow((r - 4500) / 2100, 2));
    const tq = (295 + 245 * (eng.effectiveBoost / 0.8)) * shape * (0.25 + 0.75 * (eng.throttle / 100));
    const px = plotX + (s / 24) * plotW;
    const py = plotY + 14 + plotH - Math.min(0.95, tq / 650) * plotH;
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  for (let s = 0; s <= 24; s++) {
    const r = 600 + (s / 24) * 6200;
    const shape = 0.62 + 0.38 * Math.exp(-Math.pow((r - 4500) / 2100, 2));
    const tq = (295 + 245 * (eng.effectiveBoost / 0.8)) * shape * (0.25 + 0.75 * (eng.throttle / 100));
    const ps = (tq * r) / 7023.5;
    const px = plotX + (s / 24) * plotW;
    const py = plotY + 14 + plotH - Math.min(0.95, ps / 480) * plotH;
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Live RPM cursor line
  const curX = plotX + eng.rpmNorm * plotW;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(curX, plotY + 14);
  ctx.lineTo(curX, plotY + 14 + plotH);
  ctx.stroke();
}

export function buildMechanism(reg, kit) {
  const gMech = reg.group("mechanism", { stage: "mechanism" });

  // ---------------------------------------------------------------------------
  // 1. SOHC Camshaft Timing Sprockets (front of L/R camboxes, 0.5x crank speed)
  // ---------------------------------------------------------------------------
  const camGearGeo = buildExternalGearGeometry(0.115, 22, 0.018, 0.032, 0.45);
  const camHubGeo = buildCylinderGeometry(0.052, 0.052, 0.044, { segments: 18, axis: "z" });

  for (const [side, s, zCam] of [["L", -1, 0.885], ["R", 1, 0.965]]) {
    const gCam = reg.group(`mech.camGroup.${side}`, {
      parent: gMech,
      pos: [s * 1.44, 0, zCam],
      rot: [0, 0, -SPEC.initialTheta * 0.5],
      stage: "mechanism"
    });
    reg.part(`mech.camSprocket.${side}`, camGearGeo, {
      parent: gCam,
      ramp: "brass",
      mountOn: `struct.camBox.${side}`
    });
    reg.part(`mech.camHub.${side}`, camHubGeo, {
      parent: gCam,
      ramp: "lit",
      detail: true,
      mountOn: `mech.camSprocket.${side}`
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Twin Under-Bank 3-into-1 Exhaust Headers & KKK K16 Turbochargers
  // ---------------------------------------------------------------------------
  const exhBossGeo = buildCylinderGeometry(0.058, 0.064, 0.10, { segments: 16, axis: "y" });
  const collectorGeo = buildSlabGeometry(0.16, 0.36, 0.16, {
    radius: 0.06,
    bevel: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    centerY: true
  });
  const turbineScrollGeo = buildCylinderGeometry(0.165, 0.165, 0.16, { segments: 26, axis: "x" });
  const chraGeo = buildCylinderGeometry(0.082, 0.082, 0.18, { segments: 20, axis: "x" });
  const compScrollGeo = buildCylinderGeometry(0.182, 0.172, 0.15, { segments: 26, axis: "x" });
  const compBellGeo = makeHollowCollarGeo(0.114, 0.145, 0.085, 24);
  const compOutletStubGeo = buildCylinderGeometry(0.068, 0.075, 0.15, { segments: 18, axis: "y" });
  const downpipeGeo = makeCurvedPipeGeo(
    [
      [0, 0, 0],
      [0, -0.05, -0.18],
      [0, -0.08, -0.36]
    ],
    0.074,
    14,
    14
  );

  // Turbo compressor impeller blade geometry (8 radial blades rotating around X axis)
  const impellerHubGeo = buildCylinderGeometry(0.036, 0.048, 0.055, { segments: 16, axis: "x" });
  const impellerBladeGeo = buildSlabGeometry(0.032, 0.012, 0.078, {
    radius: 0.004,
    bevel: false,
    centerY: true
  });

  for (const [side, s] of [["L", -1], ["R", 1]]) {
    const tx = s * SPEC.TURBO_X; // ±1.24
    const ty = SPEC.TURBO_Y; // -0.96
    const tz = SPEC.TURBO_Z; // -0.74

    // Carrier bracket routing cleanly underneath turbine scroll to anchor CHRA to sump pan
    const bracketGeoSide = makeCurvedPipeGeo(
      [
        [s * 0.42, -0.35, tz],
        [s * 0.62, -1.24, tz],
        [tx, -1.24, tz],
        [tx, ty - 0.03, tz]
      ],
      0.032,
      20,
      12
    );
    reg.part(`mech.turboBracket.${side}`, bracketGeoSide, {
      parent: gMech,
      ramp: "lo",
      mountOn: "struct.sumpPan"
    });

    // Hot-side K16 Turbine Scroll (inboard at x = s * 1.07)
    reg.part(`mech.turboTurbine.${side}`, turbineScrollGeo, {
      parent: gMech,
      pos: [s * 1.07, ty, tz],
      ramp: "comb",
      mountOn: `mech.turboChra.${side}`
    });

    // Center Brass CHRA Bearing Cartridge (at x = ±1.24)
    reg.part(`mech.turboChra.${side}`, chraGeo, {
      parent: gMech,
      pos: [tx, ty, tz],
      ramp: "brass",
      mountOn: `mech.turboBracket.${side}`
    });

    // Cold-side K16 Compressor Snail & Inlet Bellmouth (outboard at x = s * 1.41)
    reg.part(`mech.turboComp.${side}`, compScrollGeo, {
      parent: gMech,
      pos: [s * 1.41, ty, tz],
      ramp: "intake",
      mountOn: `mech.turboChra.${side}`
    });
    reg.part(`mech.turboCompBell.${side}`, compBellGeo, {
      parent: gMech,
      pos: [s * 1.515, ty, tz],
      ramp: "hi",
      detail: true,
      mountOn: `mech.turboComp.${side}`
    });

    // Spinning 8-blade billet compressor impeller visible inside hollow outboard inlet horn
    const gRotor = reg.group(`mech.turboRotorGroup.${side}`, {
      parent: gMech,
      pos: [s * 1.505, ty, tz],
      stage: "mechanism"
    });
    reg.part(`mech.turboImpellerHub.${side}`, impellerHubGeo, {
      parent: gRotor,
      ramp: "lit",
      detail: true,
      mountOn: `mech.turboComp.${side}`
    });
    for (let b = 0; b < 8; b++) {
      const a = (b * Math.PI * 2) / 8;
      const gBl = reg.group(`mech.turboBladePivot.${side}.${b}`, {
        parent: gRotor,
        rot: [a, 0, 0],
        stage: "mechanism"
      });
      reg.part(`mech.turboBlade.${side}.${b}`, impellerBladeGeo, {
        parent: gBl,
        pos: [0, 0.068, 0],
        rot: [0, 0.42, 0],
        ramp: "lit",
        detail: true,
        mountOn: `mech.turboComp.${side}`
      });
    }

    // Compressor outlet discharge snout matching ANCHORS.compOutletL/R
    reg.part(`mech.compOutletStub.${side}`, compOutletStubGeo, {
      parent: gMech,
      pos: [s * 1.47, ty + 0.06, tz - 0.11],
      rot: [-0.45, 0, -s * 0.45],
      ramp: "comp",
      mountOn: `mech.turboComp.${side}`
    });
    reg.anchor(`compOutlet${side}`, s * 1.53, -0.88, -0.90, gMech, { dir: [s * 0.25, 0.85, -0.45] });

    // Exhaust 3-into-1 Merge Collector & Rear Downpipe
    reg.part(`mech.exhCollector.${side}`, collectorGeo, {
      parent: gMech,
      pos: [s * 1.04, -0.76, -0.71],
      ramp: "exhaust",
      mountOn: `mech.turboTurbine.${side}`
    });
    reg.part(`mech.turboDownpipe.${side}`, downpipeGeo, {
      parent: gMech,
      pos: [s * 1.03, ty - 0.03, tz - 0.12],
      ramp: "exhaust",
      mountOn: `mech.turboTurbine.${side}`
    });

    // Dual Pneumatic Wastegate Actuator & Bypass Pipe matching ANCHORS.wastegatePortL/R
    const wgBodyGeo = buildCylinderGeometry(0.088, 0.088, 0.13, { segments: 20, axis: "y" });
    const wgCapGeo = buildCylinderGeometry(0.098, 0.098, 0.036, { segments: 20, axis: "y" });
    const wgPlungerGeo = buildCylinderGeometry(0.024, 0.024, 0.08, { segments: 14, axis: "y" });
    const wgPipeGeo = makeCurvedPipeGeo(
      [
        [s * 1.07, -0.86, -0.84],
        [s * 1.18, -0.78, -0.96],
        [s * 1.24, -0.68, -1.05]
      ],
      0.044,
      14,
      12
    );

    reg.part(`mech.wastegatePipe.${side}`, wgPipeGeo, {
      parent: gMech,
      ramp: "exhaust",
      mountOn: `mech.turboTurbine.${side}`
    });
    reg.part(`mech.wastegate.${side}`, wgBodyGeo, {
      parent: gMech,
      pos: [s * 1.24, -0.665, -1.05],
      ramp: "copper",
      mountOn: `mech.wastegatePipe.${side}`
    });
    reg.part(`mech.wastegateCap.${side}`, wgCapGeo, {
      parent: gMech,
      pos: [s * 1.24, -0.615, -1.05],
      ramp: "brass",
      detail: true,
      mountOn: `mech.wastegate.${side}`
    });
    reg.part(`mech.wastegateValve.${side}`, wgPlungerGeo, {
      parent: gMech,
      pos: [s * 1.24, -0.585, -1.05],
      ramp: "brass",
      detail: true,
      mountOn: `mech.wastegate.${side}`
    });
    reg.anchor(`wastegatePort${side}`, s * 1.24, -0.60, -1.05, gMech, { dir: [-s * 0.25, 0.94, -0.22] });
  }

  // 6 Tubular Exhaust Header Primaries (separated 3-into-1 lanes into collector)
  const exhTargetsZ = [-0.84, -0.71, -0.58, -0.84, -0.71, -0.58];
  for (let i = 0; i < 6; i++) {
    const s = BANK_SIGN[i];
    const side = s < 0 ? "L" : "R";
    const cz = CYL_Z[i];
    const tzPort = exhTargetsZ[i];
    const bankIdx = i % 3;
    reg.part(`mech.exhBoss.${i}`, exhBossGeo, {
      parent: gMech,
      pos: [s * SPEC.HEAD_X_CENTER, -0.24, cz],
      ramp: "mid",
      mountOn: `struct.cylHead.${side}`
    });
    let pts;
    if (bankIdx === 0) {
      pts = [
        [s * SPEC.HEAD_X_CENTER, -0.26, cz],
        [s * 1.15, -0.46, cz * 0.5 + tzPort * 0.5],
        [s * 1.05, -0.68, tzPort]
      ];
    } else if (bankIdx === 1) {
      pts = [
        [s * SPEC.HEAD_X_CENTER, -0.26, cz],
        [s * 0.94, -0.46, cz * 0.40 + tzPort * 0.60],
        [s * 1.00, -0.68, tzPort]
      ];
    } else {
      pts = [
        [s * SPEC.HEAD_X_CENTER, -0.26, cz],
        [s * 1.38, -0.56, cz * 0.35 + tzPort * 0.65],
        [s * 1.30, -0.68, tzPort + 0.12],
        [s * 1.10, -0.68, tzPort]
      ];
    }
    const exhPrimaryGeo = makeCurvedPipeGeo(pts, 0.036, 20, 12);
    reg.part(`mech.exhPrimary.${i}`, exhPrimaryGeo, {
      parent: gMech,
      ramp: "exhaust",
      mountOn: `mech.exhBoss.${i}`,
      allowOverlap: [`mech.exhCollector.${side}`]
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Coaxial Port-Normal Tubes: Twin Charge Pipes & Wastegate Reference Lines
  // ---------------------------------------------------------------------------
  for (const [side, s] of [["L", -1], ["R", 1]]) {
    reg.tube(
      `tube.boost.${side}`,
      `compOutlet${side}`,
      [
        [s * 1.66, -0.38, -0.96],
        [s * 1.72, 0.22, -0.84],
        [s * 1.50, 0.60, -0.62],
        [s * 1.24, 0.72, -0.52]
      ],
      `icInlet${side}`,
      {
        parent: gMech,
        radius: 0.056,
        segments: 32,
        radialSegments: 16,
        leadOut: 0.24,
        leadIn: 0.24,
        ramp: "comp",
        fromPart: `mech.compOutletStub.${side}`,
        toPart: `struct.intercooler.snout${side}`,
        allowOverlap: [`mech.turboComp.${side}`]
      }
    );

    reg.tube(
      `tube.wastegate.${side}`,
      `plenum.tap.${side}`,
      [
        [s * 0.78, 0.30, -1.06],
        [s * 1.12, -0.02, -1.24]
      ],
      `wastegatePort${side}`,
      {
        parent: gMech,
        radius: 0.017,
        segments: 26,
        radialSegments: 10,
        leadOut: 0.20,
        leadIn: 0.20,
        ramp: "copper",
        fromPart: `struct.intakeLog.${side}`,
        toPart: `mech.wastegate.${side}`,
        allowOverlap: [`struct.cylHead.${side}`]
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Bosch Motronic M5.2 Telemetry Screen on Front Dyno Console Apron
  // ---------------------------------------------------------------------------
  const apronTilt = 0.30;
  const screenLift = 0.056;
  const screenY = -1.555 + screenLift * Math.cos(apronTilt);
  const screenZ = 1.58 + screenLift * Math.sin(apronTilt);

  reg.screen("m64.screen", {
    parent: gMech,
    pos: [-0.36, screenY, screenZ],
    rot: [-Math.PI / 2 + apronTilt, 0, 0],
    width: 1.24,
    height: 0.30,
    depth: 0.018,
    resolution: [768, 192],
    ramp: "lo",
    mountOn: "base.frontApron",
    allowOverlap: ["base.plaque"],
    draw: drawM64Screen
  });

  // Corner mounting bolts on Motronic screen bezel
  const cosA = Math.cos(apronTilt);
  const sinA = Math.sin(apronTilt);
  for (const dx of [-0.58, 0.58]) {
    for (const dz of [-0.12, 0.12]) {
      reg.detail(
        `mech.screenBolt.${dx > 0 ? "r" : "l"}${dz > 0 ? "f" : "b"}`,
        makeScrewDetail(
          -0.36 + dx,
          screenY + 0.012 * cosA - dz * sinA,
          screenZ + 0.012 * sinA + dz * cosA,
          0.012,
          "y",
          kit
        ),
        { parent: gMech, stage: "mechanism" }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Direct 3D Interactables & Spatial Annotation Tags (max 2 unobstructed tags)
  // ---------------------------------------------------------------------------
  reg.interactable("subject.crankPulley", {
    cursor: "ew-resize",
    hint: "Drag crank pulley left/right to scrub 720° Boxer cycle",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.026;
    }
  });
  reg.interactable("subject.fanHub", {
    cursor: "ew-resize",
    hint: "Drag 11-blade axial fan (1.62:1 drive) to scrub rotation",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.026;
    }
  });
  reg.interactable("struct.intercooler.core", {
    cursor: "ns-resize",
    hint: "Drag intercooler core up/down to adjust target K16 boost",
    onDrag: ({ dy, state, setParam }) => {
      const cur = state.params?.boostTarget ?? 0.8;
      setParam("boostTarget", Math.max(0.2, Math.min(1.2, cur - dy * 0.005)));
    }
  });
  reg.interactable("struct.throttleBody", {
    cursor: "ns-resize",
    hint: "Drag 74 mm throttle body up/down to modulate throttle opening",
    onDrag: ({ dy, state, setParam }) => {
      const cur = state.params?.throttle ?? 85;
      setParam("throttle", Math.max(15, Math.min(100, cur - dy * 0.45)));
    }
  });
  for (const side of ["L", "R"]) {
    reg.interactable(`mech.wastegate.${side}`, {
      cursor: "ns-resize",
      hint: "Drag wastegate up for OVERBOOST or down for WASTEGATE DUMP",
      onDrag: ({ dy, fireTrigger }) => {
        if (dy < -4) fireTrigger("overboost");
        else if (dy > 4) fireTrigger("wastegate");
      }
    });
  }

  reg.tag("tag-plate", "PORSCHE M64/60 · 3.6L TWIN-TURBO · 408 PS", 1.38, -0.92, 1.52);
  reg.tag("tag-boxer", "180° BOXER · 1-6-2-4-3-5", -1.82, 1.06, 0.22);
}

export function updateKinematics(reg, state) {
  const params = state.params || state || {};
  const eng = getEngineState(state.theta ?? SPEC.initialTheta, params, state.triggers || {});

  const crankGroup = reg.groups.get("subject.crankshaftGroup")?.group;
  if (crankGroup) {
    crankGroup.rotation.z = -eng.theta;
  }

  const fanGroup = reg.groups.get("subject.coolingFanGroup")?.group;
  if (fanGroup) {
    fanGroup.rotation.z = -eng.fanRad;
  }

  for (const side of ["L", "R"]) {
    const camGroup = reg.groups.get(`mech.camGroup.${side}`)?.group;
    if (camGroup) {
      camGroup.rotation.z = -eng.camRad;
    }

    const rotorGroup = reg.groups.get(`mech.turboRotorGroup.${side}`)?.group;
    if (rotorGroup) {
      rotorGroup.rotation.x = eng.turboRad;
    }

    const wgValve = reg.parts.get(`mech.wastegateValve.${side}`)?.group;
    if (wgValve) {
      wgValve.position.y = -0.585 + 0.045 * eng.wastegateEnv;
    }
  }

  for (let i = 0; i < 6; i++) {
    const ck = eng.cylinders[i];
    const pGroup = reg.groups.get(`subject.pistonGroup.${i}`)?.group;
    if (pGroup) {
      pGroup.position.x = ck.xPiston;
    }
    const rGroup = reg.groups.get(`subject.rodGroup.${i}`)?.group;
    if (rGroup) {
      rGroup.rotation.z = ck.rodAngle;
    }
  }
}

export function tourAt(t) {
  const u = ((t % 1) + 1) % 1;
  if (u < 0.25) {
    return { view: "iso", cutaway: true, rpm: 2400, boostTarget: 0.80 };
  }
  if (u < 0.50) {
    return { view: "boxer", cutaway: true, rpm: 4200, boostTarget: 0.85 };
  }
  if (u < 0.75) {
    return { view: "turbos", cutaway: true, rpm: 5750, boostTarget: 1.00 };
  }
  return { view: "fan", cutaway: false, rpm: 3200, boostTarget: 0.80 };
}
