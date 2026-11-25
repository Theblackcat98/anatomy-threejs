import * as THREE from "three";
import { SPEC, getRigState } from "./model.mjs";

export function buildShader(reg, kit) {
  const boomGroup = reg.groups.get("subject.boomGroup")?.group || reg.root;
  const shaderGroup = reg.group("shader.group", { parent: boomGroup, stage: "shader" });
  const theme = kit.currentTheme;
  const initSt = getRigState(SPEC.initialTheta, {}, {});

  const sharedUniforms = {
    uTime: { value: Math.abs(SPEC.initialTheta) * 0.45 },
    uWindSpeed: { value: 0.6 + initSt.windNorm * 1.6 },
    uCamber: { value: initSt.camberRatio },
    uGust: { value: initSt.gustEnv },
    uEnvelope: { value: 1.0 },
    uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
    uColIntake: { value: new THREE.Color(theme.channels.intake) },
    uColComb: { value: new THREE.Color(theme.channels.comb) },
    uColLit: { value: new THREE.Color(theme.channels.lit) }
  };

  // 1. Vertical Sail-Span Apparent Wind & Leeward Suction Streamline Sheet
  const spanMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: sharedUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uWindSpeed;
      uniform float uCamber;
      uniform float uGust;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComb;
      varying vec2 vUv;

      void main() {
        if (uEnvelope < 0.004) discard;

        // Taper chord envelope with sail planform from foot (v=0) toward masthead (v=1)
        float maxChordU = mix(0.95, 0.24, pow(vUv.y, 1.08));
        float uChord = vUv.x / max(0.08, maxChordU);

        // Soft boundary fade inside quad (no visible rectangular card edge)
        float maskX = smoothstep(0.02, 0.14, vUv.x) * (1.0 - smoothstep(maxChordU - 0.14, maxChordU + 0.06, vUv.x));
        float maskY = smoothstep(0.04, 0.18, vUv.y) * (1.0 - smoothstep(0.84, 0.98, vUv.y));
        float env = maskX * maskY * uEnvelope;
        if (env < 0.004) discard;

        // Flowing chordwise wind streamlines curved slightly by NACA camber draft peak at 38% chord
        float draftCurve = sin(clamp(uChord, 0.0, 1.0) * 3.14159) * (uCamber * 2.1);
        float laneCoord = (vUv.y - draftCurve * 0.12) * 14.0;
        float flowWave = 0.5 + 0.5 * sin(uChord * 12.0 - uTime * (2.6 * uWindSpeed) + laneCoord * 0.6);
        float streak = smoothstep(0.62, 0.98, abs(sin(laneCoord * 3.14159))) * (0.45 + 0.55 * flowWave);

        // Stagnation pressure peak near 32% chord (comb) transitioning into fast trailing wash (intake)
        float stagZone = exp(-pow((uChord - 0.30) / 0.24, 2.0));
        vec3 flowCol = mix(uColIntake, uColComb, clamp(stagZone * (0.68 + uGust * 0.32), 0.0, 1.0));

        float alpha = clamp((0.06 + 0.30 * streak + 0.14 * stagZone * uGust) * env * (uIsDark > 0.5 ? 0.92 : 0.72), 0.0, 0.44);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(flowCol, alpha);
      }
    `
  });

  const spanGeo = new THREE.PlaneGeometry(1.56, 2.40, 1, 1);
  const spanMesh = new THREE.Mesh(spanGeo, spanMat);
  spanMesh.position.set(0.68, 1.28, 0.05);
  reg.detail("rig.windShaderPlane", spanMesh, { parent: shaderGroup, stage: "shader" });

  // 2. Horizontal Mid-Span Aerodynamic Pressure & Leeward Slot Slice (visible in TOP & ISO)
  const sliceMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: sharedUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uWindSpeed;
      uniform float uCamber;
      uniform float uGust;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComb;
      varying vec2 vUv;

      void main() {
        if (uEnvelope < 0.004) discard;

        // Smooth elliptical aperture fade so horizontal slice never shows a box border
        vec2 c = (vUv - 0.5) * 2.0;
        float rad = length(c);
        float mask = 1.0 - smoothstep(0.62, 0.98, rad);
        float env = mask * uEnvelope;
        if (env < 0.004) discard;

        // vUv.x runs 0..1 along chord (luff -> leech); vUv.y runs 0..1 across leeward (-Z) -> windward (+Z)
        float p = 0.38;
        float xi = clamp((vUv.x - 0.14) / 0.72, 0.0, 1.0);
        float camberProf = xi < p
          ? (2.0 * p * xi - xi * xi) / (p * p)
          : (1.0 - 2.0 * p + 2.0 * p * xi - xi * xi) / ((1.0 - p) * (1.0 - p));
        // Sail cross-section sits shifted toward -Z (lower vUv.y in PlaneGeometry after rotateX(-PI/2))
        float foilZ = 0.48 - camberProf * clamp(uCamber * 1.45, 0.06, 0.32);

        float distFoil = vUv.y - foilZ;
        // Windward (+Z, distFoil > 0) = stagnation pressure; Leeward (-Z, distFoil < 0) = accelerated suction slot
        float leeSide = smoothstep(0.02, -0.14, distFoil);
        float windSide = smoothstep(-0.02, 0.16, distFoil);

        // Deflected airflow streamlines curving smoothly past the cambered section
        float psi = vUv.y - (foilZ - 0.48) * exp(-pow(abs(distFoil) / 0.18, 2.0));
        float lines = smoothstep(0.68, 0.99, abs(sin(psi * 26.0)));
        float pulse = 0.55 + 0.45 * sin(vUv.x * 16.0 - uTime * (3.2 * uWindSpeed));

        vec3 col = mix(uColComb, uColIntake, leeSide);
        float intensity = lines * pulse * (0.55 * windSide + 0.85 * leeSide) + exp(-abs(distFoil) * 14.0) * 0.25;
        float alpha = clamp(intensity * env * (uIsDark > 0.5 ? 0.88 : 0.65), 0.0, 0.46);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const sliceGeo = new THREE.PlaneGeometry(1.76, 1.12, 1, 1);
  sliceGeo.rotateX(-Math.PI / 2);
  const sliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
  sliceMesh.position.set(0.64, 0.92, -0.10);
  reg.detail("rig.windSliceShader", sliceMesh, { parent: shaderGroup, stage: "shader" });

  reg.root.userData.windShaderMat = { uniforms: sharedUniforms };

  kit.onThemeChange((nextTheme) => {
    sharedUniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    sharedUniforms.uColIntake.value.set(nextTheme.channels.intake);
    sharedUniforms.uColComb.value.set(nextTheme.channels.comb);
    sharedUniforms.uColLit.value.set(nextTheme.channels.lit);
  });
}
