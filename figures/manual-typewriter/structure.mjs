import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildStructure(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const { CASE_W, CASE_D, CASE_H, caseFloorY, caseTopY } = SPEC;

  // Shallow one-piece lower casting: open above and behind, not a tall cabinet shell.
  reg.part("case.body", new THREE.BoxGeometry(CASE_W, CASE_H, CASE_D), {
    parent: baseGroup,
    pos: [0, caseFloorY + CASE_H * 0.5, 0],
    ramp: "mid",
    outline: "hi",
    crease: "lo",
    outlineWidth: 0.018,
    mountOn: "base.plate",
    allowOverlap: ["case.operator.apron", "case.keyboard.deck", "case.keyboard.support.left", "case.keyboard.support.right", "carriage.frame"]
  });

  // Low front apron gives the casting its characteristic sloped shoulder without closing the mechanism.
  reg.part("case.operator.apron", new THREE.BoxGeometry(CASE_W - 0.18, 0.24, 0.12), {
    parent: baseGroup,
    pos: [0, caseFloorY + 0.14, CASE_D * 0.5 - 0.08],
    rot: [-0.18, 0, 0],
    ramp: "lo",
    outline: "mid",
    crease: "faint",
    mountOn: "case.body",
    allowOverlap: ["case.body", "case.keyboard.deck"]
  });

  // The keyboard is an inclined metal plate carried by two stanchions.
  [-1, 1].forEach((sign, i) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`case.keyboard.support.${side}`, new THREE.BoxGeometry(0.20, 0.34, 0.24), {
      parent: baseGroup,
      pos: [sign * 1.43, 0.42, 0.72],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "case.body",
      allowOverlap: ["case.body", "case.keyboard.deck"]
    });
    reg.detail(`case.keyboard.support.screw.${i}`, makeScrewDetail(sign * 1.43, caseTopY + 0.012, 0.72, 0.035, "y", kit), { parent: baseGroup, stage: "structure" });
  });

  reg.part("case.keyboard.deck", new THREE.BoxGeometry(3.30, 0.12, 1.46), {
    parent: baseGroup,
    pos: [0, 0.50, SPEC.keyboardZ],
    rot: [0.10, 0, 0],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "case.keyboard.support.left",
    allowOverlap: ["case.keyboard.support.right", "case.operator.apron", "keyboard.assembly"]
  });

  // Open cast side cheeks support the platen carriage outside its full travel envelope.
  [-1, 1].forEach((sign, i) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`frame.side.${side}`, new THREE.BoxGeometry(0.16, 1.26, 0.44), {
      parent: baseGroup,
      pos: [sign * 2.25, 0.91, -0.74],
      ramp: "mid",
      outline: "hi",
      crease: "lo",
      mountOn: "case.body",
      allowOverlap: ["case.body", `frame.carriage.bearing.${side}`, "typebasket.mount.left", "typebasket.mount.right"]
    });
    reg.part(`frame.carriage.bearing.${side}`, new THREE.BoxGeometry(0.21, 0.24, 0.50), {
      parent: baseGroup,
      pos: [sign * 2.25, 1.47, -0.74],
      ramp: "hi",
      outline: "mid",
      crease: "lo",
      mountOn: `frame.side.${side}`,
      allowOverlap: [`frame.side.${side}`, "carriage.rail.front", "carriage.rail.rear"]
    });
    reg.detail(`frame.carriage.bearing.screw.${i}`, makeScrewDetail(sign * 2.25, 1.47, -0.48, 0.035, "z", kit), { parent: baseGroup, stage: "structure" });
  });

  // Two polished guide rods carry the moving carriage; their axes are parallel to the platen.
  [
    { id: "front", z: -0.48 },
    { id: "rear", z: -1.00 }
  ].forEach(({ id, z }) => {
    reg.part(`carriage.rail.${id}`, buildCylinderGeometry(0.035, 0.035, 4.50, { axis: "x", segments: 24 }), {
      parent: baseGroup,
      pos: [0, 1.47, z],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "frame.carriage.bearing.left",
      allowOverlap: ["frame.carriage.bearing.right", `carriage.rail.${id === "front" ? "rear" : "front"}`]
    });
  });

  // Segment mounts establish a real pivot region immediately behind the keylevers.
  [-1, 1].forEach((sign) => {
    const side = sign < 0 ? "left" : "right";
    reg.part(`typebasket.mount.${side}`, new THREE.BoxGeometry(0.14, 0.96, 0.18), {
      parent: baseGroup,
      pos: [sign * 1.42, 0.835, SPEC.basketZ],
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      mountOn: "case.body",
      allowOverlap: [`frame.side.${side}`, "typebasket.rail", "typebasket.segment"]
    });
  });
  reg.part("typebasket.rail", buildCylinderGeometry(0.035, 0.035, 2.92, { axis: "x", segments: 20 }), {
    parent: baseGroup,
    pos: [0, SPEC.basketY, SPEC.basketZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: "typebasket.mount.left",
    allowOverlap: ["typebasket.mount.right", "typebasket.segment"]
  });

  // Shallow rear paper shelf and a short feed-table lip anchor the carriage paper path.
  reg.part("paper.feed.table", new THREE.BoxGeometry(2.90, 0.055, 0.38), {
    parent: baseGroup,
    pos: [0, 1.49, -1.15],
    ramp: "hi",
    outline: "lo",
    crease: "faint",
    mountOn: "carriage.rail.rear",
    allowOverlap: ["carriage.rail.rear", "carriage.frame", "paper.sheet"]
  });

  reg.anchor("case.floor", 0, caseFloorY, 0, baseGroup);
  reg.anchor("keyboard.deck.center", 0, 0.50, SPEC.keyboardZ, baseGroup, { dir: [0, 1, 0] });
  reg.anchor("typebasket.center", ...ANCHORS.typebasketCenter, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("platen.center", ...ANCHORS.platenCenter, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("print.point", ...ANCHORS.printPoint, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("carriage.rail.front.left", -1.86, 1.47, -0.48, baseGroup, { dir: [1, 0, 0] });
  reg.anchor("carriage.rail.front.right", 1.86, 1.47, -0.48, baseGroup, { dir: [-1, 0, 0] });
  reg.anchor("carriage.rail.rear.left", -1.86, 1.47, -1.00, baseGroup, { dir: [1, 0, 0] });
  reg.anchor("carriage.rail.rear.right", 1.86, 1.47, -1.00, baseGroup, { dir: [-1, 0, 0] });
  reg.anchor("ribbon.path.center", 0, SPEC.platenY, SPEC.ribbonZ, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("paper.path.front", 0, SPEC.platenY, SPEC.paperFrontZ, baseGroup, { dir: [0, 0, 1] });
  reg.anchor("base.top", 0, SPEC.topSurfaceY, 0, baseGroup);
  reg.anchor("plaque.center", ...ANCHORS.plaqueCenter, baseGroup);
}
