import * as THREE from "three";

/**
 * Computes minimum Euclidean distance between two THREE.Box3 instances (0 if intersecting),
 * along with per-axis gap [dx, dy, dz].
 */
function boxGap(boxA, boxB) {
  const dx = Math.max(0, boxA.min.x - boxB.max.x, boxB.min.x - boxA.max.x);
  const dy = Math.max(0, boxA.min.y - boxB.max.y, boxB.min.y - boxA.max.y);
  const dz = Math.max(0, boxA.min.z - boxB.max.z, boxB.min.z - boxA.max.z);
  const dist = Math.hypot(dx, dy, dz);
  return { dist, dx, dy, dz };
}

function getMeshTrianglesInBox(item, box) {
  const solidMesh = item.group.getObjectByName("solid") || item.group;
  const geo = item.geometry;
  const posAttr = geo?.attributes?.position;
  if (!posAttr) return [];

  const mat = solidMesh.matrixWorld;
  const indexAttr = geo.index;
  const tris = [];
  const tri = new THREE.Triangle();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  if (indexAttr) {
    const count = indexAttr.count;
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(posAttr, indexAttr.getX(i)).applyMatrix4(mat);
      b.fromBufferAttribute(posAttr, indexAttr.getX(i + 1)).applyMatrix4(mat);
      c.fromBufferAttribute(posAttr, indexAttr.getX(i + 2)).applyMatrix4(mat);
      tri.set(a, b, c);
      if (box.intersectsTriangle(tri)) {
        tris.push(new THREE.Triangle(a.clone(), b.clone(), c.clone()));
      }
    }
  } else {
    const count = posAttr.count;
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(posAttr, i).applyMatrix4(mat);
      b.fromBufferAttribute(posAttr, i + 1).applyMatrix4(mat);
      c.fromBufferAttribute(posAttr, i + 2).applyMatrix4(mat);
      tri.set(a, b, c);
      if (box.intersectsTriangle(tri)) {
        tris.push(new THREE.Triangle(a.clone(), b.clone(), c.clone()));
      }
    }
  }
  return tris;
}

/**
 * Checks whether itemA and itemB have actual triangles intersecting within the same
 * spatial cells of `overlapBox` (handles both large flat faces and curved geometry).
 */
function meshesTrulyOverlap(itemA, itemB, overlapBox) {
  const probeBox = overlapBox.clone().expandByScalar(0.02);
  const trisA = getMeshTrianglesInBox(itemA, probeBox);
  if (trisA.length === 0) return false;
  const trisB = getMeshTrianglesInBox(itemB, probeBox);
  if (trisB.length === 0) return false;

  // Subdivide probeBox into fine spatial cells (~0.03 units) and check if any cell intersects both A and B
  const min = probeBox.min;
  const size = probeBox.getSize(new THREE.Vector3());
  const nx = Math.max(1, Math.min(10, Math.ceil(size.x / 0.03)));
  const ny = Math.max(1, Math.min(10, Math.ceil(size.y / 0.03)));
  const nz = Math.max(1, Math.min(10, Math.ceil(size.z / 0.03)));
  const cell = new THREE.Box3();

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let iz = 0; iz < nz; iz++) {
        cell.min.set(
          min.x + (size.x * ix) / nx,
          min.y + (size.y * iy) / ny,
          min.z + (size.z * iz) / nz
        );
        cell.max.set(
          min.x + (size.x * (ix + 1)) / nx,
          min.y + (size.y * (iy + 1)) / ny,
          min.z + (size.z * (iz + 1)) / nz
        );
        const hitA = trisA.some((t) => cell.intersectsTriangle(t));
        if (!hitA) continue;
        const hitB = trisB.some((t) => cell.intersectsTriangle(t));
        if (hitB) return true;
      }
    }
  }
  return false;
}

/**
 * Stage 1 Pure Model Audit: verifies physical constants, cycle bounds, and anchor definitions.
 */
export function runModelAudit(model) {
  const errors = [];
  if (!model || typeof model !== "object") {
    return ["[MODEL] model module must export SPEC, ANCHORS, and step/state functions"];
  }
  const { SPEC, ANCHORS, getChamberState, epitrochoidPoint } = model;
  if (!SPEC) errors.push("[MODEL] Missing SPEC export in model.mjs");
  if (!ANCHORS) errors.push("[MODEL] Missing ANCHORS export in model.mjs");

  if (typeof epitrochoidPoint === "function") {
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      const pt = epitrochoidPoint(t, 0);
      if (!Array.isArray(pt) || pt.length < 2 || !pt.every(Number.isFinite)) {
        errors.push(`[MODEL] epitrochoidPoint(${t.toFixed(2)}) returned invalid coordinates`);
        break;
      }
    }
  }

  if (typeof getChamberState === "function") {
    const phasesSeen = new Set();
    for (let i = 0; i < 72; i++) {
      const theta = (i / 72) * Math.PI * 6; // Full 3-turn eccentric shaft cycle (1 full rotor turn)
      const st = getChamberState(theta, 0);
      if (!st || !Number.isFinite(st.pressure) || !Number.isFinite(st.deg)) {
        errors.push(`[MODEL] getChamberState(${theta.toFixed(2)}) returned non-finite values`);
        break;
      }
      if (st.pressure < 0.5 || st.pressure > 50) {
        errors.push(`[MODEL] Unphysical chamber pressure ${st.pressure.toFixed(2)} bar at θ=${theta.toFixed(2)}`);
        break;
      }
      phasesSeen.add(st.phase);
    }
    const expectedPhases = ["INTAKE", "COMPRESSION", "IGNITION · POWER", "EXHAUST"];
    for (const p of expectedPhases) {
      if (!phasesSeen.has(p)) {
        errors.push(`[MODEL] Phase "${p}" was never reached across a full 1080° shaft cycle`);
      }
    }
  }

  return errors;
}

/**
 * Runs the 3D Geometry Audit in Node.js (~100ms, no GPU required).
 */
export function runGeometryAudit(reg, stepModelFn, options = {}) {
  const errors = [];
  const poses = options.poses || [
    { name: "rest (θ=0°)", theta: 0, explode: 0 },
    { name: "quarter (θ=90°)", theta: Math.PI * 0.5, explode: 0 },
    { name: "half (θ=180°)", theta: Math.PI, explode: 0 },
    { name: "three-quarter (θ=270°)", theta: Math.PI * 1.5, explode: 0 },
    { name: "exploded (E=1)", theta: 0, explode: 1 }
  ];

  // 0. TONE HIERARCHY & MOUNT METADATA CHECK
  let litCount = 0;
  let hasSubjectStage = false;
  for (const [id, item] of reg.parts) {
    if (item.opts.stage === "subject") hasSubjectStage = true;
    if (item.opts.ramp === "lit") {
      litCount++;
      if (item.opts.stage !== "subject" && !item.opts.detail) {
        errors.push(`[TONE] "${id}" uses ramp "lit" outside stage "subject" (stage="${item.opts.stage}")`);
      }
    }
    if (!item.opts.detail && !item.opts.mountOn) {
      errors.push(`[UNMOUNTED] "${id}" is missing a mountOn property (specify parent part ID, "ground", or "coaxial")`);
    }
  }
  if (hasSubjectStage && litCount === 0) {
    errors.push(`[TONE] Stage "subject" has 0 parts with ramp: "lit" (the primary subject must be lit)`);
  }

  for (const pose of poses) {
    stepModelFn(pose.theta, pose.explode);
    reg.root.updateMatrixWorld(true);

    const boxes = new Map();
    for (const [id, item] of reg.parts) {
      if (item.opts.detail) continue;
      const solidMesh = item.group.getObjectByName("solid") || item.group;
      const box = new THREE.Box3().setFromObject(solidMesh);
      boxes.set(id, box);
    }

    // 1. SUPPORT / FLOATING CHECK (in rest pose)
    if (pose.explode === 0 && pose.theta === 0) {
      for (const [id, item] of reg.parts) {
        if (item.opts.detail) continue;
        const targetId = item.opts.mountOn;
        if (!targetId || targetId === "ground" || targetId === "coaxial") continue;
        const boxA = boxes.get(id);
        const boxB = boxes.get(targetId);
        if (!boxB) {
          errors.push(`[MOUNT] "${id}" references unknown mountOn part "${targetId}"`);
          continue;
        }
        if (boxA && boxB) {
          const { dist, dx, dy, dz } = boxGap(boxA, boxB);
          if (dist > 0.035) {
            errors.push(
              `[FLOATING] "${id}" does not touch its mount "${targetId}" ` +
              `(gap ${dist.toFixed(3)} · dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)}, dz=${dz.toFixed(3)})`
            );
          }
        }
      }
    }

    // 2. HOLLOW BORE RADIAL CLEARANCE CHECK (e.g. Rotor inside Epitrochoid Housing)
    if (pose.explode === 0) {
      const vWorld = new THREE.Vector3();
      const vLocal = new THREE.Vector3();
      const invMat = new THREE.Matrix4();
      for (const [id, item] of reg.parts) {
        const boreHostId = item.opts.insideBoreOf;
        const clearanceFn = item.opts.boreClearanceFn;
        if (!boreHostId || typeof clearanceFn !== "function") continue;
        const hostItem = reg.parts.get(boreHostId);
        if (!hostItem) {
          errors.push(`[BORE] "${id}" references unknown insideBoreOf part "${boreHostId}"`);
          continue;
        }
        invMat.copy(hostItem.group.matrixWorld).invert();
        const posAttr = item.geometry?.attributes?.position;
        if (!posAttr) continue;
        let worstClearance = Infinity;
        for (let i = 0; i < posAttr.count; i++) {
          vWorld.fromBufferAttribute(posAttr, i).applyMatrix4(item.group.matrixWorld);
          vLocal.copy(vWorld).applyMatrix4(invMat);
          const c = clearanceFn(vLocal.x, vLocal.y, vLocal.z);
          if (c < worstClearance) worstClearance = c;
        }
        if (worstClearance < -0.008) {
          errors.push(
            `[COLLISION in ${pose.name}] "${id}" clips bore wall of "${boreHostId}" ` +
            `(penetration ${(-worstClearance).toFixed(3)})`
          );
        } else if (worstClearance > 0.12) {
          errors.push(
            `[CLEARANCE in ${pose.name}] "${id}" has excessive gap to bore wall of "${boreHostId}" ` +
            `(min clearance ${worstClearance.toFixed(3)})`
          );
        }
      }
    }

    // 3. SOLID INTERSECTION / CLIPPING CHECK
    const ids = Array.from(boxes.keys());
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        const itemA = reg.parts.get(idA);
        const itemB = reg.parts.get(idB);
        const optsA = itemA.opts;
        const optsB = itemB.opts;

        if (
          optsA.mountOn === idB ||
          optsB.mountOn === idA ||
          optsA.insideBoreOf === idB ||
          optsB.insideBoreOf === idA ||
          optsA.allowOverlap.includes(idB) ||
          optsB.allowOverlap.includes(idA)
        ) {
          continue;
        }

        // Shrink AABB slightly by 0.015 so flush surfaces don't trigger false positives
        const bA = boxes.get(idA).clone().expandByScalar(-0.015);
        const bB = boxes.get(idB).clone().expandByScalar(-0.015);

        if (bA.intersectsBox(bB)) {
          const overlap = bA.clone().intersect(bB);
          const sz = overlap.getSize(new THREE.Vector3());
          if (sz.x * sz.y * sz.z > 0.0008 && meshesTrulyOverlap(itemA, itemB, overlap)) {
            errors.push(
              `[COLLISION in ${pose.name}] "${idA}" clips "${idB}" ` +
              `(overlap ${sz.x.toFixed(2)}×${sz.y.toFixed(2)}×${sz.z.toFixed(2)})`
            );
          }
        }
      }
    }

    // 4. TUBE-TO-SOLID PASS-THROUGH CHECK (in rest pose)
    if (pose.explode === 0 && pose.theta === 0) {
      for (const tube of reg.tubes) {
        const pts = tube.curve.getPoints(40);
        // Check interior points (excluding start/end mounting regions)
        for (const [id, box] of boxes) {
          if (
            id === tube.id ||
            id === tube.fromPart ||
            id === tube.toPart ||
            tube.opts.allowOverlap?.includes(id)
          ) {
            continue;
          }
          const innerBox = box.clone().expandByScalar(-0.015);
          for (let k = 4; k <= pts.length - 5; k++) {
            if (innerBox.containsPoint(pts[k])) {
              errors.push(
                `[TUBE COLLISION] Tube "${tube.id}" passes through solid "${id}" at segment ${k}/40`
              );
              break;
            }
          }
        }
      }
    }
  }

  // 5. TUBE / CABLE BEND RADIUS (KINK) & TERMINAL CHECK
  stepModelFn(0, 0);
  reg.root.updateMatrixWorld(true);
  for (const tube of reg.tubes) {
    const pts = tube.curve.getPoints(40);
    for (let i = 1; i < pts.length - 1; i++) {
      const v1 = pts[i].clone().sub(pts[i - 1]).normalize();
      const v2 = pts[i + 1].clone().sub(pts[i]).normalize();
      const angleDeg = THREE.MathUtils.radToDeg(v1.angleTo(v2));
      if (angleDeg > 42) {
        errors.push(`[TUBE KINK] "${tube.id}" bends too sharply (${angleDeg.toFixed(1)}° at segment ${i})`);
        break;
      }
    }
    const fromAnchor = reg.joints.get(tube.from);
    const toAnchor = reg.joints.get(tube.to);
    if (fromAnchor && toAnchor) {
      const pFrom = fromAnchor.getWorldPosition(new THREE.Vector3());
      const pTo = toAnchor.getWorldPosition(new THREE.Vector3());
      if (pts[0].distanceTo(pFrom) > 0.05) {
        errors.push(`[TUBE TERMINAL] "${tube.id}" start misses anchor "${tube.from}" by ${pts[0].distanceTo(pFrom).toFixed(3)}`);
      }
      if (pts[pts.length - 1].distanceTo(pTo) > 0.05) {
        errors.push(`[TUBE TERMINAL] "${tube.id}" end misses anchor "${tube.to}" by ${pts[pts.length - 1].distanceTo(pTo).toFixed(3)}`);
      }
    }
  }

  return errors;
}
