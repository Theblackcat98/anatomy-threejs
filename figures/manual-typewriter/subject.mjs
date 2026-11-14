import * as THREE from "three";
import { buildCylinderGeometry } from "../../kit/primitives.mjs";
import { ANCHORS } from "./model.mjs";

const TYPEBAR_COUNT = 7;
const TYPEBAR_LENGTH = 0.85;
const TYPEBAR_XS = Array.from({ length: TYPEBAR_COUNT }, (_, i) => (i - (TYPEBAR_COUNT - 1) / 2) * 0.30);

export function buildSubject(reg) {
  const subject = reg.group("typebars.assembly", { stage: "subject" });

  // A visible fan of seven typebars pivots from one common basket rail toward the platen.
  TYPEBAR_XS.forEach((x, i) => {
    const pivot = reg.group(`typebar.pivot.${i}`, {
      parent: subject,
      pos: [x, ANCHORS.typebasketCenter[1], ANCHORS.typebasketCenter[2]],
      rot: [0, (i - 3) * 0.035, 0],
      stage: "subject"
    });
    const swing = reg.group(`typebar.swing.${i}`, {
      parent: pivot,
      rot: [-0.14, 0, 0],
      stage: "subject"
    });

    const rodGeo = buildCylinderGeometry(0.026, 0.032, TYPEBAR_LENGTH, { axis: "y", segments: 14 });
    rodGeo.translate(0, TYPEBAR_LENGTH * 0.5, 0);
    reg.part(`typebar.rod.${i}`, rodGeo, {
      parent: swing,
      ramp: "lit",
      outline: "hi",
      crease: "faint",
      noCrease: true,
      outlineWidth: 0.012,
      mountOn: "typebasket.rail",
      allowOverlap: [`typebar.head.${i}`, "typebars.axis"],
      detail: true
    });

    reg.part(`typebar.head.${i}`, new THREE.BoxGeometry(0.115, 0.09, 0.055), {
      parent: swing,
      pos: [0, TYPEBAR_LENGTH, 0],
      ramp: "lit",
      outline: "hi",
      crease: "faint",
      outlineWidth: 0.012,
      mountOn: `typebar.rod.${i}`,
      allowOverlap: [`typebar.rod.${i}`, "carriage.platen"],
      detail: true
    });
    reg.anchor(`typebar.tip.${i}`, 0, TYPEBAR_LENGTH, 0, swing, { dir: [0, 0, -1] });
  });

  // The basket pivot shaft and its journals are brass so the working typebars remain the focal channel.
  reg.part("typebars.axis", buildCylinderGeometry(0.032, 0.032, 2.30, { axis: "x", segments: 18 }), {
    parent: subject,
    pos: [0, ANCHORS.typebasketCenter[1], ANCHORS.typebasketCenter[2]],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "typebasket.rail",
    allowOverlap: TYPEBAR_XS.map((_, i) => `typebar.rod.${i}`),
    detail: true
  });

  TYPEBAR_XS.forEach((x, i) => {
    reg.part(`typebar.pin.${i}`, buildCylinderGeometry(0.037, 0.037, 0.07, { axis: "x", segments: 12 }), {
      parent: subject,
      pos: [x, ANCHORS.typebasketCenter[1], ANCHORS.typebasketCenter[2]],
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "typebars.axis",
      allowOverlap: ["typebars.axis", `typebar.rod.${i}`],
      detail: true
    });
  });

  reg.anchor("typebar.home", 0, TYPEBAR_LENGTH, 0, reg.groups.get("typebar.swing.3")?.group || subject, { dir: [0, 0, -1] });
}
