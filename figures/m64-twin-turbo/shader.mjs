import * as THREE from "three";
import { SPEC, BANK_SIGN, CYL_Z, getEngineState } from "./model.mjs";

const CHAMBER_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vPosLocal;
  void main() {
    vUv = uv;
    vPosLocal = position;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CHAMBER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uComb;
  uniform float uIntake;
  uniform float uComp;
  uniform float uExh;
  uniform float uBoost;
  uniform float uEnv;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vPosLocal;

  void main() {
    float fresnel = pow(1.0 - abs(vNormalView.z), 1.35);
    float swirl = 0.5 + 0.5 * sin(vUv.x * 18.0 + vUv.y * 12.0 - uTime * 9.0);

    vec3 combCol = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.92, 0.65), clamp(uComb * 1.15, 0.0, 1.0));
    vec3 intkCol = vec3(0.18, 0.68, 1.0);
    vec3 compCol = vec3(0.68, 0.25, 0.98);
    vec3 exhCol  = vec3(0.96, 0.22, 0.14);

    vec3 col =
      combCol * uComb * (1.15 + 0.35 * swirl) +
      intkCol * uIntake * (0.45 + 0.25 * swirl) +
      compCol * uComp * (0.50 + 0.30 * uBoost) +
      exhCol  * uExh * 0.52;

    float alpha = (0.04 + 0.62 * uComb + 0.22 * uIntake + 0.26 * uComp + 0.24 * uExh);
    alpha *= (0.65 + 0.35 * fresnel) * uEnv;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
  }
`;

const TURBINE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uHeat;
  uniform float uOverboost;
  uniform float uEnv;
  varying vec2 vUv;
  varying vec3 vNormalView;

  void main() {
    float rim = 0.45 + 0.55 * pow(1.0 - abs(vNormalView.z), 1.1);
    float pulse = 0.88 + 0.12 * sin(uTime * 14.0 + vUv.x * 12.0);
    float h = clamp(uHeat + 0.35 * uOverboost, 0.0, 1.35);
    vec3 col = mix(vec3(0.75, 0.12, 0.04), vec3(1.0, 0.55, 0.12), clamp(h, 0.0, 1.0));
    col = mix(col, vec3(1.0, 0.90, 0.55), clamp(h - 0.8, 0.0, 0.6));
    float alpha = clamp(0.12 + 0.44 * h, 0.0, 0.72) * rim * pulse * uEnv;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const AIRFLOW_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uEnv;
  varying vec2 vUv;
  varying vec3 vNormalView;

  void main() {
    float flow = fract(vUv.y * 3.0 - uTime * (1.5 + 4.5 * uSpeed));
    float streak = smoothstep(0.0, 0.25, flow) * (1.0 - smoothstep(0.45, 0.95, flow));
    float edgeFade = sin(clamp(vUv.y, 0.0, 1.0) * 3.14159);
    float rim = 0.55 + 0.45 * (1.0 - abs(vNormalView.z));
    vec3 col = mix(uColorA, uColorB, vUv.y);
    float alpha = streak * edgeFade * rim * uIntensity * uEnv;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.65));
  }
`;

export function buildShader(reg) {
  const gFx = reg.group("shader", { stage: "shader" });

  // 1. Six 4-Stroke Boxer Combustion Chamber Shaders (nested cleanly inside glass cylinder barrels)
  const chamberGeo = new THREE.CylinderGeometry(SPEC.BORE_R * 0.88, SPEC.BORE_R * 0.88, 0.22, 24, 1, true);
  chamberGeo.rotateZ(-Math.PI / 2);

  const chamberUniforms = [];
  for (let i = 0; i < 6; i++) {
    const s = BANK_SIGN[i];
    const cz = CYL_Z[i];
    const uniforms = {
      uTime: { value: 0 },
      uComb: { value: 0 },
      uIntake: { value: 0 },
      uComp: { value: 0 },
      uExh: { value: 0 },
      uBoost: { value: 0.8 },
      uEnv: { value: 1 }
    };
    chamberUniforms.push(uniforms);

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: CHAMBER_VERT,
      fragmentShader: CHAMBER_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(chamberGeo, mat);
    mesh.position.set(s * 0.99, 0, cz);
    mesh.renderOrder = 18;
    reg.detail(`shader.chamber.${i}`, mesh, { parent: gFx, stage: "shader" });
  }

  // 2. Twin KKK K16 Hot-Side Turbine Thermal Glow Sleeves
  const turbineGeo = new THREE.CylinderGeometry(0.174, 0.174, 0.155, 28, 1, true);
  turbineGeo.rotateZ(-Math.PI / 2);
  const turbineUniforms = [];
  for (const s of [-1, 1]) {
    const uniforms = {
      uTime: { value: 0 },
      uHeat: { value: 0.35 },
      uOverboost: { value: 0 },
      uEnv: { value: 1 }
    };
    turbineUniforms.push(uniforms);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: CHAMBER_VERT,
      fragmentShader: TURBINE_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(turbineGeo, mat);
    mesh.position.set(s * 1.07, SPEC.TURBO_Y, SPEC.TURBO_Z);
    mesh.renderOrder = 19;
    reg.detail(`shader.turbineGlow.${s < 0 ? "L" : "R"}`, mesh, { parent: gFx, stage: "shader" });
  }

  // 3. Axial Cooling Fan Slipstream Wash Ring behind 11-blade fan
  const fanWashGeo = new THREE.CylinderGeometry(0.36, 0.39, 0.24, 32, 1, true);
  fanWashGeo.rotateX(Math.PI / 2);
  const fanUniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 0.4 },
    uIntensity: { value: 0.32 },
    uColorA: { value: new THREE.Color(0x60a5fa) },
    uColorB: { value: new THREE.Color(0xc4b5fd) },
    uEnv: { value: 1 }
  };
  const fanMesh = new THREE.Mesh(
    fanWashGeo,
    new THREE.ShaderMaterial({
      uniforms: fanUniforms,
      vertexShader: CHAMBER_VERT,
      fragmentShader: AIRFLOW_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  fanMesh.position.set(0, SPEC.FAN_Y, SPEC.FAN_Z - 0.14);
  fanMesh.renderOrder = 17;
  reg.detail("shader.fanWash", fanMesh, { parent: gFx, stage: "shader" });

  // 4. Twin Wastegate Relief Dump Plumes (flares during WASTEGATE DUMP trigger)
  const wgGeo = new THREE.CylinderGeometry(0.025, 0.068, 0.28, 16, 1, true);
  const wgUniforms = [];
  const wgMeshes = [];
  for (const s of [-1, 1]) {
    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uIntensity: { value: 0.0 },
      uColorA: { value: new THREE.Color(0x38bdf8) },
      uColorB: { value: new THREE.Color(0xfbbf24) },
      uEnv: { value: 1 }
    };
    wgUniforms.push(uniforms);
    const mesh = new THREE.Mesh(
      wgGeo,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: CHAMBER_VERT,
        fragmentShader: AIRFLOW_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    mesh.position.set(s * 1.24, -0.44, -1.05);
    mesh.visible = false;
    mesh.renderOrder = 20;
    wgMeshes.push(mesh);
    reg.detail(`shader.wastegateDump.${s < 0 ? "L" : "R"}`, mesh, { parent: gFx, stage: "shader" });
  }

  return function updateShader(state) {
    const env = state.shaderEnv ?? 1;
    const t = state.simClock ?? 0;
    const params = state.params || state || {};
    const eng = getEngineState(state.theta ?? SPEC.initialTheta, params, state.triggers || {});

    gFx.visible = env > 0.02;
    if (!gFx.visible) return;

    for (let i = 0; i < 6; i++) {
      const ck = eng.cylinders[i];
      const u = chamberUniforms[i];
      u.uTime.value = t;
      u.uComb.value = ck.combIntensity;
      u.uIntake.value = ck.intakeWeight;
      u.uComp.value = ck.compWeight;
      u.uExh.value = ck.exhWeight;
      u.uBoost.value = eng.effectiveBoost;
      u.uEnv.value = env;
    }

    const turbHeat = (0.18 + 0.72 * eng.rpmNorm + 0.25 * eng.effectiveBoost) * (1 - 0.35 * eng.wastegateEnv);
    for (const u of turbineUniforms) {
      u.uTime.value = t;
      u.uHeat.value = turbHeat;
      u.uOverboost.value = eng.overboostEnv;
      u.uEnv.value = env;
    }

    fanUniforms.uTime.value = t;
    fanUniforms.uSpeed.value = eng.rpmNorm;
    fanUniforms.uIntensity.value = 0.18 + 0.34 * eng.rpmNorm;
    fanUniforms.uEnv.value = env;

    for (let k = 0; k < 2; k++) {
      wgUniforms[k].uTime.value = t;
      wgUniforms[k].uIntensity.value = eng.wastegateEnv * 0.85;
      wgUniforms[k].uEnv.value = env;
      wgMeshes[k].visible = eng.wastegateEnv > 0.03;
    }
  };
}
