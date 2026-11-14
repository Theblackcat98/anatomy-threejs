import * as THREE from "three";
import {
  buildCylinderGeometry,
  makeScrewDetail,
  makeKnurlLines
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, getZoomState } from "./model.mjs";

const ZOOM_CAM_N_SAMPLES = 40;

function buildZoomQuadrantArcGeometry(rInner = 0.14, rOuter = 0.25, depth = 0.09) {
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
  geo.rotateY(Math.PI / 2);
  return geo;
}

function drawZoomCamScreen(ctx, canvas, state, theme) {
  const w = canvas.width;
  const h = canvas.height;
  const css = (theme && theme.css) || {};
  const ch = (theme && theme.channels) || {};

  const bgCol = css.card || "#181a1f";
  const textCol = css.text || "#f4efe4";
  const mutedCol = css.muted || "#8c877c";
  const litCol = css.lit || "#f59e0b";
  const g2Col = ch.intake || "#38bdf8";
  const g3Col = ch.comb || "#fb923c";

  const st = getZoomState(state?.params || state, state?.triggers || {});

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = mutedCol;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.globalAlpha = 1;

  // Header
  ctx.fillStyle = textCol;
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("PARFOCAL CAM LOCUS", 12, 22);

  ctx.fillStyle = litCol;
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(st.focal)}mm f/${st.fstop.toFixed(1)}`, w - 12, 22);
  ctx.textAlign = "left";

  // Cam locus plot (u = 0..1 across 24mm..70mm; vertical = axial cam travel X)
  const gx = 16;
  const gy = 34;
  const gw = w - 32;
  const gh = 80;

  ctx.strokeStyle = mutedCol;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, gy, gw, gh);
  // 24 / 35 / 50 / 70 vertical guides
  [24, 35, 50, 70].forEach((fMark) => {
    const u = (fMark - 24) / (70 - 24);
    const px = gx + u * gw;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px, gy + gh);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Map normalized cam travel [-0.85, +0.45] to screen Y
  const mapX = (xVal) => gy + gh * (1 - (xVal + 0.82) / 1.32);

  // Plot G2 Variator curve (monotonic sweep)
  ctx.strokeStyle = g2Col;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i <= ZOOM_CAM_N_SAMPLES; i++) {
    const u = i / ZOOM_CAM_N_SAMPLES;
    const xG2Curve = -0.72 + 0.60 * (0.85 * u + 0.15 * u * u);
    const px = gx + u * gw;
    const py = mapX(xG2Curve);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Plot G3 Compensator curve (parabolic U-locus)
  ctx.strokeStyle = g3Col;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i <= ZOOM_CAM_N_SAMPLES; i++) {
    const u = i / ZOOM_CAM_N_SAMPLES;
    const xG3Curve = 0.34 - 0.22 * Math.sin(Math.PI * u) + 0.08 * u;
    const px = gx + u * gw;
    const py = mapX(xG3Curve);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Active focal length cursor
  const cx = gx + st.zoomNorm * gw;
  ctx.strokeStyle = litCol;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, gy);
  ctx.lineTo(cx, gy + gh);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = g2Col;
  ctx.beginPath();
  ctx.arc(cx, mapX(st.xG2), 4.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = g3Col;
  ctx.beginPath();
  ctx.arc(cx, mapX(st.xG3), 4.0, 0, Math.PI * 2);
  ctx.fill();

  // Curve legend labels inside plot
  ctx.font = "600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = g3Col;
  ctx.fillText("G3 COMP", gx + 4, gy + 12);
  ctx.fillStyle = g2Col;
  ctx.fillText("G2 VAR", gx + 4, gy + gh - 5);

  // Bottom telemetry readouts
  ctx.fillStyle = textCol;
  ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`FOV ${st.fovDiagDeg.toFixed(1)}°`, 16, 134);

  ctx.fillStyle = mutedCol;
  ctx.textAlign = "right";
  ctx.fillText(`MAG ${st.magRatio.toFixed(2)}×`, w - 16, 134);
  ctx.textAlign = "left";

  ctx.fillStyle = litCol;
  ctx.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("ΔBFL 0.00 mm (LOCKED)", 16, 152);
}

export function buildMechanism(reg, kit) {
  const { topSurfaceY } = SPEC;
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const mechGroup = reg.group("mechanism.group", { parent: baseGroup, stage: "mechanism" });

  // ---------------------------------------------------------------------------
  // 1. Broadcast Servo Zoom Rocker & Focal Quadrant (Front-Left Outrigger)
  // ---------------------------------------------------------------------------
  const [rkX, rkY, rkZ] = ANCHORS.zoomRockerMount;
  const rockerGroup = reg.group("zoomRocker.group", {
    parent: mechGroup,
    pos: [rkX, rkY, rkZ],
    stage: "mechanism"
  });

  const rkBaseGeo = new THREE.BoxGeometry(0.38, 0.18, 0.56);
  reg.part("zoomRocker.base", rkBaseGeo, {
    parent: rockerGroup,
    pos: [0, 0.09, 0],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.rocker"
  });

  reg.part("zoomRocker.arc", buildZoomQuadrantArcGeometry(0.14, 0.25, 0.09), {
    parent: rockerGroup,
    pos: [0, 0.18, 0],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "zoomRocker.base"
  });

  const rkTickPts = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.22 + (i / 8) * (Math.PI * 0.56);
    const r0 = 0.21;
    const r1 = i % 2 === 0 ? 0.265 : 0.245;
    rkTickPts.push(
      new THREE.Vector3(0.052, 0.18 + Math.sin(a) * r0, Math.cos(a) * r0),
      new THREE.Vector3(0.052, 0.18 + Math.sin(a) * r1, Math.cos(a) * r1)
    );
  }
  reg.detail(
    "zoomRocker.ticks",
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rkTickPts), kit.lineMaterials.hi),
    { parent: rockerGroup }
  );

  const rkLeverGroup = reg.group("zoomRocker.leverGroup", {
    parent: rockerGroup,
    pos: [0, 0.18, 0],
    stage: "mechanism"
  });

  reg.part("zoomRocker.hub", buildCylinderGeometry(0.055, 0.055, 0.16, { segments: 18, axis: "x" }), {
    parent: rkLeverGroup,
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "zoomRocker.base",
    allowOverlap: ["zoomRocker.arc"]
  });

  reg.part("zoomRocker.arm", new THREE.BoxGeometry(0.040, 0.40, 0.044), {
    parent: rkLeverGroup,
    pos: [0, 0.22, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "zoomRocker.hub",
    allowOverlap: ["zoomRocker.arc"]
  });

  reg.part("zoomRocker.grip", buildCylinderGeometry(0.042, 0.042, 0.24, { segments: 18, axis: "x" }), {
    parent: rkLeverGroup,
    pos: [0, 0.43, 0],
    ramp: "lit",
    outline: "mid",
    crease: "faint",
    mountOn: "zoomRocker.arm"
  });

  const rkBossGeo = buildCylinderGeometry(0.046, 0.056, 0.10, { segments: 16, axis: "x" });
  reg.part("zoomRocker.boss", rkBossGeo, {
    parent: rockerGroup,
    pos: [0.22, 0.10, -0.08],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "zoomRocker.base"
  });
  reg.anchor("zoomRocker.port", 0.27, 0.10, -0.08, rockerGroup, { dir: [0.82, 0.18, -0.54] });

  reg.tag("tag-zoom", "24 · 35 · 50 · 70", rkX - 0.10, rkY + 0.56, rkZ - 0.16);

  // Servo Zoom Drive Harness: zoomRocker.port -> barrel.port.zoom
  reg.tube(
    "cable.servoZoom",
    "zoomRocker.port",
    [[-1.12, rkY + 0.24, 0.44]],
    "barrel.port.zoom",
    {
      parent: mechGroup,
      radius: 0.022,
      segments: 34,
      radialSegments: 10,
      leadOut: 0.14,
      leadIn: 0.16,
      ramp: "brass",
      outline: "lo",
      fromPart: "zoomRocker.boss",
      toPart: "barrel.zoomBoss",
      allowOverlap: ["zoomRocker.base", "barrel.outer.back", "barrel.frontHood", "cradle.front"]
    }
  );

  // ---------------------------------------------------------------------------
  // 2. Ring-USM Focus Control Dial & Harness (Front-Center Outrigger)
  // ---------------------------------------------------------------------------
  const [usmX, usmY, usmZ] = ANCHORS.usmCtrlMount;
  const usmGroup = reg.group("usmCtrl.group", {
    parent: mechGroup,
    pos: [usmX, usmY, usmZ],
    stage: "mechanism"
  });

  reg.part("usmCtrl.boss", buildCylinderGeometry(0.28, 0.32, 0.12, { segments: 28, axis: "y" }), {
    parent: usmGroup,
    pos: [0, 0.06, 0],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.usm"
  });

  const usmDialGroup = reg.group("usmCtrl.dialGroup", {
    parent: usmGroup,
    pos: [0, 0.24, 0],
    stage: "mechanism"
  });

  reg.part("usmCtrl.drum", buildCylinderGeometry(0.22, 0.22, 0.24, { segments: 32, axis: "y" }), {
    parent: usmDialGroup,
    ramp: "hi",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.016,
    mountOn: "usmCtrl.boss"
  });

  reg.detail(
    "usmCtrl.knurl",
    makeKnurlLines(0.22, -0.09, 0.09, 26, kit, {
      tone: "lo",
      pointer: { y: 0.123, z0: 0.06, z1: 0.20 }
    }),
    { parent: usmDialGroup }
  );
  reg.detail("usmCtrl.screw", makeScrewDetail(0, 0.123, 0, 0.06, "y", kit), { parent: usmDialGroup });

  reg.part("usmCtrl.cableBoss", buildCylinderGeometry(0.045, 0.055, 0.10, { segments: 14, axis: "x" }), {
    parent: usmGroup,
    pos: [0.33, 0.06, -0.04],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "usmCtrl.boss"
  });
  reg.anchor("usmCtrl.port", 0.38, 0.06, -0.04, usmGroup, { dir: [0.88, 0.22, -0.42] });

  // USM Focus / Telemetry Harness: usmCtrl.port -> sensor.port.in
  reg.tube(
    "cable.usmFocus",
    "usmCtrl.port",
    [[1.20, -1.32, 0.64], [1.48, -0.96, 0.84]],
    "sensor.port.in",
    {
      parent: mechGroup,
      radius: 0.022,
      segments: 36,
      radialSegments: 10,
      leadOut: 0.16,
      leadIn: 0.18,
      ramp: "copper",
      outline: "lo",
      fromPart: "usmCtrl.cableBoss",
      toPart: "sensor.portBoss",
      allowOverlap: ["usmCtrl.boss", "sensor.housing", "sensor.pedestal", "cradle.rear", "base.outrigger.usm"]
    }
  );

  // ---------------------------------------------------------------------------
  // 3. Diegetic Parfocal Cam-Curve & FOV Monitor (Front-Right Outrigger)
  // ---------------------------------------------------------------------------
  const [scrX, scrY, scrZ] = ANCHORS.camScreenMount;
  const scrGroup = reg.group("camScreen.group", {
    parent: mechGroup,
    pos: [scrX, scrY, scrZ],
    stage: "mechanism"
  });

  reg.part("camScreen.pedestal", buildCylinderGeometry(0.11, 0.17, 0.42, { segments: 24, axis: "y" }), {
    parent: scrGroup,
    pos: [0, 0.21, -0.10],
    ramp: "lo",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.screen"
  });

  reg.screen("zoom.camScreen", {
    parent: scrGroup,
    pos: [0, 0.66, 0.02],
    rot: [-0.24, 0.42, 0],
    width: 1.04,
    height: 0.68,
    depth: 0.08,
    resolution: [288, 192],
    ramp: "mid",
    outline: "hi",
    mountOn: "camScreen.pedestal",
    draw: drawZoomCamScreen
  });

  // ---------------------------------------------------------------------------
  // 4. Direct 3D Interactions
  // ---------------------------------------------------------------------------
  reg.interactable("cam.barrelGroup", {
    cursor: "grab",
    hint: "Drag brass zoom cam barrel to sweep 24–70mm focal length",
    onDrag: ({ dx, dy, state, setParam }) => {
      setParam("focal", (state.params.focal ?? 35) + (dx - dy * 0.5) * 0.22);
    }
  });

  reg.interactable("zoom.g2.group", {
    cursor: "grab",
    hint: "Slide G2 variator horizontally to drive 24–70mm parfocal zoom",
    onDrag: ({ dx, state, setParam }) => {
      setParam("focal", (state.params.focal ?? 35) + dx * 0.28);
    }
  });

  reg.interactable("zoom.g1.group", {
    cursor: "grab",
    hint: "Slide G1 focus collector horizontally for close focus (0.38m – 8m)",
    onDrag: ({ dx, state, setParam }) => {
      const curD = state.params.focusDist ?? 1.5;
      setParam("focusDist", curD * Math.exp(dx * 0.01));
    }
  });

  reg.interactable("zoomRocker.leverGroup", {
    cursor: "grab",
    hint: "Pull servo zoom rocker to command 24–70mm focal length",
    onDrag: ({ dy, state, setParam }) => {
      setParam("focal", (state.params.focal ?? 35) - dy * 0.28);
    }
  });

  reg.interactable("usmCtrl.dialGroup", {
    cursor: "grab",
    hint: "Turn USM focus dial to shift G1 close-focus group",
    onDrag: ({ dx, dy, state, setParam }) => {
      const curD = state.params.focusDist ?? 1.5;
      setParam("focusDist", curD * Math.exp((dx - dy) * 0.01));
    }
  });
}

export function updateKinematics(reg, state) {
  const params = state.params || state;
  const triggers = state.triggers || {};
  const st = getZoomState(params, triggers);

  // 1. Brass Cam Barrel Rotation & 4-Group Optical Displacements
  const camBarrel = reg.groups.get("cam.barrelGroup")?.group;
  if (camBarrel) {
    camBarrel.rotation.x = st.camRotRad;
  }

  const g1 = reg.groups.get("zoom.g1.group")?.group;
  if (g1) {
    g1.position.x = st.xG1;
  }

  const g2 = reg.groups.get("zoom.g2.group")?.group;
  if (g2) {
    g2.position.x = st.xG2;
  }

  const g3 = reg.groups.get("zoom.g3.group")?.group;
  if (g3) {
    g3.position.x = st.xG3;
  }

  // 2. EMD 9-Blade Constant-Aperture Iris Diaphragm
  for (let b = 0; b < 9; b++) {
    const pivot = reg.groups.get(`zoom.iris.bladePivot.${b}`)?.group;
    if (pivot) {
      const az = (b / 9) * Math.PI * 2;
      pivot.rotation.x = -az + 0.25 - st.bladeSwingRad;
    }
  }

  // 3. Broadcast Servo Rocker Lever & USM Focus Dial
  const rkLever = reg.groups.get("zoomRocker.leverGroup")?.group;
  if (rkLever) {
    rkLever.rotation.x = -0.52 + st.zoomNorm * 1.04;
  }

  const usmDial = reg.groups.get("usmCtrl.dialGroup")?.group;
  if (usmDial) {
    usmDial.rotation.y = -st.focusRingRad;
  }

  // 4. Stage 6 Parfocal Optical Ray Shader Uniforms
  const rayGroup = reg.groups.get("zoom.rayShader")?.group || reg.root.getObjectByName("zoom.rayShader");
  if (rayGroup) {
    const effEnv = state.shaderEnv !== undefined ? state.shaderEnv : 1.0;
    rayGroup.traverse((child) => {
      if (child.material && child.material.uniforms) {
        const u = child.material.uniforms;
        if (u.uTime) u.uTime.value = state.theta || 0;
        if (u.uZoomNorm) u.uZoomNorm.value = st.zoomNorm;
        if (u.uXG1) u.uXG1.value = st.xG1;
        if (u.uXG2) u.uXG2.value = st.xG2;
        if (u.uXG3) u.uXG3.value = st.xG3;
        if (u.uRPupil) u.uRPupil.value = st.rPupil;
        if (u.uPupilNorm) u.uPupilNorm.value = st.pupilNorm;
        if (u.uPulseEnv) u.uPulseEnv.value = st.pulseEnv;
        if (u.uCutaway) u.uCutaway.value = state.cutaway ? 1.0 : 0.0;
        if (u.uEnvelope) u.uEnvelope.value = effEnv;
      }
    });
  }
}

export function tourAt(clock, _state) {
  const c = ((clock % 1) + 1) % 1;
  if (c < 0.24) {
    const t = c / 0.24;
    const s = t * t * (3 - 2 * t);
    return {
      caption: "24mm -> 70mm PARFOCAL CAM SWEEP · G2 & G3 IN SYNCH",
      params: { focal: 24 + 46 * s, focusDist: 1.5, fstop: 2.8 },
      cutaway: true
    };
  }
  if (c < 0.44) {
    const t = (c - 0.24) / 0.20;
    const s = t * t * (3 - 2 * t);
    return {
      caption: "PARABOLIC COMPENSATOR PEAK · 45mm ΔBFL = 0.00mm",
      params: { focal: 70 - 35 * s, focusDist: 1.5, fstop: 2.8 },
      cutaway: true
    };
  }
  if (c < 0.64) {
    const t = (c - 0.44) / 0.20;
    const s = Math.sin(t * Math.PI);
    return {
      caption: "GROUP 1 CLOSE FOCUS · HELICAL FRONT EXTENSION (0.38m)",
      params: { focal: 35, focusDist: 1.5 - 1.12 * s, fstop: 2.8 },
      cutaway: true
    };
  }
  if (c < 0.82) {
    const t = (c - 0.64) / 0.18;
    const s = Math.sin(t * Math.PI);
    return {
      caption: "CONSTANT-APERTURE EMD IRIS & Z-SECTION CAM TRACKS",
      params: { focal: 50, focusDist: 1.2, fstop: 2.8 + 15.2 * s },
      cutaway: true,
      section: 1.02 - 1.12 * s
    };
  }
  return {
    caption: "FULL CHASSIS · STUDIO 24–70mm f/2.8 PARFOCAL ZOOM",
    params: { focal: 35, focusDist: 1.5, fstop: 2.8 },
    cutaway: false,
    section: 1.02
  };
}
