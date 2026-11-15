import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { clamp01 } from "../../kit/runtime.mjs";
import { SPEC, ANCHORS, getDctState, getGearSpec, getGearRatio } from "./model.mjs";

/**
 * Builds a C-shaped crescent shift fork yoke in the YZ plane (extruded along X)
 * to hug the brass synchronizer sleeve groove cleanly from the +Z/+Y front side.
 */
function buildForkYokeX(rInner, rOuter, thickness, aStartDeg = 110, aEndDeg = 225, segs = 14) {
  const shape = new THREE.Shape();
  const aStart = (aStartDeg * Math.PI) / 180;
  const aEnd = (aEndDeg * Math.PI) / 180;
  for (let i = 0; i <= segs; i++) {
    const a = aStart + (aEnd - aStart) * (i / segs);
    const x = Math.cos(a) * rOuter;
    const y = Math.sin(a) * rOuter;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = aStart + (aEnd - aStart) * (i / segs);
    shape.lineTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildMechanism(reg, kit) {
  const mechGroup = reg.group("mech.group", { stage: "mechanism" });
  const { BASE_Y, outY, outZ } = SPEC;
  const padTopY = BASE_Y + 0.11;

  // 1. Sculpted Shift Forks with Crescent Yokes on Dual Shift Rails
  const rails = {
    odd: { y: 0.14, z: 0.64, partId: "struct.shiftRail.odd" },
    even: { y: -0.02, z: 0.76, partId: "struct.shiftRail.even" }
  };

  SPEC.synchros.forEach((syn) => {
    const rail = rails[syn.rail];
    const forkGroup = reg.group(`mech.fork.group.${syn.id}`, {
      parent: mechGroup,
      pos: [syn.x, rail.y, rail.z],
      stage: "mechanism"
    });

    // Sliding rail collar
    reg.part(`mech.fork.collar.${syn.id}`, buildCylinderGeometry(0.056, 0.056, 0.09, { segments: 14, axis: "x" }), {
      parent: forkGroup,
      ramp: "hi",
      outline: "mid",
      crease: "faint",
      explode: [0, 0.18, 0.25],
      mountOn: rail.partId
    });

    // Local offset from rail center to synchro sleeve center (outY, outZ)
    const relY = outY - rail.y;
    const relZ = outZ - rail.z;
    // Connect collar cleanly to top-front lip of crescent yoke (at r ~ 0.265, angle ~ 155 deg -> z = +0.24, y = +0.11)
    const lipY = relY + 0.12;
    const lipZ = relZ + 0.24;
    const armLen = Math.hypot(lipY, lipZ);
    const armRotX = Math.atan2(-lipZ, -lipY);

    reg.part(`mech.fork.arm.${syn.id}`, new THREE.BoxGeometry(0.048, armLen, 0.052), {
      parent: forkGroup,
      pos: [0, lipY * 0.5, lipZ * 0.5],
      rot: [armRotX, 0, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      explode: [0, 0.18, 0.25],
      mountOn: `mech.fork.collar.${syn.id}`,
      allowOverlap: [`mech.fork.yoke.${syn.id}`]
    });

    // Crescent C-Yoke hugging the brass synchronizer sleeve
    reg.part(`mech.fork.yoke.${syn.id}`, buildForkYokeX(0.232, 0.292, 0.046, 112, 222, 16), {
      parent: forkGroup,
      pos: [0, relY, relZ],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      explode: [0, 0.18, 0.25],
      mountOn: `mech.fork.arm.${syn.id}`,
      allowOverlap: [`synchro.sleeve.${syn.id}`, `synchro.hub.${syn.id}`]
    });
  });

  // Twin Hydraulic Shift Actuator Cylinders at rear bulkhead (x = +2.24)
  reg.part("mech.shiftActuator.odd", buildCylinderGeometry(0.068, 0.068, 0.24, { segments: 16, axis: "x" }), {
    parent: mechGroup,
    pos: [2.25, rails.odd.y, rails.odd.z],
    ramp: "copper",
    outline: "mid",
    crease: "faint",
    explode: [0.24, 0.22, 0.22],
    mountOn: "struct.shiftRail.odd"
  });
  reg.anchor("syn.actuator.odd", 2.37, rails.odd.y, rails.odd.z, mechGroup, { dir: [1, 0, 0] });

  reg.part("mech.shiftActuator.even", buildCylinderGeometry(0.068, 0.068, 0.24, { segments: 16, axis: "x" }), {
    parent: mechGroup,
    pos: [2.25, rails.even.y, rails.even.z],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    explode: [0.24, 0.16, 0.28],
    mountOn: "struct.shiftRail.even"
  });
  reg.anchor("syn.actuator.even", 2.37, rails.even.y, rails.even.z, mechGroup, { dir: [1, 0, 0] });

  // 2. Cleanly Arched Hydraulic Feed Tubes (Mechatronics -> Clutches K1/K2 & Shift Actuators)
  reg.tube(
    "tube.hyd.k1",
    "mecha.out.k1",
    [
      [-0.82, padTopY + 0.14, 0.90],
      [-1.56, -1.42, 0.80],
      [-1.84, -0.92, 0.54]
    ],
    "clutch.feed.k1",
    {
      parent: mechGroup,
      radius: 0.026,
      segments: 38,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.16,
      ramp: "lit",
      outline: "lo",
      fromPart: "struct.mecha.body",
      toPart: "struct.clutchFeed",
      allowOverlap: ["tube.hyd.k2"]
    }
  );

  reg.tube(
    "tube.hyd.k2",
    "mecha.out.k2",
    [
      [-0.86, padTopY + 0.12, 1.00],
      [-1.50, -1.46, 0.90],
      [-1.74, -0.96, 0.60]
    ],
    "clutch.feed.k2",
    {
      parent: mechGroup,
      radius: 0.026,
      segments: 38,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.16,
      ramp: "comp",
      outline: "lo",
      fromPart: "struct.mecha.body",
      toPart: "struct.clutchFeed",
      allowOverlap: ["tube.hyd.k1"]
    }
  );

  reg.tube(
    "tube.hyd.synE",
    "mecha.out.synE",
    [
      [1.32, padTopY + 0.12, 1.04],
      [2.32, -1.52, 1.02],
      [2.64, -0.32, 0.82]
    ],
    "syn.actuator.even",
    {
      parent: mechGroup,
      radius: 0.024,
      segments: 38,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.16,
      ramp: "brass",
      outline: "lo",
      fromPart: "struct.mecha.body",
      toPart: "mech.shiftActuator.even",
      allowOverlap: ["tube.hyd.synO"]
    }
  );

  reg.tube(
    "tube.hyd.synO",
    "mecha.out.synO",
    [
      [1.30, padTopY + 0.10, 1.06],
      [2.54, -1.20, 1.02],
      [2.72, -0.14, 0.72]
    ],
    "syn.actuator.odd",
    {
      parent: mechGroup,
      radius: 0.024,
      segments: 38,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.16,
      ramp: "copper",
      outline: "lo",
      fromPart: "struct.mecha.body",
      toPart: "mech.shiftActuator.odd",
      allowOverlap: ["tube.hyd.synE"]
    }
  );

  // 3. 7-Gate Sequential Selector Lever (front-left outrigger pad, cleanly clear of plaque)
  const [pdX, , pdZ] = ANCHORS.paddleMount;
  reg.part("mech.paddle.housing", new THREE.BoxGeometry(0.48, 0.14, 0.34), {
    parent: mechGroup,
    pos: [pdX, padTopY + 0.07, pdZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.paddlePad"
  });
  reg.part("mech.paddle.bezel", new THREE.BoxGeometry(0.42, 0.03, 0.16), {
    parent: mechGroup,
    pos: [pdX, padTopY + 0.145, pdZ],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "mech.paddle.housing"
  });
  // 7 Gate index ticks on selector bezel
  const gatePts = [];
  for (let i = 0; i < 7; i++) {
    const gx = pdX - 0.15 + (i / 6) * 0.30;
    gatePts.push(new THREE.Vector3(gx, padTopY + 0.163, pdZ + 0.03), new THREE.Vector3(gx, padTopY + 0.163, pdZ + 0.07));
  }
  reg.detail(
    "mech.paddle.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gatePts), kit.lineMaterials.lo),
    { parent: mechGroup }
  );

  const paddlePivot = reg.group("mech.paddle.pivot", {
    parent: mechGroup,
    pos: [pdX, padTopY + 0.14, pdZ],
    stage: "mechanism"
  });
  reg.part("mech.paddle.stalk", new THREE.BoxGeometry(0.052, 0.40, 0.052), {
    parent: paddlePivot,
    pos: [0, 0.19, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "mech.paddle.bezel"
  });
  reg.part("mech.paddle.knob", buildCylinderGeometry(0.072, 0.058, 0.13, { segments: 16, axis: "y" }), {
    parent: paddlePivot,
    pos: [0, 0.42, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "mech.paddle.stalk"
  });

  // 4. Diegetic Mechatronics Telemetry & Torque-Handoff Screen (front-right pad)
  const [scX, , scZ] = ANCHORS.screenMount;
  reg.part("mech.screenStand", new THREE.BoxGeometry(0.24, 0.30, 0.18), {
    parent: mechGroup,
    pos: [scX, padTopY + 0.15, scZ - 0.04],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.screenPad"
  });
  reg.detail("mech.screenStand.screw", makeScrewDetail(scX, padTopY + 0.004, scZ + 0.13, 0.026, "y", kit), {
    parent: mechGroup
  });

  reg.screen("dct.screen", {
    parent: mechGroup,
    pos: [scX, padTopY + 0.54, scZ + 0.04],
    rot: [-0.24, -0.22, 0],
    width: 1.08,
    height: 0.72,
    resolution: [300, 200],
    ramp: "lo",
    outline: "mid",
    mountOn: "mech.screenStand",
    draw: (ctx, canvas, state, theme) => {
      const d = getDctState({ ...state, rpm: state.effectiveRpm ?? state.rpm });
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = theme.isDark ? "#0d1420" : "#141b26";
      ctx.fillRect(0, 0, W, H);

      // Header bar
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`7-DCT · ${d.effRatio.toFixed(2)}:1`, 12, 18);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`OUT ${d.outRpm} RPM`, 188, 18);

      // K1 & K2 Clutch Clamp Bars + Live Shaft RPM
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.fillText(`K1 ${Math.round(d.k1 * 100)}%`, 12, 43);
      ctx.fillStyle = "rgba(148,163,184,0.18)";
      ctx.fillRect(78, 33, 134, 12);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(78, 33, 134 * d.k1, 12);
      ctx.fillStyle = "#fdba74";
      ctx.fillText(`${d.oddRpm}`, 220, 43);

      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`K2 ${Math.round(d.k2 * 100)}%`, 12, 65);
      ctx.fillStyle = "rgba(148,163,184,0.18)";
      ctx.fillRect(78, 55, 134, 12);
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(78, 55, 134 * d.k2, 12);
      ctx.fillStyle = "#d8b4fe";
      ctx.fillText(`${d.evenRpm}`, 220, 65);

      // Dual-Clutch Handoff Cross-Fade Plot
      const px = 12;
      const py = 78;
      const pw = W - 24;
      const ph = 44;
      ctx.fillStyle = "rgba(15,23,42,0.75)";
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = "rgba(148,163,184,0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, pw, ph);

      // Draw K1 & K2 torque overlap curves across active pair
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f97316";
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const s = t * t * (3 - 2 * t);
        const curOdd = d.activeGear % 2 === 1;
        const yv = curOdd ? 1 - s : s;
        const cx = px + t * pw;
        const cy = py + ph - 4 - yv * (ph - 8);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      ctx.strokeStyle = "#a855f7";
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const s = t * t * (3 - 2 * t);
        const curOdd = d.activeGear % 2 === 1;
        const yv = curOdd ? s : 1 - s;
        const cx = px + t * pw;
        const cy = py + ph - 4 - yv * (ph - 8);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Current handoff marker line
      const frac = d.gearVal - Math.floor(d.gearVal);
      const mx = px + frac * pw;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, py + 2);
      ctx.lineTo(mx, py + ph - 2);
      ctx.stroke();

      // 7-Speed Gear Matrix
      for (let g = 1; g <= 7; g++) {
        const bx = 12 + (g - 1) * 40;
        const by = 132;
        const isActive = g === d.activeGear;
        const isPre = g === d.preselectGear;
        ctx.fillStyle = isActive ? "#f97316" : isPre ? "#38bdf8" : "#243042";
        ctx.fillRect(bx, by, 34, 34);
        ctx.fillStyle = isActive || isPre ? "#0f172a" : "#94a3b8";
        ctx.font = "bold 14px monospace";
        ctx.fillText(String(g), bx + 12, by + 22);
      }

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px monospace";
      ctx.fillText(`ACTIVE: G${d.activeGear}   PRE-SELECTED: G${d.preselectGear}`, 14, 185);
    }
  });

  // 5. Direct 3D Interactables
  reg.interactable("mech.paddle.pivot", {
    cursor: "grab",
    hint: "Drag 7-gate selector lever left/right to shift gears 1–7",
    onDrag: ({ dx, state, setParam }) => {
      setParam("gear", (state.params.gear ?? 3) + dx * 0.035);
    }
  });

  reg.interactable("shaft.flywheel", {
    cursor: "grab",
    hint: "Drag flywheel/clutch drum to crank transmission manually",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.015;
    }
  });
  reg.interactable("clutch.k2.basket", {
    cursor: "grab",
    hint: "Drag K1/K2 wet clutch drum to crank transmission manually",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.015;
    }
  });
}

export function updateKinematics(reg, state) {
  const theta = state.theta ?? SPEC.initialTheta;
  const d = getDctState({ ...state, rpm: state.effectiveRpm ?? state.rpm ?? SPEC.initialRpm });

  const oddRatioScale = d.rpm > 0 ? d.oddRpm / d.rpm : 1;
  const evenRatioScale = d.rpm > 0 ? d.evenRpm / d.rpm : 1;

  // 1. Flywheel, Concentric Input Shafts, Output Countershaft, and Individual Freewheeling Gears
  const fwSpin = reg.groups.get("shaft.flywheel.spin")?.group;
  const oddSpin = reg.groups.get("shaft.odd.spin")?.group;
  const evenSpin = reg.groups.get("shaft.even.spin")?.group;
  const outSpin = reg.groups.get("shaft.out.spin")?.group;

  if (fwSpin) fwSpin.rotation.x = theta;
  if (oddSpin) oddSpin.rotation.x = theta * oddRatioScale;
  if (evenSpin) evenSpin.rotation.x = theta * evenRatioScale;
  if (outSpin) outSpin.rotation.x = -theta / d.effRatio;

  SPEC.gears.forEach((g) => {
    const outGearSpin = reg.groups.get(`gear.outSpin.${g.gear}`)?.group;
    if (!outGearSpin) return;
    const isLocked = g.gear === d.activeGear || g.gear === d.preselectGear;
    if (isLocked) {
      outGearSpin.rotation.x = -theta / d.effRatio;
    } else {
      const inScale = g.shaft === "odd" ? oddRatioScale : evenRatioScale;
      outGearSpin.rotation.x = (-theta * inScale) / getGearRatio(g.gear);
    }
  });

  // 2. Clamp K1 & K2 Wet Clutch Pistons Axially
  const k1Piston = reg.groups.get("clutch.k1.pistonGroup")?.group;
  const k2Piston = reg.groups.get("clutch.k2.pistonGroup")?.group;
  if (k1Piston) k1Piston.position.x = -1.61 + d.k1 * 0.055;
  if (k2Piston) k2Piston.position.x = -1.62 + d.k2 * 0.055;

  // 3. Slide All 4 Brass Synchronizer Sleeves & Sculpted Shift Forks
  SPEC.synchros.forEach((syn) => {
    const dx = d.synchroPos[syn.id] || 0;
    const synGroup = reg.groups.get(`synchro.group.${syn.id}`)?.group;
    if (synGroup) synGroup.position.x = syn.x + dx;

    const synSpin = reg.groups.get(`synchro.spin.${syn.id}`)?.group;
    if (synSpin) synSpin.rotation.x = -theta / d.effRatio;

    const forkGroup = reg.groups.get(`mech.fork.group.${syn.id}`)?.group;
    if (forkGroup) forkGroup.position.x = syn.x + dx;
  });

  // 4. Tilt Selector Lever across 1..7 Gate
  const paddlePivot = reg.groups.get("mech.paddle.pivot")?.group;
  if (paddlePivot) {
    const gNorm = clamp01((d.gearVal - 1) / 6);
    paddlePivot.rotation.z = 0.52 - gNorm * 1.04;
  }

  // 5. Update Torque-Flow Shader Uniforms
  const fluxMat = reg.groups.get("shader.fluxData")?.group?.userData?.material;
  if (fluxMat) {
    const gLow = Math.floor(d.gearVal);
    const gHigh = Math.min(7, gLow + 1);
    const lowSpec = getGearSpec(gLow);
    const highSpec = getGearSpec(gHigh);
    const oddSpec = lowSpec.shaft === "odd" ? lowSpec : highSpec;
    const evenSpec = lowSpec.shaft === "even" ? lowSpec : highSpec;

    fluxMat.uniforms.uTime.value = state.simClock ?? 0;
    fluxMat.uniforms.uOddGearX.value = oddSpec.x;
    fluxMat.uniforms.uEvenGearX.value = evenSpec.x;
    fluxMat.uniforms.uOddGearR.value = oddSpec.rIn;
    fluxMat.uniforms.uEvenGearR.value = evenSpec.rIn;
    fluxMat.uniforms.uK1.value = d.k1;
    fluxMat.uniforms.uK2.value = d.k2;
    fluxMat.uniforms.uLoad.value = d.load / 100;
    fluxMat.uniforms.uEnvelope.value = state.shaderEnv ?? 1.0;
  }
}
