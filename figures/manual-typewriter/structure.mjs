import * as THREE from "three";
import {
  buildCylinderGeometry,
  buildEnclosureBoxGeometry,
  makeScrewDetail
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildStructure(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const { CASE_W, CASE_D, CASE_H, caseFloorY, caseTopY, topSurfaceY } = SPEC;

  // Open-top, open-front chassis leaves the manual mechanism visible by design.
  reg.part("cabinet.shell", buildEnclosureBoxGeometry(CASE_W, CASE_H, CASE_D, 0.14, {
    openTop: true,
    centerY: false
  }), {
    parent: baseGroup,
    pos: [0, caseFloorY, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "base.plate",
    allowOverlap: ["case.operatorPanel", "case.keyboard.deck", "case.side.cap.left", "case.side.cap.right"]
  });

  // A shallow front face gives the appliance body its characteristic cast-shell silhouette.
  reg.part("case.operatorPanel", new THREE.BoxGeometry(CASE_W - 0.34, 0.34, 0.10), {
    parent: baseGroup,
    pos: [0, caseFloorY + 0.34, CASE_D * 0.5 - 0.025],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "cabinet.shell",
    cutawayHide: true,
    allowOverlap: ["cabinet.shell", "case.side.cap.left", "case.side.cap.right"]
  });

  // Narrow side caps and the deck frame create a recognizable stepped case profile.
  [-1, 1].forEach((sign) => {
    const sideId = sign < 0 ? "left" : "right";
    reg.part(`case.side.cap.${sideId}`, new THREE.BoxGeometry(0.12, 0.48, 1.12), {
      parent: baseGroup,
      pos: [sign * (CASE_W * 0.5 - 0.16), caseTopY - 0.25, 0.28],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      mountOn: "cabinet.shell",
      allowOverlap: ["cabinet.shell", "case.keyboard.deck"]
    });
  });

  // Keyboard shelf and its raised rear lip; the key rows are added in Stage 5.
  reg.part("case.keyboard.deck", new THREE.BoxGeometry(3.82, 0.13, 1.22), {
    parent: baseGroup,
    pos: [0, caseTopY + 0.055, 0.58],
    rot: [0.10, 0, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "cabinet.shell",
    allowOverlap: ["cabinet.shell", "case.side.cap.left", "case.side.cap.right"]
  });
  reg.part("case.keyboard.lip", new THREE.BoxGeometry(3.70, 0.10, 0.12), {
    parent: baseGroup,
    pos: [0, caseTopY + 0.12, 0.03],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "case.keyboard.deck"
  });

  // Typebar basket saddle and posts: a straight pivot line above the keyboard.
  [-1.55, 1.55].forEach((x, i) => {
    reg.part(`typebasket.post.${i}`, new THREE.BoxGeometry(0.18, 0.40, 0.18), {
      parent: baseGroup,
      pos: [x, 1.08, -0.22],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "cabinet.shell",
      allowOverlap: ["cabinet.shell"]
    });
  });
  reg.part("typebasket.rail", buildCylinderGeometry(0.07, 0.07, 3.24, { axis: "x", segments: 24 }), {
    parent: baseGroup,
    pos: [0, ANCHORS.typebasketCenter[1], ANCHORS.typebasketCenter[2]],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "typebasket.post.0",
    allowOverlap: ["typebasket.post.1"]
  });

  // Fixed upright bearing stands carry the moving platen carriage over the rear of the case.
  [-1, 1].forEach((sign, i) => {
    const sideId = sign < 0 ? "left" : "right";
    reg.part(`carriage.stand.${sideId}`, new THREE.BoxGeometry(0.18, 0.62, 0.42), {
      parent: baseGroup,
      pos: [sign * 1.76, 1.20, SPEC.platenZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "cabinet.shell",
      allowOverlap: ["cabinet.shell"]
    });
    reg.detail(`carriage.stand.screw.${i}`, makeScrewDetail(sign * 1.76, caseTopY + 0.004, SPEC.platenZ + 0.1, 0.045, "y", kit), { parent: baseGroup });
  });

  // The carriage travels on two polished rods; all moving roller, paper, and end pieces sit above them.
  [
    { id: "front", z: SPEC.platenZ + 0.18 },
    { id: "rear", z: SPEC.platenZ - 0.18 }
  ].forEach(({ id, z }) => {
    reg.part(`carriage.rail.${id}`, buildCylinderGeometry(0.047, 0.047, 4.80, { axis: "x", segments: 20 }), {
      parent: baseGroup,
      pos: [0, 1.55, z],
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: `carriage.stand.left`,
      allowOverlap: [`carriage.rail.${id === "front" ? "rear" : "front"}`, "carriage.stand.right"]
    });
  });

  // Fixed margin stops and line-feed support on the case’s right shoulder.
  [-1, 1].forEach((sign, i) => {
    reg.part(`carriage.stop.${i}`, new THREE.BoxGeometry(0.12, 0.16, 0.28), {
      parent: baseGroup,
      pos: [sign * 2.34, 1.60, SPEC.platenZ],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "carriage.rail.front",
      allowOverlap: ["carriage.rail.front", "carriage.rail.rear"]
    });
  });

  reg.part("case.ribbon.well", new THREE.BoxGeometry(2.22, 0.10, 0.26), {
    parent: baseGroup,
    pos: [0, 1.02, 0.18],
    ramp: "lo",
    outline: "lo",
    crease: "faint",
    mountOn: "case.keyboard.deck",
    allowOverlap: ["case.keyboard.deck"]
  });

  // Stage 3 anchors are exact world points in the fixed cabinet coordinate frame.
  reg.anchor("case.floor", 0, caseFloorY, 0, baseGroup);
  reg.anchor("typebasket.center", ...ANCHORS.typebasketCenter, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("platen.center", ...ANCHORS.platenCenter, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("carriage.rail.left", -2.34, 1.55, SPEC.platenZ + 0.18, baseGroup, { dir: [1, 0, 0] });
  reg.anchor("carriage.rail.right", 2.34, 1.55, SPEC.platenZ + 0.18, baseGroup, { dir: [-1, 0, 0] });
  reg.anchor("return.mount", ...ANCHORS.returnMount, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("keyboard.center", ...ANCHORS.keyboardCenter, baseGroup, { dir: [0, 1, 0] });
  reg.anchor("case.top", 0, caseTopY, 0, baseGroup);
  reg.anchor("base.top", 0, topSurfaceY, 0, baseGroup);
}
