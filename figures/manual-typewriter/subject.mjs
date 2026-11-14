import * as THREE from "three";
import { buildCylinderGeometry } from "../../kit/primitives.mjs";
import { ANCHORS, SPEC, TYPEBAR_SLOTS } from "./model.mjs";

const TYPEBAR_UP = new THREE.Vector3(0, 1, 0);
const STRIKE_ANGLE = 0.48;
const strikeTarget = new THREE.Vector3(0, SPEC.platenY, SPEC.strikeZ);

function getTypebarPose(slot) {
  const xRatio = slot.barX / 1.34;
  const pivot = new THREE.Vector3(
    slot.barX,
    SPEC.basketY + 0.018 * Math.cos(slot.row * 0.5),
    SPEC.basketZ + 0.17 * (1 - xRatio * xRatio) + (slot.row - 1.5) * 0.025
  );
  const strikeVector = strikeTarget.clone().sub(pivot);
  const length = strikeVector.length();
  const targetDirection = strikeVector.normalize();
  let axis = targetDirection.clone().cross(TYPEBAR_UP).normalize();
  if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
  const restDirection = targetDirection.clone().applyAxisAngle(axis, -STRIKE_ANGLE).normalize();
  const restQuaternion = new THREE.Quaternion().setFromUnitVectors(TYPEBAR_UP, restDirection);
  const strikeQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, STRIKE_ANGLE).multiply(restQuaternion);
  const upperCaseOffset = new THREE.Vector3(0, SPEC.shiftDistance, 0).applyQuaternion(strikeQuaternion.clone().invert());
  return { pivot, length, axis, restDirection, restQuaternion, upperCaseOffset };
}

export function buildSubject(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;

  // The segment is a shallow curved steel basket rather than a single straight pivot shaft.
  const segmentPoints = [];
  for (let i = 0; i <= 14; i++) {
    const x = -1.40 + (2.80 * i) / 14;
    const ratio = x / 1.40;
    segmentPoints.push(new THREE.Vector3(x, SPEC.basketY, SPEC.basketZ + 0.17 * (1 - ratio * ratio)));
  }
  const segmentCurve = new THREE.CatmullRomCurve3(segmentPoints);
  reg.part("typebasket.segment", new THREE.TubeGeometry(segmentCurve, 48, 0.045, 10, false), {
    parent: baseGroup,
    ramp: "hi",
    outline: "mid",
    crease: "faint",
    noCrease: true,
    mountOn: "typebasket.rail",
    allowOverlap: ["typebasket.rail", "typebasket.guide.comb"],
    detail: true
  });

  // A lower comb keeps the returned bars in individual lanes; each lane has its own journal pin.
  reg.part("typebasket.guide.comb", new THREE.BoxGeometry(2.84, 0.075, 0.17), {
    parent: baseGroup,
    pos: [0, SPEC.basketY - 0.12, SPEC.basketZ + 0.10],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "typebasket.mount.left",
    allowOverlap: ["typebasket.mount.right"]
  });

  TYPEBAR_SLOTS.forEach((slot) => {
    const { pivot, length, axis, restDirection, restQuaternion, upperCaseOffset } = getTypebarPose(slot);
    const id = slot.slotIndex;
    const swing = reg.group(`typebar.swing.${id}`, {
      parent: baseGroup,
      pos: pivot.toArray(),
      stage: "subject"
    });
    swing.quaternion.copy(restQuaternion);
    swing.userData.strikeAxis = axis.toArray();
    swing.userData.restQuaternion = restQuaternion.toArray();
    swing.userData.strikeAngle = STRIKE_ANGLE;
    swing.userData.keyIndex = slot.keyIndex;

    const rodGeometry = buildCylinderGeometry(0.014, 0.020, length, { axis: "y", segments: 10 });
    rodGeometry.translate(0, length * 0.5, 0);
    reg.part(`typebar.rod.${id}`, rodGeometry, {
      parent: swing,
      ramp: id === Math.floor(TYPEBAR_SLOTS.length / 2) ? "lit" : "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      outlineWidth: 0.010,
      mountOn: "typebasket.segment",
      allowOverlap: ["typebasket.segment", "typebasket.rail", `typebar.pivot.${id}`, `typebar.head.${id}`],
      detail: true
    });

    // The paired upper/lower-case type slugs are mounted on the bar tip and strike the same print point.
    reg.part(`typebar.head.${id}`, new THREE.BoxGeometry(0.105, 0.050, 0.095), {
      parent: swing,
      pos: [0, length - 0.025, 0],
      ramp: id === Math.floor(TYPEBAR_SLOTS.length / 2) ? "lit" : "hi",
      outline: "mid",
      crease: "faint",
      outlineWidth: 0.010,
      mountOn: `typebar.rod.${id}`,
      allowOverlap: [`typebar.rod.${id}`, "paper.sheet", "ribbon.band.center", "carriage.platen"],
      detail: true
    });
    const tailGeometry = buildCylinderGeometry(0.012, 0.015, 0.18, { axis: "y", segments: 8 });
    tailGeometry.translate(0, -0.09, 0);
    reg.part(`typebar.tail.${id}`, tailGeometry, {
      parent: swing,
      ramp: "hi",
      outline: "lo",
      crease: "faint",
      noCrease: true,
      mountOn: "typebasket.segment",
      allowOverlap: ["typebasket.segment", `typebar.rod.${id}`],
      detail: true
    });
    [new THREE.Vector3(0, length, 0), new THREE.Vector3(0, length, 0).add(upperCaseOffset)].forEach((slugPos, faceIndex) => {
      reg.part(`typebar.slug.${id}.${faceIndex}`, new THREE.BoxGeometry(0.034, 0.008, 0.024), {
        parent: swing,
        pos: slugPos.toArray(),
        ramp: "lo",
        outline: "lo",
        crease: "faint",
        mountOn: `typebar.head.${id}`,
        allowOverlap: [`typebar.head.${id}`],
        detail: true
      });
    });

    reg.part(`typebar.pivot.${id}`, buildCylinderGeometry(0.025, 0.025, 0.085, { axis: "x", segments: 12 }), {
      parent: baseGroup,
      pos: pivot.toArray(),
      ramp: "brass",
      outline: "lo",
      crease: "faint",
      mountOn: "typebasket.segment",
      allowOverlap: ["typebasket.segment", "typebasket.rail", `typebar.rod.${id}`],
      detail: true
    });
    reg.part(`typebar.guide.${id}`, new THREE.BoxGeometry(0.022, 0.11, 0.11), {
      parent: baseGroup,
      pos: [pivot.x, SPEC.basketY - 0.10, pivot.z + 0.10],
      ramp: "mid",
      outline: "lo",
      crease: "faint",
      mountOn: "typebasket.guide.comb",
      allowOverlap: ["typebasket.guide.comb", `typebar.rod.${id}`],
      detail: true
    });
    if ([0, Math.floor(TYPEBAR_SLOTS.length / 2), TYPEBAR_SLOTS.length - 1].includes(id)) {
      reg.anchor(`typebar.pivot.${id}`, pivot.x, pivot.y, pivot.z, baseGroup, { dir: axis.toArray() });
    }
  });

  // Small visual return springs flank the segment; these show the bars' spring-return bias.
  [-1, 1].forEach((sign) => {
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const y = 0.98 + t * 0.20;
      const x = sign * (1.27 + 0.025 * Math.sin(t * Math.PI * 8));
      points.push(new THREE.Vector3(x, y, 0.18));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const spring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), kit.lineMaterials.mid);
    reg.detail(`typebar.return.spring.${sign < 0 ? "left" : "right"}`, spring, { parent: baseGroup, stage: "subject" });
  });

  reg.anchor("typebar.print.point", ...ANCHORS.printPoint, baseGroup, { dir: [0, 0, -1] });
}
