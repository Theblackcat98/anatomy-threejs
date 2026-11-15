import * as THREE from "three";
import { buildCylinderGeometry, makeScrewDetail } from "../../kit/primitives.mjs";
import { SPEC, ANCHORS, getRigState } from "./model.mjs";

export function buildMechanism(reg, kit) {
  const mechGroup = reg.group("mech.group", { stage: "mechanism" });
  const { topSurfaceY, winchX, winchZ, winchBaseY } = SPEC;

  // 1. Loaded Standing Rigging: Port/Stbd Shrouds, Forestay & Backstay
  reg.tube("rig.shroud.port.lower", "chainplate.top.port", [], "spreader.tip.port", {
    parent: mechGroup,
    radius: 0.017,
    segments: 12,
    radialSegments: 8,
    rigid: true,
    ramp: "brass",
    outline: "lo",
    fromPart: "struct.turnbuckle.port",
    toPart: "struct.spreader.port"
  });
  reg.tube("rig.shroud.port.upper", "spreader.tip.port", [], "mast.top.port", {
    parent: mechGroup,
    radius: 0.017,
    segments: 12,
    radialSegments: 8,
    rigid: true,
    ramp: "brass",
    outline: "lo",
    fromPart: "struct.spreader.port",
    toPart: "struct.masthead.cap"
  });
  reg.tube("rig.shroud.stbd.lower", "chainplate.top.stbd", [], "spreader.tip.stbd", {
    parent: mechGroup,
    radius: 0.017,
    segments: 12,
    radialSegments: 8,
    rigid: true,
    ramp: "comb",
    outline: "lo",
    fromPart: "struct.turnbuckle.stbd",
    toPart: "struct.spreader.stbd"
  });
  reg.tube("rig.shroud.stbd.upper", "spreader.tip.stbd", [], "mast.top.stbd", {
    parent: mechGroup,
    radius: 0.017,
    segments: 12,
    radialSegments: 8,
    rigid: true,
    ramp: "comb",
    outline: "lo",
    fromPart: "struct.spreader.stbd",
    toPart: "struct.masthead.cap"
  });
  reg.tube("rig.forestay", "bowStem.top", [], "mast.top.fore", {
    parent: mechGroup,
    radius: 0.019,
    segments: 16,
    radialSegments: 8,
    rigid: true,
    ramp: "hi",
    outline: "lo",
    fromPart: "struct.bowStem.tang",
    toPart: "struct.masthead.cap"
  });
  reg.tube("rig.backstay", "sternFit.top", [], "mast.top.aft", {
    parent: mechGroup,
    radius: 0.017,
    segments: 16,
    radialSegments: 8,
    rigid: true,
    ramp: "hi",
    outline: "lo",
    fromPart: "struct.sternFit.tang",
    toPart: "struct.masthead.crane"
  });

  // 2. Mainsheet Line: Turning Block -> Smooth Clearance Ramp -> Helical Winch Drum Wraps -> Self-Tailer -> Free Tail
  const wrapWaypoints = [
    [winchX - 0.72, winchBaseY + 0.04, winchZ + 0.32],
    [winchX - 0.46, winchBaseY + 0.30, winchZ + 0.52],
    [winchX - 0.16, winchBaseY + 0.44, winchZ + 0.50]
  ];
  // 2.25 smooth helical turns hugging the tapered drum waist (8 samples/turn, zero polygon facets)
  const totalSteps = 18;
  const startAngle = Math.PI * 0.52; // +Z side facing turning block
  const endAngle = startAngle - Math.PI * 4.25; // wraps CW around drum
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const ang = startAngle + (endAngle - startAngle) * t;
    const y = 0.48 + t * 0.34; // climbs from 0.48 up to 0.82 near crown
    const rDrum = 0.49 - 0.07 * ((y - 0.44) / 0.37);
    const r = rDrum + 0.018;
    wrapWaypoints.push([winchX + Math.cos(ang) * r, winchBaseY + y, winchZ + Math.sin(ang) * r]);
  }
  // Gentle large-radius waterfall curve out of self-tailer crown groove past stripper horn (no Z reversal!)
  wrapWaypoints.push([winchX + 0.43, winchBaseY + 0.85, winchZ + 0.23]);
  wrapWaypoints.push([winchX + 0.56, winchBaseY + 0.83, winchZ + 0.14]);
  wrapWaypoints.push([winchX + 0.65, winchBaseY + 0.72, winchZ + 0.08]);
  wrapWaypoints.push([winchX + 0.68, winchBaseY + 0.52, winchZ + 0.04]);

  reg.anchor("winch.sheet.tail", winchX + 0.68, winchBaseY + 0.24, winchZ + 0.02, mechGroup, {
    dir: [0.0, 0.99, 0.08]
  });

  reg.tube("rig.mainsheet.winchWrap", "turningBlock.out", wrapWaypoints, "winch.sheet.tail", {
    parent: mechGroup,
    radius: 0.022,
    segments: 96,
    radialSegments: 10,
    leadOut: 0.10,
    leadIn: 0.10,
    ramp: "copper",
    outline: "lo",
    fromPart: "struct.turningBlock.sheave",
    toPart: "winch.stripperHorn",
    allowOverlap: [
      "winch.drum",
      "winch.drumFlangeLow",
      "winch.crownBot",
      "winch.crownTop",
      "winch.stripperArm",
      "winch.stripperHorn",
      "winch.ringGear",
      "winch.planet.0",
      "winch.planet.1",
      "winch.planet.2",
      "struct.winch.housingCut",
      "struct.winch.frontShield",
      "base.winchCoaming",
      "base.winchCoamingLower"
    ]
  });

  // Dynamic Cel-Shaded Mainsheet Tackle (Boom Clew Block -> Sliding Traveler Car)
  const sheetDynGeo = buildCylinderGeometry(0.020, 0.020, 1.0, { segments: 12, axis: "y" });
  const sheetDynGroup = kit.createAnatomyPart(sheetDynGeo, {
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    noCrease: true
  });
  sheetDynGroup.name = "rig.mainsheet.dynamic";
  reg.detail("rig.mainsheet.dynamic", sheetDynGroup, { parent: mechGroup, stage: "mechanism" });

  // Dynamic Cel-Shaded Deck Lead (Traveler Car -> Turning Block)
  const deckLeadGeo = buildCylinderGeometry(0.020, 0.020, 1.0, { segments: 12, axis: "y" });
  const deckLeadGroup = kit.createAnatomyPart(deckLeadGeo, {
    ramp: "copper",
    outline: "lo",
    crease: "faint",
    noCrease: true
  });
  deckLeadGroup.name = "rig.mainsheet.deckLead";
  reg.detail("rig.mainsheet.deckLead", deckLeadGroup, { parent: mechGroup, stage: "mechanism" });

  // 3. Diegetic Cockpit Rigging Telemetry Console (front-left foredeck, completely unobstructed)
  const [scX, , scZ] = ANCHORS.screenMount;
  reg.part("mech.screenStand", buildCylinderGeometry(0.11, 0.14, 0.22, { segments: 16, axis: "y" }), {
    parent: mechGroup,
    pos: [scX, topSurfaceY + 0.11, scZ - 0.03],
    ramp: "mid",
    outline: "mid",
    crease: "lo",
    mountOn: "base.deckSection"
  });
  reg.detail("mech.screenStand.screw", makeScrewDetail(scX, topSurfaceY + 0.004, scZ + 0.14, 0.022, "y", kit), {
    parent: mechGroup
  });

  reg.screen("rig.screen", {
    parent: mechGroup,
    pos: [scX, topSurfaceY + 0.38, scZ],
    rot: [-0.36, -0.22, 0],
    width: 0.90,
    height: 0.56,
    resolution: [280, 174],
    ramp: "lo",
    outline: "mid",
    mountOn: "mech.screenStand",
    draw: (ctx, canvas, state, theme) => {
      const r = getRigState(state);
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = theme.isDark ? "#0d1622" : "#131c29";
      ctx.fillRect(0, 0, W, H);

      // Header: Active Gear Mode & Apparent Wind
      ctx.fillStyle = r.isLowGear ? "#f59e0b" : r.isHold ? "#94a3b8" : "#38bdf8";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`${r.gearLabel}`, 12, 18);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`${r.effWind.toFixed(1)} KN`, 196, 18);

      // Shroud Load Cells
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.fillText(`STBD SHROUD ${r.windwardShroudKn.toFixed(1)} kN`, 12, 42);
      ctx.fillStyle = "rgba(148,163,184,0.22)";
      ctx.fillRect(12, 48, W - 24, 11);
      ctx.fillStyle = r.windwardShroudKn > 12 ? "#ef4444" : "#f97316";
      ctx.fillRect(12, 48, Math.min(1, r.windwardShroudKn / 22) * (W - 24), 11);

      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`PORT SHROUD ${r.leewardShroudKn.toFixed(1)} kN`, 12, 78);
      ctx.fillStyle = "rgba(148,163,184,0.22)";
      ctx.fillRect(12, 84, W - 24, 9);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(12, 84, Math.min(1, r.leewardShroudKn / 22) * (W - 24), 9);

      // Live Sail Camber Airfoil Section Preview
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px monospace";
      ctx.fillText(`CAMBER ${(r.camber * 100).toFixed(0)}% · TORQUE ${r.ratio.toFixed(1)}x`, 12, 114);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const u = i / 28;
        const ax = 18 + u * (W - 36);
        const ay = 152 - Math.sin(Math.PI * Math.pow(u, 0.78)) * r.camber * 92;
        if (i === 0) ctx.moveTo(ax, ay);
        else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
    }
  });

  // 4. Direct 3D Interactables (Winch Handle, Drum, Boom, Traveler Car, Wind Vane)
  reg.interactable("winch.handle.arm", {
    cursor: "grab",
    hint: "Drag winch handle CW (1:1 fast) or CCW (3.5:1 planetary power)",
    onDrag: ({ dx, state, setParam }) => {
      state.theta -= dx * 0.025;
      if (Math.abs(dx) > 0.5) {
        setParam("rpm", dx > 0 ? 40 : -36);
      }
    }
  });
  reg.interactable("winch.handle.grip", {
    cursor: "grab",
    hint: "Drag winch handle grip to crank",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.025;
    }
  });
  reg.interactable("winch.drum", {
    cursor: "grab",
    hint: "Drag drum to wind mainsheet",
    onDrag: ({ dx, state }) => {
      state.theta -= dx * 0.02;
    }
  });
  reg.interactable("boom.spar", {
    cursor: "grab",
    hint: "Drag boom to ease or sheet in mainsail trim",
    onDrag: ({ dx, state, setParam }) => {
      setParam("trim", (state.params.trim ?? 58) - dx * 0.45);
    }
  });
  reg.interactable("struct.traveler.car", {
    cursor: "grab",
    hint: "Drag traveler car to adjust mainsheet trim",
    onDrag: ({ dx, state, setParam }) => {
      setParam("trim", (state.params.trim ?? 58) - dx * 0.45);
    }
  });
  reg.interactable("struct.windVane.arm", {
    cursor: "grab",
    hint: "Drag masthead wind vane to change wind speed",
    onDrag: ({ dx, state, setParam }) => {
      setParam("wind", (state.params.wind ?? 18) + dx * 0.25);
    }
  });
}

const _ptA = new THREE.Vector3();
const _ptB = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function updateDynamicLine(reg, name, anchorAId, anchorBId) {
  const aObj = reg.joints.get(anchorAId);
  const bObj = reg.joints.get(anchorBId);
  const meshGroup = reg.root.getObjectByName(name);
  if (!aObj || !bObj || !meshGroup) return;

  aObj.getWorldPosition(_ptA);
  bObj.getWorldPosition(_ptB);
  reg.root.worldToLocal(_ptA);
  reg.root.worldToLocal(_ptB);

  _mid.addVectors(_ptA, _ptB).multiplyScalar(0.5);
  _dir.subVectors(_ptB, _ptA);
  const len = _dir.length();
  if (len > 0.001) {
    meshGroup.position.copy(_mid);
    meshGroup.scale.set(1, len, 1);
    meshGroup.quaternion.setFromUnitVectors(_up, _dir.normalize());
  }
}

export function updateKinematics(reg, state) {
  const r = getRigState(state);

  // 1. Planetary Winch Kinematics (CW 1:1 Direct vs CCW 3.5:1 Planetary Reduction)
  const handleGroup = reg.groups.get("winch.handle.group")?.group;
  const spindleGroup = reg.groups.get("winch.spindle.group")?.group;
  const carrierGroup = reg.groups.get("winch.carrier.group")?.group;
  const drumGroup = reg.groups.get("winch.drum.group")?.group;

  if (handleGroup) handleGroup.rotation.y = r.handleRotY;
  if (spindleGroup) spindleGroup.rotation.y = r.handleRotY;
  if (carrierGroup) carrierGroup.rotation.y = r.carrierRotY;
  if (drumGroup) drumGroup.rotation.y = r.drumRotY;

  for (let idx = 0; idx < 3; idx++) {
    const pSpin = reg.groups.get(`winch.planet.spin.${idx}`)?.group;
    if (pSpin) {
      pSpin.rotation.y = r.planetSelfRot;
    }
  }

  // 2. Boom, Traveler Car & Masthead Wind Vane
  const boomGroup = reg.groups.get("boom.group")?.group;
  if (boomGroup) {
    boomGroup.rotation.y = r.boomAngleY;
  }

  const carGroup = reg.groups.get("struct.traveler.carGroup")?.group;
  if (carGroup) {
    carGroup.position.z = ANCHORS.travelerCenter[2] + r.travelerCarZ;
  }

  const vaneGroup = reg.groups.get("struct.windVane.group")?.group;
  if (vaneGroup) {
    vaneGroup.rotation.y = r.windVaneYaw;
  }

  // 3. Stretch Live Cel-Shaded Mainsheet Tackle & Deck Lead
  reg.root.updateMatrixWorld(true);
  updateDynamicLine(reg, "rig.mainsheet.dynamic", "boom.clew", "traveler.car.top");
  updateDynamicLine(reg, "rig.mainsheet.deckLead", "traveler.car.out", "turningBlock.in");

  // 4. Update Dynamic Sail Camber & Wind Flow Shader Uniforms
  const sailMat = reg.groups.get("shader.sailData")?.group?.userData?.material;
  const windMat = reg.groups.get("shader.windData")?.group?.userData?.material;
  if (sailMat) {
    sailMat.uniforms.uTime.value = state.simClock ?? 0;
    sailMat.uniforms.uCamber.value = r.camber;
    sailMat.uniforms.uWind.value = r.effWind;
    sailMat.uniforms.uEnvelope.value = state.shaderEnv ?? 1.0;
  }
  if (windMat) {
    windMat.uniforms.uTime.value = state.simClock ?? 0;
    windMat.uniforms.uWind.value = r.effWind;
    windMat.uniforms.uEnvelope.value = state.shaderEnv ?? 1.0;
  }
}
