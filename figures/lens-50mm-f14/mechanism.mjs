import * as THREE from "three";
import {
  buildCylinderGeometry,
  makeRingLine,
  makeScrewDetail,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, getLensState } from "./model.mjs";

const LENS_OPT_N_MTF_SAMPLES = 36;

function buildPrimePinionGearGeometry(rPitch = 0.088, width = 0.14, teeth = 14) {
  const shape = new THREE.Shape();
  const rRoot = rPitch - 0.012;
  const rTip = rPitch + 0.012;
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const mod = i % 4;
    const r = mod === 1 || mod === 2 ? rTip : rRoot;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    curveSegments: 12
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(Math.PI / 2); // align extrusion axis to X (parallel to focus ring)
  return geo;
}

function buildPrimeQuadrantArcGeometry(rInner = 0.14, rOuter = 0.25, depth = 0.09) {
  const shape = new THREE.Shape();
  const aStart = -Math.PI * 0.03;
  const aEnd = Math.PI * 1.03;
  shape.absarc(0, 0, rOuter, aStart, aEnd, false);
  shape.absarc(0, 0, rInner, aEnd, aStart, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    curveSegments: 24
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(Math.PI / 2); // arc in YZ plane
  return geo;
}

function drawPrimeOpticsScreen(ctx, canvas, state, theme) {
  const w = canvas.width;
  const h = canvas.height;
  const css = (theme && theme.css) || {};
  const ch = (theme && theme.channels) || {};

  const bgCol = css.card || "#181a1f";
  const textCol = css.text || "#f4efe4";
  const mutedCol = css.muted || "#8c877c";
  const litCol = css.lit || "#f59e0b";
  const rayCol = ch.intake || "#38bdf8";
  const irisCol = ch.comb || "#fb923c";

  const st = getLensState(state?.params || state, state?.triggers || {});

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, w, h);

  // Subtle instrument border & header bar
  ctx.strokeStyle = mutedCol;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.globalAlpha = 1;

  ctx.fillStyle = textCol;
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("MTF50 & DEPTH OF FIELD", 12, 22);

  ctx.fillStyle = litCol;
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "right";
  ctx.fillText(`f/${st.effFstop.toFixed(1)} · ${st.focusDist.toFixed(2)}m`, w - 12, 22);
  ctx.textAlign = "left";

  // MTF50 Curve Graph (f/1.4 -> f/16)
  const gx = 16;
  const gy = 34;
  const gw = w - 32;
  const gh = 68;

  ctx.strokeStyle = mutedCol;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx, gy + gh);
  // Sweet spot reference grid line (80% MTF)
  const y80 = gy + gh * (1 - (80 - 40) / 60);
  ctx.moveTo(gx, y80);
  ctx.lineTo(gx + gw, y80);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Plot MTF curve
  ctx.strokeStyle = rayCol;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i <= LENS_OPT_N_MTF_SAMPLES; i++) {
    const u = i / LENS_OPT_N_MTF_SAMPLES;
    const fVal = 1.4 * Math.pow(16.0 / 1.4, u);
    const logF = Math.log2(fVal / 4.5);
    const mtf = Math.max(42, Math.min(96, 94 - 16 * logF * logF));
    const px = gx + u * gw;
    const py = gy + gh * (1 - (mtf - 40) / 60);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Current effective f-stop marker
  const curX = gx + st.fNorm * gw;
  const curY = gy + gh * (1 - (st.mtfScore - 40) / 60);
  ctx.strokeStyle = irisCol;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(curX, gy);
  ctx.lineTo(curX, gy + gh);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = irisCol;
  ctx.beginPath();
  ctx.arc(curX, curY, 4.2, 0, Math.PI * 2);
  ctx.fill();

  // MTF score badge
  ctx.fillStyle = textCol;
  ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`MTF ${st.mtfScore.toFixed(0)}%`, gx + 4, gy + 12);
  ctx.fillStyle = mutedCol;
  ctx.textAlign = "right";
  ctx.fillText(`EXT +${st.extensionMm.toFixed(2)}mm`, gx + gw - 2, gy + 12);
  ctx.textAlign = "left";

  // Depth-of-Field Bar (0.4m -> 12m log scale)
  const bx = 16;
  const by = 120;
  const bw = w - 32;
  const bh = 12;
  ctx.fillStyle = mutedCol;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(bx, by, bw, bh);
  ctx.globalAlpha = 1;

  const mapDist = (d) => {
    const dc = Math.max(0.4, Math.min(12.0, Number.isFinite(d) ? d : 12.0));
    return Math.log(dc / 0.4) / Math.log(12.0 / 0.4);
  };
  const uNear = mapDist(st.dofNearM);
  const uFar = mapDist(st.dofFarM);
  const uFocus = mapDist(st.focusDist);

  ctx.fillStyle = irisCol;
  ctx.globalAlpha = 0.78;
  ctx.fillRect(bx + uNear * bw, by, Math.max(4, (uFar - uNear) * bw), bh);
  ctx.globalAlpha = 1;

  // Focus plane tick
  ctx.fillStyle = textCol;
  ctx.fillRect(bx + uFocus * bw - 1.5, by - 3, 3, bh + 6);

  const farStr = Number.isFinite(st.dofFarM) ? `${st.dofFarM.toFixed(2)}m` : "INF";
  ctx.fillStyle = mutedCol;
  ctx.font = "600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`DOF ${st.dofNearM.toFixed(2)}m – ${farStr}`, bx, by + 27);
  ctx.textAlign = "right";
  ctx.fillStyle = litCol;
  ctx.fillText(st.regime.split("·")[0].trim(), bx + bw, by + 27);
  ctx.textAlign = "left";
}

export function buildMechanism(reg, kit) {
  const { topSurfaceY } = SPEC;
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const mechGroup = reg.group("mechanism.group", { parent: baseGroup, stage: "mechanism" });

  // ---------------------------------------------------------------------------
  // 1. Follow-Focus Handwheel & Focus Ring Pinion Stand (Rail Outrigger)
  // ---------------------------------------------------------------------------
  const [ffX, ffY, ffZ] = ANCHORS.followFocusMount;
  const ffStandGroup = reg.group("followFocus.stand", {
    parent: mechGroup,
    pos: [ffX, ffY, ffZ],
    stage: "mechanism"
  });

  const ffPedGeo = new THREE.BoxGeometry(0.38, 0.42, 0.30);
  reg.part("followFocus.pedestal", ffPedGeo, {
    parent: ffStandGroup,
    pos: [0, 0.21, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.ff"
  });

  [[-0.13, -0.09], [0.13, -0.09], [-0.13, 0.09], [0.13, 0.09]].forEach(([bx, bz], idx) => {
    reg.detail(`followFocus.bolt.${idx}`, makeScrewDetail(bx, 0.03, bz, 0.020, "y", kit), {
      parent: ffStandGroup
    });
  });

  // Rotating handwheel facing viewer along +Z
  const ffWheelGroup = reg.group("followFocus.wheelGroup", {
    parent: ffStandGroup,
    pos: [0, 0.34, 0.21],
    stage: "mechanism"
  });

  const ffWheelGeo = buildCylinderGeometry(0.22, 0.22, 0.10, { segments: 32, axis: "z" });
  reg.part("followFocus.wheel", ffWheelGeo, {
    parent: ffWheelGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    mountOn: "followFocus.pedestal"
  });

  const ffHubGeo = buildCylinderGeometry(0.075, 0.075, 0.13, { segments: 18, axis: "z" });
  reg.part("followFocus.hub", ffHubGeo, {
    parent: ffWheelGroup,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "followFocus.wheel",
    allowOverlap: ["followFocus.pedestal"]
  });

  // Crank boss handle near wheel rim
  const ffCrankGeo = buildCylinderGeometry(0.026, 0.030, 0.09, { segments: 14, axis: "z" });
  reg.part("followFocus.handle", ffCrankGeo, {
    parent: ffWheelGroup,
    pos: [0.15, 0.055, 0.075],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "followFocus.wheel"
  });

  // Index ring on handwheel face
  const wheelRing = makeRingLine(0.18, 28, kit, "mid");
  wheelRing.position.z = 0.053;
  reg.detail("followFocus.faceRing", wheelRing, { parent: ffWheelGroup });

  const whipBossGeo = buildCylinderGeometry(0.044, 0.052, 0.09, { segments: 16, axis: "x" });
  reg.part("followFocus.boss", whipBossGeo, {
    parent: ffStandGroup,
    pos: [0.21, 0.20, 0.02],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "followFocus.pedestal"
  });
  reg.anchor("followFocus.port", 0.25, 0.20, 0.02, ffStandGroup, { dir: [0.58, -0.05, 0.81] });

  // Focus Ring Drive Pinion Column beside focus ring (meshes onto outer focus ring at X=-0.55)
  const pinionX = -0.55;
  const pinionY = -0.76;
  const pinionZ = 0.58;
  const pinionStandH = pinionY - ffY - 0.04;
  const pinionColGeo = new THREE.BoxGeometry(0.22, pinionStandH, 0.22);
  reg.part("followFocus.pinionStand", pinionColGeo, {
    parent: mechGroup,
    pos: [pinionX, ffY + pinionStandH * 0.5, pinionZ],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.pinion"
  });

  const pinionGroup = reg.group("followFocus.pinionGroup", {
    parent: mechGroup,
    pos: [pinionX, pinionY, pinionZ],
    stage: "mechanism"
  });
  reg.part("followFocus.gear", buildPrimePinionGearGeometry(0.088, 0.16, 14), {
    parent: pinionGroup,
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "followFocus.pinionStand",
    allowOverlap: ["focus.ring.front", "focus.ring.back"]
  });

  const pinionBossGeo = buildCylinderGeometry(0.044, 0.052, 0.09, { segments: 14, axis: "x" });
  reg.part("followFocus.pinionBoss", pinionBossGeo, {
    parent: mechGroup,
    pos: [pinionX - 0.13, ffY + 0.22, pinionZ + 0.02],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "followFocus.pinionStand"
  });
  reg.anchor("followPinion.port", pinionX - 0.17, ffY + 0.22, pinionZ + 0.02, mechGroup, {
    dir: [-0.58, -0.05, 0.81]
  });

  // Flexible cine follow-focus whip connecting handwheel stand -> pinion gearbox
  reg.tube(
    "cable.followWhip",
    "followFocus.port",
    [[-0.88, ffY + 0.16, 0.80]],
    "followPinion.port",
    {
      parent: mechGroup,
      radius: 0.022,
      segments: 34,
      radialSegments: 10,
      leadOut: 0.10,
      leadIn: 0.10,
      ramp: "lo",
      outline: "lo",
      fromPart: "followFocus.boss",
      toPart: "followFocus.pinionBoss",
      allowOverlap: [
        "followFocus.pedestal",
        "followFocus.pinionStand",
        "base.outrigger.ff",
        "base.outrigger.pinion",
        "base.outrigger.plaque",
        "base.plaque"
      ]
    }
  );

  // ---------------------------------------------------------------------------
  // 2. Aperture Stop-Down Quadrant & Mechanical Control Lever
  // ---------------------------------------------------------------------------
  const [apX, apY, apZ] = ANCHORS.apertureCtrlMount;
  const apGroup = reg.group("apertureCtrl.group", {
    parent: mechGroup,
    pos: [apX, apY, apZ],
    stage: "mechanism"
  });

  const apBaseGeo = new THREE.BoxGeometry(0.32, 0.16, 0.50);
  reg.part("apertureCtrl.base", apBaseGeo, {
    parent: apGroup,
    pos: [0, 0.08, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.ap"
  });

  reg.part("apertureCtrl.arc", buildPrimeQuadrantArcGeometry(0.14, 0.24, 0.09), {
    parent: apGroup,
    pos: [0, 0.16, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "apertureCtrl.base"
  });

  const apTickPts = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.22 + (i / 8) * (Math.PI * 0.56);
    const r0 = 0.20;
    const r1 = i % 2 === 0 ? 0.255 : 0.235;
    apTickPts.push(
      new THREE.Vector3(0.052, 0.16 + Math.sin(a) * r0, Math.cos(a) * r0),
      new THREE.Vector3(0.052, 0.16 + Math.sin(a) * r1, Math.cos(a) * r1)
    );
  }
  reg.detail(
    "apertureCtrl.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(apTickPts), kit.lineMaterials.hi),
    { parent: apGroup }
  );

  const apLeverGroup = reg.group("apertureCtrl.leverGroup", {
    parent: apGroup,
    pos: [0, 0.16, 0],
    stage: "mechanism"
  });

  const apHubGeo = buildCylinderGeometry(0.052, 0.052, 0.15, { segments: 18, axis: "x" });
  reg.part("apertureCtrl.hub", apHubGeo, {
    parent: apLeverGroup,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "apertureCtrl.base",
    allowOverlap: ["apertureCtrl.arc"]
  });

  const apArmGeo = new THREE.BoxGeometry(0.038, 0.36, 0.042);
  reg.part("apertureCtrl.arm", apArmGeo, {
    parent: apLeverGroup,
    pos: [0, 0.20, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "apertureCtrl.hub",
    allowOverlap: ["apertureCtrl.arc"]
  });

  const apGripGeo = buildCylinderGeometry(0.038, 0.038, 0.20, { segments: 18, axis: "x" });
  reg.part("apertureCtrl.grip", apGripGeo, {
    parent: apLeverGroup,
    pos: [0, 0.39, 0],
    ramp: "lit",
    outline: "mid",
    crease: "faint",
    mountOn: "apertureCtrl.arm"
  });

  const apCtrlBossGeo = buildCylinderGeometry(0.044, 0.052, 0.09, { segments: 16, axis: "x" });
  reg.part("apertureCtrl.boss", apCtrlBossGeo, {
    parent: apGroup,
    pos: [0.19, 0.09, -0.06],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "apertureCtrl.base"
  });
  reg.anchor("apertureCtrl.port", 0.24, 0.09, -0.06, apGroup, { dir: [0.85, 0.32, -0.42] });

  reg.tag("tag-scale", "f/1.4 – f/16", apX + 0.36, apY + 0.05, apZ + 0.06);

  // Aperture actuator linkage cable to barrel.port.aperture
  reg.tube(
    "cable.aperture",
    "apertureCtrl.port",
    [[0.74, -1.24, 0.32]],
    "barrel.port.aperture",
    {
      parent: mechGroup,
      radius: 0.022,
      segments: 30,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.14,
      ramp: "brass",
      outline: "lo",
      fromPart: "apertureCtrl.boss",
      toPart: "barrel.apertureBoss",
      allowOverlap: [
        "apertureCtrl.base",
        "base.outrigger.ap",
        "barrel.outer.back",
        "barrel.outer.front",
        "cradle.rear"
      ]
    }
  );

  // ---------------------------------------------------------------------------
  // 3. Diegetic MTF50 & Depth-of-Field Bench Monitor (Rear-Right Outrigger)
  // ---------------------------------------------------------------------------
  const [monX, monY, monZ] = ANCHORS.monitorMount;
  const monGroup = reg.group("monitor.group", {
    parent: mechGroup,
    pos: [monX, monY, monZ],
    stage: "mechanism"
  });

  const monPedGeo = buildCylinderGeometry(0.11, 0.17, 0.40, { segments: 24, axis: "y" });
  reg.part("monitor.pedestal", monPedGeo, {
    parent: monGroup,
    pos: [0, 0.20, -0.10],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.mon"
  });

  const monBossGeo = buildCylinderGeometry(0.044, 0.052, 0.09, { segments: 14, axis: "x" });
  reg.part("monitor.boss", monBossGeo, {
    parent: monGroup,
    pos: [-0.14, 0.21, -0.10],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "monitor.pedestal"
  });
  reg.anchor("monitor.port.in", -0.19, 0.21, -0.10, monGroup, { dir: [-0.72, 0.48, -0.50] });

  reg.screen("optics.monitor", {
    parent: monGroup,
    pos: [0, 0.63, 0.02],
    rot: [-0.24, 0.42, 0],
    width: 1.02,
    height: 0.68,
    depth: 0.08,
    resolution: [288, 192],
    ramp: "mid",
    outline: "hi",
    mountOn: "monitor.pedestal",
    allowOverlap: ["monitor.boss"],
    draw: drawPrimeOpticsScreen
  });

  // High-speed CMOS readout & telemetry cable: sensor.port.out -> monitor.port.in
  reg.tube(
    "cable.sensor",
    "sensor.port.out",
    [[1.64, -0.84, 0.90]],
    "monitor.port.in",
    {
      parent: mechGroup,
      radius: 0.022,
      segments: 34,
      radialSegments: 10,
      leadOut: 0.20,
      leadIn: 0.20,
      ramp: "copper",
      outline: "lo",
      fromPart: "sensor.portBoss",
      toPart: "monitor.boss",
      allowOverlap: [
        "sensor.housing",
        "sensor.pedestal",
        "monitor.pedestal",
        "base.outrigger.mon",
        "optics.monitor"
      ]
    }
  );

  // ---------------------------------------------------------------------------
  // 4. Direct 3D Interactions
  // ---------------------------------------------------------------------------
  reg.interactable("unit.carriageGroup", {
    cursor: "grab",
    hint: "Drag optical core horizontally to focus (0.45–10m) or vertically for off-axis field",
    onDrag: ({ dx, dy, state, setParam }) => {
      const curD = state.params.focusDist ?? 1.2;
      const curF = state.params.fieldDeg ?? 0;
      setParam("focusDist", curD * Math.exp(dx * 0.008));
      setParam("fieldDeg", curF - dy * 0.08);
    }
  });

  reg.interactable("iris.group", {
    cursor: "grab",
    hint: "Drag 9-blade iris ring vertically to stop aperture down (f/1.4 – f/16)",
    onDrag: ({ dy, state, setParam }) => {
      const cur = state.params.fstop ?? 2.0;
      setParam("fstop", cur * Math.exp(-dy * 0.009));
    }
  });

  reg.interactable("followFocus.wheelGroup", {
    cursor: "grab",
    hint: "Spin follow-focus handwheel to drive brass helicoid (0.45m – 10.0m)",
    onDrag: ({ dx, dy, state, setParam }) => {
      const curD = state.params.focusDist ?? 1.2;
      setParam("focusDist", curD * Math.exp((dx - dy) * 0.008));
    }
  });

  reg.interactable("apertureCtrl.leverGroup", {
    cursor: "grab",
    hint: "Pull aperture lever to actuate 9-blade iris diaphragm (f/1.4 – f/16)",
    onDrag: ({ dy, state, setParam }) => {
      const cur = state.params.fstop ?? 2.0;
      setParam("fstop", cur * Math.exp(dy * 0.009));
    }
  });
}

export function updateKinematics(reg, state) {
  const params = state.params || state;
  const triggers = state.triggers || {};
  const st = getLensState(params, triggers);
  const explode = state.explode ?? 0;

  // 1. Helicoid Focus Ring Rotation & Axial Unit-Focusing Shift (-X)
  const helicoidGroup = reg.groups.get("helicoid.group")?.group;
  if (helicoidGroup) {
    helicoidGroup.rotation.x = st.focusRingAngle;
  }

  const carriageGroup = reg.groups.get("unit.carriageGroup")?.group;
  if (carriageGroup) {
    carriageGroup.position.x = st.helicoidShiftX;
  }

  // 2. 9-Blade Iris Diaphragm Pivot Actuation
  for (let b = 0; b < 9; b++) {
    const pivot = reg.groups.get(`iris.bladePivot.${b}`)?.group;
    if (pivot) {
      const az = (b / 9) * Math.PI * 2;
      pivot.rotation.x = -az + 0.25 - st.bladeSwingRad;
    }
  }

  // 3. Follow-Focus Handwheel, Pinion Gear, & Aperture Quadrant Lever
  const ffWheel = reg.groups.get("followFocus.wheelGroup")?.group;
  if (ffWheel) {
    ffWheel.rotation.z = -st.focusRingAngle * 1.4;
  }

  const pinion = reg.groups.get("followFocus.pinionGroup")?.group;
  if (pinion) {
    pinion.rotation.x = -st.focusRingAngle * 3.2;
  }

  const apLever = reg.groups.get("apertureCtrl.leverGroup")?.group;
  if (apLever) {
    apLever.rotation.x = -0.52 + st.fNorm * 1.04;
  }

  // 4. Stage 6 Optical Ray Cone Shader Uniforms
  const rayGroup = reg.groups.get("optics.rayShader")?.group || reg.root.getObjectByName("optics.rayShader");
  if (rayGroup) {
    const fadeOut = 1 - Math.max(0, Math.min(1, (explode - 0.05) / 0.3));
    const effEnv = (state.shaderEnv !== undefined ? state.shaderEnv : 1.0) * fadeOut;
    rayGroup.traverse((child) => {
      if (child.material && child.material.uniforms) {
        const u = child.material.uniforms;
        if (u.uTime) u.uTime.value = state.theta || 0;
        if (u.uFocusShift) u.uFocusShift.value = st.helicoidShiftX;
        if (u.uRPupil) u.uRPupil.value = st.rPupil;
        if (u.uPupilNorm) u.uPupilNorm.value = st.pupilNorm;
        if (u.uFieldRad) u.uFieldRad.value = st.fieldRad;
        if (u.uSensorShiftY) u.uSensorShiftY.value = st.sensorShiftY;
        if (u.uAfPulse) u.uAfPulse.value = st.afEnv;
        if (u.uCutaway) u.uCutaway.value = state.cutaway ? 1.0 : 0.0;
        if (u.uEnvelope) u.uEnvelope.value = effEnv;
      }
    });
  }
}

export function tourAt(clock, _state) {
  const c = ((clock % 1) + 1) % 1;
  if (c < 0.16) {
    const t = c / 0.16;
    const s = t * t * (3 - 2 * t);
    return {
      caption: "WIDE OPEN · 50mm f/1.4 HELICOID FOCUS EXTENSION",
      params: { focusDist: 1.8 - 1.32 * s, fstop: 1.4, fieldDeg: 0 },
      cutaway: true,
      explode: 0
    };
  }
  if (c < 0.34) {
    const t = (c - 0.16) / 0.18;
    const s = t * t * (3 - 2 * t);
    return {
      caption: "9-BLADE IRIS · STOPPING DOWN FROM f/1.4 TO f/11",
      params: { focusDist: 0.65 + 1.15 * s, fstop: 1.4 + 9.6 * s, fieldDeg: 0 },
      cutaway: true,
      explode: 0
    };
  }
  if (c < 0.52) {
    const t = (c - 0.34) / 0.18;
    const s = Math.sin(t * Math.PI * 2);
    return {
      caption: "OFF-AXIS CHIEF RAYS · FIELD ANGLE SWEEP ±12°",
      params: { focusDist: 1.5, fstop: 2.8, fieldDeg: s * 12 },
      cutaway: true,
      explode: 0
    };
  }
  if (c < 0.68) {
    const t = (c - 0.52) / 0.16;
    const e = Math.sin(t * Math.PI);
    return {
      caption: "EXPLODED VIEW · 7 ELEMENTS IN 6 DOUBLE-GAUSS GROUPS",
      params: { focusDist: 1.2, fstop: 2.0, fieldDeg: 0 },
      cutaway: true,
      explode: e
    };
  }
  if (c < 0.84) {
    const t = (c - 0.68) / 0.16;
    const sec = 0.92 - 1.10 * Math.sin(t * Math.PI);
    return {
      caption: "Z-SECTION SLICE · GLASS CURVATURES & BRASS HELICOID",
      params: { focusDist: 0.95, fstop: 2.0, fieldDeg: -5 },
      cutaway: true,
      explode: 0,
      section: sec
    };
  }
  return {
    caption: "FULL HOUSING · BALANCED SWEET SPOT f/4.0",
    params: { focusDist: 1.2, fstop: 4.0, fieldDeg: 0 },
    cutaway: false,
    explode: 0,
    section: 0.92
  };
}
