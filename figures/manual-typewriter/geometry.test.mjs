import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Recorder3D } from "../../kit/registry.mjs";
import { createShaderKit } from "../../kit/shaders.mjs";
import { ACTIVE_KEYS, TYPEBAR_SLOTS, SPEC, selectTypeKey } from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics } from "./mechanism.mjs";

function fixture() {
  const root = new THREE.Group();
  const kit = createShaderKit();
  const reg = new Recorder3D(root, kit);
  for (const [stage, build] of [["base", buildBase], ["structure", buildStructure], ["subject", buildSubject], ["mechanism", buildMechanism]]) {
    reg.setStage(stage);
    build(reg, kit);
  }
  return { root, reg };
}

function close(actual, expected, message) {
  assert.ok(actual.distanceTo(expected) < 1e-6, `${message}: error ${actual.distanceTo(expected)}`);
}

test("action links stay attached in the parent frame through orbit and strike", () => {
  const { root, reg } = fixture();
  const base = reg.groups.get("base.group").group;
  const keyboard = reg.groups.get("keyboard.assembly").group;
  const transforms = [[0, 0, 0], [Math.PI / 6, -Math.PI / 5, 0], [0, Math.PI / 2, 0], [0, Math.PI, 0], [Math.PI / 2, 0, 0]];
  for (const rotation of transforms) {
    root.rotation.set(...rotation);
    root.position.set(0.4, -0.2, 0.1);
    root.scale.setScalar(1.3);
    for (const [keyIndex, strike] of [[0, 0], [0, 1], [22, 0.6], [ACTIVE_KEYS.length - 1, 1]]) {
      selectTypeKey(keyIndex);
      updateKinematics(reg, { params: { column: 16 }, triggers: { strike }, triggerAges: {} });
      root.updateMatrixWorld(true);
      for (const [index, key] of ACTIVE_KEYS.entries()) {
        const slot = TYPEBAR_SLOTS.find((entry) => entry.keyIndex === index);
        const swing = reg.groups.get(`typebar.swing.${slot.slotIndex}`).group;
        const link = reg.parts.get(`keyboard.action.link.${key.id}`).group;
        const half = link.userData.baseLength / 2;
        const actualStart = link.localToWorld(new THREE.Vector3(0, -half, 0));
        const actualEnd = link.localToWorld(new THREE.Vector3(0, half, 0));
        const expectedStart = keyboard.localToWorld(new THREE.Vector3(key.x, -0.055, key.z - 0.38));
        const expectedEnd = swing.localToWorld(new THREE.Vector3(0, -0.16, 0));
        close(actualStart, expectedStart, `${key.id} keylever endpoint`);
        close(actualEnd, expectedEnd, `${key.id} typebar endpoint`);
        for (const point of [actualStart, actualEnd]) {
          const local = base.worldToLocal(point.clone());
          assert.ok(local.y > SPEC.caseTopY, `${key.id} clears the lower casting`);
          assert.ok(local.z < SPEC.BASE_D / 2 && local.z > -SPEC.BASE_D / 2, `${key.id} stays inside the base footprint`);
        }
      }
    }
  }
});

test("the base contains no plaque, rivets, or orphan plaque label", () => {
  const { reg } = fixture();
  assert.ok(![...reg.parts.keys()].some((id) => id.startsWith("base.plaque")));
  assert.ok(!reg.tags.has("tag-plate"));
  assert.ok(!reg.joints.has("plaque.center"));
});
