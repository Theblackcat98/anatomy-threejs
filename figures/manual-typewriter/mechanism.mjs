import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, getTypewriterState } from "./model.mjs";

function makeKeyLegend(text) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 88;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#f2ead5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#9b927f";
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  ctx.fillStyle = "#25252a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = text.length > 1 ? "bold 28px Arial, sans-serif" : "bold 50px Arial, sans-serif";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
}

function addKeyLabel(reg, parent, id, text, width = 0.13, height = 0.09) {
  const material = makeKeyLegend(text);
  if (!material) return;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  label.rotation.x = -Math.PI / 2;
  label.position.set(0, 0.061, 0);
  reg.detail(`keyboard.label.${id}`, label, { parent, stage: "mechanism" });
}

function addKey(reg, keyboard, id, text, x, z, width = 0.235, depth = 0.195) {
  const keyGroup = reg.group(`keyboard.key.${id}`, {
    parent: keyboard,
    pos: [x, 0.125, z - 0.58],
    stage: "mechanism"
  });
  reg.part(`keyboard.cap.${id}`, new THREE.BoxGeometry(width, 0.12, depth), {
    parent: keyGroup,
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "case.keyboard.deck",
    detail: true
  });
  addKeyLabel(reg, keyGroup, id, text, Math.min(0.14, width * 0.68), Math.min(0.10, depth * 0.58));
  return keyGroup;
}

function buildPaperCanvas(ctx, canvas, state) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f3eddc";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ddd3bd";
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = "#8a8070";
  ctx.font = "16px monospace";
  ctx.textAlign = "left";
  ctx.fillText("ANATOMY · No. 5", 30, 38);
  ctx.strokeStyle = "#d7cbb4";
  ctx.beginPath();
  ctx.moveTo(30, 54);
  ctx.lineTo(w - 30, 54);
  ctx.stroke();

  const column = Math.max(0, Math.min(SPEC.maxColumn, Math.round(state.params?.column ?? 0)));
  const sample = "THE QUICK BR";
  const typed = sample.slice(0, column);
  ctx.fillStyle = "#27252a";
  ctx.font = "bold 27px 'Courier New', monospace";
  ctx.fillText(typed, 30, 105);
  const cursorX = 30 + Math.max(0, column) * 16.2;
  ctx.fillStyle = "#a75e37";
  ctx.fillRect(cursorX, 85, 3, 27);
  ctx.fillStyle = "#908673";
  ctx.font = "14px monospace";
  ctx.fillText("TYPE · SPACE · RETURN", 30, h - 25);
}

export function buildMechanism(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;

  // Moving carriage: the roller, paper, rack, and side bearings translate together.
  const carriage = reg.group("carriage.assembly", {
    parent: baseGroup,
    pos: [SPEC.carriageStartX, 0, 0],
    stage: "mechanism"
  });
  reg.part("carriage.frame", new THREE.BoxGeometry(3.28, 0.12, 0.52), {
    parent: carriage,
    pos: [0, 1.64, SPEC.platenZ],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "carriage.rail.front",
    allowOverlap: ["carriage.rail.front", "carriage.rail.rear", "carriage.end.left", "carriage.end.right"]
  });

  [-1, 1].forEach((sign, i) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`carriage.end.${side}`, new THREE.BoxGeometry(0.14, 0.70, 0.46), {
      parent: carriage,
      pos: [sign * 1.52, 1.98, SPEC.platenZ],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      mountOn: "carriage.frame",
      allowOverlap: ["carriage.platen", "carriage.frame", "platen.knob.left", "platen.knob.right"]
    });
    reg.detail(`carriage.end.screw.${i}`, makeScrewDetail(sign * 1.52, 1.70, SPEC.platenZ + 0.235, 0.035, "z", kit), { parent: carriage });
  });

  // Rubber platen, feed shaft, ratchet wheel, and turning knobs.
  reg.part("carriage.platen", buildCylinderGeometry(0.205, 0.205, 3.55, { axis: "x", segments: 40 }), {
    parent: carriage,
    pos: [0, SPEC.platenY, SPEC.platenZ],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: "carriage.end.right",
    allowOverlap: ["carriage.end.left", "carriage.end.right", "platen.knob.left", "platen.knob.right", "paper.sheet"]
  });
  [-1, 1].forEach((sign) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`platen.knob.${side}`, buildCylinderGeometry(0.13, 0.13, 0.16, { axis: "x", segments: 24 }), {
      parent: carriage,
      pos: [sign * 1.82, SPEC.platenY, SPEC.platenZ],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: "carriage.platen",
      allowOverlap: ["carriage.end.left", "carriage.end.right"]
    });
    const handwheel = new THREE.Group();
    handwheel.position.set(sign * 1.92, SPEC.platenY, SPEC.platenZ);
    handwheel.rotation.y = Math.PI / 2;
    const hoop = makeRingLine(0.17, 36, kit, "mid");
    hoop.rotation.y = Math.PI / 2;
    handwheel.add(hoop);
    reg.detail(`platen.handwheel.${side}`, handwheel, { parent: carriage, stage: "mechanism" });
  });

  const ratchetGeo = buildExternalGearGeometry(0.19, 18, 0.026, 0.11, 0.07);
  ratchetGeo.rotateY(Math.PI / 2);
  reg.part("platen.ratchet", ratchetGeo, {
    parent: carriage,
    pos: [1.71, SPEC.platenY, SPEC.platenZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "carriage.platen",
    allowOverlap: ["carriage.end.right", "platen.knob.right"],
    detail: true
  });

  // Paper is a thin, live canvas sheet tucked behind the roller; its typed line follows the escapement.
  reg.screen("paper.sheet", {
    parent: carriage,
    pos: [0, 2.82, -0.85],
    width: 2.38,
    height: 1.34,
    depth: 0.018,
    bezelPad: 0.018,
    resolution: [480, 270],
    ramp: "hi",
    outline: "lo",
    mountOn: "carriage.platen",
    allowOverlap: ["carriage.platen", "carriage.end.left", "carriage.end.right"],
    draw: buildPaperCanvas
  });

  // A rack travels with the carriage while the pawl remains fixed to the typebar basket.
  reg.part("carriage.escapement.rack", new THREE.BoxGeometry(3.22, 0.055, 0.10), {
    parent: carriage,
    pos: [0, 1.74, -0.22],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "carriage.frame",
    allowOverlap: ["carriage.frame"],
    detail: true
  });
  for (let i = 0; i <= 20; i++) {
    const tooth = new THREE.BoxGeometry(0.025, 0.07, 0.11);
    reg.part(`carriage.rack.tooth.${i}`, tooth, {
      parent: carriage,
      pos: [-1.55 + i * 0.155, 1.79, -0.22],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "carriage.escapement.rack",
      detail: true
    });
  }

  // A shallow keyboard with staggered QWERTY rows and an oversize space bar.
  const keyboard = reg.group("keyboard.assembly", {
    parent: baseGroup,
    pos: [0, SPEC.caseTopY + 0.055, 0.58],
    rot: [0.10, 0, 0],
    stage: "mechanism"
  });
  const rows = [
    { letters: "QWERTYUIOP", z: 0.96 },
    { letters: "ASDFGHJKL", z: 0.64 },
    { letters: "ZXCVBNM", z: 0.32 }
  ];
  let kKeyGroup = null;
  rows.forEach(({ letters, z }, row) => {
    const spacing = 0.34;
    const x0 = -((letters.length - 1) * spacing) * 0.5;
    [...letters].forEach((letter, i) => {
      const keyGroup = addKey(reg, keyboard, `${letter}`, letter, x0 + i * spacing, z);
      if (letter === "K") kKeyGroup = keyGroup;
    });
  });

  const shiftLeft = addKey(reg, keyboard, "shift-left", "SHIFT", -1.53, 0.32, 0.42, 0.19);
  const shiftRight = addKey(reg, keyboard, "shift-right", "SHIFT", 1.53, 0.32, 0.42, 0.19);
  const spaceKey = addKey(reg, keyboard, "space", "SPACE", 0, 0.04, 1.28, 0.18);
  // Keep references explicit so feature-aware runtimes can find the control groups.
  void shiftLeft;
  void shiftRight;

  let kArmed = true;
  if (kKeyGroup) {
    reg.interactable("keyboard.key.K", {
      cursor: "pointer",
      hint: "Drag the K key down to strike a typebar",
      onDrag: ({ dy, fireTrigger }) => {
        if (dy > 2 && kArmed) {
          fireTrigger("strike");
          kArmed = false;
        } else if (dy < -2) {
          kArmed = true;
        }
      }
    });
  }
  let spaceArmed = true;
  reg.interactable("keyboard.key.space", {
    cursor: "pointer",
    hint: "Drag the space bar to advance the carriage without printing",
    onDrag: ({ dy, fireTrigger }) => {
      if (dy > 2 && spaceArmed) {
        fireTrigger("space");
        spaceArmed = false;
      } else if (dy < -2) {
        spaceArmed = true;
      }
    }
  });

  // Ribbon spools sit in a shallow well; the central vibrator lifts the ink band on a strike.
  [-1, 1].forEach((sign, i) => {
    const side = sign < 0 ? "left" : "right";
    const spool = reg.group(`ribbon.spool.${side}`, {
      parent: baseGroup,
      pos: [sign * 0.87, 1.23, 0.18],
      stage: "mechanism"
    });
    reg.part(`ribbon.spool.body.${side}`, buildCylinderGeometry(0.17, 0.17, 0.36, { axis: "y", segments: 28 }), {
      parent: spool,
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      mountOn: "case.ribbon.well",
      allowOverlap: ["case.ribbon.well"],
      noCrease: true
    });
    reg.part(`ribbon.spool.hub.${side}`, buildCylinderGeometry(0.06, 0.06, 0.42, { axis: "y", segments: 20 }), {
      parent: spool,
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: `ribbon.spool.body.${side}`,
      allowOverlap: [`ribbon.spool.body.${side}`],
      detail: true
    });
    const cap = buildCylinderGeometry(0.19, 0.19, 0.035, { axis: "y", segments: 28 });
    reg.part(`ribbon.spool.cap.${side}`, cap, {
      parent: spool,
      pos: [0, 0.20, 0],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: `ribbon.spool.body.${side}`,
      allowOverlap: [`ribbon.spool.body.${side}`, `ribbon.spool.hub.${side}`],
      detail: true
    });
    reg.anchor(`ribbon.spool.${side}.center`, 0, 0, 0, spool, { dir: [0, 1, 0] });
    reg.detail(`ribbon.spool.screw.${side}`, makeScrewDetail(sign * 0.87, 1.465, 0.18, 0.025, "y", kit), { parent: baseGroup });
  });

  // Narrow fabric leads rise from the spool rims to the ribbon line at the print point.
  [-1, 1].forEach((sign) => {
    const side = sign < 0 ? "left" : "right";
    const start = new THREE.Vector3(sign * 1.0, 1.405, 0.18);
    const end = new THREE.Vector3(sign * 1.0, 2.10, -0.405);
    const direction = end.clone().sub(start);
    const lead = reg.group(`ribbon.lead.${side}`, {
      parent: baseGroup,
      pos: start.clone().add(end).multiplyScalar(0.5).toArray(),
      stage: "mechanism"
    });
    lead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    reg.part(`ribbon.lead.strip.${side}`, new THREE.BoxGeometry(0.036, direction.length(), 0.020), {
      parent: lead,
      ramp: "copper",
      outline: "lo",
      crease: "faint",
      mountOn: `ribbon.spool.body.${side}`,
      allowOverlap: [`ribbon.spool.body.${side}`, `ribbon.spool.hub.${side}`]
    });
  });

  reg.part("ribbon.band.left", new THREE.BoxGeometry(0.80, 0.045, 0.022), {
    parent: baseGroup,
    pos: [-0.61, 2.10, -0.405],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "ribbon.lead.strip.left",
    allowOverlap: ["ribbon.lead.strip.left", "ribbon.vibrator"]
  });
  reg.part("ribbon.band.right", new THREE.BoxGeometry(0.80, 0.045, 0.022), {
    parent: baseGroup,
    pos: [0.61, 2.10, -0.405],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "ribbon.lead.strip.right",
    allowOverlap: ["ribbon.lead.strip.right", "ribbon.vibrator"]
  });
  const ribbonVibrator = reg.group("ribbon.lift", {
    parent: baseGroup,
    pos: [0, 2.10, -0.405],
    stage: "mechanism"
  });
  reg.part("ribbon.vibrator", new THREE.BoxGeometry(0.48, 0.07, 0.028), {
    parent: ribbonVibrator,
    ramp: "copper",
    outline: "mid",
    crease: "faint",
    mountOn: "ribbon.band.left",
    allowOverlap: ["ribbon.band.left", "ribbon.band.right", "typebar.head.3"],
    detail: true
  });
  [-0.20, 0.20].forEach((x, i) => {
    const guide = buildCylinderGeometry(0.018, 0.018, 0.16, { axis: "y", segments: 10 });
    reg.part(`ribbon.guide.${i}`, guide, {
      parent: ribbonVibrator,
      pos: [x, -0.05, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "ribbon.vibrator",
      detail: true
    });
  });

  // Escapement pawl and return lever are physical controls, not copied generic knobs.
  const escapement = reg.group("escapement.pawl.group", {
    parent: baseGroup,
    pos: [0, 1.31, -0.22],
    stage: "mechanism"
  });
  reg.part("escapement.pawl", new THREE.BoxGeometry(0.34, 0.075, 0.10), {
    parent: escapement,
    pos: [0, 0.035, 0],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "typebasket.rail",
    allowOverlap: ["typebasket.rail", "carriage.escapement.rack"],
    detail: true
  });
  const pawlTip = buildCylinderGeometry(0.038, 0.038, 0.12, { axis: "z", segments: 12 });
  reg.part("escapement.pawl.tip", pawlTip, {
    parent: escapement,
    pos: [0.15, 0.045, -0.03],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "escapement.pawl",
    detail: true
  });

  const returnLever = reg.group("carriage.returnLever", {
    parent: carriage,
    pos: [1.50, 1.70, -0.32],
    stage: "mechanism"
  });
  reg.part("carriage.returnLever.handle", new THREE.BoxGeometry(0.10, 0.54, 0.08), {
    parent: returnLever,
    pos: [0, 0.27, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "carriage.frame",
    allowOverlap: ["carriage.frame"]
  });
  reg.part("carriage.returnLever.grip", buildCylinderGeometry(0.09, 0.07, 0.22, { axis: "x", segments: 18 }), {
    parent: returnLever,
    pos: [-0.10, 0.54, 0.12],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "carriage.returnLever.handle"
  });
  let returnArmed = true;
  reg.interactable("carriage.returnLever", {
    cursor: "grab",
    hint: "Drag the carriage lever down to return to the left margin",
    onDrag: ({ dy, fireTrigger }) => {
      if (dy > 2 && returnArmed) {
        fireTrigger("return");
        returnArmed = false;
      } else if (dy < -2) {
        returnArmed = true;
      }
    }
  });

  // A compact spur wheel makes the escapement’s one-tooth feed visible at the right side.
  const escapeWheelGeo = buildExternalGearGeometry(0.13, 16, 0.026, 0.06, 0.07);
  reg.part("escapement.wheel", escapeWheelGeo, {
    parent: baseGroup,
    pos: [1.52, 1.45, -0.12],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "case.ribbon.well",
    allowOverlap: ["case.ribbon.well", "escapement.pawl"],
    detail: true
  });

  // Bind the direct 3D carriage drag to the same detented FEED position as the HUD slider.
  reg.interactable("carriage.assembly", {
    cursor: "ew-resize",
    hint: "Drag the carriage left or right to inspect its line travel",
    onDrag: ({ worldDx, state, setParam }) => {
      const current = Number(state.params?.column ?? 0);
      const next = Math.max(0, Math.min(SPEC.maxColumn, current + worldDx / SPEC.carriagePitch));
      setParam("column", Math.round(next * 4) / 4);
    }
  });

  reg.anchor("carriage.platen.center", 0, SPEC.platenY, SPEC.platenZ, carriage, { dir: [0, 0, 1] });
  reg.anchor("carriage.paper.center", 0, 2.82, -0.85, carriage, { dir: [0, 0, 1] });
  reg.anchor("carriage.return.handle", 0, 0.54, 0.12, returnLever, { dir: [0, 1, 0] });
  reg.anchor("ribbon.print.point", 0, 0, 0, ribbonVibrator, { dir: [0, 0, -1] });
  reg.anchor("escapement.pawl.tip", 0.15, 0.045, -0.03, escapement, { dir: [0, 0, -1] });
  reg.tag("tag-paper", "TYPE · FEED · RETURN", 0, 3.46, -0.85);

  updateKinematics(reg, {
    params: { column: 0 },
    triggers: { strike: 0, space: 0, return: 0 }
  });
}

export function updateKinematics(reg, state) {
  const triggers = state.triggers || {};
  const strike = triggers.strike ?? 0;
  const space = triggers.space ?? 0;
  const returning = triggers.return ?? 0;
  const params = state.params || {};
  const writer = getTypewriterState(params, triggers);

  const carriage = reg.groups.get("carriage.assembly")?.group;
  if (carriage) carriage.position.x = writer.carriageX;

  for (let i = 0; i < 7; i++) {
    const swing = reg.groups.get(`typebar.swing.${i}`)?.group;
    if (swing) swing.rotation.x = -0.14 - (i === 3 ? 0.12 : 0.008) * strike;
  }

  const keyK = reg.groups.get("keyboard.key.K")?.group;
  if (keyK) keyK.position.y = 0.125 - 0.045 * strike;
  const spaceKey = reg.groups.get("keyboard.key.space")?.group;
  if (spaceKey) spaceKey.position.y = 0.125 - 0.035 * space;

  const vibrator = reg.groups.get("ribbon.lift")?.group;
  if (vibrator) vibrator.position.y = 2.10 + 0.045 * strike;
  const pawl = reg.groups.get("escapement.pawl.group")?.group;
  if (pawl) pawl.rotation.z = -0.16 * strike;
  const returnLever = reg.groups.get("carriage.returnLever")?.group;
  if (returnLever) returnLever.rotation.z = -0.22 * returning;
  const platen = reg.parts.get("carriage.platen")?.group;
  if (platen) platen.rotation.x = -0.08 * Math.max(space, returning);

  const leftSpool = reg.groups.get("ribbon.spool.left")?.group;
  const rightSpool = reg.groups.get("ribbon.spool.right")?.group;
  if (leftSpool) leftSpool.rotation.y = (params.column ?? 0) * 0.11;
  if (rightSpool) rightSpool.rotation.y = -(params.column ?? 0) * 0.11;
}
