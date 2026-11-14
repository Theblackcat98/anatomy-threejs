import * as THREE from "three";
import { createShaderKit } from "./shaders.mjs";
import { Recorder3D } from "./registry.mjs";

export function clamp01(x) {
  return x <= 0 ? 0 : x >= 1 ? 1 : x;
}

export function smooth(a, b, x) {
  if (a === b) return x >= b ? 1 : 0;
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function burst(age, rise = 0.08, fall = 0.65) {
  if (!Number.isFinite(age) || age < 0) return 0;
  if (age <= rise) {
    return rise <= 0 ? 1 : smooth(0, rise, age);
  }
  const end = rise + Math.max(0.001, fall);
  if (age >= end) return 0;
  return 1 - smooth(rise, end, age);
}

export function settle(held, want, dt, seconds = 0.25, calm = 1) {
  if (seconds <= 0 || dt <= 0) return want;
  const alpha = 1 - Math.exp((-dt * Math.max(0.15, calm)) / Math.max(0.001, seconds));
  if (typeof held === "object" && held !== null && "at" in held) {
    held.at += (want - held.at) * alpha;
    return held.at;
  }
  return held + (want - held) * alpha;
}

export function mountAnatomyFigure(config) {
  const {
    spec,
    buildBase,
    buildStructure,
    buildSubject,
    buildMechanism,
    buildShader,
    updateKinematics,
    formatReadout,
    tourAt
  } = config;

  const simulationMode = spec.simulationMode || "continuous";
  const isContinuous = simulationMode === "continuous";

  const features = Object.assign(
    {
      explode: true,
      cutaway: true,
      shader: true,
      crank: isContinuous,
      slow: isContinuous,
      rpm: isContinuous
    },
    spec.features || {}
  );

  const sectionSpec =
    spec.section && typeof spec.section === "object"
      ? spec.section
      : features.section
        ? { axis: "z", min: -2.0, max: 2.0, initial: 2.0, label: "SECT" }
        : null;

  const baseControls =
    Array.isArray(spec.controls)
      ? [...spec.controls]
      : isContinuous || features.rpm === true
        ? [
            {
              id: "rpm",
              label: "RPM",
              min: 0,
              max: 2400,
              step: 20,
              initial: spec.initialRpm !== undefined ? spec.initialRpm : 720,
              title: "Shaft speed"
            }
          ]
        : [];

  if ((simulationMode === "timeline" || features.timeline === true) && !baseControls.some((c) => c.id === "timeline")) {
    baseControls.push({
      id: "timeline",
      label: "TIME",
      min: 0,
      max: 1,
      step: 0.005,
      initial: spec.initialTimeline !== undefined ? spec.initialTimeline : 0,
      title: "Scrub simulation timeline"
    });
  }

  const controlDefs = baseControls;
  const triggerDefs = Array.isArray(spec.triggers) ? spec.triggers : [];
  const stepDefs = Array.isArray(spec.steps) ? spec.steps : [];
  const cameraViews = Array.isArray(spec.cameraViews) ? spec.cameraViews : [];
  const tourFn = typeof tourAt === "function" ? tourAt : typeof spec.tour === "function" ? spec.tour : null;

  const state = {
    theta: spec.initialTheta !== undefined ? spec.initialTheta : 0.65,
    rpm: spec.initialRpm !== undefined ? spec.initialRpm : (isContinuous ? 720 : 0),
    timeline: spec.initialTimeline !== undefined ? spec.initialTimeline : 0,
    params: {},
    slowModes: [1, 0.2, 0.05, 0],
    slowLabels: ["SLOW 1×", "SLOW 1/5×", "SLOW 1/20×", "PAUSED"],
    slowIndex: 0,
    crankMode: false,
    exploded: false,
    cutaway: spec.initialCutaway !== undefined ? spec.initialCutaway : features.cutaway,
    shaderEnabled: features.shader,
    hudVisible: true,
    debugPaused: false,
    stepIndex: 0,
    section: sectionSpec ? (sectionSpec.initial !== undefined ? sectionSpec.initial : sectionSpec.max) : null
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
  const sectionSpring = createSpring(state.section !== null ? state.section : 0);
  let targetSection = state.section;
  let thetaTarget = null;

  let simClock = 0;
  let tourClock = 0;
  let hasUserInteracted = false;
  let lastInteractionMs = performance.now();
  const triggerTimes = {};
  const triggerValues = {};
  const triggerAges = {};
  for (const t of triggerDefs) {
    triggerTimes[t.id] = -999;
    triggerValues[t.id] = 0;
    triggerAges[t.id] = 999;
  }

  function markUserInteraction() {
    hasUserInteracted = true;
    lastInteractionMs = performance.now();
  }

  const host = document.getElementById("canvas-host");
  const cardEl = document.getElementById("figure-card");
  const readoutEl = document.getElementById("readout");
  const phaseCornerEl = document.getElementById("phase-corner");

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (sectionSpec) {
    renderer.localClippingEnabled = true;
  }
  host.appendChild(renderer.domElement);

  const ISO_ELEV = ((spec.isoElevDeg !== undefined ? spec.isoElevDeg : 30) * Math.PI) / 180;
  const ISO_AZIM = ((spec.isoAzimDeg !== undefined ? spec.isoAzimDeg : -36) * Math.PI) / 180;
  let zoomFactor = spec.initialZoom || 1.08;
  let targetZoom = zoomFactor;
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
  const triggersGroupEl = document.getElementById("triggers-group");
  const cameraViewsGroupEl = document.getElementById("camera-views-group");
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
  const triggerButtons = new Map();
  let stepBtn = null;
  let sectionSliderEl = null;
  let activeCameraViewId = null;

  const localSectionNormal = new THREE.Vector3(0, 0, -1);
  const localSectionPlane = new THREE.Plane(localSectionNormal, 2.0);
  const worldSectionPlane = new THREE.Plane(localSectionNormal, 2.0);

  function setParam(id, value, immediate = false) {
    const def = controlDefMap.get(id);
    if (!def) return;
    const clamped = Math.max(def.min, Math.min(def.max, value));
    state.params[id] = clamped;
    if (id === "rpm") state.rpm = clamped;
    if (id === "timeline") {
      state.timeline = clamped;
      state.theta = clamped * Math.PI * 2;
    }
    const input = sliderInputs.get(id);
    if (input) input.value = String(clamped);
    if (immediate && paramSprings[id]) {
      paramSprings[id].at = clamped;
      paramSprings[id].rate = 0;
    }
  }

  function setSection(val, immediate = false) {
    if (!sectionSpec || !Number.isFinite(val)) return;
    const clamped = Math.max(sectionSpec.min, Math.min(sectionSpec.max, val));
    targetSection = clamped;
    if (sectionSliderEl) sectionSliderEl.value = String(clamped);
    if (immediate) {
      state.section = sectionSpring.at = clamped;
      sectionSpring.rate = 0;
    }
  }

  function setCameraViewSelectionUI(viewId) {
    activeCameraViewId = viewId || null;
    if (!cameraViewsGroupEl) return;
    Array.from(cameraViewsGroupEl.children).forEach((btn) => {
      btn.classList.toggle("active", Boolean(activeCameraViewId) && btn.dataset.viewId === activeCameraViewId);
    });
  }

  function applyCameraView(viewIdOrIndex, immediate = false) {
    if (cameraViews.length === 0) return null;
    const view =
      typeof viewIdOrIndex === "number"
        ? cameraViews[viewIdOrIndex]
        : cameraViews.find((v) => v.id === viewIdOrIndex);
    if (!view) return null;

    const elevDeg = view.elev !== undefined ? view.elev : (spec.isoElevDeg !== undefined ? spec.isoElevDeg : 30);
    const azimDeg = view.azim !== undefined ? view.azim : (spec.isoAzimDeg !== undefined ? spec.isoAzimDeg : -36);
    const zoom = view.zoom !== undefined ? view.zoom : (spec.initialZoom || 1.08);
    const pan = Array.isArray(view.pan)
      ? view.pan
      : [0, spec.initialPanY !== undefined ? spec.initialPanY : -0.06];

    targetRotX = (elevDeg * Math.PI) / 180;
    targetRotY = (azimDeg * Math.PI) / 180;
    targetPanX = pan[0] !== undefined ? pan[0] : 0;
    targetPanY = pan[1] !== undefined ? pan[1] : 0;
    targetZoom = Math.max(0.45, Math.min(4.5, zoom));

    if (immediate) {
      rotX = targetRotX;
      rotY = targetRotY;
      panX = targetPanX;
      panY = targetPanY;
      zoomFactor = targetZoom;
      updateCameraSize();
    }
    setCameraViewSelectionUI(view.id);
    return view;
  }

  function fireTrigger(id, opts = {}) {
    const tDef = triggerDefs.find((t) => t.id === id);
    if (!tDef) return false;
    if (!opts.fromTour) markUserInteraction();
    triggerTimes[id] = simClock;
    triggerAges[id] = 0;
    triggerValues[id] = burst(0, tDef.rise !== undefined ? tDef.rise : 0.08, tDef.fall !== undefined ? tDef.fall : 0.75);
    if (typeof tDef.onTrigger === "function") {
      tDef.onTrigger({ state, setParam, fireTrigger, applyStep });
    }
    const btn = triggerButtons.get(id);
    if (btn) btn.classList.add("armed");
    return true;
  }

  function applyStep(idx) {
    if (stepDefs.length === 0) return null;
    state.stepIndex = ((idx % stepDefs.length) + stepDefs.length) % stepDefs.length;
    const step = stepDefs[state.stepIndex];
    if (step.theta !== undefined) {
      thetaTarget = step.theta;
    }
    if (step.timeline !== undefined) {
      setParam("timeline", step.timeline, false);
    }
    if (step.params && typeof step.params === "object") {
      for (const [k, v] of Object.entries(step.params)) {
        setParam(k, v, false);
      }
    }
    if (stepBtn) {
      stepBtn.textContent = step.label || `STEP ${state.stepIndex + 1}/${stepDefs.length}`;
    }
    return step;
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
        markUserInteraction();
        setParam(c.id, parseFloat(e.target.value), false);
      });
      lbl.appendChild(span);
      lbl.appendChild(input);
      customSlidersEl.appendChild(lbl);
      sliderInputs.set(c.id, input);
    }

    if (sectionSpec) {
      const lbl = document.createElement("label");
      lbl.className = "slider-label";
      lbl.title = sectionSpec.title || "Slice 3D cross-section plane";
      const span = document.createElement("span");
      span.textContent = sectionSpec.label || "SECT";
      const input = document.createElement("input");
      input.type = "range";
      input.id = "section-slider";
      input.min = String(sectionSpec.min);
      input.max = String(sectionSpec.max);
      input.step = String(sectionSpec.step || 0.02);
      input.value = String(targetSection);
      input.addEventListener("input", (e) => {
        markUserInteraction();
        setSection(parseFloat(e.target.value), false);
      });
      lbl.appendChild(span);
      lbl.appendChild(input);
      customSlidersEl.appendChild(lbl);
      sectionSliderEl = input;
    }
  } else {
    const rpmSlider = document.getElementById("rpm-slider");
    if (rpmSlider) {
      rpmSlider.addEventListener("input", (e) => {
        markUserInteraction();
        setParam("rpm", parseFloat(e.target.value), false);
      });
      sliderInputs.set("rpm", rpmSlider);
    }
  }

  if (triggersGroupEl) {
    triggersGroupEl.innerHTML = "";
    if (stepDefs.length > 0) {
      stepBtn = document.createElement("button");
      stepBtn.type = "button";
      stepBtn.className = "action-btn trigger-btn";
      stepBtn.id = "step-btn";
      stepBtn.title = "Advance sequence step";
      stepBtn.textContent = stepDefs[0].label || `STEP 1/${stepDefs.length}`;
      stepBtn.addEventListener("click", () => {
        markUserInteraction();
        applyStep(state.stepIndex + 1);
      });
      triggersGroupEl.appendChild(stepBtn);
    }
    for (const t of triggerDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "action-btn trigger-btn";
      btn.id = `trigger-btn-${t.id}`;
      btn.textContent = t.label;
      if (t.title) btn.title = t.title;
      btn.addEventListener("click", () => fireTrigger(t.id));
      triggersGroupEl.appendChild(btn);
      triggerButtons.set(t.id, btn);
    }
  }

  if (cameraViewsGroupEl) {
    cameraViewsGroupEl.innerHTML = "";
    cameraViews.forEach((v, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "view-pill";
      btn.dataset.viewId = v.id;
      btn.textContent = v.label;
      if (idx < 9) btn.title = `${v.label} (${idx + 1})`;
      btn.addEventListener("click", () => {
        markUserInteraction();
        applyCameraView(v.id, false);
      });
      cameraViewsGroupEl.appendChild(btn);
    });
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
  if (!features.slow && slowBtn) {
    slowBtn.style.display = "none";
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
    targetZoom = zoomFactor = spec.initialZoom || 1.08;
    setCameraViewSelectionUI(null);
    updateCameraSize();
  }

  crankBtn.addEventListener("click", () => { markUserInteraction(); toggleCrankMode(); });
  slowBtn.addEventListener("click", () => { markUserInteraction(); cycleSlowMode(); });
  explodeBtn.addEventListener("click", () => { markUserInteraction(); toggleExplode(); });
  cutawayBtn.addEventListener("click", () => { markUserInteraction(); toggleCutaway(); });
  shaderBtn.addEventListener("click", () => { markUserInteraction(); toggleShader(); });
  hudBtn.addEventListener("click", toggleHud);
  hudQuickBtn.addEventListener("click", toggleHud);
  resetBtn.addEventListener("click", () => { markUserInteraction(); resetIsoView(); });

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
    markUserInteraction();
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
    markUserInteraction();
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
        setCameraViewSelectionUI(null);
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
          fireTrigger,
          applyStep,
          event: e
        });
      } else if (e.shiftKey || state.crankMode || (features.crank && state.slowModes[state.slowIndex] === 0)) {
        thetaTarget = null;
        state.theta -= dx * 0.024;
      } else {
        setCameraViewSelectionUI(null);
        targetRotY += dx * 0.0085;
        targetRotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, targetRotX + dy * 0.0085));
      }
    } else if (activePointers.size >= 2) {
      setCameraViewSelectionUI(null);
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
        targetZoom = zoomFactor = Math.max(0.45, Math.min(4.5, zoomFactor * scale));
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
    markUserInteraction();
    setCameraViewSelectionUI(null);
    targetZoom = zoomFactor = Math.max(0.45, Math.min(4.5, zoomFactor - e.deltaY * 0.0012));
    updateCameraSize();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key >= "1" && e.key <= "9") {
      const idx = Number(e.key) - 1;
      if (cameraViews[idx]) {
        markUserInteraction();
        applyCameraView(idx, false);
        return;
      }
    }
    const k = e.key.toLowerCase();
    if (k === "e") { markUserInteraction(); toggleExplode(); }
    else if (k === "s") {
      markUserInteraction();
      if (features.slow) cycleSlowMode();
      else if (stepDefs.length > 0) applyStep(state.stepIndex + 1);
    }
    else if (k === "c") { markUserInteraction(); toggleCutaway(); }
    else if (k === "i") { markUserInteraction(); toggleShader(); }
    else if (k === "h") toggleHud();
    else if (k === "r") { markUserInteraction(); resetIsoView(); }
    else if (e.key === "ArrowRight") { markUserInteraction(); thetaTarget = null; state.theta -= 0.12; }
    else if (e.key === "ArrowLeft") { markUserInteraction(); thetaTarget = null; state.theta += 0.12; }
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

  function stepSceneAndRender(effectiveRpm, dt = 0) {
    worldGroup.position.set(panX, panY, 0);
    worldGroup.rotation.order = "XYZ";
    worldGroup.rotation.x = rotX;
    worldGroup.rotation.y = rotY;
    worldGroup.updateMatrixWorld(true);

    reg.applyExplode(explodeSpring.at, state.cutaway);

    if (sectionSpec) {
      const sVal = sectionSpring.at;
      state.section = sVal;
      const isOpen = !sectionSpec.alwaysActive && sVal >= sectionSpec.max - 0.001;
      if (isOpen) {
        kit.setSectionPlane(null);
      } else {
        const axis = sectionSpec.axis || "z";
        const sign = sectionSpec.invert ? 1 : -1;
        localSectionNormal.set(
          axis === "x" ? sign : 0,
          axis === "y" ? sign : 0,
          axis === "z" ? sign : 0
        );
        localSectionPlane.set(localSectionNormal, -sign * sVal);
        worldSectionPlane.copy(localSectionPlane).applyMatrix4(worldGroup.matrixWorld);
        kit.setSectionPlane(worldSectionPlane);
      }
    }

    for (const t of triggerDefs) {
      const age = simClock - triggerTimes[t.id];
      triggerAges[t.id] = age;
      const val = burst(age, t.rise !== undefined ? t.rise : 0.08, t.fall !== undefined ? t.fall : 0.75);
      triggerValues[t.id] = val;
      const btn = triggerButtons.get(t.id);
      if (btn) btn.classList.toggle("armed", val > 0.04);
    }

    const smoothedParams = {};
    for (const c of controlDefs) {
      smoothedParams[c.id] = paramSprings[c.id].at;
    }
    if (smoothedParams.timeline !== undefined) {
      state.timeline = smoothedParams.timeline;
    }

    const kinematicState = {
      theta: state.theta,
      explode: explodeSpring.at,
      rpm: rpmSpring.at,
      effectiveRpm,
      shaderEnv: shaderEnvSpring.at,
      cutaway: state.cutaway,
      section: sectionSpec ? sectionSpring.at : null,
      simClock,
      dt,
      simulationMode,
      timeline: state.timeline,
      stepIndex: state.stepIndex,
      triggers: { ...triggerValues },
      triggerAges: { ...triggerAges },
      params: smoothedParams,
      rawParams: state.params,
      ...smoothedParams
    };

    if (updateKinematics) {
      updateKinematics(reg, kinematicState);
    }

    worldGroup.updateMatrixWorld(true);

    if (reg.screens && reg.screens.size > 0) {
      for (const [, scr] of reg.screens) {
        if (scr.ctx && scr.canvas && typeof scr.draw === "function") {
          scr.draw(scr.ctx, scr.canvas, kinematicState, kit.currentTheme);
          if (scr.texture) scr.texture.needsUpdate = true;
        }
      }
    }

    if (state.hudVisible && formatReadout) {
      const hudData = formatReadout(kinematicState);
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
      simClock += dt;

      let tourExplodeTarget = null;
      let tourCutawayTarget = null;
      let tourShaderTarget = null;
      const idleThresholdMs = hasUserInteracted ? 3600 : 1600;
      if (typeof tourFn === "function" && (now - lastInteractionMs) > idleThresholdMs && activePointers.size === 0) {
        tourClock += dt;
        const patch = tourFn(tourClock, {
          theta: state.theta,
          explode: explodeSpring.at,
          cutaway: state.cutaway,
          section: sectionSpec ? sectionSpring.at : null,
          params: { ...state.params },
          simulationMode
        });
        if (patch && typeof patch === "object") {
          if (typeof patch.explode === "boolean") tourExplodeTarget = patch.explode ? 1.0 : 0.0;
          else if (typeof patch.explode === "number") tourExplodeTarget = patch.explode;
          if (typeof patch.cutaway === "boolean") tourCutawayTarget = patch.cutaway;
          if (typeof patch.shader === "boolean") tourShaderTarget = patch.shader ? 1.0 : 0.0;
          if (typeof patch.rpm === "number") setParam("rpm", patch.rpm, false);
          if (typeof patch.theta === "number") {
            thetaTarget = null;
            state.theta = patch.theta;
          }
          if (typeof patch.section === "number" && sectionSpec) setSection(patch.section, false);
          if (patch.params && typeof patch.params === "object") {
            for (const [pk, pv] of Object.entries(patch.params)) {
              setParam(pk, pv, false);
            }
          }
          if (typeof patch.cameraView === "string" && patch.cameraView !== activeCameraViewId) {
            applyCameraView(patch.cameraView, false);
          }
          if (typeof patch.trigger === "string") {
            fireTrigger(patch.trigger, { fromTour: true });
          }
        }
      }

      if (tourCutawayTarget !== null && tourCutawayTarget !== state.cutaway) {
        state.cutaway = tourCutawayTarget;
        if (cutawayBtn) cutawayBtn.classList.toggle("active", state.cutaway);
      }

      rotX += (targetRotX - rotX) * 0.2;
      rotY += (targetRotY - rotY) * 0.2;
      panX += (targetPanX - panX) * 0.22;
      panY += (targetPanY - panY) * 0.22;
      if (Math.abs(targetZoom - zoomFactor) > 0.0004) {
        zoomFactor += (targetZoom - zoomFactor) * 0.22;
        updateCameraSize();
      }

      const wantExplode = tourExplodeTarget !== null ? tourExplodeTarget : (features.explode && state.exploded ? 1.0 : 0.0);
      stepSpring(explodeSpring, wantExplode, dt, 150, 19);
      if (!paramSprings.rpm) {
        stepSpring(rpmSpring, state.rpm, dt, 110, 16);
      }
      for (const c of controlDefs) {
        stepSpring(paramSprings[c.id], state.params[c.id], dt, 120, 17);
      }
      if (paramSprings.rpm) {
        state.rpm = state.params.rpm;
      }
      if (sectionSpec) {
        stepSpring(sectionSpring, targetSection, dt, 140, 18);
      }
      const wantShader = tourShaderTarget !== null ? tourShaderTarget : (features.shader && state.shaderEnabled ? 1.0 : 0.0);
      stepSpring(shaderEnvSpring, wantShader, dt, 140, 18);

      const speedMult = state.slowModes[state.slowIndex];
      const effectiveRpm = rpmSpring.at * speedMult;
      const isUserCranking =
        activePointers.size === 1 &&
        !activeInteractable &&
        (state.crankMode || (features.crank && speedMult === 0));

      if (thetaTarget !== null) {
        state.theta += (thetaTarget - state.theta) * Math.min(1, dt * 8.5);
        if (Math.abs(thetaTarget - state.theta) < 0.001) {
          state.theta = thetaTarget;
          thetaTarget = null;
        }
      } else if (simulationMode === "timeline" && paramSprings.timeline) {
        state.theta = paramSprings.timeline.at * Math.PI * 2;
      } else if (isContinuous && !isUserCranking) {
        const omegaShaft = (effectiveRpm * Math.PI * 2) / 60;
        state.theta -= omegaShaft * dt * 0.12;
      } else if (!isContinuous && features.rpm && effectiveRpm > 0 && !isUserCranking) {
        const omegaShaft = (effectiveRpm * Math.PI * 2) / 60;
        state.theta -= omegaShaft * dt * 0.12;
      }
      stepSceneAndRender(effectiveRpm, dt);
    } else {
      stepSceneAndRender(0, 0);
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
      targetZoom = zoomFactor = zoom;
      panX = targetPanX = panXY[0];
      panY = targetPanY = panXY[1];
      setCameraViewSelectionUI(null);
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

    setCameraView(viewIdOrIndex) {
      state.debugPaused = true;
      const view = applyCameraView(viewIdOrIndex, true);
      if (!view) {
        throw new Error(`Unknown camera view "${viewIdOrIndex}"`);
      }
      stepSceneAndRender(0);
      return view;
    },

    setSection(val) {
      if (!sectionSpec) return null;
      state.debugPaused = true;
      setSection(val, true);
      stepSceneAndRender(0);
      return state.section;
    },

    fireTrigger(id) {
      const ok = fireTrigger(id);
      if (state.debugPaused) {
        stepSceneAndRender(0);
      }
      return { id, ok, value: triggerValues[id] ?? 0 };
    },

    advanceStep() {
      const step = applyStep(state.stepIndex + 1);
      if (step && step.theta !== undefined) {
        state.theta = step.theta;
        thetaTarget = null;
      }
      if (state.debugPaused) stepSceneAndRender(0);
      return { stepIndex: state.stepIndex, step };
    },

    isolate(filter) {
      state.debugPaused = true;
      reg.isolate(filter, state.cutaway, explodeSpring.at);
      stepSceneAndRender(0);
      return filter;
    },

    setPose(opts = {}) {
      state.debugPaused = opts.paused !== undefined ? opts.paused : true;
      if (opts.theta !== undefined) {
        thetaTarget = null;
        state.theta = opts.theta;
      }
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
      if (opts.section !== undefined && sectionSpec) {
        setSection(opts.section, true);
      }
      if (opts.cameraView !== undefined) {
        applyCameraView(opts.cameraView, true);
      }
      if (opts.trigger) {
        fireTrigger(opts.trigger);
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
        section: state.section,
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
      targetZoom = zoomFactor = zoom;
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
        archetype: spec.archetype || "bench",
        simulationMode,
        toneMode: spec.toneMode || "single-lit",
        parts: reg.parts.size,
        tubes: reg.tubes.length,
        joints: Array.from(reg.joints.keys()),
        screensCount: reg.screens ? reg.screens.size : 0,
        themes: kit.THEMES.map((t) => t.id),
        features,
        section: sectionSpec ? { ...sectionSpec, current: state.section } : null,
        cameraViews: cameraViews.map((v) => v.id),
        triggers: triggerDefs.map((t) => t.id),
        stepsCount: stepDefs.length,
        controls: controlDefs.map((c) => c.id),
        interactables: reg.interactables.map((i) => i.id),
        drivePoses: spec.drivePoses || null
      };
    }
  };
}
