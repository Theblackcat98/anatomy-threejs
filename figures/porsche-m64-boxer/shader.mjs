import * as THREE from "three";
import { buildCylinderGeometry } from "../../kit/primitives.mjs";
import { SPEC, getPistonKinematics } from "./model.mjs";

const CHAMBER_VERT = `
  varying vec3 vLocalPos;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vLocalPos = position;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const CHAMBER_FRAG = `
  uniform float uTheta;
  uniform float uFireDeg;
  uniform float uBank;
  uniform float uEnvelope;
  uniform float uHeat;
  uniform float uThrottle;
  uniform vec3 uColIntake;
  uniform vec3 uColComp;
  uniform vec3 uColComb;
  uniform vec3 uColExh;
  varying vec3 vLocalPos;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  const float PI = 3.14159265359;

  void main() {
    float crankDeg = mod(uTheta * 180.0 / PI, 720.0);
    if (crankDeg < 0.0) crankDeg += 720.0;
    float cyc = mod(crankDeg - uFireDeg + 720.0, 720.0);
    float phase = cyc / 720.0;

    float wPower  = smoothstep(0.0, 0.025, phase) * (1.0 - smoothstep(0.22, 0.27, phase));
    float wExh    = smoothstep(0.22, 0.27, phase) * (1.0 - smoothstep(0.47, 0.52, phase));
    float wIntake = smoothstep(0.47, 0.52, phase) * (1.0 - smoothstep(0.72, 0.77, phase));
    float wComp   = smoothstep(0.72, 0.77, phase) * (1.0 - smoothstep(0.97, 1.0, phase));
    float spark   = exp(-pow((phase - 0.022) / 0.026, 2.0));

    // Throttle directly scales combustion energy & cold intake charge density
    float loadGain = 0.38 + 0.62 * clamp(uThrottle, 0.0, 1.0);
    float powerGain = (wPower + spark * 0.95) * (0.45 + 0.85 * clamp(uThrottle, 0.0, 1.0));

    vec3 col = uColComb * powerGain
             + uColExh * wExh * loadGain
             + uColIntake * wIntake * (0.65 + 0.35 * loadGain)
             + uColComp * wComp * (0.70 + 0.30 * loadGain);

    // Spark flash originates near cylinder head end (uBank * x > 0)
    float headEnd = smoothstep(-0.35, 0.48, vLocalPos.x * uBank);
    if (spark > 0.12) {
      col = mix(col, vec3(1.0, 0.96, 0.82), spark * (0.35 + 0.65 * uThrottle) * (0.45 + 0.55 * headEnd));
    }

    // Soft radial & axial boundary fade so gas charge sits cleanly inside open cutaway bore
    float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
    float coreMask = smoothstep(0.08, 0.65, ndotv);
    float axialFade = smoothstep(0.50, 0.26, abs(vLocalPos.x));
    float baseAlpha = (0.18 + 0.52 * (powerGain * 0.72 + wExh * 0.30 + wIntake * 0.14)) * (0.70 + 0.30 * uHeat);
    float alpha = coreMask * axialFade * baseAlpha * uEnvelope;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.82));
  }
`;

export function buildShader(reg, kit) {
  const theme = kit.currentTheme;
  const shaderGroup = reg.group("shader.group", { stage: "shader" });

  // 1. Dynamic Volumetric 4-Stroke Gas Cylinder Inside Each Cutaway Bore
  const unitChamberGeo = buildCylinderGeometry(SPEC.boreRadius * 0.86, SPEC.boreRadius * 0.86, 1.0, {
    segments: 20,
    axis: "x"
  });
  const chamberMats = [];

  SPEC.cylinders.forEach((cyl) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTheta: { value: SPEC.initialTheta },
        uFireDeg: { value: cyl.fireDeg },
        uBank: { value: cyl.bank },
        uEnvelope: { value: 1.0 },
        uHeat: { value: 0.45 },
        uThrottle: { value: 0.48 },
        uColIntake: { value: new THREE.Color(theme.channels.intake) },
        uColComp: { value: new THREE.Color(theme.channels.comp) },
        uColComb: { value: new THREE.Color(theme.channels.comb) },
        uColExh: { value: new THREE.Color(theme.channels.exhaust) }
      },
      vertexShader: CHAMBER_VERT,
      fragmentShader: CHAMBER_FRAG
    });
    chamberMats.push(mat);

    const k = getPistonKinematics(cyl, SPEC.initialTheta);
    const headX = cyl.bank * SPEC.boreEndAbsX;
    const span = Math.max(0.03, Math.abs(headX - k.pistonCrownX));
    const cGroup = reg.group(`shader.chamber.${cyl.id}`, {
      parent: shaderGroup,
      pos: [(k.pistonCrownX + headX) * 0.5, SPEC.crankY, cyl.z],
      stage: "shader"
    });
    cGroup.scale.set(span, 1, 1);
    cGroup.userData.material = mat;

    const mesh = new THREE.Mesh(unitChamberGeo, mat);
    reg.detail(`shader.chamberMesh.${cyl.id}`, mesh, { parent: cGroup, stage: "shader" });
  });

  // 2. Confined Incandescent Fresnel Blackbody Sheath on Exhaust Headers & K16 Turbine Throats
  const headerGlowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uHeat: { value: 0.45 },
      uEnvelope: { value: 1.0 }
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uHeat;
      uniform float uEnvelope;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main() {
        float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float rim = pow(1.0 - ndotv, 1.35);
        float pulse = 0.86 + 0.14 * sin(uTime * 14.0 - vUv.x * 24.0);
        float hot = clamp(uHeat * pulse, 0.0, 1.0);

        vec3 cherry = vec3(0.92, 0.16, 0.06);
        vec3 orange = vec3(1.0, 0.54, 0.12);
        vec3 whiteHot = vec3(1.0, 0.92, 0.56);
        vec3 col = mix(cherry, orange, smoothstep(0.22, 0.70, hot));
        col = mix(col, whiteHot, smoothstep(0.74, 1.0, hot) * (0.4 + 0.6 * (1.0 - rim)));

        float along = 0.45 + 0.55 * smoothstep(0.05, 0.95, vUv.x);
        float alpha = (0.20 + 0.50 * rim) * along * (0.14 + 0.86 * hot) * uEnvelope;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.84));
      }
    `
  });

  reg.tubes
    .filter((t) => t.id.startsWith("tube.exhaust."))
    .forEach((t) => {
      const sleeveGeo = new THREE.TubeGeometry(t.curve, 38, t.radius * 1.36, 12, false);
      const sleeveMesh = new THREE.Mesh(sleeveGeo, headerGlowMat);
      reg.detail(`shader.headerGlow.${t.id}`, sleeveMesh, { parent: shaderGroup, stage: "shader" });
    });

  // Confined glowing torus ring inside each K16 hot turbine scroll throat
  const throatGeo = new THREE.TorusGeometry(0.145, 0.036, 12, 28);
  [-1, 1].forEach((bSign) => {
    const side = bSign < 0 ? "L" : "R";
    const throatMesh = new THREE.Mesh(throatGeo, headerGlowMat);
    throatMesh.position.set(bSign * SPEC.turboX, SPEC.turboY, SPEC.turboZ - 0.17);
    reg.detail(`shader.turbineThroat.${side}`, throatMesh, { parent: shaderGroup, stage: "shader" });
  });

  const hData = reg.group("shader.headerData", { parent: shaderGroup, stage: "shader" });
  hData.userData.material = headerGlowMat;

  kit.onThemeChange((nextTheme) => {
    chamberMats.forEach((mat) => {
      mat.uniforms.uColIntake.value.set(nextTheme.channels.intake);
      mat.uniforms.uColComp.value.set(nextTheme.channels.comp);
      mat.uniforms.uColComb.value.set(nextTheme.channels.comb);
      mat.uniforms.uColExh.value.set(nextTheme.channels.exhaust);
    });
  });
}
