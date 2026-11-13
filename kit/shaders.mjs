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
    }
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
    }
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
    }
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
    }
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
    }
  }
];

export const CEL_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
  varying vec3 vWorldNormal;

  float aaStep(float edge, float x) {
    float w = clamp(fwidth(x) * 1.15, 0.015, 0.08);
    return smoothstep(edge - w, edge + w, x);
  }

  void main() {
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

export function createShaderKit(initialTheme = THEMES[0]) {
  let currentTheme = initialTheme;
  const lightDir = new THREE.Vector3(0.52, 0.78, 0.48).normalize();
  const anatomyMaterials = [];
  const outlineMaterials = [];
  const haloMaterials = [];
  const themeListeners = [];
  const lineMaterials = {};
  const dotMaterials = {};

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

  function createAnatomySolidMaterial(rampKey = "mid", topBias = 0.62) {
    const ramp = currentTheme.ramps[rampKey] || currentTheme.ramps.mid;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uLightDir: { value: lightDir },
        uTop:    { value: new THREE.Color(ramp.top) },
        uShade0: { value: new THREE.Color(ramp.shades[3]) },
        uShade1: { value: new THREE.Color(ramp.shades[2]) },
        uShade2: { value: new THREE.Color(ramp.shades[1]) },
        uShade3: { value: new THREE.Color(ramp.shades[0]) },
        uTopBias: { value: topBias }
      },
      vertexShader: CEL_VERTEX_SHADER,
      fragmentShader: CEL_FRAGMENT_SHADER,
      polygonOffset: true,
      polygonOffsetFactor: 1.5,
      polygonOffsetUnits: 1.5
    });
    mat.userData.rampKey = rampKey;
    anatomyMaterials.push(mat);
    return mat;
  }

  function createOutlineMaterial(lineKey = "mid", thickness = 0.018) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(currentTheme.lines[lineKey] || currentTheme.lines.mid) },
        uThickness: { value: thickness }
      },
      vertexShader: `
        uniform float uThickness;
        void main() {
          vec3 displaced = position + normalize(normal) * uThickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    mat.userData.lineKey = lineKey;
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
    const opts = Object.assign({
      ramp: "mid",
      outline: "mid",
      crease: "faint",
      creaseAngle: 28,
      outlineWidth: 0.017,
      topBias: 0.62,
      noOutline: false,
      noCrease: false
    }, options);

    const group = new THREE.Group();
    const solidMat = createAnatomySolidMaterial(opts.ramp, opts.topBias);
    const mesh = new THREE.Mesh(geometry, solidMat);
    mesh.name = "solid";
    group.add(mesh);

    if (!opts.noOutline) {
      const outMat = createOutlineMaterial(opts.outline, opts.outlineWidth);
      const outMesh = new THREE.Mesh(geometry, outMat);
      outMesh.name = "outline";
      group.add(outMesh);
    }

    if (!opts.noCrease) {
      const edgesGeo = new THREE.EdgesGeometry(geometry, opts.creaseAngle);
      const edges = new THREE.LineSegments(edgesGeo, lineMaterials[opts.crease] || lineMaterials.faint);
      edges.name = "crease";
      group.add(edges);
    }

    return group;
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
      const ramp = theme.ramps[mat.userData.rampKey] || theme.ramps.mid;
      mat.uniforms.uTop.value.set(ramp.top);
      mat.uniforms.uShade0.value.set(ramp.shades[3]);
      mat.uniforms.uShade1.value.set(ramp.shades[2]);
      mat.uniforms.uShade2.value.set(ramp.shades[1]);
      mat.uniforms.uShade3.value.set(ramp.shades[0]);
    });

    outlineMaterials.forEach((mat) => {
      const col = theme.lines[mat.userData.lineKey] || theme.lines.mid;
      mat.uniforms.uColor.value.set(col);
    });

    Object.keys(lineMaterials).forEach((k) => {
      lineMaterials[k].color.set(theme.lines[k]);
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
    createOutlineMaterial,
    createHaloMaterial,
    createAnatomyPart,
    onThemeChange,
    applyTheme
  };
}
