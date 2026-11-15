import * as THREE from "three";
import { buildCylinderGeometry, makeRingLine, makeKnurlLines, makeScrewDetail } from "../../kit/primitives.mjs";
import { clamp01 } from "../../kit/runtime.mjs";
import { SPEC, ANCHORS, getPistonKinematics, getEngineMetrics, getCylinderStroke } from "./model.mjs";

/**
 * Builds an open U-channel cutaway throttle body sleeve along X so the brass butterfly plate is visible.
 */
function buildCutawayThrottleBodyGeometry(rIn, rOut, length) {
  const shape = new THREE.Shape();
  const aStart = (120 * Math.PI) / 180;
  const aEnd = (340 * Math.PI) / 180;
  const segs = 20;
  for (let i = 0; i <= segs; i++) {
    const a = aStart + (aEnd - aStart) * (i / segs);
    const x = Math.cos(a) * rOut;
    const y = Math.sin(a) * rOut;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = aStart + (aEnd - aStart) * (i / segs);
    shape.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 1
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

export function buildMechanism(reg, kit) {
  const mechGroup = reg.group("mech.group", { stage: "mechanism" });
  const { topSurfaceY, crankY, boreEndAbsX, headOuterAbsX, turboX, turboY, turboZ } = SPEC;
  const headCenterAbsX = (boreEndAbsX + headOuterAbsX) * 0.5; // 1.15

  // 1. 3-into-1 Swept Inconel Exhaust Headers & Cold-Side Intercooler Piping
  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    const bankCyls = SPEC.cylinders.filter((c) => c.bank === bSign);
    const tubeIds = bankCyls.map((c) => `tube.exhaust.${c.id}`);
    const tx = bSign * turboX;
    const tzCollector = turboZ - 0.21;

    bankCyls.forEach((cyl, idx) => {
      const dipY = -1.14 - idx * 0.09;
      const outX = bSign * (1.30 + idx * 0.14);
      const midZ = cyl.z * 0.48 + tzCollector * 0.52;

      const waypoints = [
        [bSign * headCenterAbsX, dipY + 0.16, cyl.z],
        [outX, dipY, midZ],
        [tx - bSign * 0.06, -1.36, tzCollector + (idx === 0 ? 0.06 : idx === 2 ? -0.06 : 0.0)]
      ];

      reg.tube(`tube.exhaust.${cyl.id}`, `exhaust.port.${cyl.id}`, waypoints, `turbo.exIn.${side}`, {
        parent: mechGroup,
        radius: 0.042,
        segments: 40,
        radialSegments: 10,
        leadOut: 0.14,
        leadIn: 0.20,
        ramp: "exhaust",
        outline: "lo",
        fromPart: `cyl.exPort.${cyl.id}`,
        toPart: `turbo.collector.${side}`,
        allowOverlap: [
          ...tubeIds.filter((id) => id !== `tube.exhaust.${cyl.id}`),
          `turbo.pedestal.${side}`,
          `turbo.turbineScroll.${side}`
        ]
      });
    });

    // Cold-Side Charge Pipe: Compressor Outlet -> Intercooler End Tank
    reg.tube(
      `tube.charge.${side}`,
      `turbo.compOut.${side}`,
      [
        [tx, crankY + 0.36, turboZ + 0.04],
        [bSign * 1.56, crankY + 0.72, -0.82],
        [bSign * 1.24, crankY + 0.72, -1.24]
      ],
      `ic.in.${side}`,
      {
        parent: mechGroup,
        radius: 0.048,
        segments: 34,
        radialSegments: 12,
        leadOut: 0.16,
        leadIn: 0.16,
        ramp: "intake",
        outline: "mid",
        fromPart: `turbo.compOut.${side}`,
        toPart: `struct.ic.tank.${side}`,
        allowOverlap: [`struct.intakeLog.${side}`]
      }
    );

    // Cold-Side Plenum Feed: Intercooler End-Tank Bottom -> Intake Log Rear
    reg.tube(
      `tube.plenum.${side}`,
      `ic.out.${side}`,
      [
        [bSign * 0.92, crankY + 0.30, -1.28],
        [bSign * (headCenterAbsX - 0.02), crankY + 0.45, -1.24]
      ],
      `intake.log.${side}.rear`,
      {
        parent: mechGroup,
        radius: 0.046,
        segments: 26,
        radialSegments: 12,
        leadOut: 0.12,
        leadIn: 0.12,
        ramp: "intake",
        outline: "mid",
        fromPart: `struct.ic.tank.${side}`,
        toPart: `struct.intakeLog.${side}`,
        allowOverlap: [`struct.ic.strut.0`, `struct.ic.strut.1`]
      }
    );

    // Wastegate Actuator Linkage Rod (slides dynamically with boost / antilag)
    const wgRodGroup = reg.group(`mech.wgRod.group.${side}`, {
      parent: mechGroup,
      pos: [tx - bSign * 0.18, turboY + 0.08, turboZ - 0.06],
      rot: [0, 0, bSign * 0.22],
      stage: "mechanism"
    });
    reg.part(`mech.wgRod.${side}`, buildCylinderGeometry(0.014, 0.014, 0.26, { segments: 10, axis: "y" }), {
      parent: wgRodGroup,
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      detail: true
    });
  });

  // 2. Central Crossover Balance Plenum & Live Cutaway Butterfly Throttle Body
  const crossY = crankY + 0.49; // +0.17
  const crossZ = 0.16;
  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    reg.part(`mech.crossover.${side}`, buildCylinderGeometry(0.065, 0.065, 1.06, { segments: 16, axis: "x" }), {
      parent: mechGroup,
      pos: [bSign * 0.62, crossY, crossZ],
      ramp: "intake",
      outline: "mid",
      crease: "faint",
      clippable: true,
      mountOn: `struct.intakeLog.${side}`
    });
  });
  reg.part("mech.throttleBody", buildCutawayThrottleBodyGeometry(0.072, 0.105, 0.28), {
    parent: mechGroup,
    pos: [0, crossY, crossZ],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    clippable: true,
    mountOn: "mech.crossover.L",
    allowOverlap: ["mech.crossover.R"]
  });
  const butterflyPivot = reg.group("mech.butterfly.pivot", {
    parent: mechGroup,
    pos: [0, crossY, crossZ],
    stage: "mechanism"
  });
  reg.part("mech.butterfly.shaft", buildCylinderGeometry(0.015, 0.015, 0.24, { segments: 10, axis: "y" }), {
    parent: butterflyPivot,
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    detail: true
  });
  reg.part("mech.butterfly.plate", buildCylinderGeometry(0.064, 0.064, 0.014, { segments: 20, axis: "x" }), {
    parent: butterflyPivot,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true
  });

  // 3. Front-Apron Throttle Quadrant Lever (directly draggable in 3D!)
  const [thX, , thZ] = ANCHORS.throttleMount;
  reg.part("mech.throttle.base", new THREE.BoxGeometry(0.42, 0.13, 0.32), {
    parent: mechGroup,
    pos: [thX, topSurfaceY + 0.065, thZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  reg.part("mech.throttle.quadrant", buildCylinderGeometry(0.20, 0.20, 0.075, { segments: 24, axis: "z" }), {
    parent: mechGroup,
    pos: [thX, topSurfaceY + 0.22, thZ],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "mech.throttle.base"
  });

  const throttlePivot = reg.group("mech.throttle.pivot", {
    parent: mechGroup,
    pos: [thX, topSurfaceY + 0.22, thZ + 0.05],
    stage: "mechanism"
  });
  reg.part("mech.throttle.arm", new THREE.BoxGeometry(0.052, 0.36, 0.042), {
    parent: throttlePivot,
    pos: [0, 0.17, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "mech.throttle.quadrant"
  });
  reg.part("mech.throttle.grip", buildCylinderGeometry(0.048, 0.048, 0.17, { segments: 14, axis: "z" }), {
    parent: throttlePivot,
    pos: [0, 0.36, 0.03],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "mech.throttle.arm"
  });

  // 4. Wastegate Boost Dial Gauge with Fresnel Cel Glass Lens (front-right, directly draggable!)
  const [bdX, , bdZ] = ANCHORS.boostDialMount;
  const dialGroup = reg.group("mech.boostDial.group", {
    parent: mechGroup,
    pos: [bdX, topSurfaceY + 0.17, bdZ],
    rot: [-0.28, 0, 0],
    stage: "mechanism"
  });
  reg.part("mech.boostDial.bezel", buildCylinderGeometry(0.28, 0.30, 0.13, { segments: 28, axis: "y" }), {
    parent: dialGroup,
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "struct.boostBase",
    allowOverlap: ["base.plate"]
  });
  reg.part("mech.boostDial.face", buildCylinderGeometry(0.24, 0.24, 0.025, { segments: 28, axis: "y" }), {
    parent: dialGroup,
    pos: [0, 0.064, 0],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "mech.boostDial.bezel"
  });

  const boostTicks = [];
  for (let i = 0; i <= 8; i++) {
    const a = (-125 + i * (250 / 8)) * (Math.PI / 180);
    boostTicks.push(
      new THREE.Vector3(Math.sin(a) * 0.15, 0.082, -Math.cos(a) * 0.15),
      new THREE.Vector3(Math.sin(a) * 0.21, 0.082, -Math.cos(a) * 0.21)
    );
  }
  reg.detail("mech.boostDial.ticks", new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(boostTicks), kit.lineMaterials.hi), {
    parent: dialGroup
  });
  const dialRing = makeRingLine(0.23, 28, kit, "lo");
  dialRing.rotation.x = -Math.PI / 2;
  dialRing.position.y = 0.082;
  reg.detail("mech.boostDial.ring", dialRing, { parent: dialGroup });

  const boostNeedlePivot = reg.group("mech.boostDial.needlePivot", {
    parent: dialGroup,
    pos: [0, 0.088, 0],
    stage: "mechanism"
  });
  reg.part("mech.boostDial.needle", new THREE.BoxGeometry(0.024, 0.018, 0.19), {
    parent: boostNeedlePivot,
    pos: [0, 0, -0.075],
    ramp: "comb",
    outline: "lo",
    crease: "faint",
    detail: true
  });
  reg.part("mech.boostDial.cap", buildCylinderGeometry(0.050, 0.050, 0.036, { segments: 16, axis: "y" }), {
    parent: dialGroup,
    pos: [0, 0.092, 0],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    detail: true
  });
  reg.part("mech.boostDial.glass", buildCylinderGeometry(0.245, 0.245, 0.018, { segments: 28, axis: "y" }), {
    parent: dialGroup,
    pos: [0, 0.112, 0],
    ramp: "glass",
    opacity: 0.24,
    outline: "lo",
    crease: "faint",
    detail: true
  });
  reg.detail("mech.boostDial.knurl", makeKnurlLines(0.30, -0.06, 0.04, 24, kit, { tone: "lo" }), {
    parent: dialGroup
  });

  // Position BAR tag cleanly on the deck in front of the boost dial bezel
  reg.tag("tag-boost", "BAR", bdX, topSurfaceY + 0.04, bdZ + 0.36);

  // 5. Diegetic Dyno Telemetry Monitor (front-right pedestal)
  const [scX, , scZ] = ANCHORS.dynoScreenMount;
  reg.part("mech.dynoStand", new THREE.BoxGeometry(0.26, 0.32, 0.22), {
    parent: mechGroup,
    pos: [scX, topSurfaceY + 0.16, scZ - 0.08],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.plate"
  });
  reg.detail("mech.dynoStand.screw", makeScrewDetail(scX, topSurfaceY + 0.004, scZ + 0.12, 0.026, "y", kit), { parent: mechGroup });

  reg.screen("dyno.screen", {
    parent: mechGroup,
    pos: [scX, topSurfaceY + 0.56, scZ],
    rot: [-0.26, -0.24, 0],
    width: 1.06,
    height: 0.68,
    resolution: [288, 184],
    ramp: "lo",
    outline: "mid",
    mountOn: "mech.dynoStand",
    draw: (ctx, canvas, state, theme) => {
      const m = getEngineMetrics(state);
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = theme.isDark ? "#0d1420" : "#141a24";
      ctx.fillRect(0, 0, W, H);

      // Subtle telemetry grid
      ctx.strokeStyle = "rgba(148,163,184,0.16)";
      ctx.lineWidth = 1;
      for (let x = 22; x < W - 12; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, H - 28); ctx.stroke();
      }
      for (let y = 30; y < H - 24; y += 24) {
        ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(W - 12, y); ctx.stroke();
      }

      // Header KPIs
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`DYNO · ${m.powerHp} HP`, 12, 16);
      ctx.fillStyle = m.headerHeat > 0.72 ? "#fb923c" : "#38bdf8";
      ctx.fillText(`${m.effBoost.toFixed(2)} BAR · ${m.egtCelsius}°C`, 134, 16);

      // Sub-header turbo speed
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px monospace";
      ctx.fillText(`TURBO ${(m.turboRpm / 1000).toFixed(0)}k RPM · THROT ${Math.round(m.throttle)}%`, 12, 30);

      // Torque/HP curve with glowing live cursor
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const px = 14 + u * (W - 28);
        const curve = Math.sin(u * Math.PI * 0.85) * (0.42 + 0.58 * (m.effBoost / 2.2));
        const py = H - 36 - curve * 78;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const uNow = clamp01(m.rpm / 7200);
      const dotX = 14 + uNow * (W - 28);
      const dotY = H - 36 - Math.sin(uNow * Math.PI * 0.85) * (0.42 + 0.58 * (m.effBoost / 2.2)) * 78;
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 6-cylinder firing indicators (1-6-2-4-3-5)
      const cylIds = [1, 6, 2, 4, 3, 5];
      cylIds.forEach((cid, idx) => {
        const cyl = SPEC.cylinders.find((c) => c.id === cid);
        const st = getCylinderStroke(cyl, state.theta ?? 0, m.effBoost, m.throttle, m.antilag);
        const bx = 14 + idx * 44;
        const barH = Math.min(20, 4 + st.pressure * 0.45);
        ctx.fillStyle =
          st.stroke === "POWER"
            ? "#f97316"
            : st.stroke === "EXHAUST"
              ? "#ef4444"
              : st.stroke === "INTAKE"
                ? "#38bdf8"
                : "#eab308";
        ctx.fillRect(bx, H - 12 - barH, 36, barH);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px monospace";
        ctx.fillText(`C${cid}`, bx + 10, H - 2);
      });
    }
  });

  // 6. Direct 3D Interactables (Throttle lever, Boost dial, Front crank pulley)
  reg.interactable("mech.throttle.pivot", {
    cursor: "grab",
    hint: "Drag throttle lever left/right to rotate intake butterfly valve",
    onDrag: ({ dx, state, setParam }) => {
      setParam("throttle", (state.params.throttle ?? 68) + dx * 0.35);
    }
  });

  reg.interactable("mech.boostDial.bezel", {
    cursor: "grab",
    hint: "Drag boost dial to adjust target twin-turbo boost",
    onDrag: ({ dx, dy, state, setParam }) => {
      setParam("boost", (state.params.boost ?? 1.25) + (dx - dy) * 0.008);
    }
  });

  reg.interactable("crank.pulley", {
    cursor: "grab",
    hint: "Drag front crank pulley to step the 720° firing cycle",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.015;
    }
  });
}

export function updateKinematics(reg, state) {
  const theta = state.theta ?? SPEC.initialTheta;
  const m = getEngineMetrics(state);

  // 1. Rotate Crankshaft
  const crankGroup = reg.groups.get("crank.group")?.group;
  if (crankGroup) {
    crankGroup.rotation.z = theta;
  }

  // 2. Drive 6 Opposed Pistons, Connecting Rods & 12 Poppet Valves
  SPEC.cylinders.forEach((cyl) => {
    const k = getPistonKinematics(cyl, theta);
    const rodGroup = reg.groups.get(`conrod.group.${cyl.id}`)?.group;
    if (rodGroup) {
      rodGroup.position.set(k.cx, k.cy, cyl.z);
      rodGroup.rotation.z = k.rodAngleZ;
    }
    const pistonGroup = reg.groups.get(`piston.group.${cyl.id}`)?.group;
    if (pistonGroup) {
      pistonGroup.position.set(k.pistonPinX, SPEC.crankY, cyl.z);
    }

    const st = getCylinderStroke(cyl, theta, m.effBoost, m.throttle, m.antilag);
    const valveBaseX = cyl.bank * (SPEC.boreEndAbsX + 0.03);
    const inGroup = reg.groups.get(`valve.in.group.${cyl.id}`)?.group;
    if (inGroup) {
      inGroup.position.x = valveBaseX - cyl.bank * st.intakeLift * 0.068;
    }
    const exGroup = reg.groups.get(`valve.ex.group.${cyl.id}`)?.group;
    if (exGroup) {
      exGroup.position.x = valveBaseX - cyl.bank * st.exhaustLift * 0.068;
    }

    // Update dynamic volumetric combustion chamber cylinder spanning from piston crown to head face
    const chamberMesh = reg.groups.get(`shader.chamber.${cyl.id}`)?.group;
    if (chamberMesh) {
      const crownX = k.pistonCrownX;
      const headX = cyl.bank * SPEC.boreEndAbsX;
      const span = Math.max(0.03, Math.abs(headX - crownX));
      chamberMesh.position.set((crownX + headX) * 0.5, SPEC.crankY, cyl.z);
      chamberMesh.scale.set(span, 1, 1);
      const uMat = chamberMesh.userData.material;
      if (uMat) {
        uMat.uniforms.uTheta.value = theta;
        uMat.uniforms.uEnvelope.value = state.shaderEnv ?? 1.0;
        uMat.uniforms.uHeat.value = m.headerHeat;
      }
    }
  });

  // 3. Spin 4 DOHC Camshafts at exact 0.5x crank speed
  ["L", "R"].forEach((side) => {
    ["in", "ex"].forEach((kind) => {
      const camGroup = reg.groups.get(`cam.${kind}.${side}`)?.group;
      if (camGroup) {
        camGroup.rotation.z = theta * 0.5;
      }
    });
  });

  // 4. Spin Twin Turbocharger Turbine & Compressor Impellers + Wastegate Rods
  const turboPhase = (state.simClock ?? 0) * (10 + m.turboRpm * 0.00022);
  const wgLift = clamp01((m.effBoost - 0.5) / 1.8) * 0.05;
  ["L", "R"].forEach((side) => {
    const rotor = reg.groups.get(`turbo.rotor.${side}`)?.group;
    if (rotor) {
      rotor.rotation.z = (side === "L" ? 1 : -1) * turboPhase;
    }
    const wgRod = reg.groups.get(`mech.wgRod.group.${side}`)?.group;
    if (wgRod) {
      wgRod.position.y = SPEC.turboY + 0.08 - wgLift;
    }
  });

  // 5. Update Throttle Quadrant, Live Butterfly Valve & Boost Gauge Needle
  const tNorm = clamp01((m.throttle - 10) / 90);
  const throttlePivot = reg.groups.get("mech.throttle.pivot")?.group;
  if (throttlePivot) {
    throttlePivot.rotation.z = 0.72 - tNorm * 1.44;
  }
  const butterflyPivot = reg.groups.get("mech.butterfly.pivot")?.group;
  if (butterflyPivot) {
    // 0° = closed across bore; 82° = wide-open flow along X
    butterflyPivot.rotation.y = tNorm * 1.42;
  }

  const boostNeedle = reg.groups.get("mech.boostDial.needlePivot")?.group;
  if (boostNeedle) {
    const bNorm = clamp01((m.effBoost - 0.2) / 2.1);
    boostNeedle.rotation.y = (125 - bNorm * 250) * (Math.PI / 180);
  }

  // 6. Update Exhaust Header & Turbine Throat Shader Uniforms
  const headerMat = reg.groups.get("shader.headerData")?.group?.userData?.material;
  if (headerMat) {
    headerMat.uniforms.uTime.value = state.simClock ?? 0;
    headerMat.uniforms.uHeat.value = m.headerHeat;
    headerMat.uniforms.uEnvelope.value = state.shaderEnv ?? 1.0;
  }
}
