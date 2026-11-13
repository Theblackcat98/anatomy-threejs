import * as THREE from "three";

export class Recorder3D {
  constructor(sceneRoot, kit) {
    this.root = sceneRoot;
    this.kit = kit;
    this.parts = new Map();      // id -> { id, group, geometry, opts }
    this.tubes = [];             // { id, part, curve, radius, from, to, waypoints, opts }
    this.joints = new Map();     // id -> THREE.Object3D (named anchor points)
    this.groups = new Map();     // id -> { id, group, opts }
    this.tags = new Map();       // id -> { id, text, pos }
    this.interactables = [];     // { id, object3d, cursor, hint, onDrag }
    this.currentStage = "base";  // 'base' | 'structure' | 'subject' | 'mechanism' | 'shader'
  }

  setStage(stageName) {
    this.currentStage = stageName;
  }

  /**
   * Create and register a named Three.js Group (e.g., for assemblies or kinematic sub-trees)
   */
  group(id, opts = {}) {
    const {
      parent = this.root,
      pos = [0, 0, 0],
      rot = [0, 0, 0],
      explode = [0, 0, 0],
      cutawayHide = false,
      stage = this.currentStage
    } = opts;

    const g = new THREE.Group();
    g.name = id;
    g.position.set(...pos);
    g.rotation.set(...rot);
    g.userData = {
      id,
      isAssemblyGroup: true,
      stage,
      explode,
      cutawayHide,
      basePos: [...pos],
      baseRot: [...rot]
    };
    parent.add(g);
    this.groups.set(id, { id, group: g, opts: g.userData });
    return g;
  }

  /**
   * Register a named 3D anchor/port so other files can snap to it without guessing coordinates.
   * Pass opts.dir ([dx, dy, dz] in parentGroup local coordinates) for port outward normals.
   */
  anchor(id, x, y, z, parentGroup = this.root, opts = {}) {
    const obj = new THREE.Object3D();
    obj.name = `anchor:${id}`;
    obj.position.set(x, y, z);
    obj.userData.localDir = opts.dir ? new THREE.Vector3(...opts.dir).normalize() : null;
    parentGroup.add(obj);
    this.joints.set(id, obj);
    return obj;
  }

  /**
   * Get world position of a registered anchor
   */
  getAnchorWorldPos(id) {
    const obj = this.joints.get(id);
    if (!obj) {
      throw new Error(`Missing registered anchor "${id}"`);
    }
    this.root.updateMatrixWorld(true);
    return obj.getWorldPosition(new THREE.Vector3());
  }

  /**
   * Get world-space outward port normal of a registered anchor, or null if none was registered
   */
  getAnchorWorldDir(id) {
    const obj = this.joints.get(id);
    if (!obj) {
      throw new Error(`Missing registered anchor "${id}"`);
    }
    if (!obj.userData?.localDir) return null;
    this.root.updateMatrixWorld(true);
    return obj.userData.localDir.clone().transformDirection(obj.matrixWorld).normalize();
  }

  /**
   * Create an Anatomy-styled 3D solid and register it for the 3D geometry audit
   */
  part(id, geometry, opts = {}) {
    if (this.parts.has(id)) {
      throw new Error(`Duplicate part ID registered: "${id}"`);
    }
    const {
      ramp = "mid",          // 'lo' | 'mid' | 'hi' | 'lit' | 'brass' | 'copper'
      outline = "mid",
      crease = "faint",
      creaseAngle = 28,
      outlineWidth = 0.017,
      topBias = 0.62,
      noOutline = false,
      noCrease = false,
      parent = this.root,
      pos = [0, 0, 0],
      rot = [0, 0, 0],
      mountOn = null,        // ID of part this must touch/rest on (or 'ground' or 'coaxial')
      allowOverlap = [],     // IDs of parts allowed to intersect (e.g. meshing gears, coaxial shafts)
      insideBoreOf = null,   // ID of hollow housing part whose inner bore contains this part
      boreClearanceFn = null,// Optional (x, y, z) => signed radial clearance inside bore (>0 means clear, <0 means collision)
      explode = [0, 0, 0],   // Axial offset vector when Explode (E) = 1
      detail = false,        // True for tiny screws/ticks/fins (skips heavy collision checks)
      cutawayHide = false,   // True if hidden when Cutaway (C) is active at rest
      stage = this.currentStage
    } = opts;

    const group = this.kit.createAnatomyPart(geometry, {
      ramp,
      outline,
      crease,
      creaseAngle,
      outlineWidth,
      topBias,
      noOutline,
      noCrease
    });
    group.name = id;
    group.position.set(...pos);
    group.rotation.set(...rot);
    group.userData = {
      id,
      ramp,
      outline,
      stage,
      mountOn,
      allowOverlap: Array.isArray(allowOverlap) ? allowOverlap.filter(Boolean) : [],
      insideBoreOf,
      boreClearanceFn,
      explode,
      basePos: [...pos],
      baseRot: [...rot],
      detail,
      cutawayHide
    };

    parent.add(group);
    this.parts.set(id, { id, group, geometry, opts: group.userData });
    return group;
  }

  /**
   * Add a decorative line/dot/mesh detail attached to a parent group and track its stage for isolation
   */
  detail(id, object3d, opts = {}) {
    const {
      parent = this.root,
      cutawayHide = false,
      stage = this.currentStage
    } = opts;
    object3d.name = id;
    object3d.userData = Object.assign({}, object3d.userData, {
      id,
      stage,
      cutawayHide: Boolean(cutawayHide || object3d.userData?.cutawayHide),
      detail: true
    });
    parent.add(object3d);
    return object3d;
  }

  /**
   * Route a 3D pipe/cable between two named anchors and register it for bend/collision audits
   */
  tube(id, anchorFromId, waypoints, anchorToId, opts = {}) {
    const fromObj = this.joints.get(anchorFromId);
    const toObj = this.joints.get(anchorToId);
    if (!fromObj || !toObj) {
      throw new Error(`Tube "${id}" references missing anchor: ${anchorFromId} -> ${anchorToId}`);
    }
    this.root.updateMatrixWorld(true);
    const pStart = fromObj.getWorldPosition(new THREE.Vector3());
    const pEnd = toObj.getWorldPosition(new THREE.Vector3());
    const fromDirWorld = opts.fromDir
      ? new THREE.Vector3(...opts.fromDir).normalize()
      : this.getAnchorWorldDir(anchorFromId);
    const toDirWorld = opts.toDir
      ? new THREE.Vector3(...opts.toDir).normalize()
      : this.getAnchorWorldDir(anchorToId);

    const leadOut = opts.leadOut !== undefined ? opts.leadOut : (fromDirWorld ? 0.18 : 0);
    const leadIn = opts.leadIn !== undefined ? opts.leadIn : (toDirWorld ? 0.18 : 0);

    const pts = [pStart];
    if (fromDirWorld && leadOut > 0) {
      pts.push(pStart.clone().addScaledVector(fromDirWorld, leadOut));
    }
    for (const wp of waypoints) {
      pts.push(new THREE.Vector3(...wp));
    }
    if (toDirWorld && leadIn > 0) {
      pts.push(pEnd.clone().addScaledVector(toDirWorld, leadIn));
    }
    pts.push(pEnd);

    const curve = new THREE.CatmullRomCurve3(pts, false, opts.curveType || "centripetal");
    const radius = opts.radius || 0.03;
    const segments = opts.segments || 32;
    const radialSegments = opts.radialSegments || 12;
    const geo = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);

    const allow = new Set(opts.allowOverlap || []);
    if (opts.fromPart) allow.add(opts.fromPart);
    if (opts.toPart) allow.add(opts.toPart);

    const part = this.part(id, geo, {
      ...opts,
      noCrease: opts.noCrease !== undefined ? opts.noCrease : true,
      outlineWidth: opts.outlineWidth || 0.012,
      mountOn: opts.mountOn || opts.fromPart || "ground",
      allowOverlap: Array.from(allow)
    });

    this.tubes.push({
      id,
      part,
      curve,
      radius,
      from: anchorFromId,
      to: anchorToId,
      fromDirWorld,
      toDirWorld,
      fromPart: opts.fromPart || null,
      toPart: opts.toPart || null,
      waypoints,
      opts
    });
    return part;
  }

  /**
   * Register an engraved HUD tag anchored in 3D space
   */
  tag(id, text, x, y, z) {
    this.tags.set(id, { id, text, pos: [x, y, z] });
  }

  /**
   * Register a 3D group or part as directly draggable in the viewport via pointer raycasting.
   * opts: { cursor = "move", hint = "", onDrag: ({ dx, dy, worldDx, worldDy, state, setParam, event }) => void }
   */
  interactable(targetId, opts = {}) {
    const obj =
      typeof targetId === "string"
        ? this.groups.get(targetId)?.group || this.parts.get(targetId)?.group
        : targetId;
    if (!obj) {
      throw new Error(`Interactable target "${targetId}" not found in registered groups or parts`);
    }
    const entry = {
      id: typeof targetId === "string" ? targetId : obj.name || "interactable",
      object3d: obj,
      cursor: opts.cursor || "move",
      hint: opts.hint || "",
      onDrag: opts.onDrag || null
    };
    this.interactables.push(entry);
    return entry;
  }

  /**
   * Apply exploded axial offsets across all registered assembly groups and parts
   */
  applyExplode(exFactor, cutawayActive = true) {
    for (const [, item] of this.groups) {
      const [ex, ey, ez] = item.opts.explode;
      if (ex || ey || ez) {
        item.group.position.set(
          item.opts.basePos[0] + ex * exFactor,
          item.opts.basePos[1] + ey * exFactor,
          item.opts.basePos[2] + ez * exFactor
        );
      }
      if (item.opts.cutawayHide && !this._isolationActive) {
        item.group.visible = !cutawayActive || exFactor > 0.08;
      }
    }
    for (const [, item] of this.parts) {
      const [ex, ey, ez] = item.opts.explode;
      if (ex || ey || ez) {
        item.group.position.set(
          item.opts.basePos[0] + ex * exFactor,
          item.opts.basePos[1] + ey * exFactor,
          item.opts.basePos[2] + ez * exFactor
        );
      }
      if (item.opts.cutawayHide && !this._isolationActive) {
        item.group.visible = !cutawayActive || exFactor > 0.08;
      }
    }
    if (!this._isolationActive) {
      this.root.traverse((obj) => {
        if (obj.userData && obj.userData.detail && obj.userData.cutawayHide) {
          obj.visible = !cutawayActive || exFactor > 0.08;
        }
      });
    }
  }

  /**
   * Isolate a stage ('base', 'structure', 'subject', 'mechanism', 'shader') or list of part IDs/prefixes.
   * Pass null or 'all' to restore visibility.
   */
  isolate(filter, cutawayActive = true, exFactor = 0) {
    if (!filter || filter === "all") {
      this._isolationActive = false;
      this.root.traverse((obj) => {
        if (obj === this.root) return;
        if (obj.userData && obj.userData.cutawayHide) {
          obj.visible = !cutawayActive || exFactor > 0.08;
        } else if (obj.userData && (obj.userData.stage || obj.userData.id)) {
          obj.visible = true;
        }
      });
      return;
    }

    this._isolationActive = true;
    const filters = Array.isArray(filter) ? filter : [filter];
    const matches = (ud) => {
      if (!ud) return false;
      return filters.some((f) =>
        ud.stage === f ||
        ud.id === f ||
        (typeof ud.id === "string" && ud.id.startsWith(f + "."))
      );
    };

    // First set visibility on all registered parts and details
    this.root.traverse((obj) => {
      if (obj.userData && (obj.userData.id || obj.userData.stage) && !obj.userData.isAssemblyGroup) {
        obj.visible = matches(obj.userData);
      }
    });
  }
}
