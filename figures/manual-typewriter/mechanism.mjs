import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildExternalGearGeometry,
  makeRingLine,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import {
  ACTIVE_KEYS,
  ANCHORS,
  SPEC,
  TYPEBAR_SLOTS,
  getLineCount,
  getReturnStartColumn,
  getSelectedTypeKey,
  getTypedText,
  isShifted,
  selectTypeKey
} from "./model.mjs";

const MECHANISM_UP = new THREE.Vector3(0, 1, 0);
const PAPER_LINE_PITCH = 0.18;
let paperCanvas = null;
let paperTexture = null;
let previousPaperText = null;
let paperMeshRef = null;

function keyLegendMaterial(primary, secondary = "") {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#28272b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (secondary && secondary !== primary) {
    ctx.font = "bold 30px Arial, sans-serif";
    ctx.fillText(primary, 64, 35);
    ctx.font = "bold 20px Arial, sans-serif";
    ctx.fillText(secondary, 64, 68);
  } else {
    ctx.font = primary.length > 2 ? "bold 20px Arial, sans-serif" : "bold 42px Arial, sans-serif";
    ctx.fillText(primary, 64, 51);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, side: THREE.DoubleSide });
}

function addKeyLegend(reg, parent, id, primary, secondary, width, depth, y) {
  const material = keyLegendMaterial(primary, secondary);
  if (!material) return;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  label.rotation.x = -Math.PI / 2;
  label.position.y = y;
  reg.detail(`keyboard.label.${id}`, label, { parent, stage: "mechanism" });
}

function addKey(reg, keyboard, key, { width = 0.176, depth = 0.176, style = "round" } = {}) {
  const keyGroup = reg.group(`keyboard.key.${key.id}`, {
    parent: keyboard,
    pos: [key.x, 0.115, key.z],
    stage: "mechanism"
  });
  if (style === "round") {
    reg.part(`keyboard.key.rim.${key.id}`, buildCylinderGeometry(0.091, 0.091, 0.022, { axis: "y", segments: 24 }), {
      parent: keyGroup,
      pos: [0, -0.018, 0],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      mountOn: "case.keyboard.deck",
      allowOverlap: ["case.keyboard.deck"],
      detail: true
    });
    reg.part(`keyboard.key.cap.${key.id}`, buildCylinderGeometry(0.082, 0.082, 0.055, { axis: "y", segments: 28 }), {
      parent: keyGroup,
      pos: [0, 0.019, 0],
      ramp: "hi",
      outline: "mid",
      crease: "faint",
      mountOn: "case.keyboard.deck",
      allowOverlap: [`keyboard.key.rim.${key.id}`, "case.keyboard.deck"],
      detail: true
    });
  } else {
    reg.part(`keyboard.key.cap.${key.id}`, new THREE.BoxGeometry(width, 0.060, depth), {
      parent: keyGroup,
      pos: [0, 0.014, 0],
      ramp: "hi",
      outline: "mid",
      crease: "faint",
      mountOn: "case.keyboard.deck",
      allowOverlap: ["case.keyboard.deck"],
      detail: true
    });
  }
  const stemXs = style === "bar" ? [-width * 0.38, width * 0.38] : [0];
  stemXs.forEach((x, i) => {
    reg.part(`keyboard.key.stem.${key.id}.${i}`, buildCylinderGeometry(0.028, 0.028, 0.17, { axis: "y", segments: 10 }), {
      parent: keyGroup,
      pos: [x, -0.063, 0],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "case.keyboard.deck",
      allowOverlap: ["case.keyboard.deck", `keyboard.key.cap.${key.id}`],
      detail: true
    });
  });
  addKeyLegend(reg, keyGroup, key.id, key.label, key.shifted || "", Math.min(width * 0.68, 0.14), Math.min(depth * 0.48, 0.08), 0.048);
  return keyGroup;
}

function addLink(reg, id, parent, start, end, radius, opts = {}) {
  const a = start.isVector3 ? start.clone() : new THREE.Vector3(...start);
  const b = end.isVector3 ? end.clone() : new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const length = Math.max(delta.length(), 0.001);
  const link = reg.part(id, buildCylinderGeometry(radius, radius, length, { axis: "y", segments: 8 }), {
    parent,
    pos: a.clone().add(b).multiplyScalar(0.5).toArray(),
    ramp: opts.ramp || "hi",
    outline: "lo",
    crease: "faint",
    noCrease: true,
    mountOn: opts.mountOn || "case.keyboard.deck",
    allowOverlap: opts.allowOverlap || [],
    detail: true
  });
  link.quaternion.setFromUnitVectors(MECHANISM_UP, delta.normalize());
  link.userData.baseLength = length;
  return link;
}

function createPaperPath() {
  const r = SPEC.platenRadius + 0.012;
  const cy = SPEC.platenY;
  const cz = SPEC.platenZ;
  const points = [];
  const lowerSteps = 10;
  for (let i = 0; i <= lowerSteps; i++) {
    const t = i / lowerSteps;
    points.push(new THREE.Vector3(0, cy - 0.36 + 0.36 * t, cz + r));
  }
  const arcSteps = 28;
  for (let i = 1; i <= arcSteps; i++) {
    const theta = Math.PI * i / arcSteps;
    points.push(new THREE.Vector3(0, cy + r * Math.sin(theta), cz + r * Math.cos(theta)));
  }
  const upperSteps = 18;
  for (let i = 1; i <= upperSteps; i++) {
    const t = i / upperSteps;
    points.push(new THREE.Vector3(0, cy + 1.24 * t, cz - r));
  }
  return points;
}

function makePaperWrapGeometry(width) {
  const path = createPaperPath();
  const across = 12;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row < path.length; row++) {
    for (let col = 0; col <= across; col++) {
      const x = -width * 0.5 + width * col / across;
      positions.push(x, path[row].y, path[row].z);
      uvs.push(col / across, row / (path.length - 1));
    }
  }
  for (let row = 0; row < path.length - 1; row++) {
    for (let col = 0; col < across; col++) {
      const a = row * (across + 1) + col;
      const b = a + 1;
      const c = a + across + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function drawPaper() {
  if (!paperCanvas || !paperTexture) return;
  const ctx = paperCanvas.getContext("2d");
  const w = paperCanvas.width;
  const h = paperCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f4eedf";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#d9cfbb";
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = "#837c6e";
  ctx.textAlign = "left";
  ctx.font = "20px monospace";
  ctx.fillText("ANATOMY · MANUAL TYPEWRITER No. 5", 34, 64);
  ctx.strokeStyle = "#d8cebb";
  ctx.beginPath();
  ctx.moveTo(34, 78);
  ctx.lineTo(w - 34, 78);
  ctx.stroke();

  const fullText = getTypedText();
  const currentLine = fullText.split("\n").at(-1) || "";
  const visible = currentLine.slice(-28);
  ctx.fillStyle = "#28252a";
  ctx.font = "bold 30px 'Courier New', monospace";
  ctx.fillText(visible, 34, h - 84);
  const cursorX = Math.min(w - 40, 34 + visible.length * 18);
  ctx.fillStyle = "#9a5b37";
  ctx.fillRect(cursorX, h - 116, 3, 38);
  ctx.fillStyle = "#928775";
  ctx.font = "17px monospace";
  ctx.fillText(`LINE ${String(getLineCount() + 1).padStart(2, "0")} · CARRIAGE ${String(SPEC.maxColumn).padStart(2, "0")}`, 34, h - 28);
  paperTexture.needsUpdate = true;
}

function createPaperMesh(reg, carriage) {
  if (typeof document === "undefined") return;
  paperCanvas = document.createElement("canvas");
  paperCanvas.width = 768;
  paperCanvas.height = 512;
  paperTexture = new THREE.CanvasTexture(paperCanvas);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.anisotropy = 4;
  drawPaper();
  const paperGroup = reg.group("paper.wrap", { parent: carriage, stage: "mechanism" });
  paperMeshRef = new THREE.Mesh(makePaperWrapGeometry(2.56), new THREE.MeshBasicMaterial({
    map: paperTexture,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  }));
  paperMeshRef.name = "paper.wrap.mesh";
  reg.detail("paper.sheet", paperMeshRef, { parent: paperGroup, stage: "mechanism" });
}

function addSpool(reg, baseGroup, side) {
  const sign = side === "left" ? -1 : 1;
  const x = sign * 2.10;
  const y = SPEC.platenY;
  const z = SPEC.ribbonZ;
  reg.part(`ribbon.post.${side}`, buildCylinderGeometry(0.032, 0.032, 1.65, { axis: "y", segments: 12 }), {
    parent: baseGroup,
    pos: [x, 0.98, z],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    noCrease: true,
    mountOn: "case.body",
    allowOverlap: [`ribbon.spool.body.${side}`]
  });
  const spool = reg.group(`ribbon.spool.${side}`, { parent: baseGroup, pos: [x, y, z], stage: "mechanism" });
  reg.part(`ribbon.spool.body.${side}`, buildCylinderGeometry(0.115, 0.115, 0.17, { axis: "y", segments: 24 }), {
    parent: spool,
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: `ribbon.post.${side}`,
    allowOverlap: [`ribbon.post.${side}`, `ribbon.spool.flange.${side}.top`, `ribbon.spool.flange.${side}.bottom`]
  });
  [
    { id: "bottom", offset: -0.10 },
    { id: "top", offset: 0.10 }
  ].forEach(({ id, offset }) => {
    reg.part(`ribbon.spool.flange.${side}.${id}`, buildCylinderGeometry(0.15, 0.15, 0.018, { axis: "y", segments: 28 }), {
      parent: spool,
      pos: [0, offset, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: `ribbon.spool.body.${side}`,
      allowOverlap: [`ribbon.spool.body.${side}`],
      detail: true
    });
  });
  reg.part(`ribbon.spool.hub.${side}`, buildCylinderGeometry(0.032, 0.032, 0.22, { axis: "y", segments: 16 }), {
    parent: spool,
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: `ribbon.spool.body.${side}`,
    allowOverlap: [`ribbon.spool.body.${side}`],
    detail: true
  });
  const ring = makeRingLine(0.105, 28, kitFrom(reg), "lo");
  ring.position.y = 0.115;
  reg.detail(`ribbon.spool.ring.${side}`, ring, { parent: spool, stage: "mechanism" });
  reg.anchor(`ribbon.spool.${side}.center`, 0, 0, 0, spool, { dir: [0, 1, 0] });
  return spool;
}

// The registry's shader kit is available as reg.kit only in newer builds; use this helper for themed rings.
function kitFrom(reg) {
  return reg.kit || { lineMaterials: { lo: new THREE.LineBasicMaterial({ color: 0x37343a }) } };
}

export function buildMechanism(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;

  // Translating carriage: the end plates, platen, paper, feed rollers, and rack all travel together.
  const carriage = reg.group("carriage.assembly", {
    parent: baseGroup,
    pos: [SPEC.carriageStartX, 0, 0],
    stage: "mechanism"
  });
  reg.part("carriage.frame", new THREE.BoxGeometry(3.00, 0.10, 0.52), {
    parent: carriage,
    pos: [0, 1.38, -0.74],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    mountOn: "carriage.rail.front",
    allowOverlap: ["carriage.rail.front", "carriage.rail.rear", "carriage.end.left", "carriage.end.right"]
  });

  [-1, 1].forEach((sign) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`carriage.end.${side}`, new THREE.BoxGeometry(0.13, 0.62, 0.66), {
      parent: carriage,
      pos: [sign * 1.32, 1.67, -0.74],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      mountOn: "carriage.frame",
      allowOverlap: ["carriage.frame", "carriage.platen", `platen.knob.${side}`]
    });
  });

  [-1, 1].forEach((sign) => {
    const side = sign < 0 ? "left" : "right";
    [-0.48, -1.00].forEach((z, index) => {
      reg.part(`carriage.bearing.${side}.${index}`, new THREE.BoxGeometry(0.18, 0.17, 0.16), {
        parent: carriage,
        pos: [sign * 1.20, 1.47, z],
        ramp: "lo",
        outline: "lo",
        crease: "faint",
        mountOn: "carriage.frame",
        allowOverlap: ["carriage.frame", `carriage.rail.${index === 0 ? "front" : "rear"}`],
        detail: true
      });
    });
  });

  reg.part("carriage.platen", buildCylinderGeometry(SPEC.platenRadius, SPEC.platenRadius, 3.00, { axis: "x", segments: 40 }), {
    parent: carriage,
    pos: [0, SPEC.platenY, SPEC.platenZ],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: "carriage.end.right",
    allowOverlap: ["carriage.end.left", "carriage.end.right", "platen.knob.left", "platen.knob.right", "platen.ratchet", "paper.sheet", "paper.feed.roller.*"]
  });

  [-1, 1].forEach((sign) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`platen.knob.${side}`, buildCylinderGeometry(0.085, 0.085, 0.36, { axis: "x", segments: 24 }), {
      parent: carriage,
      pos: [sign * 1.56, SPEC.platenY, SPEC.platenZ],
      ramp: "brass",
      outline: "mid",
      crease: "faint",
      mountOn: "carriage.platen",
      allowOverlap: ["carriage.end.left", "carriage.end.right", "carriage.platen"],
      detail: true
    });
    const handwheel = new THREE.Group();
    handwheel.position.set(sign * 1.84, SPEC.platenY, SPEC.platenZ);
    handwheel.rotation.y = Math.PI / 2;
    const hoop = makeRingLine(0.14, 32, kit, "mid");
    hoop.rotation.y = Math.PI / 2;
    handwheel.add(hoop);
    reg.detail(`platen.handwheel.${side}`, handwheel, { parent: carriage, stage: "mechanism" });
    reg.detail(`platen.knob.screw.${side}`, makeScrewDetail(sign * 1.56, SPEC.platenY, SPEC.platenZ, 0.022, "x", kit), { parent: carriage, stage: "mechanism" });
  });

  const ratchetGeometry = buildExternalGearGeometry(0.15, 36, 0.012, 0.035, 0.06);
  ratchetGeometry.rotateY(Math.PI / 2);
  reg.part("platen.ratchet", ratchetGeometry, {
    parent: carriage,
    pos: [1.52, SPEC.platenY, SPEC.platenZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "carriage.platen",
    allowOverlap: ["carriage.end.right", "platen.knob.right", "carriage.platen"],
    detail: true
  });
  reg.part("platen.linefeed.pawl", new THREE.BoxGeometry(0.18, 0.04, 0.035), {
    parent: carriage,
    pos: [1.50, SPEC.platenY - 0.10, SPEC.platenZ + 0.13],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "platen.ratchet",
    allowOverlap: ["platen.ratchet", "carriage.end.right"],
    detail: true
  });

  // Paper wraps over the platen and rises behind it; the carriage owns the entire paper path.
  createPaperMesh(reg, carriage);
  [-1.05, -0.53, 0, 0.53, 1.05].forEach((x, i) => {
    reg.part(`paper.feed.roller.${i}`, buildCylinderGeometry(0.055, 0.055, 0.17, { axis: "x", segments: 18 }), {
      parent: carriage,
      pos: [x, SPEC.platenY - 0.235, SPEC.platenZ + 0.055],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "carriage.platen",
      allowOverlap: ["carriage.platen", "paper.sheet"],
      detail: true
    });
  });
  reg.part("paper.bail.rod", buildCylinderGeometry(0.022, 0.022, 2.62, { axis: "x", segments: 12 }), {
    parent: carriage,
    pos: [0, SPEC.platenY + 0.34, SPEC.platenZ + 0.02],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    noCrease: true,
    mountOn: "carriage.end.left",
    allowOverlap: ["carriage.end.right", "paper.sheet"],
    detail: true
  });
  [-1, 1].forEach((sign, i) => {
    reg.part(`paper.bail.roller.${i}`, buildCylinderGeometry(0.052, 0.052, 0.14, { axis: "x", segments: 16 }), {
      parent: carriage,
      pos: [sign * 0.73, SPEC.platenY + 0.34, SPEC.platenZ + 0.02],
      ramp: "lo",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "paper.bail.rod",
      allowOverlap: ["paper.bail.rod", "paper.sheet"],
      detail: true
    });
  });

  // A carriage rack has the same fine pitch used by the visible character feed control.
  const rackWidth = 3.08;
  reg.part("carriage.escapement.rack", new THREE.BoxGeometry(rackWidth, 0.055, 0.12), {
    parent: carriage,
    pos: [0, 1.30, -0.25],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "carriage.frame",
    allowOverlap: ["carriage.frame", "escapement.wheel", "escapement.pawl"],
    detail: true
  });
  const teethCount = Math.floor(rackWidth / SPEC.carriagePitch);
  for (let i = 0; i <= teethCount; i++) {
    reg.part(`carriage.rack.tooth.${i}`, new THREE.BoxGeometry(SPEC.carriagePitch * 0.42, 0.045, 0.12), {
      parent: carriage,
      pos: [-rackWidth * 0.5 + i * SPEC.carriagePitch, 1.345, -0.25],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "carriage.escapement.rack",
      allowOverlap: ["carriage.escapement.rack"],
      detail: true
    });
  }

  const returnLever = reg.group("carriage.returnLever", {
    parent: carriage,
    pos: [-1.32, 1.62, -0.74],
    stage: "mechanism"
  });
  reg.part("carriage.returnLever.arm", new THREE.BoxGeometry(0.075, 0.48, 0.08), {
    parent: returnLever,
    pos: [-0.03, 0.20, 0.29],
    rot: [-0.22, 0, -0.08],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "carriage.end.left",
    allowOverlap: ["carriage.end.left", "carriage.frame"]
  });
  reg.part("carriage.returnLever.grip", buildCylinderGeometry(0.085, 0.075, 0.22, { axis: "x", segments: 18 }), {
    parent: returnLever,
    pos: [-0.03, 0.44, 0.40],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "carriage.returnLever.arm",
    allowOverlap: ["carriage.returnLever.arm"],
    detail: true
  });
  let returnArmed = true;
  reg.interactable("carriage.returnLever", {
    cursor: "grab",
    hint: "Drag the carriage-return lever to release the escapement and feed a new line",
    onDrag: ({ dy, fireTrigger }) => {
      if (dy > 2 && returnArmed) {
        fireTrigger("return");
        returnArmed = false;
      } else if (dy < -2) returnArmed = true;
    }
  });

  // Four-row keyboard with 45 type actions plus two shifts, backspace, and a full-width spacebar.
  const keyboard = reg.group("keyboard.assembly", {
    parent: baseGroup,
    pos: [0, SPEC.keyboardY, SPEC.keyboardZ],
    rot: [0.10, 0, 0],
    stage: "mechanism"
  });
  const keyGroups = new Map();
  ACTIVE_KEYS.forEach((key, index) => {
    keyGroups.set(key.id, addKey(reg, keyboard, key));
    const lever = reg.group(`keyboard.action.${key.id}`, {
      parent: keyboard,
      pos: [key.x, -0.055, key.z],
      stage: "mechanism"
    });
    reg.part(`keyboard.action.lever.${key.id}`, new THREE.BoxGeometry(0.032, 0.025, 0.43), {
      parent: lever,
      pos: [0, 0, -0.18],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      mountOn: "case.keyboard.deck",
      allowOverlap: ["case.keyboard.deck"],
      detail: true
    });
    reg.part(`keyboard.action.pivot.${key.id}`, buildCylinderGeometry(0.024, 0.024, 0.075, { axis: "x", segments: 10 }), {
      parent: lever,
      pos: [0, 0, -0.14],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "case.keyboard.deck",
      allowOverlap: [`keyboard.action.lever.${key.id}`, "case.keyboard.deck"],
      detail: true
    });

    const selectedSlot = TYPEBAR_SLOTS.find((slot) => slot.keyIndex === index);
    const swing = reg.groups.get(`typebar.swing.${selectedSlot.slotIndex}`)?.group;
    const startLocal = keyboard.localToWorld(new THREE.Vector3(key.x, -0.055, key.z - 0.38));
    const endLocal = swing ? swing.localToWorld(new THREE.Vector3(0, -0.16, 0)) : new THREE.Vector3(selectedSlot.barX, 0.94, SPEC.basketZ + 0.1);
    const actionLink = addLink(reg, `keyboard.action.link.${key.id}`, baseGroup, startLocal, endLocal, 0.008, {
      mountOn: "case.keyboard.deck",
      ramp: "brass",
      allowOverlap: [`typebar.tail.${selectedSlot.slotIndex}`]
    });
    actionLink.userData.keyIndex = index;

    let armed = true;
    reg.interactable(`keyboard.key.${key.id}`, {
      cursor: "pointer",
      hint: `Press ${key.label} to swing its paired typebar into the ribbon and paper`,
      onDrag: ({ dy, fireTrigger }) => {
        if (dy > 2 && armed) {
          selectTypeKey(index);
          fireTrigger("strike");
          armed = false;
        } else if (dy < -2) armed = true;
      }
    });
  });

  const specialKeys = [
    { id: "shift-left", label: "SHIFT", shifted: "", x: -1.37, z: 0.39, trigger: "shift", width: 0.31, depth: 0.18, style: "bar" },
    { id: "shift-right", label: "SHIFT", shifted: "", x: 1.37, z: 0.39, trigger: "shift", width: 0.31, depth: 0.18, style: "bar" },
    { id: "backspace", label: "BS", shifted: "", x: 1.48, z: -0.39, trigger: "backspace", width: 0.26, depth: 0.18, style: "bar" },
    { id: "space", label: "SPACE", shifted: "", x: 0, z: 0.69, trigger: "space", width: 1.28, depth: 0.16, style: "bar" }
  ];
  specialKeys.forEach((key) => {
    const group = addKey(reg, keyboard, key, { width: key.width, depth: key.depth, style: key.style });
    let armed = true;
    reg.interactable(`keyboard.key.${key.id}`, {
      cursor: "pointer",
      hint: key.trigger === "shift" ? "Shift the platen to select the alternate type face" : `Press ${key.label} to operate the ${key.trigger} mechanism`,
      onDrag: ({ dy, fireTrigger }) => {
        if (dy > 2 && armed) {
          fireTrigger(key.trigger);
          armed = false;
        } else if (dy < -2) armed = true;
      }
    });
    keyGroups.set(key.id, group);
  });

  // Exposed keylever fulcrum shafts and one pull-link per type action make the force path legible.
  [-0.40, -0.14, 0.12, 0.38].forEach((z, i) => {
    reg.part(`keyboard.fulcrum.${i}`, buildCylinderGeometry(0.018, 0.018, 2.82, { axis: "x", segments: 12 }), {
      parent: keyboard,
      pos: [0, -0.04, z - 0.16],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "case.keyboard.deck",
      allowOverlap: ["case.keyboard.deck"],
      detail: true
    });
  });
  baseGroup.updateMatrixWorld(true);

  // Ribbon spools sit outboard at the print line; three collinear strips meet at the lifting vibrator.
  const leftSpool = addSpool(reg, baseGroup, "left");
  const rightSpool = addSpool(reg, baseGroup, "right");
  reg.part("ribbon.band.left", new THREE.BoxGeometry(1.95, 0.070, 0.010), {
    parent: baseGroup,
    pos: [-1.125, SPEC.platenY, SPEC.ribbonZ],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "ribbon.spool.body.left",
    allowOverlap: ["ribbon.spool.body.left", "ribbon.band.center"],
    detail: true
  });
  reg.part("ribbon.band.right", new THREE.BoxGeometry(1.95, 0.070, 0.010), {
    parent: baseGroup,
    pos: [1.125, SPEC.platenY, SPEC.ribbonZ],
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "ribbon.spool.body.right",
    allowOverlap: ["ribbon.spool.body.right", "ribbon.band.center"],
    detail: true
  });
  const ribbonLift = reg.group("ribbon.lift", {
    parent: baseGroup,
    pos: [0, SPEC.platenY, SPEC.ribbonZ],
    stage: "mechanism"
  });
  reg.part("ribbon.band.center", new THREE.BoxGeometry(0.30, 0.070, 0.010), {
    parent: ribbonLift,
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    mountOn: "ribbon.band.left",
    allowOverlap: ["ribbon.band.left", "ribbon.band.right", "ribbon.vibrator"],
    detail: true
  });
  [-1, 1].forEach((sign, i) => {
    reg.part(`ribbon.vibrator.guide.${i}`, buildCylinderGeometry(0.018, 0.018, 0.17, { axis: "y", segments: 10 }), {
      parent: ribbonLift,
      pos: [sign * 0.13, -0.09, 0],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "ribbon.vibrator",
      allowOverlap: ["ribbon.band.center"],
      detail: true
    });
  });
  reg.part("ribbon.vibrator", new THREE.BoxGeometry(0.34, 0.035, 0.025), {
    parent: ribbonLift,
    pos: [0, -0.075, 0],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "ribbon.band.center",
    allowOverlap: ["ribbon.band.center", "ribbon.vibrator.guide.0", "ribbon.vibrator.guide.1"],
    detail: true
  });

  // A fixed frame, star wheel, and pawl make the escapement visible at the rack's right-hand engagement point.
  reg.part("escapement.frame", new THREE.BoxGeometry(0.13, 1.06, 0.17), {
    parent: baseGroup,
    pos: [1.04, 0.88, -0.25],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "case.body",
    allowOverlap: ["case.body", "escapement.wheel", "escapement.pawl.group"]
  });
  const escapementWheel = buildExternalGearGeometry(0.16, 36, 0.010, 0.032, 0.07);
  reg.part("escapement.wheel", escapementWheel, {
    parent: baseGroup,
    pos: [1.04, 1.42, -0.25],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "escapement.frame",
    allowOverlap: ["escapement.frame", "escapement.pawl.group", "carriage.escapement.rack", "carriage.rack.tooth.0"],
    detail: true
  });
  const pawl = reg.group("escapement.pawl.group", {
    parent: baseGroup,
    pos: [1.04, 1.51, -0.16],
    stage: "mechanism"
  });
  reg.part("escapement.pawl", new THREE.BoxGeometry(0.31, 0.045, 0.055), {
    parent: pawl,
    pos: [-0.06, 0, 0],
    rot: [0, 0, -0.19],
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    mountOn: "escapement.frame",
    allowOverlap: ["escapement.frame", "escapement.wheel", "carriage.escapement.rack"],
    detail: true
  });
  reg.part("escapement.pawl.tip", buildCylinderGeometry(0.023, 0.023, 0.09, { axis: "z", segments: 12 }), {
    parent: pawl,
    pos: [-0.19, -0.02, -0.05],
    ramp: "brass",
    outline: "lo",
    crease: "faint",
    mountOn: "escapement.pawl",
    allowOverlap: ["escapement.wheel", "carriage.escapement.rack"],
    detail: true
  });

  // Connect the visible return lever to the fixed pawl and register useful physical anchors.
  reg.anchor("carriage.platen.center", 0, SPEC.platenY, SPEC.platenZ, carriage, { dir: [0, 0, 1] });
  reg.anchor("carriage.paper.center", 0, SPEC.platenY + 0.40, SPEC.platenZ - SPEC.platenRadius - 0.012, carriage, { dir: [0, 0, 1] });
  reg.anchor("carriage.return.handle", 0, 0.44, 0.34, returnLever, { dir: [0, 1, 0] });
  reg.anchor("ribbon.print.point", 0, 0, 0, ribbonLift, { dir: [0, 0, 1] });
  reg.anchor("escapement.pawl.tip", -0.19, -0.02, -0.05, pawl, { dir: [0, 0, -1] });
  reg.anchor("escapement.wheel.center", 1.04, 1.42, -0.25, baseGroup, { dir: [0, 0, 1] });
  reg.tag("tag-paper", "PLATEN · PAPER · RIBBON", 0, SPEC.platenY + 1.13, SPEC.platenZ - SPEC.platenRadius);

  void leftSpool;
  void rightSpool;
  void ANCHORS;
  updateKinematics(reg, { params: { column: 0 }, triggers: {}, triggerAges: {} });
}

function ease01(x) {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export function updateKinematics(reg, state) {
  const triggers = state.triggers || {};
  const triggerAges = state.triggerAges || {};
  const params = state.params || {};
  const strike = triggers.strike ?? 0;
  const space = triggers.space ?? 0;
  const backspace = triggers.backspace ?? 0;
  const linefeed = triggers.linefeed ?? 0;
  const returning = triggers.return ?? 0;
  const shifted = isShifted();
  const selected = getSelectedTypeKey();
  const selectedSlot = TYPEBAR_SLOTS.find((slot) => slot.keyIndex === ACTIVE_KEYS.indexOf(selected));
  const column = Math.max(0, Math.min(SPEC.maxColumn, Number(params.column ?? 0)));

  // Return spring travel is eased across the full row instead of teleporting the carriage.
  const returnAge = triggerAges.return ?? 999;
  const returnT = returnAge < 0.72 ? ease01(returnAge / 0.58) : 1;
  const movingColumn = returnAge < 0.72
    ? getReturnStartColumn() * (1 - returnT)
    : column;
  const carriage = reg.groups.get("carriage.assembly")?.group;
  if (carriage) {
    carriage.position.x = SPEC.carriageStartX + movingColumn * SPEC.carriagePitch;
    carriage.position.y = shifted ? SPEC.shiftDistance : 0;
  }

  TYPEBAR_SLOTS.forEach((slot) => {
    const swing = reg.groups.get(`typebar.swing.${slot.slotIndex}`)?.group;
    if (!swing) return;
    const axis = new THREE.Vector3(...swing.userData.strikeAxis).normalize();
    const restQuaternion = new THREE.Quaternion(...swing.userData.restQuaternion);
    const pulse = slot.keyIndex === ACTIVE_KEYS.indexOf(selected) ? strike : 0;
    const turn = new THREE.Quaternion().setFromAxisAngle(axis, swing.userData.strikeAngle * pulse);
    swing.quaternion.copy(turn).multiply(restQuaternion);
  });

  for (const key of ACTIVE_KEYS) {
    const group = reg.groups.get(`keyboard.key.${key.id}`)?.group;
    if (!group) continue;
    const keyPulse = selected.id === key.id ? strike : 0;
    group.position.y = 0.115 - 0.040 * keyPulse;
    const lever = reg.groups.get(`keyboard.action.${key.id}`)?.group;
    if (lever) lever.rotation.x = -0.035 * keyPulse;
  }
  const spaceKey = reg.groups.get("keyboard.key.space")?.group;
  if (spaceKey) spaceKey.position.y = 0.115 - 0.038 * space;
  const shiftLeft = reg.groups.get("keyboard.key.shift-left")?.group;
  const shiftRight = reg.groups.get("keyboard.key.shift-right")?.group;
  if (shiftLeft) shiftLeft.position.y = 0.115 - 0.035 * (shifted ? 1 : 0);
  if (shiftRight) shiftRight.position.y = 0.115 - 0.035 * (shifted ? 1 : 0);
  const backspaceKey = reg.groups.get("keyboard.key.backspace")?.group;
  if (backspaceKey) backspaceKey.position.y = 0.115 - 0.035 * backspace;

  // Keep every action pull-link physically connected to the moving typebar tail.
  const keyboard = reg.groups.get("keyboard.assembly")?.group;
  if (keyboard) keyboard.updateMatrixWorld(true);
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  baseGroup.updateMatrixWorld(true);
  ACTIVE_KEYS.forEach((key, keyIndex) => {
    const slot = TYPEBAR_SLOTS.find((entry) => entry.keyIndex === keyIndex);
    const swing = reg.groups.get(`typebar.swing.${slot.slotIndex}`)?.group;
    const link = reg.parts.get(`keyboard.action.link.${key.id}`)?.group;
    if (!keyboard || !swing || !link) return;
    const start = keyboard.localToWorld(new THREE.Vector3(key.x, -0.055, key.z - 0.38));
    const end = swing.localToWorld(new THREE.Vector3(0, -0.16, 0));
    const delta = end.clone().sub(start);
    link.position.copy(start.add(end).multiplyScalar(0.5));
    link.quaternion.setFromUnitVectors(MECHANISM_UP, delta.clone().normalize());
    link.scale.y = Math.max(0.2, delta.length() / (link.userData.baseLength || delta.length()));
  });

  const lift = reg.groups.get("ribbon.lift")?.group;
  if (lift) lift.position.y = SPEC.platenY + 0.075 * strike;
  const pawl = reg.groups.get("escapement.pawl.group")?.group;
  if (pawl) pawl.rotation.z = -0.15 * Math.max(strike, space, backspace);
  const returnLever = reg.groups.get("carriage.returnLever")?.group;
  if (returnLever) returnLever.rotation.z = -0.18 * returning;

  const platen = reg.parts.get("carriage.platen")?.group;
  if (platen) platen.rotation.x = -(getLineCount() * PAPER_LINE_PITCH) / SPEC.platenRadius;
  if (paperMeshRef) paperMeshRef.position.y = getLineCount() * PAPER_LINE_PITCH;
  const wheel = reg.parts.get("escapement.wheel")?.group;
  if (wheel) wheel.rotation.z = (column * SPEC.carriagePitch) / 0.16;

  const leftSpool = reg.groups.get("ribbon.spool.left")?.group;
  const rightSpool = reg.groups.get("ribbon.spool.right")?.group;
  if (leftSpool) leftSpool.rotation.y = column * 0.12;
  if (rightSpool) rightSpool.rotation.y = -column * 0.12;

  if (paperTexture) {
    const currentText = `${getTypedText()}|${getLineCount()}`;
    if (currentText !== previousPaperText) {
      drawPaper();
      previousPaperText = currentText;
    }
  }
}
