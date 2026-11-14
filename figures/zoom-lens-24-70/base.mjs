import * as THREE from "three";
import {
  buildSlabGeometry,
  buildCylinderGeometry,
  makeScrewDetail,
  makeHaloMesh,
  makeDatumGrid
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });

  const {
    topSurfaceY,
    railBridgeHeight,
    railRodY,
    railRodOffsetZ,
    opticalAxisZ
  } = SPEC;

  const DECK_H = 0.08;
  const DECK_Y = topSurfaceY + DECK_H;

  // 1. Soft ground shadow halo + ultra-light datum grid (no heavy bedplate or corner feet)
  const haloMesh = makeHaloMesh(5.6, 2.8, 0.38, [0.22, topSurfaceY - 0.015, 0.10], kit);
  reg.detail("base.halo", haloMesh, { parent: baseGroup, stage: "base" });

  const datumGrid = makeDatumGrid(5.4, 2.6, 18, 10, topSurfaceY - 0.005, kit, "faint");
  datumGrid.position.set(0.22, 0, 0.10);
  reg.detail("base.datumGrid", datumGrid, { parent: baseGroup, stage: "base" });

  // Register mounting anchors on rail bridges and machined outriggers
  reg.anchor("base.top", ...ANCHORS.baseTop, baseGroup);
  reg.anchor("rail.bridge.front", ...ANCHORS.railBridgeFront, baseGroup);
  reg.anchor("rail.bridge.rear", ...ANCHORS.railBridgeRear, baseGroup);
  reg.anchor("cradle.front.mount", ...ANCHORS.cradleFrontMount, baseGroup);
  reg.anchor("cradle.rear.mount", ...ANCHORS.cradleRearMount, baseGroup);
  reg.anchor("sensor.tower.mount", ...ANCHORS.sensorTowerMount, baseGroup);
  reg.anchor("zoomRocker.mount", ...ANCHORS.zoomRockerMount, baseGroup);
  reg.anchor("usmCtrl.mount", ...ANCHORS.usmCtrlMount, baseGroup);
  reg.anchor("camScreen.mount", ...ANCHORS.camScreenMount, baseGroup);

  // 2. Front & Rear Optical Bench Rail Bridges (directly grounded on datum plane)
  const bridgeGeo = new THREE.BoxGeometry(0.32, railBridgeHeight, 0.98);
  const bridgePositions = [
    { name: "base.railBridge.front", x: ANCHORS.railBridgeFront[0] },
    { name: "base.railBridge.rear", x: ANCHORS.railBridgeRear[0] }
  ];

  bridgePositions.forEach((b) => {
    reg.part(b.name, bridgeGeo, {
      parent: baseGroup,
      pos: [b.x, topSurfaceY + railBridgeHeight * 0.5, opticalAxisZ],
      ramp: "mid",
      outline: "mid",
      crease: "lo",
      mountOn: "ground"
    });
    reg.detail(
      `${b.name}.screwR`,
      makeScrewDetail(b.x, topSurfaceY + railBridgeHeight + 0.002, opticalAxisZ - 0.36, 0.036, "y", kit),
      { parent: baseGroup }
    );
    reg.detail(
      `${b.name}.screwF`,
      makeScrewDetail(b.x, topSurfaceY + railBridgeHeight + 0.002, opticalAxisZ + 0.36, 0.036, "y", kit),
      { parent: baseGroup }
    );
  });

  // 3. Twin 15mm Precision Optical Matte-Steel Support Rods spanning bridges
  const rodLen = (ANCHORS.railBridgeRear[0] - ANCHORS.railBridgeFront[0]) + 0.44;
  const rodCenterX = (ANCHORS.railBridgeRear[0] + ANCHORS.railBridgeFront[0]) * 0.5;
  const rodGeo = buildCylinderGeometry(0.052, 0.052, rodLen, { segments: 20, axis: "x" });

  [
    { id: "R", z: opticalAxisZ - railRodOffsetZ },
    { id: "F", z: opticalAxisZ + railRodOffsetZ }
  ].forEach((rod) => {
    reg.part(`base.railRod.${rod.id}`, rodGeo, {
      parent: baseGroup,
      pos: [rodCenterX, railRodY, rod.z],
      ramp: "hi",
      outline: "mid",
      crease: "faint",
      mountOn: "base.railBridge.front",
      allowOverlap: ["base.railBridge.rear"]
    });
  });

  // 4. Compact Machined Outriggers for Servo Rocker, Spec Plaque, USM Dial & Monitor
  reg.part("base.outrigger.rocker", new THREE.BoxGeometry(0.46, DECK_H, 0.66), {
    parent: baseGroup,
    pos: [ANCHORS.zoomRockerMount[0], topSurfaceY + DECK_H * 0.5, 0.63],
    ramp: "mid",
    outline: "lo",
    crease: "lo",
    mountOn: "base.railBridge.front"
  });

  const clampGeo = new THREE.BoxGeometry(0.24, 0.16, 0.18);
  const frontRodZ = opticalAxisZ + railRodOffsetZ;

  reg.part("base.clamp.plaque", clampGeo, {
    parent: baseGroup,
    pos: [ANCHORS.plaqueCenter[0], topSurfaceY + 0.12, frontRodZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "base.railRod.F"
  });

  reg.part("base.outrigger.plaque", new THREE.BoxGeometry(1.18, DECK_H, 0.72), {
    parent: baseGroup,
    pos: [ANCHORS.plaqueCenter[0], topSurfaceY + DECK_H * 0.5, 0.56],
    ramp: "mid",
    outline: "lo",
    crease: "lo",
    mountOn: "base.clamp.plaque",
    allowOverlap: ["base.railRod.F"]
  });

  reg.part("base.clamp.usm", clampGeo, {
    parent: baseGroup,
    pos: [ANCHORS.usmCtrlMount[0], topSurfaceY + 0.12, frontRodZ],
    ramp: "mid",
    outline: "lo",
    crease: "faint",
    mountOn: "base.railRod.F"
  });

  reg.part("base.outrigger.usm", new THREE.BoxGeometry(0.72, DECK_H, 0.86), {
    parent: baseGroup,
    pos: [ANCHORS.usmCtrlMount[0], topSurfaceY + DECK_H * 0.5, 0.62],
    ramp: "mid",
    outline: "lo",
    crease: "lo",
    mountOn: "base.clamp.usm",
    allowOverlap: ["base.railRod.F"]
  });

  reg.part("base.outrigger.screen", new THREE.BoxGeometry(0.92, DECK_H, 0.62), {
    parent: baseGroup,
    pos: [2.02, topSurfaceY + DECK_H * 0.5, 0.61],
    ramp: "mid",
    outline: "lo",
    crease: "lo",
    mountOn: "base.railBridge.rear"
  });

  // 5. Compact Brass Spec Plaque
  const [pqX, , pqZ] = ANCHORS.plaqueCenter;
  const plaqueGeo = buildSlabGeometry(1.06, 0.36, 0.04, {
    radius: 0.05,
    bevel: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1
  });
  reg.part("base.plaque", plaqueGeo, {
    parent: baseGroup,
    pos: [pqX, DECK_Y + 0.04, pqZ],
    ramp: "brass",
    outline: "mid",
    crease: "lo",
    mountOn: "base.outrigger.plaque"
  });

  [
    [-0.44, -0.11],
    [ 0.44, -0.11],
    [-0.44,  0.11],
    [ 0.44,  0.11]
  ].forEach(([dx, dz], idx) => {
    reg.detail(
      `base.plaque.screw.${idx}`,
      makeScrewDetail(pqX + dx, DECK_Y + 0.042, pqZ + dz, 0.024, "y", kit),
      { parent: baseGroup }
    );
  });

  reg.tag("tag-plate", "24–70mm f/2.8 · CAM", pqX, DECK_Y + 0.06, pqZ + 0.02);
}
