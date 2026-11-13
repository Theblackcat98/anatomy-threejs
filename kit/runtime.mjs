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

  const features = Object.assign(
    { explode: true, cutaway: true, shader: true, crank: true },
    spec.features || {}
  );

  const controlDefs =
    Array.isArray(spec.controls) && spec.controls.length > 0
      ? spec.controls
      : [
          {
            id: "rpm",
            label: "RPM",
            min: 0,
            max: 2400,
            step: 20,
            initial: spec.initialRpm !== undefined ? spec.initialRpm : 720,
            title: "Shaft speed"
          }
        ];

  const state = {
    theta: spec.initialTheta !== undefined ? spec.initialTheta : 0.65,
    rpm: spec.initialRpm !== undefined ? spec.initialRpm : 720,
    params: {},
    slowModes: [1, 0.2, 0.05, 0],
    slowLabels: ["SLOW 1×", "SLOW 1/5×", "SLOW 1/20×", "PAUSED"],
    slowIndex: 0,
    crankMode: false,
    exploded: false,
    cutaway: spec.initialCutaway !== undefined ? spec.initialCutaway : features.cutaway,
    shaderEnabled: features.shader,
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

  const paramSprings = {};
  for (const c of controlDefs) {
    state.params[c.id] = c.initial;
    paramSprings[c.id] = createSpring(c.initial);
  }
  if (state.params.rpm !== undefined) {
    state.rpm = state.params.rpm;
  }

  const explodeSpring = createSpring(0);
  const rpmSpring = paramSprings.rpm || createSpring(state.rpm);
  const shaderEnvSpring = createSpring(features.shader ? 1 : 0);

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
  const customSlidersEl = document.getElementById("custom-sliders");
  const crankBtn = document.getElementById("crank-btn");
  const slowBtn = document.getElementById("slow-btn");
  const explodeBtn = document.getElementById("explode-btn");
  const cutawayBtn = document.getElementById("cutaway-btn");
  const shaderBtn = document.getElementById("shader-btn");
  const hudBtn = document.getElementById("hud-btn");
  const hudQuickBtn = document.getElementById("hud-quick-btn");
  const resetBtn = document.getElementById("reset-btn");
  const hintExplodeEl = document.getElementById("hint-explode");
  const hintCrankEl = document.getElementById("hint-crank");
  const hintInteractEl = document.getElementById("hint-interact");
  const hintInteractMobileEl = document.getElementById("hint-interact-mobile");

  const controlDefMap = new Map(controlDefs.map((c) => [c.id, c]));
  const sliderInputs = new Map();

  function setParam(id, value, immediate = false) {
    const def = controlDefMap.get(id);
    if (!def) return;
    const clamped = Math.max(def.min, Math.min(def.max, value));
    state.params[id] = clamped;
    if (id === "rpm") state.rpm = clamped;
    const input = sliderInputs.get(id);
    if (input) input.value = String(clamped);
    if (immediate && paramSprings[id]) {
      paramSprings[id].at = clamped;
      paramSprings[id].rate = 0;
    }
  }

  if (customSlidersEl) {
    customSlidersEl.innerHTML = "";
    for (const c of controlDefs) {
      const lbl = document.createElement("label");
      lbl.className = "slider-label";
      if (c.title) lbl.title = c.title;
      const span = document.createElement("span");
      span.textContent = c.label;
      const input = document.createElement("input");
      input.type = "range";
      input.id = c.id === "rpm" ? "rpm-slider" : `param-slider-${c.id}`;
      input.min = String(c.min);
      input.max = String(c.max);
      input.step = String(c.step);
      input.value = String(c.initial);
      input.addEventListener("input", (e) => {
        setParam(c.id, parseFloat(e.target.value), false);
      });
      lbl.appendChild(span);
      lbl.appendChild(input);
      customSlidersEl.appendChild(lbl);
      sliderInputs.set(c.id, input);
    }
  } else {
    const rpmSlider = document.getElementById("rpm-slider");
    if (rpmSlider) {
      rpmSlider.addEventListener("input", (e) => {
        setParam("rpm", parseFloat(e.target.value), false);
      });
      sliderInputs.set("rpm", rpmSlider);
    }
  }

  if (!features.explode) {
    if (explodeBtn) explodeBtn.style.display = "none";
    if (hintExplodeEl) hintExplodeEl.style.display = "none";
  }
  if (!features.cutaway) {
    if (cutawayBtn) cutawayBtn.style.display = "none";
  } else if (cutawayBtn) {
    cutawayBtn.classList.toggle("active", state.cutaway);
  }
  if (!features.shader) {
    if (shaderBtn) shaderBtn.style.display = "none";
  } else if (shaderBtn) {
    shaderBtn.classList.toggle("active", state.shaderEnabled);
  }
  if (!features.crank) {
    if (crankBtn) crankBtn.style.display = "none";
    if (hintCrankEl) hintCrankEl.style.display = "none";
  }
  if (spec.interactionHint) {
    if (hintInteractEl) hintInteractEl.textContent = `${spec.interactionHint} · `;
    if (hintInteractMobileEl) hintInteractMobileEl.textContent = `${spec.interactionHint} · `;
  }

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
    if (!features.crank) return;
    state.crankMode = !state.crankMode;
    crankBtn.classList.toggle("active", state.crankMode);
  }

  function toggleExplode() {
    if (!features.explode) return;
    state.exploded = !state.exploded;
    explodeBtn.classList.toggle("active", state.exploded);
  }

  function cycleSlowMode() {
    state.slowIndex = (state.slowIndex + 1) % state.slowModes.length;
    slowBtn.textContent = state.slowLabels[state.slowIndex];
    slowBtn.classList.toggle("active", state.slowIndex > 0);
  }

  function toggleCutaway() {
    if (!features.cutaway) return;
    state.cutaway = !state.cutaway;
    cutawayBtn.classList.toggle("active", state.cutaway);
    reg.applyExplode(explodeSpring.at, state.cutaway);
  }

  function toggleShader() {
    if (!features.shader) return;
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

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let activeInteractable = null;

  function isEffectivelyVisible(obj) {
    let cur = obj;
    while (cur) {
      if (!cur.visible) return false;
      cur = cur.parent;
    }
    return true;
  }

  function pickInteractable(clientX, clientY) {
    if (!reg.interactables || reg.interactables.length === 0) return null;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    let bestEntry = null;
    let bestDist = Infinity;
    for (const entry of reg.interactables) {
      if (!entry.object3d || !isEffectivelyVisible(entry.object3d)) continue;
      const meshes = [];
      entry.object3d.traverse((child) => {
        if (child.isMesh && child.name === "solid" && isEffectivelyVisible(child)) {
          meshes.push(child);
        }
      });
      if (meshes.length === 0) continue;
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0 && hits[0].distance < bestDist) {
        bestDist = hits[0].distance;
        bestEntry = entry;
      }
    }
    return bestEntry;
  }

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
      activeInteractable =
        !isMousePan && !e.shiftKey && !state.crankMode
          ? pickInteractable(e.clientX, e.clientY)
          : null;
      host.style.cursor = "grabbing";
    } else if (activePointers.size === 2) {
      activeInteractable = null;
      syncTwoFingerMetrics();
    }
  });

  host.addEventListener("pointermove", (e) => {
    if (!activePointers.has(e.pointerId)) {
      if (activePointers.size === 0 && reg.interactables.length > 0) {
        const hoverHit = pickInteractable(e.clientX, e.clientY);
        host.style.cursor = hoverHit ? hoverHit.cursor : "grab";
      }
      return;
    }
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
      } else if (activeInteractable && typeof activeInteractable.onDrag === "function") {
        activeInteractable.onDrag({
          dx,
          dy,
          worldDx: dx * worldPerPixelX,
          worldDy: -dy * worldPerPixelY,
          state,
          setParam,
          event: e
        });
      } else if (e.shiftKey || state.crankMode || (features.crank && state.slowModes[state.slowIndex] === 0)) {
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
    if (activePointers.size === 0) {
      activeInteractable = null;
      host.style.cursor = "grab";
    } else if (activePointers.size === 1) {
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

    const smoothedParams = {};
    for (const c of controlDefs) {
      smoothedParams[c.id] = paramSprings[c.id].at;
    }

    if (updateKinematics) {
      updateKinematics(reg, {
        theta: state.theta,
        explode: explodeSpring.at,
        rpm: rpmSpring.at,
        effectiveRpm,
        shaderEnv: shaderEnvSpring.at,
        cutaway: state.cutaway,
        params: smoothedParams,
        rawParams: state.params,
        ...smoothedParams
      });
    }

    worldGroup.updateMatrixWorld(true);

    if (state.hudVisible && formatReadout) {
      const hudData = formatReadout({
        theta: state.theta,
        effectiveRpm,
        explode: explodeSpring.at,
        params: smoothedParams,
        rawParams: state.params,
        ...smoothedParams
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

      stepSpring(explodeSpring, features.explode && state.exploded ? 1.0 : 0.0, dt, 150, 19);
      if (!paramSprings.rpm) {
        stepSpring(rpmSpring, state.rpm, dt, 110, 16);
      }
      for (const c of controlDefs) {
        stepSpring(paramSprings[c.id], state.params[c.id], dt, 120, 17);
      }
      if (paramSprings.rpm) {
        state.rpm = state.params.rpm;
      }
      stepSpring(shaderEnvSpring, features.shader && state.shaderEnabled ? 1.0 : 0.0, dt, 140, 18);

      const speedMult = state.slowModes[state.slowIndex];
      const effectiveRpm = rpmSpring.at * speedMult;
      const isUserCranking =
        activePointers.size === 1 &&
        !activeInteractable &&
        (state.crankMode || (features.crank && speedMult === 0));
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
        state.exploded = features.explode && opts.explode > 0.5;
        explodeSpring.at = features.explode ? opts.explode : 0;
        explodeSpring.rate = 0;
        if (explodeBtn) explodeBtn.classList.toggle("active", state.exploded);
      }
      if (opts.cutaway !== undefined) {
        state.cutaway = features.cutaway ? Boolean(opts.cutaway) : Boolean(spec.initialCutaway);
        if (cutawayBtn) cutawayBtn.classList.toggle("active", state.cutaway);
      }
      if (opts.shader !== undefined) {
        state.shaderEnabled = features.shader ? Boolean(opts.shader) : false;
        shaderEnvSpring.at = state.shaderEnabled ? 1.0 : 0.0;
        shaderEnvSpring.rate = 0;
        if (shaderBtn) shaderBtn.classList.toggle("active", state.shaderEnabled);
      }
      if (opts.rpm !== undefined) {
        state.rpm = opts.rpm;
        if (paramSprings.rpm) {
          setParam("rpm", opts.rpm, true);
        } else {
          rpmSpring.at = opts.rpm;
          rpmSpring.rate = 0;
        }
      }
      if (opts.params && typeof opts.params === "object") {
        for (const [pk, pv] of Object.entries(opts.params)) {
          setParam(pk, pv, true);
        }
      }
      for (const c of controlDefs) {
        if (opts[c.id] !== undefined) {
          setParam(c.id, opts[c.id], true);
        }
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
        theme: kit.currentTheme.id,
        params: { ...state.params }
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
        themes: kit.THEMES.map((t) => t.id),
        features,
        controls: controlDefs.map((c) => c.id),
        interactables: reg.interactables.map((i) => i.id),
        drivePoses: spec.drivePoses || null
      };
    }
  };
}
