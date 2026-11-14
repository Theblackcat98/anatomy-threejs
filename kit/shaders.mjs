import * as THREE from "three";

export const THEMES = [
  {
    id: "light",
    name: "Light",
    swatch: "#e4e1d8",
    isDark: false,
    css: {
      bg: "#f3f2ee",
      card: "#faf9f5",
      border: "#dfddd5",
      text: "#181715",
      muted: "#78746c",
      strong: "#0c0b0a",
      lit: "#d97706",
      pillBg: "#efede7",
      pillHover: "#e4e1d8"
    },
    ramps: {
      lo:  { top: "#f5f3ed", shades: ["#ebe8df", "#dedad0", "#cfcac0", "#b8b2a6"] },
      mid: { top: "#fcfbf8", shades: ["#efede6", "#e0ddd3", "#cbc6ba", "#b0aaa0"] },
      hi:  { top: "#ffffff", shades: ["#f4f2ec", "#e5e2d9", "#d0cbc0", "#b4aea2"] },
      lit: { top: "#fff7ed", shades: ["#fed7aa", "#fb923c", "#ea580c", "#9a3412"] },
      brass: { top: "#fef9c3", shades: ["#fde68a", "#eab308", "#ca8a04", "#854d0e"] },
      copper: { top: "#ffedd5", shades: ["#fdba74", "#ea580c", "#c2410c", "#7c2d12"] }
    },
    lines: {
      hi: "#141311",
      mid: "#3b3833",
      lo: "#78736a",
      faint: "#b8b3a8",
      lit: "#7c2d12",
      dot: "#292724"
    },
    halo: "#d5d1c7",
    haloOpacity: 0.42,
    channels: {
      intake: "#2563eb",
      comp: "#7c3aed",
      comb: "#ea580c",
      exhaust: "#dc2626",
      cavity: "#ece9e0"
    },
    glass: { top: "#ffffff", rim: "#0284c7", tint: "#e0f2fe", opacity: 0.32 }
  },
  {
    id: "paper",
    name: "Paper",
    swatch: "#e8dec9",
    isDark: false,
    css: {
      bg: "#ece5d5",
      card: "#fbf7ee",
      border: "#dcd2be",
      text: "#231e18",
      muted: "#7c7161",
      strong: "#120f0b",
      lit: "#b45309",
      pillBg: "#efe7d6",
      pillHover: "#e4d9c3"
    },
    ramps: {
      lo:  { top: "#f4ede0", shades: ["#e8dec9", "#d9ccb4", "#c5b69c", "#ad9d82"] },
      mid: { top: "#fcf9f2", shades: ["#eee5d3", "#dfd3bc", "#c9baa0", "#ae9e84"] },
      hi:  { top: "#fffdf9", shades: ["#f3ebd9", "#e4d8c1", "#cebfa4", "#b2a287"] },
      lit: { top: "#fef3c7", shades: ["#fcd34d", "#d97706", "#b45309", "#78350f"] },
      brass: { top: "#fef08a", shades: ["#facc15", "#ca8a04", "#a16207", "#713f12"] },
      copper: { top: "#fed7aa", shades: ["#fb923c", "#c2410c", "#9a3412", "#6c2710"] }
    },
    lines: {
      hi: "#1e1913",
      mid: "#463d31",
      lo: "#7d7160",
      faint: "#bfb39f",
      lit: "#6c2710",
      dot: "#2e271f"
    },
    halo: "#d4c8b2",
    haloOpacity: 0.46,
    channels: {
      intake: "#1d4ed8",
      comp: "#6d28d9",
      comb: "#d97706",
      exhaust: "#b91c1c",
      cavity: "#e9dfc9"
    },
    glass: { top: "#fffaf0", rim: "#b45309", tint: "#fef3c7", opacity: 0.32 }
  },
  {
    id: "dark",
    name: "Dark",
    swatch: "#262a30",
    isDark: true,
    css: {
      bg: "#0c0e10",
      card: "#14171a",
      border: "#262b31",
      text: "#e6e4dd",
      muted: "#889099",
      strong: "#ffffff",
      lit: "#38bdf8",
      pillBg: "#1d2227",
      pillHover: "#272d35"
    },
    ramps: {
      lo:  { top: "#262b32", shades: ["#1f242a", "#1a1e23", "#15181c", "#101216"] },
      mid: { top: "#383f48", shades: ["#2e343c", "#252a31", "#1d2127", "#15181d"] },
      hi:  { top: "#4c5561", shades: ["#3f4752", "#323942", "#262c33", "#1b1f24"] },
      lit: { top: "#e0f2fe", shades: ["#7dd3fc", "#38bdf8", "#0284c7", "#0369a1"] },
      brass: { top: "#fef08a", shades: ["#eab308", "#ca8a04", "#854d0e", "#422006"] },
      copper: { top: "#fdba74", shades: ["#ea580c", "#9a3412", "#7c2d12", "#431407"] }
    },
    lines: {
      hi: "#f1efe9",
      mid: "#a5acb6",
      lo: "#5c6470",
      faint: "#343a42",
      lit: "#e0f2fe",
      dot: "#d6d4ce"
    },
    halo: "#07080a",
    haloOpacity: 0.78,
    channels: {
      intake: "#38bdf8",
      comp: "#a855f7",
      comb: "#fb923c",
      exhaust: "#f87171",
      cavity: "#0e1013"
    },
    glass: { top: "#e0f2fe", rim: "#38bdf8", tint: "#0c4a6e", opacity: 0.36 }
  },
  {
    id: "blueprint",
    name: "Blueprint",
    swatch: "#1b3b66",
    isDark: true,
    css: {
      bg: "#081426",
      card: "#0d1f3a",
      border: "#1c3c6b",
      text: "#e0f2fe",
      muted: "#7da5d9",
      strong: "#ffffff",
      lit: "#fbbf24",
      pillBg: "#132c52",
      pillHover: "#1b3c6e"
    },
    ramps: {
      lo:  { top: "#1b3a66", shades: ["#163157", "#122847", "#0e2038", "#0a1729"] },
      mid: { top: "#274f87", shades: ["#204373", "#19365e", "#132a4a", "#0e1f38"] },
      hi:  { top: "#3767ab", shades: ["#2c5691", "#224575", "#19355c", "#122645"] },
      lit: { top: "#fef9c3", shades: ["#fde047", "#fbbf24", "#d97706", "#92400e"] },
      brass: { top: "#fef08a", shades: ["#facc15", "#ca8a04", "#854d0e", "#422006"] },
      copper: { top: "#fed7aa", shades: ["#fb923c", "#ea580c", "#9a3412", "#431407"] }
    },
    lines: {
      hi: "#eff6ff",
      mid: "#93c5fd",
      lo: "#3b82f6",
      faint: "#1e40af",
      lit: "#fef08a",
      dot: "#dbeafe"
    },
    halo: "#050d1a",
    haloOpacity: 0.75,
    channels: {
      intake: "#38bdf8",
      comp: "#818cf8",
      comb: "#facc15",
      exhaust: "#fb7185",
      cavity: "#09172b"
    },
    glass: { top: "#ffffff", rim: "#93c5fd", tint: "#1e40af", opacity: 0.34 }
  },
  {
    id: "sepia",
    name: "Sepia",
    swatch: "#dfd3be",
    isDark: false,
    css: {
      bg: "#e4dac8",
      card: "#f4ece0",
      border: "#d1c4ae",
      text: "#2b2118",
      muted: "#7a6a58",
      strong: "#17110c",
      lit: "#be123c",
      pillBg: "#e8decb",
      pillHover: "#ddd0b8"
    },
    ramps: {
      lo:  { top: "#ece2d0", shades: ["#dfd2bc", "#cfc0a7", "#bca98e", "#a38f73"] },
      mid: { top: "#f7f0e4", shades: ["#e8dcc8", "#d7c8b0", "#c2b095", "#a79478"] },
      hi:  { top: "#fcf8f0", shades: ["#eee3d0", "#ded0b8", "#c8b69b", "#ad9a7e"] },
      lit: { top: "#ffe4e6", shades: ["#fda4af", "#f43f5e", "#be123c", "#881337"] },
      brass: { top: "#fef08a", shades: ["#eab308", "#ca8a04", "#a16207", "#713f12"] },
      copper: { top: "#fed7aa", shades: ["#fb923c", "#c2410c", "#9a3412", "#7c2d12"] }
    },
    lines: {
      hi: "#261c14",
      mid: "#4f3e2e",
      lo: "#806c58",
      faint: "#bda992",
      lit: "#881337",
      dot: "#36281d"
    },
    halo: "#cbbba2",
    haloOpacity: 0.48,
    channels: {
      intake: "#0369a1",
      comp: "#6d28d9",
      comb: "#e11d48",
      exhaust: "#b91c1c",
      cavity: "#e2d5c0"
    },
    glass: { top: "#fffbeb", rim: "#b45309", tint: "#fde68a", opacity: 0.34 }
  }
];

const CHANNEL_RAMP_ALIASES = {
  channelA: "intake",
  channelB: "comp",
  channelC: "comb",
  channelD: "exhaust"
};

function deriveChannelRamp(hexColor, isDark) {
  const base = new THREE.Color(hexColor);
  const white = new THREE.Color(isDark ? "#e2e8f0" : "#ffffff");
  const black = new THREE.Color("#090b0f");
  const mixHex = (target, amt) => "#" + base.clone().lerp(target, amt).getHexString();
  return {
    top: mixHex(white, isDark ? 0.42 : 0.62),
    shades: [
      mixHex(white, isDark ? 0.18 : 0.28),
      "#" + base.getHexString(),
      mixHex(black, 0.25),
      mixHex(black, 0.48)
    ]
  };
}

function resolveThemeRamp(theme, rampKey) {
  const canonical = CHANNEL_RAMP_ALIASES[rampKey] || rampKey;
  if (theme.ramps[canonical]) return theme.ramps[canonical];
  if (theme.channels && theme.channels[canonical]) {
    return deriveChannelRamp(theme.channels[canonical], Boolean(theme.isDark));
  }
  return theme.ramps.mid;
}

export const CEL_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const CEL_FRAGMENT_SHADER = `
  uniform vec3 uLightDir;
  uniform vec3 uTop;
  uniform vec3 uShade0;
  uniform vec3 uShade1;
  uniform vec3 uShade2;
  uniform vec3 uShade3;
  uniform float uTopBias;
  uniform vec4 uSectionPlane;
  uniform float uSectionEnabled;
  uniform float uClippedPart;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  float aaStep(float edge, float x) {
    float w = clamp(fwidth(x) * 1.15, 0.015, 0.08);
    return smoothstep(edge - w, edge + w, x);
  }

  void main() {
    if (uSectionEnabled > 0.5 && uClippedPart > 0.5) {
      float secDist = dot(vWorldPos, uSectionPlane.xyz) + uSectionPlane.w;
      if (secDist < 0.0) discard;
    }

    if (!gl_FrontFacing) {
      float hatch = step(0.54, fract((vWorldPos.x * 1.15 + vWorldPos.y * 1.35 + vWorldPos.z * 0.9) * 12.0));
      vec3 cutCol = mix(uShade0 * 0.86, uShade1, hatch * 0.65);
      gl_FragColor = vec4(cutCol, 1.0);
      return;
    }

    vec3 N = normalize(vWorldNormal);
    float ndotl = dot(N, normalize(uLightDir));

    vec3 sideCol = uShade0;
    sideCol = mix(sideCol, uShade1, aaStep(-0.28, ndotl));
    sideCol = mix(sideCol, uShade2, aaStep(0.14, ndotl));
    sideCol = mix(sideCol, uShade3, aaStep(0.56, ndotl));

    float upness = N.y + 0.18 * N.z;
    float isTop = aaStep(uTopBias, upness);
    vec3 col = mix(sideCol, uTop, isTop);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const GLASS_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const GLASS_FRAGMENT_SHADER = `
  uniform vec3 uLightDir;
  uniform vec3 uTop;
  uniform vec3 uRim;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform vec4 uSectionPlane;
  uniform float uSectionEnabled;
  uniform float uClippedPart;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    if (uSectionEnabled > 0.5 && uClippedPart > 0.5) {
      float secDist = dot(vWorldPos, uSectionPlane.xyz) + uSectionPlane.w;
      if (secDist < 0.0) discard;
    }

    vec3 N = normalize(vWorldNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uLightDir);

    float ndotv = abs(dot(N, V));
    float fresnel = pow(clamp(1.0 - ndotv, 0.0, 1.0), 2.0);
    vec3 H = normalize(L + V);
    float specBand = smoothstep(0.90, 0.96, max(dot(N, H), 0.0));
    float topBand = smoothstep(0.68, 0.82, N.y + 0.15 * N.z) * 0.28;

    vec3 col = mix(uTint, uRim, smoothstep(0.22, 0.65, fresnel));
    col = mix(col, uTop, clamp(specBand * 0.72 + topBand, 0.0, 0.85));
    float alpha = clamp(uOpacity + fresnel * 0.44 + specBand * 0.35, 0.06, 0.90);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createShaderKit(initialTheme = THEMES[0]) {
  let currentTheme = initialTheme;
  const lightDir = new THREE.Vector3(0.52, 0.78, 0.48).normalize();
  const anatomyMaterials = [];
  const outlineMaterials = [];
  const glassMaterials = [];
  const haloMaterials = [];
  const clippableLineMaterials = [];
  const themeListeners = [];
  const lineMaterials = {};
  const dotMaterials = {};

  let activeSectionPlane = null;
  const sectionPlaneVec4 = new THREE.Vector4(0, 0, -1, 999);
  let sectionEnabledVal = 0.0;

  ["hi", "mid", "lo", "faint", "lit"].forEach((k) => {
    lineMaterials[k] = new THREE.LineBasicMaterial({
      color: new THREE.Color(currentTheme.lines[k]),
      transparent: true,
      opacity: k === "faint" ? 0.72 : 0.95
    });
  });

  ["dot", "lit"].forEach((k) => {
    dotMaterials[k] = new THREE.MeshBasicMaterial({
      color: new THREE.Color(currentTheme.lines[k === "dot" ? "dot" : "lit"])
    });
  });

  function createAnatomySolidMaterial(rampKey = "mid", topBias = 0.62, clippable = false) {
    const ramp = resolveThemeRamp(currentTheme, rampKey);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uLightDir: { value: lightDir },
        uTop:    { value: new THREE.Color(ramp.top) },
        uShade0: { value: new THREE.Color(ramp.shades[3]) },
        uShade1: { value: new THREE.Color(ramp.shades[2]) },
        uShade2: { value: new THREE.Color(ramp.shades[1]) },
        uShade3: { value: new THREE.Color(ramp.shades[0]) },
        uTopBias: { value: topBias },
        uSectionPlane: { value: sectionPlaneVec4 },
        uSectionEnabled: { value: sectionEnabledVal },
        uClippedPart: { value: clippable ? 1.0 : 0.0 }
      },
      vertexShader: CEL_VERTEX_SHADER,
      fragmentShader: CEL_FRAGMENT_SHADER,
      side: clippable && sectionEnabledVal > 0.5 ? THREE.DoubleSide : THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: 1.5,
      polygonOffsetUnits: 1.5
    });
    mat.userData.rampKey = rampKey;
    mat.userData.clippable = Boolean(clippable);
    anatomyMaterials.push(mat);
    return mat;
  }

  function createGlassMaterial(opts = {}) {
    const gTheme = currentTheme.glass || { top: "#ffffff", rim: "#38bdf8", tint: "#bae6fd", opacity: 0.34 };
    const clippable = Boolean(opts.clippable);
    const customOpacity = typeof opts.opacity === "number" ? opts.opacity : null;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uLightDir: { value: lightDir },
        uTop: { value: new THREE.Color(gTheme.top) },
        uRim: { value: new THREE.Color(gTheme.rim) },
        uTint: { value: new THREE.Color(gTheme.tint) },
        uOpacity: { value: customOpacity !== null ? customOpacity : gTheme.opacity },
        uSectionPlane: { value: sectionPlaneVec4 },
        uSectionEnabled: { value: sectionEnabledVal },
        uClippedPart: { value: clippable ? 1.0 : 0.0 }
      },
      vertexShader: GLASS_VERTEX_SHADER,
      fragmentShader: GLASS_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    mat.userData.customOpacity = customOpacity;
    mat.userData.clippable = clippable;
    glassMaterials.push(mat);
    return mat;
  }

  function createOutlineMaterial(lineKey = "mid", thickness = 0.018, clippable = false) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(currentTheme.lines[lineKey] || currentTheme.lines.mid) },
        uThickness: { value: thickness },
        uSectionPlane: { value: sectionPlaneVec4 },
        uSectionEnabled: { value: sectionEnabledVal },
        uClippedPart: { value: clippable ? 1.0 : 0.0 }
      },
      vertexShader: `
        uniform float uThickness;
        varying vec3 vWorldPos;
        void main() {
          vec3 displaced = position + normalize(normal) * uThickness;
          vec4 wp = modelMatrix * vec4(displaced, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec4 uSectionPlane;
        uniform float uSectionEnabled;
        uniform float uClippedPart;
        varying vec3 vWorldPos;
        void main() {
          if (uSectionEnabled > 0.5 && uClippedPart > 0.5) {
            float secDist = dot(vWorldPos, uSectionPlane.xyz) + uSectionPlane.w;
            if (secDist < 0.0) discard;
          }
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    mat.userData.lineKey = lineKey;
    mat.userData.clippable = Boolean(clippable);
    outlineMaterials.push(mat);
    return mat;
  }

  function createHaloMaterial() {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(currentTheme.halo),
      transparent: true,
      opacity: currentTheme.haloOpacity,
      depthWrite: false
    });
    haloMaterials.push(mat);
    return mat;
  }

  function createAnatomyPart(geometry, options = {}) {
    const isGlass = options.ramp === "glass";
    const opts = Object.assign({
      ramp: "mid",
      outline: isGlass ? "lo" : "mid",
      crease: "faint",
      creaseAngle: 28,
      outlineWidth: isGlass ? 0.009 : 0.017,
      topBias: 0.62,
      noOutline: false,
      noCrease: false,
      clippable: false,
      opacity: undefined
    }, options);

    const group = new THREE.Group();
    const solidMat = isGlass
      ? createGlassMaterial({ opacity: opts.opacity, clippable: opts.clippable })
      : createAnatomySolidMaterial(opts.ramp, opts.topBias, opts.clippable);
    const mesh = new THREE.Mesh(geometry, solidMat);
    mesh.name = "solid";
    if (isGlass) {
      mesh.renderOrder = 2;
    }
    group.add(mesh);

    if (!opts.noOutline) {
      const outMat = createOutlineMaterial(opts.outline, opts.outlineWidth, opts.clippable);
      const outMesh = new THREE.Mesh(geometry, outMat);
      outMesh.name = "outline";
      group.add(outMesh);
    }

    if (!opts.noCrease) {
      const edgesGeo = new THREE.EdgesGeometry(geometry, opts.creaseAngle);
      let creaseMat = lineMaterials[opts.crease] || lineMaterials.faint;
      if (opts.clippable) {
        creaseMat = creaseMat.clone();
        creaseMat.userData.lineKey = opts.crease in lineMaterials ? opts.crease : "faint";
        creaseMat.clippingPlanes = activeSectionPlane ? [activeSectionPlane] : [];
        clippableLineMaterials.push(creaseMat);
      }
      const edges = new THREE.LineSegments(edgesGeo, creaseMat);
      edges.name = "crease";
      group.add(edges);
    }

    return group;
  }

  function setSectionPlane(planeOrNull) {
    activeSectionPlane = planeOrNull || null;
    sectionEnabledVal = activeSectionPlane ? 1.0 : 0.0;
    if (activeSectionPlane) {
      sectionPlaneVec4.set(
        activeSectionPlane.normal.x,
        activeSectionPlane.normal.y,
        activeSectionPlane.normal.z,
        activeSectionPlane.constant
      );
    }
    anatomyMaterials.forEach((mat) => {
      mat.uniforms.uSectionEnabled.value = sectionEnabledVal;
      if (mat.userData.clippable) {
        mat.side = activeSectionPlane ? THREE.DoubleSide : THREE.FrontSide;
      }
    });
    glassMaterials.forEach((mat) => {
      mat.uniforms.uSectionEnabled.value = sectionEnabledVal;
    });
    outlineMaterials.forEach((mat) => {
      mat.uniforms.uSectionEnabled.value = sectionEnabledVal;
    });
    clippableLineMaterials.forEach((mat) => {
      mat.clippingPlanes = activeSectionPlane ? [activeSectionPlane] : [];
    });
  }

  function onThemeChange(fn) {
    themeListeners.push(fn);
  }

  function applyTheme(themeOrId) {
    const theme = typeof themeOrId === "string"
      ? THEMES.find((t) => t.id === themeOrId) || THEMES[0]
      : themeOrId;
    currentTheme = theme;

    anatomyMaterials.forEach((mat) => {
      const ramp = resolveThemeRamp(theme, mat.userData.rampKey);
      mat.uniforms.uTop.value.set(ramp.top);
      mat.uniforms.uShade0.value.set(ramp.shades[3]);
      mat.uniforms.uShade1.value.set(ramp.shades[2]);
      mat.uniforms.uShade2.value.set(ramp.shades[1]);
      mat.uniforms.uShade3.value.set(ramp.shades[0]);
    });

    const gTheme = theme.glass || { top: "#ffffff", rim: "#38bdf8", tint: "#bae6fd", opacity: 0.34 };
    glassMaterials.forEach((mat) => {
      mat.uniforms.uTop.value.set(gTheme.top);
      mat.uniforms.uRim.value.set(gTheme.rim);
      mat.uniforms.uTint.value.set(gTheme.tint);
      if (mat.userData.customOpacity === null) {
        mat.uniforms.uOpacity.value = gTheme.opacity;
      }
    });

    outlineMaterials.forEach((mat) => {
      const col = theme.lines[mat.userData.lineKey] || theme.lines.mid;
      mat.uniforms.uColor.value.set(col);
    });

    Object.keys(lineMaterials).forEach((k) => {
      lineMaterials[k].color.set(theme.lines[k]);
    });
    clippableLineMaterials.forEach((mat) => {
      const lk = mat.userData.lineKey || "faint";
      mat.color.set(theme.lines[lk] || theme.lines.faint);
    });
    dotMaterials.dot.color.set(theme.lines.dot);
    dotMaterials.lit.color.set(theme.lines.lit);

    haloMaterials.forEach((mat) => {
      mat.color.set(theme.halo);
      mat.opacity = theme.haloOpacity;
    });

    themeListeners.forEach((fn) => fn(theme));
    return theme;
  }

  return {
    THEMES,
    get currentTheme() { return currentTheme; },
    lightDir,
    lineMaterials,
    dotMaterials,
    createAnatomySolidMaterial,
    createGlassMaterial,
    createOutlineMaterial,
    createHaloMaterial,
    createAnatomyPart,
    setSectionPlane,
    onThemeChange,
    applyTheme
  };
}
