import * as THREE from "three";
import { createShaderKit } from "./shaders.mjs";
import { Recorder3D } from "./registry.mjs";

export function mountAnatomyFigure(config) {
  const {
    spec,
    buildBase,
    buildStructure,
    buildSubject,
    buildMechanism,
    buildShader,
    updateKinematics,
    formatReadout
  } = config;

  const state = {
    theta: spec.initialTheta !== undefined ? spec.initialTheta : 0.65,
    rpm: spec.initialRpm !== undefined ? spec.initialRpm : 720,
    slowModes: [1, 0.2, 0.05, 0],
    slowLabels: ["SLOW 1×", "SLOW 1/5×", "SLOW 1/20×", "PAUSED"],
    slowIndex: 0,
    crankMode: false,
    exploded: false,
    cutaway: true,
    shaderEnabled: true,
    hudVisible: true,
    debugPaused: false
  };

  function createSpring(initial) {
    return { at: initial, rate: 0 };
  }

  function stepSpring(held, want, dt, stiff, damping) {
    const steps = Math.max(Math.ceil(dt * 120), 1);
    const slice = dt / steps;
    for (let i = 0; i < steps; i++) {
      held.rate += ((want - held.at) * stiff - held.rate * damping) * slice;
      held.at += held.rate * slice;
    }
    if (Math.abs(want - held.at) < 0.0005 && Math.abs(held.rate) < 0.0005) {
      held.at = want;
      held.rate = 0;
    }
  }

  const explodeSpring = createSpring(0);
  const rpmSpring = createSpring(state.rpm);
  const shaderEnvSpring = createSpring(1);

  const host = document.getElementById("canvas-host");
  const cardEl = document.getElementById("figure-card");
  const readoutEl = document.getElementById("readout");
  const phaseCornerEl = document.getElementById("phase-corner");

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);

  const ISO_ELEV = ((spec.isoElevDeg !== undefined ? spec.isoElevDeg : 30) * Math.PI) / 180;
  const ISO_AZIM = ((spec.isoAzimDeg !== undefined ? spec.isoAzimDeg : -36) * Math.PI) / 180;
  let zoomFactor = spec.initialZoom || 1.08;
  let panX = 0;
  let panY = spec.initialPanY !== undefined ? spec.initialPanY : -0.06;
  let targetPanX = panX;
  let targetPanY = panY;
  let rotX = ISO_ELEV;
  let rotY = ISO_AZIM;
  let targetRotX = ISO_ELEV;
  let targetRotY = ISO_AZIM;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 18);
  camera.lookAt(0, 0, 0);

  function updateCameraSize() {
    const w = Math.max(host.clientWidth, 200);
    const h = Math.max(host.clientHeight, 200);
    const aspect = w / h;

    const minVertSpan = spec.minVertSpan || 4.9;
    const minHorizSpan = spec.minHorizSpan || 6.7;

    let halfH = (minVertSpan * 0.5) / zoomFactor;
    let halfW = halfH * aspect;

    if (halfW < (minHorizSpan * 0.5) / zoomFactor) {
      halfW = (minHorizSpan * 0.5) / zoomFactor;
      halfH = halfW / aspect;
    }

    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const kit = createShaderKit();
  const reg = new Recorder3D(worldGroup, kit);

  // Build the 6 modular stages in order
  reg.setStage("base");
  if (buildBase) buildBase(reg, kit);
  reg.setStage("structure");
  if (buildStructure) buildStructure(reg, kit);
  reg.setStage("subject");
  if (buildSubject) buildSubject(reg, kit);
  reg.setStage("mechanism");
  if (buildMechanism) buildMechanism(reg, kit);
  reg.setStage("shader");
  if (buildShader) buildShader(reg, kit);

  const schemeButtonsEl = document.getElementById("scheme-buttons");
  const rpmSlider = document.getElementById("rpm-slider");
  const crankBtn = document.getElementById("crank-btn");
  const slowBtn = document.getElementById("slow-btn");
  const explodeBtn = document.getElementById("explode-btn");
  const cutawayBtn = document.getElementById("cutaway-btn");
  const shaderBtn = document.getElementById("shader-btn");
  const hudBtn = document.getElementById("hud-btn");
  const hudQuickBtn = document.getElementById("hud-quick-btn");
  const resetBtn = document.getElementById("reset-btn");

  function applyTheme(themeOrId) {
    const theme = kit.applyTheme(themeOrId);
    const root = document.documentElement.style;
    root.setProperty("--anatomy-bg", theme.css.bg);
    root.setProperty("--anatomy-card", theme.css.card);
    root.setProperty("--anatomy-paper", theme.css.card);
    root.setProperty("--anatomy-border", theme.css.border);
    root.setProperty("--anatomy-text", theme.css.text);
    root.setProperty("--anatomy-muted", theme.css.muted);
    root.setProperty("--anatomy-strong", theme.css.strong);
    root.setProperty("--anatomy-lit", theme.css.lit);
    root.setProperty("--anatomy-pill-bg", theme.css.pillBg);
    root.setProperty("--anatomy-pill-hover", theme.css.pillHover);

    const legLit = document.getElementById("leg-lit");
    const legIntake = document.getElementById("leg-intake");
    const legComb = document.getElementById("leg-comb");
    const legExh = document.getElementById("leg-exh");
    if (legLit) legLit.style.backgroundColor = theme.css.lit;
    if (legIntake) legIntake.style.backgroundColor = theme.channels.intake;
    if (legComb) legComb.style.backgroundColor = theme.channels.comb;
    if (legExh) legExh.style.backgroundColor = theme.channels.exhaust;

    if (schemeButtonsEl) {
      Array.from(schemeButtonsEl.children).forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.id === theme.id);
      });
    }
  }

  kit.THEMES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scheme-btn";
    btn.dataset.id = t.id;
    btn.innerHTML = `<span class="swatch" style="background:${t.swatch}"></span>${t.name}`;
    btn.addEventListener("click", () => applyTheme(t));
    schemeButtonsEl.appendChild(btn);
  });

  function toggleCrankMode() {
    state.crankMode = !state.crankMode;
    crankBtn.classList.toggle("active", state.crankMode);
  }

  function toggleExplode() {
    state.exploded = !state.exploded;
    explodeBtn.classList.toggle("active", state.exploded);
  }

  function cycleSlowMode() {
    state.slowIndex = (state.slowIndex + 1) % state.slowModes.length;
    slowBtn.textContent = state.slowLabels[state.slowIndex];
    slowBtn.classList.toggle("active", state.slowIndex > 0);
  }

  function toggleCutaway() {
    state.cutaway = !state.cutaway;
    cutawayBtn.classList.toggle("active", state.cutaway);
    reg.applyExplode(explodeSpring.at, state.cutaway);
  }

  function toggleShader() {
    state.shaderEnabled = !state.shaderEnabled;
    shaderBtn.classList.toggle("active", state.shaderEnabled);
  }

  function setHudVisible(vis) {
    state.hudVisible = vis;
    document.body.classList.toggle("hud-hidden", !state.hudVisible);
    hudBtn.classList.toggle("active", state.hudVisible);
    hudQuickBtn.classList.toggle("active", state.hudVisible);
    updateCameraSize();
  }

  function toggleHud() {
    setHudVisible(!state.hudVisible);
  }

  function resetIsoView() {
    targetRotX = ISO_ELEV;
    targetRotY = ISO_AZIM;
    targetPanX = 0;
    targetPanY = spec.initialPanY !== undefined ? spec.initialPanY : -0.06;
    zoomFactor = spec.initialZoom || 1.08;
    updateCameraSize();
  }

  rpmSlider.addEventListener("input", (e) => {
    state.rpm = parseFloat(e.target.value);
  });
  crankBtn.addEventListener("click", toggleCrankMode);
  slowBtn.addEventListener("click", cycleSlowMode);
  explodeBtn.addEventListener("click", toggleExplode);
  cutawayBtn.addEventListener("click", toggleCutaway);
  shaderBtn.addEventListener("click", toggleShader);
  hudBtn.addEventListener("click", toggleHud);
  hudQuickBtn.addEventListener("click", toggleHud);
  resetBtn.addEventListener("click", resetIsoView);

  const activePointers = new Map();
  let lastSingleX = 0;
  let lastSingleY = 0;
  let lastMidX = 0;
  let lastMidY = 0;
  let lastPinchDist = 0;
  let isMousePan = false;

  host.addEventListener("contextmenu", (e) => e.preventDefault());

  function syncTwoFingerMetrics() {
    const pts = Array.from(activePointers.values());
    if (pts.length >= 2) {
      lastMidX = (pts[0].x + pts[1].x) * 0.5;
      lastMidY = (pts[0].y + pts[1].y) * 0.5;
      lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
  }

  host.addEventListener("pointerdown", (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    host.setPointerCapture(e.pointerId);
    cardEl.focus();

    if (activePointers.size === 1) {
      lastSingleX = e.clientX;
      lastSingleY = e.clientY;
      isMousePan = e.button === 2 || e.button === 1;
    } else if (activePointers.size === 2) {
      syncTwoFingerMetrics();
    }
  });

  host.addEventListener("pointermove", (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const w = Math.max(host.clientWidth, 1);
    const h = Math.max(host.clientHeight, 1);
    const worldPerPixelX = (camera.right - camera.left) / w;
    const worldPerPixelY = (camera.top - camera.bottom) / h;

    if (activePointers.size === 1) {
      const dx = e.clientX - lastSingleX;
      const dy = e.clientY - lastSingleY;
      lastSingleX = e.clientX;
      lastSingleY = e.clientY;

      if (isMousePan) {
        targetPanX += dx * worldPerPixelX;
        targetPanY -= dy * worldPerPixelY;
      } else if (e.shiftKey || state.crankMode || state.slowModes[state.slowIndex] === 0) {
        state.theta -= dx * 0.024;
      } else {
        targetRotY += dx * 0.0085;
        targetRotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, targetRotX + dy * 0.0085));
      }
    } else if (activePointers.size >= 2) {
      const pts = Array.from(activePointers.values());
      const midX = (pts[0].x + pts[1].x) * 0.5;
      const midY = (pts[0].y + pts[1].y) * 0.5;
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);

      const midDx = midX - lastMidX;
      const midDy = midY - lastMidY;
      targetPanX += midDx * worldPerPixelX;
      targetPanY -= midDy * worldPerPixelY;

      if (lastPinchDist > 12 && dist > 12) {
        const scale = dist / lastPinchDist;
        zoomFactor = Math.max(0.45, Math.min(4.5, zoomFactor * scale));
        updateCameraSize();
      }

      lastMidX = midX;
      lastMidY = midY;
      lastPinchDist = dist;
    }
  });

  function onPointerRelease(e) {
    activePointers.delete(e.pointerId);
    if (host.hasPointerCapture(e.pointerId)) {
      host.releasePointerCapture(e.pointerId);
    }
    if (activePointers.size === 1) {
      const remaining = activePointers.values().next().value;
      lastSingleX = remaining.x;
      lastSingleY = remaining.y;
      isMousePan = false;
    } else if (activePointers.size >= 2) {
      syncTwoFingerMetrics();
    }
  }

  host.addEventListener("pointerup", onPointerRelease);
  host.addEventListener("pointercancel", onPointerRelease);

  host.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomFactor = Math.max(0.45, Math.min(4.5, zoomFactor - e.deltaY * 0.0012));
    updateCameraSize();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "e") toggleExplode();
    else if (k === "s") cycleSlowMode();
    else if (k === "c") toggleCutaway();
    else if (k === "i") toggleShader();
    else if (k === "h") toggleHud();
    else if (k === "r") resetIsoView();
    else if (e.key === "ArrowRight") state.theta -= 0.12;
    else if (e.key === "ArrowLeft") state.theta += 0.12;
  });

  window.addEventListener("resize", updateCameraSize);

  const tempProjVec = new THREE.Vector3();
  function projectWorldPointToScreen(worldVec) {
    tempProjVec.copy(worldVec).project(camera);
    const w = host.clientWidth || 760;
    const h = host.clientHeight || 475;
    return {
      x: (tempProjVec.x * 0.5 + 0.5) * w,
      y: (-tempProjVec.y * 0.5 + 0.5) * h
    };
  }

  function updateEngravedTags() {
    if (!state.hudVisible) return;
    for (const [id, tagInfo] of reg.tags) {
      const el = document.getElementById(id);
      if (!el) continue;
      tempProjVec.set(...tagInfo.pos).applyMatrix4(worldGroup.matrixWorld);
      const { x, y } = projectWorldPointToScreen(tempProjVec);
      el.style.left = `${x.toFixed(1)}px`;
      el.style.top = `${y.toFixed(1)}px`;
    }
  }

  function stepSceneAndRender(effectiveRpm) {
    worldGroup.position.set(panX, panY, 0);
    worldGroup.rotation.order = "XYZ";
    worldGroup.rotation.x = rotX;
    worldGroup.rotation.y = rotY;
    worldGroup.updateMatrixWorld(true);

    reg.applyExplode(explodeSpring.at, state.cutaway);

    if (updateKinematics) {
      updateKinematics(reg, {
        theta: state.theta,
        explode: explodeSpring.at,
        rpm: rpmSpring.at,
        effectiveRpm,
        shaderEnv: shaderEnvSpring.at,
        cutaway: state.cutaway
      });
    }

    worldGroup.updateMatrixWorld(true);

    if (state.hudVisible && formatReadout) {
      const hudData = formatReadout({
        theta: state.theta,
        effectiveRpm,
        explode: explodeSpring.at
      });
      if (hudData.readout && readoutEl) readoutEl.textContent = hudData.readout;
      if (hudData.phase && phaseCornerEl) phaseCornerEl.textContent = hudData.phase;
      updateEngravedTags();
    }

    renderer.render(scene, camera);
  }

  applyTheme(kit.THEMES[0]);
  reg.applyExplode(0, state.cutaway);
  updateCameraSize();

  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) * 0.001, 0.05);
    lastTime = now;

    if (!state.debugPaused) {
      rotX += (targetRotX - rotX) * 0.2;
      rotY += (targetRotY - rotY) * 0.2;
      panX += (targetPanX - panX) * 0.22;
      panY += (targetPanY - panY) * 0.22;

      stepSpring(explodeSpring, state.exploded ? 1.0 : 0.0, dt, 150, 19);
      stepSpring(rpmSpring, state.rpm, dt, 110, 16);
      stepSpring(shaderEnvSpring, state.shaderEnabled ? 1.0 : 0.0, dt, 140, 18);

      const speedMult = state.slowModes[state.slowIndex];
      const effectiveRpm = rpmSpring.at * speedMult;
      const isUserCranking = activePointers.size === 1 && (state.crankMode || speedMult === 0);
      if (!isUserCranking) {
        const omegaShaft = (effectiveRpm * Math.PI * 2) / 60;
        state.theta -= omegaShaft * dt * 0.12;
      }
      stepSceneAndRender(effectiveRpm);
    } else {
      stepSceneAndRender(0);
    }
  }

  requestAnimationFrame(animate);

  /* ==========================================================================
   * VISUAL HARNESS HOOK (window.__ANATOMY_DEBUG__)
   * ========================================================================== */
  window.__ANATOMY_DEBUG__ = {
    setCamera(
      elevDeg,
      azimDeg,
      zoom = spec.initialZoom || 1.0,
      panXY = [0, spec.initialPanY !== undefined ? spec.initialPanY : 0.16]
    ) {
      state.debugPaused = true;
      rotX = targetRotX = (elevDeg * Math.PI) / 180;
      rotY = targetRotY = (azimDeg * Math.PI) / 180;
      zoomFactor = zoom;
      panX = targetPanX = panXY[0];
      panY = targetPanY = panXY[1];
      updateCameraSize();
      stepSceneAndRender(0);
      return { elevDeg, azimDeg, zoom, panXY };
    },

    setOrthoView(viewName) {
      const defZoom = spec.initialZoom || 1.0;
      const defPanY = spec.initialPanY !== undefined ? spec.initialPanY : 0.16;
      const views = {
        front: [0, 0, defZoom, [0, defPanY * 0.5]],
        right: [0, -90, defZoom, [0, defPanY * 0.5]],
        left:  [0, 90, defZoom, [0, defPanY * 0.5]],
        top:   [90, 0, defZoom * 0.96, [0, 0]],
        iso:   [
          spec.isoElevDeg !== undefined ? spec.isoElevDeg : 30,
          spec.isoAzimDeg !== undefined ? spec.isoAzimDeg : -36,
          defZoom,
          [0, defPanY]
        ]
      };
      const v = views[viewName] || views.iso;
      return this.setCamera(v[0], v[1], v[2], v[3]);
    },

    isolate(filter) {
      state.debugPaused = true;
      reg.isolate(filter, state.cutaway, explodeSpring.at);
      stepSceneAndRender(0);
      return filter;
    },

    setPose(opts = {}) {
      state.debugPaused = opts.paused !== undefined ? opts.paused : true;
      if (opts.theta !== undefined) state.theta = opts.theta;
      if (opts.explode !== undefined) {
        state.exploded = opts.explode > 0.5;
        explodeSpring.at = opts.explode;
        explodeSpring.rate = 0;
        explodeBtn.classList.toggle("active", state.exploded);
      }
      if (opts.cutaway !== undefined) {
        state.cutaway = Boolean(opts.cutaway);
        cutawayBtn.classList.toggle("active", state.cutaway);
      }
      if (opts.shader !== undefined) {
        state.shaderEnabled = Boolean(opts.shader);
        shaderEnvSpring.at = state.shaderEnabled ? 1.0 : 0.0;
        shaderEnvSpring.rate = 0;
        shaderBtn.classList.toggle("active", state.shaderEnabled);
      }
      if (opts.hud !== undefined) {
        setHudVisible(Boolean(opts.hud));
      }
      if (opts.theme) {
        applyTheme(opts.theme);
      }
      reg.applyExplode(explodeSpring.at, state.cutaway);
      stepSceneAndRender(state.rpm);
      return {
        theta: state.theta,
        explode: explodeSpring.at,
        cutaway: state.cutaway,
        shader: state.shaderEnabled,
        hud: state.hudVisible,
        theme: kit.currentTheme.id
      };
    },

    focusJoint(anchorId, zoom = 2.8, elevDeg = 30, azimDeg = -36) {
      const jointObj = reg.joints.get(anchorId);
      if (!jointObj) {
        throw new Error(`Unknown joint anchor "${anchorId}". Available: ${Array.from(reg.joints.keys()).join(", ")}`);
      }
      state.debugPaused = true;
      rotX = targetRotX = (elevDeg * Math.PI) / 180;
      rotY = targetRotY = (azimDeg * Math.PI) / 180;
      panX = targetPanX = 0;
      panY = targetPanY = 0;
      zoomFactor = zoom;
      updateCameraSize();
      stepSceneAndRender(0);

      const pWorld = jointObj.getWorldPosition(new THREE.Vector3());
      panX = targetPanX = -pWorld.x;
      panY = targetPanY = -pWorld.y;
      stepSceneAndRender(0);

      const finalWorld = jointObj.getWorldPosition(new THREE.Vector3());
      const screen = projectWorldPointToScreen(finalWorld);
      return { anchorId, world: [pWorld.x, pWorld.y, pWorld.z], screen };
    },

    getJoints() {
      worldGroup.updateMatrixWorld(true);
      const out = [];
      for (const [id, obj] of reg.joints) {
        const w = obj.getWorldPosition(new THREE.Vector3());
        const s = projectWorldPointToScreen(w);
        out.push({
          id,
          world: [+w.x.toFixed(3), +w.y.toFixed(3), +w.z.toFixed(3)],
          screen: [+s.x.toFixed(1), +s.y.toFixed(1)]
        });
      }
      return out;
    },

    getSummary() {
      return {
        parts: reg.parts.size,
        tubes: reg.tubes.length,
        joints: Array.from(reg.joints.keys()),
        themes: kit.THEMES.map((t) => t.id)
      };
    }
  };
}
