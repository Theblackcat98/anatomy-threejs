import * as THREE from "three";
import {
  makeDatumGrid,
  makeScrewDetail,
  makeRulerTicks,
  makeHaloMesh
} from "../../kit/primitives.mjs";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildBase(reg, kit) {
  const baseGroup = reg.group("base.group", { stage: "base" });

  const {
    topSurfaceY,
    railHeight,
    railCapHeight,
    railTopY,
    opticalAxisZ
  } = SPEC;

  // 1. Subtle ground shadow halo + minimal orthographic datum grid (no heavy bottom plate / 4 corner feet)
  const haloMesh = makeHaloMesh(4.6, 2.2, 0.55, [0.24, topSurfaceY - 0.04, 0.18], kit);
  reg.detail("base.halo", haloMesh, { parent: baseGroup, stage: "base" });

  const datumGrid = makeDatumGrid(4.9, 2.4, 12, 6, topSurfaceY - 0.005, kit, "faint");
  datumGrid.position.set(0.24, 0, 0.18);
  reg.detail("base.datumGrid", datumGrid, { parent: baseGroup, stage: "base" });

  // 2. Precision Dovetail Optical Bench Rail grounded directly onto datum plane
  const railLen = 3.36;
  const railX = 0.26;
  const railGeo = new THREE.BoxGeometry(railLen, railHeight, 0.62);
  reg.part("base.opticalRail", railGeo, {
    parent: baseGroup,
    pos: [railX, topSurfaceY + railHeight * 0.5, opticalAxisZ],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "ground"
  });

  const railCapGeo = new THREE.BoxGeometry(railLen - 0.10, railCapHeight, 0.44);
  reg.part("base.opticalRailCap", railCapGeo, {
    parent: baseGroup,
    pos: [railX, topSurfaceY + railHeight + railCapHeight * 0.5, opticalAxisZ],
    ramp: "hi",
    outline: "mid",
    crease: "lo",
    mountOn: "base.opticalRail"
  });

  // Rail clamping screws along front/rear flange
  for (let i = 0; i < 6; i++) {
    const sx = railX - railLen * 0.42 + (i / 5) * (railLen * 0.84);
    reg.detail(
      `base.rail.screwF.${i}`,
      makeScrewDetail(sx, topSurfaceY + railHeight + 0.003, opticalAxisZ + 0.265, 0.024, "y", kit),
      { parent: baseGroup }
    );
    reg.detail(
      `base.rail.screwR.${i}`,
      makeScrewDetail(sx, topSurfaceY + railHeight + 0.003, opticalAxisZ - 0.265, 0.024, "y", kit),
      { parent: baseGroup }
    );
  }

  // Integrated millimeter focusing scale along front rail shoulder
  reg.detail(
    "base.rail.ticks",
    makeRulerTicks(railX, railLen - 0.2, opticalAxisZ + 0.16, 0.14, railTopY + 0.003, 28, 7, kit),
    { parent: baseGroup }
  );

  // 3. Compact Machined Rail Outrigger Brackets carrying controls & monitor cleanly without a full plate
  // Left follow-focus handwheel outrigger
  reg.part("base.outrigger.ff", new THREE.BoxGeometry(0.46, 0.08, 0.72), {
    parent: baseGroup,
    pos: [-1.24, topSurfaceY + 0.04, 0.44],
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "base.opticalRail"
  });

  // Front focus-pinion column outrigger
  reg.part("base.outrigger.pinion", new THREE.BoxGeometry(0.28, 0.08, 0.64), {
    parent: baseGroup,
    pos: [-0.55, topSurfaceY + 0.04, 0.42],
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "base.opticalRail"
  });

  // Center nameplate carrier + aperture outrigger
  reg.part("base.outrigger.plaque", new THREE.BoxGeometry(0.68, 0.08, 0.48), {
    parent: baseGroup,
    pos: [-0.04, topSurfaceY + 0.04, 0.34],
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "base.opticalRail",
    allowOverlap: ["base.outrigger.pinion"]
  });

  reg.part("base.outrigger.ap", new THREE.BoxGeometry(0.40, 0.08, 0.76), {
    parent: baseGroup,
    pos: [0.46, topSurfaceY + 0.04, 0.48],
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "base.opticalRail",
    allowOverlap: ["base.outrigger.plaque"]
  });

  // Rear-right telemetry monitor outrigger arm
  reg.part("base.outrigger.mon", new THREE.BoxGeometry(0.48, 0.08, 1.06), {
    parent: baseGroup,
    pos: [1.82, topSurfaceY + 0.04, 0.62],
    ramp: "lo",
    outline: "lo",
    crease: "lo",
    mountOn: "base.opticalRail"
  });

  // 4. Compact brass specification nameplate on center rail wing
  const [plaqueX, plaqueY, plaqueZ] = ANCHORS.plaqueCenter;
  const plaqueW = 0.60;
  const plaqueD = 0.26;
  reg.part("base.plaque", new THREE.BoxGeometry(plaqueW, 0.03, plaqueD), {
    parent: baseGroup,
    pos: [plaqueX, plaqueY + 0.015, plaqueZ],
    ramp: "brass",
    outline: "mid",
    crease: "faint",
    mountOn: "base.outrigger.plaque"
  });

  [
    [plaqueX - plaqueW * 0.40, plaqueZ - plaqueD * 0.32],
    [plaqueX + plaqueW * 0.40, plaqueZ - plaqueD * 0.32],
    [plaqueX - plaqueW * 0.40, plaqueZ + plaqueD * 0.32],
    [plaqueX + plaqueW * 0.40, plaqueZ + plaqueD * 0.32]
  ].forEach(([rx, rz], idx) => {
    reg.detail(
      `base.plaque.rivet.${idx}`,
      makeScrewDetail(rx, plaqueY + 0.032, rz, 0.018, "y", kit),
      { parent: baseGroup }
    );
  });

  reg.tag("tag-plate", "50mm f/1.4 · 7E/6G", plaqueX, plaqueY + 0.045, plaqueZ + 0.02);

  // Register mounting anchors for Stages 3 and 5
  reg.anchor("base.top", ...ANCHORS.baseTop, baseGroup);
  reg.anchor("rail.top", ...ANCHORS.railTop, baseGroup);
  reg.anchor("cradle.front.mount", ...ANCHORS.cradleFrontMount, baseGroup);
  reg.anchor("cradle.rear.mount", ...ANCHORS.cradleRearMount, baseGroup);
  reg.anchor("sensor.tower.mount", ...ANCHORS.sensorTowerMount, baseGroup);
  reg.anchor("followFocus.mount", ...ANCHORS.followFocusMount, baseGroup);
  reg.anchor("apertureCtrl.mount", ...ANCHORS.apertureCtrlMount, baseGroup);
  reg.anchor("monitor.mount", ...ANCHORS.monitorMount, baseGroup);
}
